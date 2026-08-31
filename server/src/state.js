import { Router } from 'express';
import { db, now } from './db.js';
import { requireAuth } from './middleware/auth.js';
import { verifyEconomy } from './economy.js';
import { recordStrike, applySanction } from './sanction.js';

export const stateRouter = Router();

// Tolérance anti-triche : on autorise 2x le gain théorique idle
// (marge pour clics actifs + achat d'upgrades en cours de session).
const RATE_TOLERANCE = 2;

// Fenêtre post-login pendant laquelle une « migration » (fusion d'une
// progression locale en avance sur le cloud) est acceptée.
const MIGRATION_WINDOW_MS = 15 * 60_000;
// Un invité ne peut pas avoir farmé plus de 7 jours hors ligne : borne
// la progression migrable à ce que sa production déclarée permet.
const MAX_MIGRATION_LOOKBACK_MS = 7 * 24 * 3600_000;

// Le taux déclaré par le client ne peut pas dépasser 8x le plafond déjà
// connu (frénésie ×7 + marge d'achat). Sinon, une seule synchro trichée
// suffirait à caler un plafond délirant pour toujours.
function cappedRate(baselineRate, declaredRate) {
  return Math.min(declaredRate, baselineRate * 8 + 50_000);
}

function readState(userId) {
  return db.prepare('SELECT * FROM states WHERE user_id = ?').get(userId);
}

stateRouter.get('/state', requireAuth, (req, res) => {
  const row = readState(req.user.id);
  if (!row) return res.json({ state: null });
  res.json({ state: JSON.parse(row.state), updatedAt: row.updated_at });
});

