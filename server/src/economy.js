// ============================================================
// Anti-triche : invariantes économiques
// ============================================================
// Un client ne peut jamais être trusted : le localStorage et le store
// sont modifiables à volonté (panneau de triche injecté, devtools…).
// La seule barrière fiable, c'est le serveur : il recalcule ce que
// l'état poussé PEUT valoir au maximum, avec les mêmes tables de prix
// que le jeu, et refuse tout ce qui est économiquement impossible.
//
// Les formules sont le miroir exact de client/src/game/store.js
// (getStaffMults, getProduction, getClickPower, getTotalRate) —
// les tables viennent directement du fichier de constantes du jeu,
// donc impossible qu'elles divergent lors d'un rééquilibrage.

import {
  GENERATORS,
  UPGRADES,
  UPGRADE_BY_ID,
  STAFF,
  STAFF_BY_ID,
  COIN_SKIN_BY_ID,
  ACHIEVEMENTS,
  COST_FACTOR,
  CLICK_PRODUCTION_SHARE,
  getRenaissanceMult,
  getRenaissanceThreshold,
} from '../../client/src/game/constants.js';

// Marges : toujours généreuses pour un joueur honnête, mortelles pour
// un état forgé. Un joueur parfait 24/7 qui attrape toutes les pommes
// (frénésies ×7, pluies, cristaux, chanceuses) tourne autour de ×4-5
// sa production de base : on laisse ×6.
const EARN_FACTOR = 6;
// Plafond physique de clics/s (manuel ~10-15 + auto-clicker 8/s).
const CLICK_RATE_CAP = 30;
// Le taux déclaré ne peut pas dépasser la capacité réelle de l'état
// (frénésie ×7 + marge d'achat en cours de session).
const RATE_FACTOR = 8;
// Remises ZoxXio non modélisées + arrondis sur les grosses sommes.
const INV_SLACK = 1.2;
// Cumul des seuils de Renaissance vs total à vie.
const REN_SLACK = 1.2;
// Démarrage, quêtes, cadeaux admin : une petite marge fixe.
const BASE_ALLOWANCE = 2e9;
const INV_ALLOWANCE = 1e7;
// Un compte peut migrer la progression d'une session invité jouée
// avant sa création : on lui accorde 7 jours de farm hors ligne.
const GUEST_SLACK_MS = 7 * 24 * 3600_000;

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

// ---------- Miroirs des formules du client ----------

function staffMults(state) {
  let production = 1;
  let click = 1;
  let autoClickPerSec = 0;
  const staff = Array.isArray(state.staff) ? state.staff : [];
  const upgrades = Array.isArray(state.upgrades) ? state.upgrades : [];
  for (const m of STAFF) {
    if (!staff.includes(m.id)) continue;
    if (m.effects.productionMult) production *= m.effects.productionMult;
    if (m.effects.clickMult) click *= m.effects.clickMult;
    if (m.effects.autoClickPerSec) autoClickPerSec += m.effects.autoClickPerSec;
  }
  for (const u of UPGRADES) {
    if (!upgrades.includes(u.id)) continue;
    if (u.kind === 'autoClick' && u.autoClickBonus) {
      autoClickPerSec += u.autoClickBonus;
    }
    if (u.kind === 'staff' || u.kind === 'case') {
      if (u.productionMult) production *= u.productionMult;
      if (u.clickMult) click *= u.clickMult;
      if (u.autoClickPerSec) autoClickPerSec += u.autoClickPerSec;
    }
  }
  return { production, click, autoClickPerSec };
}

export function theoreticalProduction(state) {
  const upgrades = Array.isArray(state.upgrades) ? state.upgrades : [];
  const genMult = {};
  let globalMult = 1;
  for (const u of UPGRADES) {
    if (!upgrades.includes(u.id)) continue;
    if (u.kind === 'gen') genMult[u.genId] = (genMult[u.genId] || 1) * u.mult;
    if (u.kind === 'global') globalMult *= u.mult;
  }
  const generators = state.generators || {};
  let rate = 0;
  for (const g of GENERATORS) {
    rate += Math.floor(num(generators[g.id])) * g.baseRate * (genMult[g.id] || 1);
  }
  const renaissanceMult = getRenaissanceMult(Math.floor(num(state.renaissances)));
  const crystalMult = state.equippedCoin === 'endocrystal' ? 1.5 : 1;
  return rate * globalMult * renaissanceMult * crystalMult * staffMults(state).production;
}

function theoreticalClickPower(state) {
  const upgrades = Array.isArray(state.upgrades) ? state.upgrades : [];
  let mult = 1;
  for (const u of UPGRADES) {
    if (u.kind === 'click' && upgrades.includes(u.id)) mult *= u.mult;
  }
  return (
    mult * staffMults(state).click +
    theoreticalProduction(state) * CLICK_PRODUCTION_SHARE
  );
}

// ---------- Invariantes ----------

// EndoCraft dépensé pour acquérir l'inventaire déclaré, aux prix du
// catalogue (sans les remises : léger surcoût ≤ 10 %, couvert par
// INV_SLACK). Un exemplaire non acheté ne peut pas exister.
export function inventorySpent(state) {
  let spent = 0;
  const generators = state.generators || {};
  for (const g of GENERATORS) {
    const owned = Math.floor(num(generators[g.id]));
    if (owned > 0) {
      // Somme des `owned` premiers achats (série géométrique en 1,15)
      spent += g.baseCost * (Math.pow(COST_FACTOR, owned) - 1) / (COST_FACTOR - 1);
    }
  }
  const upgrades = Array.isArray(state.upgrades) ? state.upgrades : [];
  for (const id of upgrades) spent += UPGRADE_BY_ID[id]?.cost || 0;
  const staff = Array.isArray(state.staff) ? state.staff : [];
  for (const id of staff) spent += STAFF_BY_ID[id]?.cost || 0;
  const cosmetics = Array.isArray(state.cosmetics) ? state.cosmetics : [];
  for (const id of cosmetics) spent += COIN_SKIN_BY_ID[id]?.cost || 0;
  return spent;
}

