// ============================================================
// Sanctions anti-triche : avertissements, remise à zéro, ban IP
// ============================================================
// Une sauvegarde économiquement impossible (voir economy.js) vaut un
// avertissement. Deux dans l'heure = sanction : la progression du
// compte est effacée et son IP est bloquée 24 h. La fenêtre d'une
// heure protège un accident isolé ; un tricheur, lui, retente en
// boucle — il est puni en quelques minutes.

import { db, now } from './db.js';
import { sendToUser } from './events.js';

const STRIKE_WINDOW_MS = 3600_000;
const BAN_MS = 24 * 3600_000;

// ::ffff:1.2.3.4 → 1.2.3.4 (IPv4 embarquée dans IPv6, selon le proxy)
export function normalizeIp(ip) {
  return String(ip || '').replace(/^::ffff:/, '').toLowerCase();
}

// Enregistre un avertissement et renvoie son rang (1, 2, 3…).
// Hors fenêtre d'une heure, le compteur repart de un.
export function recordStrike(userId, t = now()) {
  db.prepare(
    `INSERT INTO anti_cheat (user_id, strikes, last_strike_at) VALUES (?, 1, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       strikes = CASE WHEN last_strike_at > ? THEN strikes + 1 ELSE 1 END,
       last_strike_at = ?
     WHERE user_id = ?`
  ).run(userId, t, t - STRIKE_WINDOW_MS, t, userId);
  return db
    .prepare('SELECT strikes FROM anti_cheat WHERE user_id = ?')
    .get(userId).strikes;
}

export function getBan(ip) {
  if (!ip) return null;
  return db
    .prepare('SELECT * FROM ip_bans WHERE ip = ? AND until > ?')
    .get(ip, now());
}

export function banIp(ip, userId, reason, t = now()) {
  db.prepare(
    `INSERT INTO ip_bans (ip, user_id, reason, created_at, until)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(ip) DO UPDATE SET until = MAX(until, excluded.until)`
  ).run(ip, userId || null, reason || '', t, t + BAN_MS);
}

export function liftBan(ip) {
  db.prepare('DELETE FROM ip_bans WHERE ip = ?').run(ip);
}

// Progression remise à zéro (compte conservé) : même forme que la
// réinitialisation admin, avec un bump de révision pour que l'appareil
// du joueur applique la version autoritaire à sa prochaine synchro —
// même si son localStorage local affiche des milliards.
function resetProgression(userId, t) {
  const row = db
    .prepare('SELECT rev FROM states WHERE user_id = ?')
    .get(userId);
  const rev = (row ? row.rev : 0) + 1;
  const zero = {
    endocraft: 0,
    totalEndocraft: 0,
    lifetimeEndocraft: 0,
    lastRenaissanceLifetime: 0,
    clicks: 0,
    generators: {},
    upgrades: [],
    staff: [],
    cosmetics: [],
    equippedCoin: 'default',
    tags: [],
    equippedTag: null,
    achievements: [],
    applesClicked: 0,
    applesByType: {},
    shadowMinisCaught: 0,
    applesRained: 0,
    rainFrenzyCatches: 0,
    maxOfflineGain: 0,
    titleClicks: 0,
    frenziesStarted: 0,
    quests: null,
    questsClaimed: 0,
    casesOpened: 0,
    caseLegendaryDrops: 0,
    renaissances: 0,
    playMs: 0,
    rev,
  };
  const json = JSON.stringify(zero);
  if (row) {
    db.prepare(
      `UPDATE states SET state = ?, total_endocraft = 0, achievements = 0,
       renaissances = 0, baseline_at = ?, baseline_rate = 0, rev = ?, updated_at = ?
       WHERE user_id = ?`
    ).run(json, t, rev, t, userId);
  } else {
    db.prepare(
      `INSERT INTO states (user_id, state, total_endocraft, achievements,
       renaissances, baseline_at, baseline_rate, rev, updated_at)
       VALUES (?, ?, 0, 0, 0, ?, 0, ?, ?)`
    ).run(userId, json, t, rev, t);
  }
  db.prepare('UPDATE users SET updated_at = ? WHERE id = ?').run(t, userId);
  db.prepare('DELETE FROM anti_cheat WHERE user_id = ?').run(userId);
  return rev;
}

// La sanction complète : reset + ban IP + info au joueur s'il est en ligne.
export function applySanction({ userId, ip, reason }) {
  const t = now();
  const rev = resetProgression(userId, t);
  if (ip) banIp(normalizeIp(ip), userId, reason, t);
  // S'il est connecté (SSE), la remise à zéro s'applique aussitôt
  sendToUser(userId, 'stateUpdate', { rev });
  return { rev };
}
