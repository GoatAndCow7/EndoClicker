import { Router } from 'express';
import { db, now } from './db.js';
import { requireAuth } from './middleware/auth.js';

export const stateRouter = Router();

// Tolérance anti-triche : on autorise 2x le gain théorique idle
// (marge pour clics actifs + achat d'upgrades en cours de session).
const RATE_TOLERANCE = 2;

function readState(userId) {
  return db.prepare('SELECT * FROM states WHERE user_id = ?').get(userId);
}

stateRouter.get('/state', requireAuth, (req, res) => {
  const row = readState(req.user.id);
  if (!row) return res.json({ state: null });
  res.json({ state: JSON.parse(row.state), updatedAt: row.updated_at });
});

// Fenêtre post-login pendant laquelle une « migration » (fusion d'une
// progression locale en avance sur le cloud) est acceptée sans contrôle.
const MIGRATION_WINDOW_MS = 15 * 60_000;

stateRouter.put('/state', requireAuth, (req, res) => {
  const { state, productionRate, migration } = req.body || {};
  if (!state || typeof state !== 'object') {
    return res.status(400).json({ error: 'État invalide' });
  }
  const total = Number(state.totalEndocraft) || 0;
  const achievements = Array.isArray(state.achievements)
    ? state.achievements.length
    : 0;
  const renaissances = Math.max(0, Math.floor(Number(state.renaissances) || 0));
  const rate = Math.max(0, Number(productionRate) || 0);
  const clientRev = Math.floor(Number(state.rev) || 0); // 0 pour vieux clients
  const t = now();

  const row = readState(req.user.id);

  if (row) {
    // L'état a été modifié par un administrateur depuis la dernière synchro :
    // on renvoie la version autoritaire, le client doit l'appliquer.
    if (row.rev > clientRev) {
      return res.status(409).json({
        error: 'État modifié par un administrateur',
        state: JSON.parse(row.state),
        rev: row.rev,
      });
    }

    // Migration : juste après un login, l'appareil peut pousser une
    // progression locale en avance (farm en invité puis connexion).
    const user = db
      .prepare('SELECT last_login_at FROM users WHERE id = ?')
      .get(req.user.id);
    const isMigration =
      migration === true &&
      user &&
      t - user.last_login_at < MIGRATION_WINDOW_MS;

    if (!isMigration && !row.anti_cheat_disabled) {
      // Anti-triche « permissif » : ne doit JAMAIS bloquer un joueur honnête.
      // - le taux déclaré couvre la production (y compris juste après l'achat
      //   de gros générateurs, qui fait sauter le gain légitime)
      // - + 35 % de la banque par intervalle (pluie de pommes complète,
      //   pomme chanceuse, frénésie de clics, cadeaux admin)
      const elapsed = Math.max(0, (t - row.baseline_at) / 1000);
      const effectiveRate = Math.max(row.baseline_rate, rate);
      const allowance = Math.max(5000, row.total_endocraft * 0.35);
      const maxGain = effectiveRate * elapsed * RATE_TOLERANCE + allowance;
      if (total > row.total_endocraft + maxGain) {
        return res.status(422).json({
          error: 'Progression implausible, sauvegarde refusée',
        });
      }
    }
    db.prepare(
      `UPDATE states SET state = ?, total_endocraft = ?, achievements = ?, renaissances = ?,
       baseline_at = ?, baseline_rate = MAX(baseline_rate, ?), updated_at = ?
       WHERE user_id = ?`
    ).run(JSON.stringify({ ...state, rev: row.rev }), total, achievements, renaissances, t, rate, t, req.user.id);
  } else {
    // Première sauvegarde (ex: migration d'une session invité) :
    // acceptée telle quelle, elle sert de point de départ.
    db.prepare(
      `INSERT INTO states (user_id, state, total_endocraft, achievements,
       renaissances, baseline_at, baseline_rate, rev, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`
    ).run(req.user.id, JSON.stringify({ ...state, rev: 0 }), total, achievements, renaissances, t, rate, t);
  }

  db.prepare('UPDATE users SET updated_at = ? WHERE id = ?').run(t, req.user.id);
  res.json({ ok: true });
});
