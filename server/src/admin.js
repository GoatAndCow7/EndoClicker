import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db, now, ADMIN_PSEUDO } from './db.js';
import { requireAuth, isAdmin } from './middleware/auth.js';
import { sendToUser, isOnline } from './events.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, isAdmin);

const PSEUDO_RE = /^[a-zA-Z0-9_-]{3,16}$/;

// --- Assainissement de l'état fourni par l'admin ---
function sanitizeState(input) {
  const num = (v, max = Number.MAX_SAFE_INTEGER) =>
    Math.min(max, Math.max(0, Number(v) || 0));
  const strArray = (v) =>
    Array.isArray(v)
      ? [...new Set(v.filter((x) => typeof x === 'string' && x.length < 100))]
      : [];

  const generators = {};
  if (input.generators && typeof input.generators === 'object') {
    for (const [k, v] of Object.entries(input.generators)) {
      if (typeof k === 'string' && k.length < 100) {
        generators[k] = Math.floor(num(v));
      }
    }
  }

  return {
    endocraft: num(input.endocraft),
    totalEndocraft: num(input.totalEndocraft),
    lifetimeEndocraft: num(input.lifetimeEndocraft),
    clicks: Math.floor(num(input.clicks)),
    generators,
    upgrades: strArray(input.upgrades),
    staff: strArray(input.staff),
    cosmetics: strArray(input.cosmetics),
    equippedCoin:
      typeof input.equippedCoin === 'string' && input.equippedCoin.length < 50
        ? input.equippedCoin
        : 'default',
    tags: strArray(input.tags),
    equippedTag:
      typeof input.equippedTag === 'string' && input.equippedTag.length < 50
        ? input.equippedTag
        : null,
    achievements: strArray(input.achievements),
    applesClicked: Math.floor(num(input.applesClicked)),
    applesByType:
      input.applesByType && typeof input.applesByType === 'object'
        ? input.applesByType
        : {},
    shadowMinisCaught: Math.floor(num(input.shadowMinisCaught)),
    rainFrenzyCatches: Math.floor(num(input.rainFrenzyCatches)),
    maxOfflineGain: num(input.maxOfflineGain),
    titleClicks: Math.floor(num(input.titleClicks)),
    frenziesStarted: Math.floor(num(input.frenziesStarted)),
    questsClaimed: Math.floor(num(input.questsClaimed)),
    casesOpened: Math.floor(num(input.casesOpened)),
    caseLegendaryDrops: Math.floor(num(input.caseLegendaryDrops)),
    quests: input.quests && typeof input.quests === 'object' ? input.quests : null,
    renaissances: Math.floor(num(input.renaissances)),
    lastRenaissanceLifetime: num(input.lastRenaissanceLifetime),
    playMs: Math.floor(num(input.playMs)),
    // rev sera écrasé par le serveur
  };
}

function getUserWithState(id) {
  const user = db
    .prepare('SELECT id, pseudo, created_at, updated_at FROM users WHERE id = ?')
    .get(id);
  if (!user) return null;
  const row = db
    .prepare(
      'SELECT state, total_endocraft, achievements, rev, anti_cheat_disabled, updated_at FROM states WHERE user_id = ?'
    )
    .get(id);
  return {
    ...user,
    totalEndocraft: row ? row.total_endocraft : 0,
    achievementsCount: row ? row.achievements : 0,
    rev: row ? row.rev : 0,
    antiCheatDisabled: row ? !!row.anti_cheat_disabled : false,
    online: isOnline(user.id),
    stateUpdatedAt: row ? row.updated_at : null,
    state: row ? JSON.parse(row.state) : null,
  };
}

