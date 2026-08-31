import { Router } from 'express';
import { db, now } from './db.js';
import { verifyEconomy } from './economy.js';

export const leaderboardRouter = Router();

// Un état stocké ne peut plus mentir : s'il est économiquement
// impossible (édition locale synchronisée avant le renforcement),
// il reste en base mais n'apparaît plus au classement.
function isPlausible(state, accountAgeMs) {
  try {
    return verifyEconomy(state, { accountAgeMs }).ok;
  } catch {
    return false;
  }
}

leaderboardRouter.get('/leaderboard', (req, res) => {
  const t = now();
  // On récupère plus que 20 : les états impossibles sont filtrés ensuite.
  const rows = db
    .prepare(
      `SELECT u.pseudo, u.created_at, s.total_endocraft, s.achievements, s.renaissances, s.state, s.updated_at
       FROM states s JOIN users u ON u.id = s.user_id
       ORDER BY s.total_endocraft DESC
       LIMIT 60`
    )
    .all();
  const clean = rows.filter((r) => {
    let state = null;
    try {
      state = JSON.parse(r.state);
    } catch {
      return false;
    }
    return isPlausible(state, Math.max(0, t - r.created_at));
  });
  res.json({
    leaderboard: clean.slice(0, 20).map((r) => {
      let equippedTag = null;
      try {
        equippedTag = JSON.parse(r.state)?.equippedTag || null;
      } catch {
        /* état corrompu */
      }
      return {
        pseudo: r.pseudo,
        totalEndocraft: r.total_endocraft,
        achievements: r.achievements,
        renaissances: r.renaissances || 0,
        equippedTag,
        updatedAt: r.updated_at,
      };
    }),
  });
});

// Profil public d'un joueur (données non sensibles uniquement)
leaderboardRouter.get('/profile/:pseudo', (req, res) => {
  const user = db
    .prepare(
      'SELECT id, pseudo, created_at, updated_at FROM users WHERE pseudo = ? COLLATE NOCASE'
    )
    .get(req.params.pseudo);
  if (!user) return res.status(404).json({ error: 'Joueur introuvable' });

  const row = db
    .prepare(
      'SELECT state, total_endocraft, updated_at FROM states WHERE user_id = ?'
    )
    .get(user.id);

  const state = row ? JSON.parse(row.state) : {};
  const rank = row
    ? db
        .prepare('SELECT COUNT(*) + 1 AS r FROM states WHERE total_endocraft > ?')
        .get(row.total_endocraft).r
    : null;

  res.json({
    profile: {
      pseudo: user.pseudo,
      createdAt: user.created_at,
      updatedAt: row ? row.updated_at : user.updated_at,
      totalEndocraft: row ? row.total_endocraft : 0,
      clicks: state.clicks || 0,
      playMs: state.playMs || 0,
      generators: state.generators || {},
      staff: state.staff || [],
      achievements: state.achievements || [],
      renaissances: state.renaissances || 0,
      equippedTag: state.equippedTag || null,
      upgrades: state.upgrades || [],
      cosmetics: state.cosmetics || [],
      tags: state.tags || [],
      casesOpened: state.casesOpened || 0,
      caseLegendaryDrops: state.caseLegendaryDrops || 0,
      // Un état économiquement impossible n'a pas de place au classement.
      rank: row && isPlausible(state, Math.max(0, now() - user.created_at)) ? rank : null,
    },
  });
});