stateRouter.put('/state', requireAuth, (req, res) => {
  const { state, productionRate, migration } = req.body || {};
  if (!state || typeof state !== 'object') {
    return res.status(400).json({ error: 'État invalide' });
  }
  const total = Math.max(0, Number(state.totalEndocraft) || 0);
  const achievements = Array.isArray(state.achievements)
    ? state.achievements.length
    : 0;
  const renaissances = Math.max(0, Math.floor(Number(state.renaissances) || 0));
  const rate = Math.max(0, Number(productionRate) || 0);
  const clientRev = Math.floor(Number(state.rev) || 0); // 0 pour vieux clients
  const t = now();

  const row = readState(req.user.id);

  // L'état a été modifié par un administrateur depuis la dernière synchro :
  // on renvoie la version autoritaire, le client doit l'appliquer.
  if (row && row.rev > clientRev) {
    return res.status(409).json({
      error: 'État modifié par un administrateur',
      state: JSON.parse(row.state),
      rev: row.rev,
    });
  }

  const user = db
    .prepare('SELECT last_login_at, created_at FROM users WHERE id = ?')
    .get(req.user.id);
  const accountAgeMs = user ? Math.max(0, t - user.created_at) : null;

  // Invariantes économiques : l'état poussé doit être payable (on ne
  // possède que ce qu'on a pu s'offrir) et produisible (les gains
  // tiennent dans le temps de jeu réel). Recalculé depuis les tables
  // du jeu — un état forgé en local, lui, ne tient jamais.
  let safeRate = rate;
  if (!row || !row.anti_cheat_disabled) {
    const audit = verifyEconomy(state, { accountAgeMs, declaredRate: rate });
    if (!audit.ok) {
      // Sauvegarde impossible : avertissement. Deux dans l'heure =
      // sanction automatique (progression effacée + IP bannie 24 h).
      const strike = recordStrike(req.user.id, t);
      const pseudo = db
        .prepare('SELECT pseudo FROM users WHERE id = ?')
        .get(req.user.id)?.pseudo;
      console.warn(
        `[anti-triche] ${pseudo} (#${req.user.id}, IP ${req.ip}) : ${audit.reason}` +
          ` — envoyé total=${total.toExponential(2)} à-vie=${(Math.max(0, Number(state.lifetimeEndocraft) || 0)).toExponential(2)}` +
          `, stocké total=${row ? row.total_endocraft : 0} à-vie=${row ? row.lifetime_endocraft : 0}, taux=${rate.toExponential(2)}` +
          ` (avertissement ${strike}/2)`
      );
      if (strike >= 2) {
        applySanction({ userId: req.user.id, ip: req.ip, reason: audit.reason });
        console.warn(
          `[anti-triche] ⚖️  ${pseudo} (#${req.user.id}) : progression remise à zéro, IP ${req.ip} bannie 24 h`
        );
      }
      return res.status(422).json({
        error: 'Progression implausible, sauvegarde refusée',
      });
    }
    // Le taux déclaré ne peut pas élever le plafond au-delà de ce que
    // l'état peut réellement produire.
    safeRate = Math.min(rate, audit.maxRate);
  }

  if (row) {
    // Migration : juste après un login, l'appareil peut pousser une
    // progression locale en avance (farm en invité puis connexion).
    const isMigration =
      migration === true &&
      user &&
      t - user.last_login_at < MIGRATION_WINDOW_MS;

    if (!row.anti_cheat_disabled) {
      // Anti-triche « permissif » : ne doit JAMAIS bloquer un joueur honnête.
      // Ces fenêtres ne comptent PAS d'avertissement : un très gros achat
      // peut dépasser le plafond d'un intervalle (le taux monte d'un coup)
      // et se débloque seul à la synchro suivante. Seules les impossibilités
      // structurelles (verifyEconomy ci-dessus) sont sanctionnées.
      // - le taux déclaré couvre la production (y compris juste après l'achat
      //   de gros générateurs, qui fait sauter le gain légitime)
      // - + 35 % de la banque par intervalle (pluie de pommes complète,
      //   pomme chanceuse, frénésie de clics, cadeaux admin)
      // - en migration, le temps d'absence réel est pris en compte (borné
      //   à 7 jours) : on ne valide plus à l'aveugle.
      const elapsed = Math.max(0, (t - row.baseline_at) / 1000);
      const lookback = isMigration
        ? Math.min(elapsed, MAX_MIGRATION_LOOKBACK_MS / 1000)
        : elapsed;
      const effectiveRate = Math.max(
        row.baseline_rate,
        cappedRate(row.baseline_rate, safeRate)
      );
      const allowance = Math.max(5000, row.total_endocraft * 0.35);
      const maxGain = effectiveRate * lookback * RATE_TOLERANCE + allowance;
      if (total > row.total_endocraft + maxGain) {
        return res.status(422).json({
          error: 'Progression implausible, sauvegarde refusée',
        });
      }
      // Même fenêtre pour le total à vie (colonne dédiée, jamais remise à
      // zéro par une Renaissance). Sans ça, un état forgé gonflerait sa
      // progression « historique » pour faire passer l'inventaire.
      const lifetime = Math.max(0, Number(state.lifetimeEndocraft) || 0);
      if (lifetime > row.lifetime_endocraft + maxGain) {
        return res.status(422).json({
          error: 'Progression implausible, sauvegarde refusée',
        });
      }
    }
    // Le plafond suit la production déclarée à la hausse, mais redescend
    // d'un facteur 2 à chaque synchro sinon : il ne peut plus être gonflé
    // une fois pour toutes par une fausse déclaration.
    db.prepare(
      `UPDATE states SET state = ?, total_endocraft = ?, lifetime_endocraft = ?, achievements = ?, renaissances = ?,
       baseline_at = ?, baseline_rate = MAX(MIN(?, baseline_rate * 8 + 50000), baseline_rate * 0.5), updated_at = ?
       WHERE user_id = ?`
    ).run(
      JSON.stringify({ ...state, rev: row.rev }),
      total,
      Math.max(0, Number(state.lifetimeEndocraft) || 0),
      achievements,
      renaissances,
      t,
      safeRate,
      t,
      req.user.id
    );
  } else {
    // Première sauvegarde (ex: migration d'une session invité) :
    // bornée par ce que la production déclarée peut produire en 7 jours.
    const maxFirst =
      safeRate * (MAX_MIGRATION_LOOKBACK_MS / 1000) * RATE_TOLERANCE + 1e9;
    if (total > maxFirst) {
      return res.status(422).json({
        error: 'Progression implausible, sauvegarde refusée',
      });
    }
    db.prepare(
      `INSERT INTO states (user_id, state, total_endocraft, lifetime_endocraft, achievements,
       renaissances, baseline_at, baseline_rate, rev, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
    ).run(req.user.id, JSON.stringify({ ...state, rev: 0 }), total, Math.max(0, Number(state.lifetimeEndocraft) || 0), achievements, renaissances, t, safeRate, t);
  }

  db.prepare('UPDATE users SET updated_at = ? WHERE id = ?').run(t, req.user.id);
  res.json({ ok: true });
});