// Braises du Phénix reçues : n × 500 M à la renaissance n, cumulées.
function braisesTotal(renaissances) {
  const n = Math.floor(num(renaissances));
  return (n * (n + 1)) / 2 * 5e8;
}

// EndoCraft total qu'il faut avoir farmé pour enchaîner n renaissances
// (500 B, puis ×3 à chaque fois). Croît de façon explosive : aucune
// boucle de renaissances forgée ne peut passer.
function renaissancesFloor(renaissances) {
  let sum = 0;
  for (let k = 0; k < Math.floor(num(renaissances)); k++) {
    sum += getRenaissanceThreshold(k);
    if (!Number.isFinite(sum)) return Infinity;
  }
  return sum;
}

// Vérifie qu'un état est économiquement possible.
// ctx :
//   - accountAgeMs : âge réel du compte (server-only, non déclarable)
//   - declaredRate : taux de production poussé par le client
// Retour : { ok, reason?, maxRate } — maxRate sert à plafonner le
// baseline anti-triche même quand l'état est accepté.
export function verifyEconomy(state, ctx = {}) {
  const total = num(state.totalEndocraft);
  const lifetime = num(state.lifetimeEndocraft);
  const lastRen = num(state.lastRenaissanceLifetime);
  const bank = num(state.endocraft);
  const clicks = Math.floor(num(state.clicks));
  const playSec = num(state.playMs) / 1000;
  const renaissances = Math.floor(num(state.renaissances));

  // Fenêtre de temps pendant laquelle ces gains ont pu être produits :
  // au minimum l'âge réel du compte (+ 7 jours d'invité possible
  // avant inscription), au minimum le temps de jeu déclaré.
  const ageSec =
    ctx.accountAgeMs != null
      ? Math.max(0, ctx.accountAgeMs + GUEST_SLACK_MS) / 1000
      : playSec + GUEST_SLACK_MS / 1000;
  const windowSec = Math.max(playSec, ageSec);

  const production = theoreticalProduction(state);
  const clickPower = theoreticalClickPower(state);
  const totalRate = production + staffMults(state).autoClickPerSec * clickPower;
  const maxRate = totalRate * RATE_FACTOR + 1e6;

  const reject = (reason) => ({ ok: false, reason, maxRate });

  // 0. Champs numériques bornés — pas de NaN/Infinity déguisés.
  for (const v of [state.totalEndocraft, state.lifetimeEndocraft, state.endocraft, state.clicks, state.playMs, state.renaissances, state.lastRenaissanceLifetime]) {
    if (v != null && !Number.isFinite(Number(v))) return reject('valeurs');
  }
  for (const v of Object.values(state.generators || {})) {
    if (!Number.isFinite(Number(v))) return reject('valeurs');
  }

  // 1. Inventaire payé ≤ EndoCraft gagné à vie + braises reçues.
  //    « Max tout le jeu » avec un total à vie ridicule meurt ici.
  const earned = lifetime + braisesTotal(renaissances);
  if (inventorySpent(state) > earned * INV_SLACK + INV_ALLOWANCE) {
    return reject('inventaire');
  }

  // 2. Solde ≤ tout ce qui a jamais été gagné (on ne dépense pas
  //    plus qu'on ne possède).
  if (bank > earned * INV_SLACK + INV_ALLOWANCE) {
    return reject('solde');
  }

  // 3. Vitesse de gain : production + clics (boostés compris) sur la
  //    fenêtre de temps réelle. Tuerait un total de 1e67 en 3 jours.
  const earnCap =
    (totalRate + CLICK_RATE_CAP * clickPower) * windowSec * EARN_FACTOR +
    BASE_ALLOWANCE;
  if (total > earnCap) {
    return reject('gains');
  }
  // Le total à vie est découpé par les renaissances : ce qui a été
  // gagné depuis la dernière ne peut pas dépasser la même envelope.
  if (lifetime > lastRen + earnCap) {
    return reject('gains-à-vie');
  }

  // 4. Renaissance : les seuils cumulés doivent rentrer dans le total
  //    à vie, et l'ancre de la dernière renaissance reste cohérente.
  if (renaissancesFloor(renaissances) > lifetime * REN_SLACK + 1e9) {
    return reject('renaissances');
  }
  if (lastRen > lifetime + 1e9) {
    return reject('renaissances');
  }

  // 5. Taux déclaré ≤ capacité réelle de l'état (frénésie ×7 + marge).
  if (ctx.declaredRate != null && num(ctx.declaredRate) > maxRate) {
    return reject('taux');
  }

  // 6. Compteurs bornés par le temps réel et le catalogue.
  if (clicks > windowSec * CLICK_RATE_CAP + 1000) {
    return reject('clics');
  }
  if (renaissances > 1000 || (state.staff || []).length > STAFF.length) {
    return reject('compteurs');
  }
  if ((state.achievements || []).length > ACHIEVEMENTS.length) {
    return reject('compteurs');
  }

  return { ok: true, maxRate };
}