function saveAdminState(userId, state, productionRate = 0) {
  const t = now();
  const row = db.prepare('SELECT rev, baseline_rate FROM states WHERE user_id = ?').get(userId);
  const newRev = (row ? row.rev : 0) + 1;
  const stored = { ...state, rev: newRev };

  if (row) {
    db.prepare(
      `UPDATE states SET state = ?, total_endocraft = ?, achievements = ?, renaissances = ?,
       baseline_at = ?, baseline_rate = MAX(baseline_rate, ?), rev = ?, updated_at = ?
       WHERE user_id = ?`
    ).run(
      JSON.stringify(stored),
      state.totalEndocraft,
      state.achievements.length,
      Math.max(0, Math.floor(Number(state.renaissances) || 0)),
      t, // reset anti-triche : l'état admin devient la nouvelle référence
      Math.max(0, Number(productionRate) || 0), // taux recalculé pour la suite
      newRev,
      t,
      userId
    );
  } else {
    db.prepare(
      `INSERT INTO states (user_id, state, total_endocraft, achievements,
       renaissances, baseline_at, baseline_rate, rev, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      userId,
      JSON.stringify(stored),
      state.totalEndocraft,
      state.achievements.length,
      Math.max(0, Math.floor(Number(state.renaissances) || 0)),
      t,
      Math.max(0, Number(productionRate) || 0),
      newRev,
      t
    );
  }
  db.prepare('UPDATE users SET updated_at = ? WHERE id = ?').run(t, userId);
  // Pousse l'événement : le joueur en ligne applique la modification
  // immédiatement au lieu d'attendre sa prochaine synchro (409)
  sendToUser(userId, 'stateUpdate', { rev: newRev });
  return newRev;
}

// --- Aperçu global ---
adminRouter.get('/stats', (req, res) => {
  const totals = db
    .prepare(
      `SELECT COUNT(*) AS users, COALESCE(SUM(total_endocraft), 0) AS economy FROM states`
    )
    .get();
  const top = db
    .prepare(
      `SELECT u.pseudo, s.total_endocraft FROM states s
       JOIN users u ON u.id = s.user_id
       ORDER BY s.total_endocraft DESC LIMIT 5`
    )
    .all();
  const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  res.json({
    users: userCount,
    playersWithProgress: totals.users,
    economy: totals.economy,
    top,
  });
});

// --- Liste (avec recherche) ---
adminRouter.get('/users', (req, res) => {
  const q = (req.query.q || '').toString().trim();
  const like = `%${q}%`;
  const rows = q
    ? db
        .prepare(
          `SELECT u.id, u.pseudo, u.created_at, u.updated_at,
                  COALESCE(s.total_endocraft, 0) AS total, COALESCE(s.achievements, 0) AS achievements
           FROM users u LEFT JOIN states s ON s.user_id = u.id
           WHERE u.pseudo LIKE ? COLLATE NOCASE
           ORDER BY total DESC LIMIT 100`
        )
        .all(like)
    : db
        .prepare(
          `SELECT u.id, u.pseudo, u.created_at, u.updated_at,
                  COALESCE(s.total_endocraft, 0) AS total, COALESCE(s.achievements, 0) AS achievements
           FROM users u LEFT JOIN states s ON s.user_id = u.id
           ORDER BY total DESC LIMIT 100`
        )
        .all();
  res.json({ users: rows });
});

// --- Détail ---
adminRouter.get('/users/:id', (req, res) => {
  const user = getUserWithState(req.params.id);
  if (!user) return res.status(404).json({ error: 'Joueur introuvable' });
  res.json({ user });
});

// --- Modifier la progression ---
adminRouter.put('/users/:id/state', (req, res) => {
  const user = getUserWithState(req.params.id);
  if (!user) return res.status(404).json({ error: 'Joueur introuvable' });

  const input = req.body && req.body.state ? req.body.state : req.body;
  if (!input || typeof input !== 'object') {
    return res.status(400).json({ error: 'État invalide' });
  }

  const state = sanitizeState(input);
  // Cohérence : le total récolté ne peut pas être inférieur au solde actuel
  state.totalEndocraft = Math.max(state.totalEndocraft, state.endocraft);

  const rate = req.body ? req.body.productionRate : 0;
  const rev = saveAdminState(user.id, state, rate);
  res.json({ ok: true, rev });
});

// --- Réinitialiser la progression (compte conservé) ---
adminRouter.post('/users/:id/reset', (req, res) => {
  const user = getUserWithState(req.params.id);
  if (!user) return res.status(404).json({ error: 'Joueur introuvable' });

  const state = sanitizeState({
    endocraft: 0,
    totalEndocraft: 0,
    clicks: 0,
    generators: {},
    upgrades: [],
    staff: [],
    achievements: [],
  });
  saveAdminState(user.id, state);
  res.json({ ok: true });
});

// --- Activer/désactiver l'anti-triche pour ce joueur ---
adminRouter.put('/users/:id/anticheat', (req, res) => {
  const disabled = !!(req.body && req.body.disabled);
  const user = db
    .prepare('SELECT id FROM users WHERE id = ?')
    .get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Joueur introuvable' });

  const t = now();
  const row = db
    .prepare('SELECT user_id FROM states WHERE user_id = ?')
    .get(user.id);
  if (row) {
    db.prepare(
      'UPDATE states SET anti_cheat_disabled = ?, updated_at = ? WHERE user_id = ?'
    ).run(disabled ? 1 : 0, t, user.id);
  } else {
    db.prepare(
      `INSERT INTO states (user_id, state, total_endocraft, achievements,
       baseline_at, baseline_rate, rev, anti_cheat_disabled, updated_at)
       VALUES (?, '{}', 0, 0, ?, 0, 0, ?, ?)`
    ).run(user.id, t, disabled ? 1 : 0, t);
  }
  res.json({ ok: true, antiCheatDisabled: disabled });
});

// --- Effets en direct (SSE) ---

// Offrir une frénésie (×7) d'une durée choisie, appliquée instantanément
adminRouter.post('/users/:id/frenzy', (req, res) => {
  const durationSec = Math.min(3600, Math.max(5, Number(req.body?.durationSec) || 30));
  const user = db
    .prepare('SELECT id, pseudo FROM users WHERE id = ?')
    .get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Joueur introuvable' });

  const delivered = sendToUser(user.id, 'frenzy', {
    mult: 7,
    durationMs: durationSec * 1000,
  });
  res.json({ ok: true, delivered, durationSec });
});

// Faire apparaître une pomme (type au choix) sur l'écran du joueur
adminRouter.post('/users/:id/spawn-apple', (req, res) => {
  const user = db
    .prepare('SELECT id, pseudo FROM users WHERE id = ?')
    .get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Joueur introuvable' });

  const VALID = ['doree', 'orage', 'ombre', 'cristal', 'maudite'];
  const type = VALID.includes(req.body?.type) ? req.body.type : null; // null = aléatoire
  const delivered = sendToUser(user.id, 'spawnApple', { type });
  res.json({ ok: true, delivered, type: type || 'aléatoire' });
});

// --- Changer le mot de passe ---
adminRouter.put('/users/:id/password', (req, res) => {
  const { password } = req.body || {};
  if (!password || password.length < 6) {
    return res
      .status(400)
      .json({ error: 'Mot de passe : 6 caractères minimum' });
  }
  const user = db
    .prepare('SELECT id FROM users WHERE id = ?')
    .get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Joueur introuvable' });

  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(
    bcrypt.hashSync(password, 10),
    now(),
    user.id
  );
  res.json({ ok: true });
});

// --- Renommer ---
adminRouter.put('/users/:id/pseudo', (req, res) => {
  const { pseudo } = req.body || {};
  if (!pseudo || !PSEUDO_RE.test(pseudo)) {
    return res.status(400).json({
      error: 'Pseudo : 3 à 16 caractères (lettres, chiffres, - ou _)',
    });
  }
  if (pseudo.toLowerCase() === ADMIN_PSEUDO) {
    return res
      .status(400)
      .json({ error: 'Ce pseudo est réservé à l’administration' });
  }
  const user = db
    .prepare('SELECT id, pseudo FROM users WHERE id = ?')
    .get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Joueur introuvable' });

  const existing = db
    .prepare('SELECT id FROM users WHERE pseudo = ? COLLATE NOCASE AND id != ?')
    .get(pseudo, user.id);
  if (existing) {
    return res.status(409).json({ error: 'Ce pseudo est déjà pris' });
  }

  db.prepare('UPDATE users SET pseudo = ?, updated_at = ? WHERE id = ?').run(
    pseudo,
    now(),
    user.id
  );
  res.json({ ok: true, pseudo });
});

// --- Supprimer le compte ---
adminRouter.delete('/users/:id', (req, res) => {
  const user = db
    .prepare('SELECT id, pseudo FROM users WHERE id = ?')
    .get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Joueur introuvable' });

  db.prepare('DELETE FROM states WHERE user_id = ?').run(user.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
  res.json({ ok: true, deleted: user.pseudo });
});
