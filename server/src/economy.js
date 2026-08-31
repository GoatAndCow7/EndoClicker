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
} from '../../client/src/game/constants.js';

// Marges : toujours généreuses pour un joueur honnête, mortelles pour
// un état forgé. Un joueur parfait 24/7 qui attrape toutes les pommes
// (frénésies ×7, pluies, cristaux, chanceuses) tourne autour de ×4-5
// sa production de base : on laisse ×6.
const EARN_FACTOR = 6;
// Plafond de clics/s : les autoclickers externes sont la base du genre —
// on couvre largement (150/s courant, jusqu'à ~200 pour les plus agressifs).
// L'in-game (Emmanuel2403) est crédité dans le taux de production et ne
// compte pas dans le compteur de clics.
export const CLICK_RATE_CAP = 200;
// Le taux déclaré ne peut pas dépasser la capacité réelle de l'état
// (frénésie ×7 + marge d'achat en cours de session).
const RATE_FACTOR = 8;
// Remises ZoxXio non modélisées + arrondis sur les grosses sommes.
const INV_SLACK = 1.2;
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

// Puissance de clic théorique de l'état — sert à budgéter les gains des
// autoclickers externes (la base du genre) dans la fenêtre anti-triche.
export function theoreticalClickPower(state) {
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

// EndoCraft nécessaire pour boucler n renaissances : dominé par le
// dernier seuil (500 B × 3^(n-1)). Les seuils croissent de façon
// explosive — on compare en logarithmes pour ne jamais déborder,
// même à des renaissances stratosphériques (atteignables honnêtement
// en fin de partie, où les cycles s'accélèrent).
const LN_REN_BASE = Math.log(5e11);
const LN_REN_GROWTH = Math.log(3);
function lnRenaissanceCost(renaissances) {
  return LN_REN_BASE + Math.max(0, renaissances - 1) * LN_REN_GROWTH;
}

// Succès contredits par leurs compteurs. Les compteurs à vie sont
// monotones (jamais remis à zéro, même à la Renaissance) : un succès
// possédé dont le compteur est en dessous du requis est une liste
// forgée — genre « tous les succès » en 12 minutes de jeu.
const ACHIEVEMENT_FLOORS = {
  'click-1': [['clicks', 1]],
  'click-100': [['clicks', 100]],
  'click-1000': [['clicks', 1000]],
  'click-10000': [['clicks', 10000]],
  'time-1h': [['playMs', 3_600_000]],
  'time-10h': [['playMs', 36_000_000]],
  'total-100': [['lifetimeEndocraft', 100]],
  'total-10k': [['lifetimeEndocraft', 1e4]],
  'total-1m': [['lifetimeEndocraft', 1e6]],
  'total-100m': [['lifetimeEndocraft', 1e8]],
  'total-10b': [['lifetimeEndocraft', 1e10]],
  'total-1t': [['lifetimeEndocraft', 1e12]],
  'total-1qa': [['lifetimeEndocraft', 1e15]],
  'apple-1': [['applesClicked', 1]],
  'apple-10': [['applesClicked', 10]],
  'apple-25': [['applesClicked', 25]],
  'cristal-10': [['applesByType.cristal', 10]],
  'maudite-10': [['applesByType.maudite', 10]],
  'degustateur': [
    ['applesByType.doree', 1], ['applesByType.orage', 1],
    ['applesByType.ombre', 1], ['applesByType.cristal', 1],
    ['applesByType.maudite', 1],
  ],
  'boucherie-50': [['shadowMinisCaught', 50]],
  'rain-1': [['applesRained', 1]],
  'rain-20': [['applesRained', 20]],
  'quest-1': [['questsClaimed', 1]],
  'quest-50': [['questsClaimed', 50]],
  'case-1': [['casesOpened', 1]],
  'case-25': [['casesOpened', 25]],
  'case-legend': [['caseLegendaryDrops', 1]],
  'curieux': [['titleClicks', 25]],
  'renaissance-1': [['renaissances', 1]],
  'renaissance-5': [['renaissances', 5]],
  'renaissance-10': [['renaissances', 10]],
  'cosmetic-1': [['cosmeticsCount', 1]],
  'cosmetic-all': [['cosmeticsCount', 3]],
};

function statValue(state, key) {
  if (key === 'cosmeticsCount') {
    return (Array.isArray(state.cosmetics) ? state.cosmetics : [])
      .filter((c) => c !== 'default').length;
  }
  if (key.startsWith('applesByType.')) {
    return num((state.applesByType || {})[key.slice(13)]);
  }
  return num(state[key]);
}

function contradictedAchievements(state) {
  const owned = Array.isArray(state.achievements) ? state.achievements : [];
  let contradicted = 0;
  for (const id of owned) {
    const floors = ACHIEVEMENT_FLOORS[id];
    if (floors && floors.some(([key, min]) => statValue(state, key) < min)) {
      contradicted++;
    }
  }
  return contradicted;
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

  // 3. Identité cycle / à vie : chaque gain crédite le total du cycle ET
  //    le total à vie, la Renaissance remet le cycle à zéro et fige
  //    l'ancre. Le client garantit donc TOUJOURS
  //    total == lifetime − lastRenaissanceLifetime, à l'arrondi près.
  //    Un total à vie de 1e308 avec un cycle à 1e67 est forgé, par
  //    construction.
  const cycleSlack = Math.max(1e9, total * 1e-3);
  if (Math.abs(total - (lifetime - lastRen)) > cycleSlack) {
    return reject('cycle');
  }

  // 4. Vitesse de gain : production + clics (boostés compris) sur la
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

  // 4. Renaissance : le coût des seuils (comparé en log) doit tenir
  //    dans le total à vie ET dans l'ancre de la dernière renaissance —
  //    sinon un « Plein rebirth » forgé passe en déclarant une ancre
  //    élevée. Tolérance ×2 : un honnête cumule ~1,5 × le dernier seuil.
  if (renaissances >= 1) {
    const lnCost = lnRenaissanceCost(renaissances);
    if (lnCost > Math.log(Math.max(lifetime, 1e9)) + Math.log(2)) {
      return reject('renaissances');
    }
    if (lnCost > Math.log(Math.max(lastRen, 1e9)) + Math.log(2)) {
      return reject('renaissances');
    }
  }
  if (lastRen > lifetime + 1e9) {
    return reject('renaissances');
  }

  // 5. Taux déclaré ≤ capacité réelle de l'état (frénésie ×7 + marge).
  if (ctx.declaredRate != null && num(ctx.declaredRate) > maxRate) {
    return reject('taux');
  }

  // 6. Succès : posséder un succès dont le compteur à vie est sous le
  //    requis est impossible. Une liste débloquée d'un coup en cumule
  //    des dizaines de contradictions ; une seule est tolérée (marge
  //    pour un futur rééquilibrage d'un seuil).
  if (contradictedAchievements(state) >= 2) {
    return reject('succès');
  }

  // 7. Compteurs bornés par le temps réel et le catalogue. Les clics
  //    n'existent que pendant le temps de jeu réellement joué (pas de
  //    clic hors-ligne), d'où playSec et non la fenêtre à 7 jours.
  if (clicks > playSec * CLICK_RATE_CAP + 1000) {
    return reject('clics');
  }
  if (renaissances > 10_000 || (state.staff || []).length > STAFF.length) {
    return reject('compteurs');
  }
  if ((state.achievements || []).length > ACHIEVEMENTS.length) {
    return reject('compteurs');
  }

  return { ok: true, maxRate };
}
