import { Router } from 'express';
import { db } from './db.js';

export const leaderboardRouter = Router();

leaderboardRouter.get('/leaderboard', (req, res) => {
  const rows = db
    .prepare(
      `SELECT u.pseudo, s.total_endocraft, s.achievements, s.renaissances, s.state, s.updated_at
       FROM states s JOIN users u ON u.id = s.user_id
       ORDER BY s.total_endocraft DESC
       LIMIT 20`
    )
    .all();
  res.json({
    leaderboard: rows.map((r) => {
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

  const rank = row
    ? db
        .prepare('SELECT COUNT(*) + 1 AS r FROM states WHERE total_endocraft > ?')
        .get(row.total_endocraft).r
    : null;

  const state = row ? JSON.parse(row.state) : {};
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
      rank,
    },
  });
});
