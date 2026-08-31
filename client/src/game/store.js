import { create } from 'zustand';
import {
  GENERATORS,
  GENERATOR_BY_ID,
  UPGRADES,
  UPGRADE_BY_ID,
  ACHIEVEMENTS,
  STAFF,
  STAFF_BY_ID,
  COIN_SKIN_BY_ID,
  RENAISSANCE,
  getRenaissanceThreshold,
  getRenaissanceMult,
  COST_FACTOR,
  CLICK_PRODUCTION_SHARE,
  APPLE,
  APPLE_REWARDS,
  APPLE_TYPES,
  APPLE_RAIN,
  SHADOW_STORM,
  CRYSTAL_PRODUCTION_SECONDS,
  CURSED_DELAY_MS,
  CURSED_BANK_PERCENT,
  CURSED_CAP_SECONDS,
  DAILY_QUESTS,
  CASES,
  CASE_DUPLICATE_REFUND,
} from './constants';
import { api, getToken, decodePseudo } from '../api/client';
import { playPurchase, playAchievement, playApple } from './audio';
import { fmt } from './format';

const SAVE_KEY = 'endoclicker_save';
const SAVE_VERSION = 2; // V2 = reset mondial : les sauvegardes v1 sont ignorées
// Tirage de caisse payé mais pas encore réclamé (filet anti-crash)
const PENDING_CASE_KEY = 'endoclicker_pending_case';
const AUTOSAVE_MS = 5_000;
const CLOUD_SYNC_MS = 60_000;
const OFFLINE_CAP_MS = 10 * 3600_000; // 10 h (étendu par Fl0ryoz & co, 18 h max)
const OFFLINE_EFFICIENCY = 0.6; // 60 % de base (jusqu'à 100 % avec le staff)

// ---------- Calculs ----------

export function generatorCost(gen, owned, discountMult = 1) {
  return Math.ceil(gen.baseCost * Math.pow(COST_FACTOR, owned) * discountMult);
}

export function generatorsCost(gen, owned, amount, discountMult = 1) {
  // Somme des `amount` prochains achats (série géométrique)
  const first = gen.baseCost * Math.pow(COST_FACTOR, owned);
  return Math.ceil(
    (first * (Math.pow(COST_FACTOR, amount) - 1) / (COST_FACTOR - 1)) * discountMult
  );
}

// Bonus d'équipe (staff) ET d'améliorations équipées : production, clics,
// pommes, coûts, hors-ligne, auto-clicker.
export function getStaffMults(state) {
  let production = 1;
  let click = 1;
  let appleFreq = 1;
  let genCost = 1;
  let offlineEffBonus = 0;
  let offlineCapBonusMs = 0;
  let autoClickPerSec = 0;
  for (const m of STAFF) {
    if (state.staff && state.staff.includes(m.id)) {
      if (m.effects.productionMult) production *= m.effects.productionMult;
      if (m.effects.clickMult) click *= m.effects.clickMult;
      if (m.effects.appleFreqMult) appleFreq *= m.effects.appleFreqMult;
      if (m.effects.genCostMult) genCost *= m.effects.genCostMult;
      if (m.effects.offlineEffBonus) offlineEffBonus += m.effects.offlineEffBonus;
      if (m.effects.offlineCapBonusMs) offlineCapBonusMs += m.effects.offlineCapBonusMs;
      if (m.effects.autoClickPerSec) autoClickPerSec += m.effects.autoClickPerSec;
    }
  }
  for (const u of UPGRADES) {
    if (!state.upgrades || !state.upgrades.includes(u.id)) continue;
    if (u.kind === 'autoClick' && u.autoClickBonus) autoClickPerSec += u.autoClickBonus;
    if (u.kind === 'offline') {
      if (u.offlineEffBonus) offlineEffBonus += u.offlineEffBonus;
      if (u.offlineCapBonusMs) offlineCapBonusMs += u.offlineCapBonusMs;
    }
    // Améliorations d'équipe (têtes des membres) et exclusives de cases
    if (u.kind === 'staff' || u.kind === 'case') {
      if (u.productionMult) production *= u.productionMult;
      if (u.clickMult) click *= u.clickMult;
      if (u.appleFreqMult) appleFreq *= u.appleFreqMult;
      if (u.genCostMult) genCost *= u.genCostMult;
      if (u.offlineEffBonus) offlineEffBonus += u.offlineEffBonus;
      if (u.offlineCapBonusMs) offlineCapBonusMs += u.offlineCapBonusMs;
      if (u.autoClickPerSec) autoClickPerSec += u.autoClickPerSec;
    }
  }
  return { production, click, appleFreq, genCost, offlineEffBonus, offlineCapBonusMs, autoClickPerSec };
}

export function getProduction(state) {
  const genMult = {};
  let globalMult = 1;
  for (const u of UPGRADES) {
    if (!state.upgrades || !state.upgrades.includes(u.id)) continue;
    if (u.kind === 'gen') genMult[u.genId] = (genMult[u.genId] || 1) * u.mult;
    if (u.kind === 'global') globalMult *= u.mult;
  }
  let rate = 0;
  for (const g of GENERATORS) {
    rate += (state.generators[g.id] || 0) * g.baseRate * (genMult[g.id] || 1);
  }
  // Bonus permanent des Renaissances B(n) = (1 + 0,25n) × 1,15^n, et
  // Résonance de l'EndoCrystal (×1,5 si équipé)
  const renaissanceMult = getRenaissanceMult(state.renaissances || 0);
  const crystalMult =
    equippedPerk(state)?.id === 'productionBoost' ? 1.5 : 1;
  return rate * globalMult * renaissanceMult * crystalMult * getStaffMults(state).production;
}

// Taux total affiché et déclaré au serveur : production passive +
// auto-clicker d'Emmanuel2403 (clics/s × puissance, hors boost).
export function getTotalRate(state) {
  const auto = getStaffMults(state).autoClickPerSec;
  return getProduction(state) + (auto > 0 ? auto * getClickPower(state) : 0);
}

// Pouvoir unique du skin de pièce équipé (cosmétiques)
export function equippedPerk(state) {
  const skin = COIN_SKIN_BY_ID[state.equippedCoin || 'default'];
  return skin?.perk?.id ? skin.perk : null;
}

export function getClickPower(state) {
  let mult = 1;
  for (const u of UPGRADES) {
    if (u.kind === 'click' && state.upgrades.includes(u.id)) mult *= u.mult;
  }
  // Les pioches profitent des multiplicateurs staff/cases ; la part issue
  // de la production en est EXCLUE — sinon le clic devient la stratégie
  // dominante à 10 clics/s + frénésie ×7.
  return (
    mult * getStaffMults(state).click +
    getProduction(state) * CLICK_PRODUCTION_SHARE
  );
}

function computeStats(state) {
  const totalGenerators = Object.values(state.generators).reduce(
    (a, b) => a + b,
    0
  );
  return {
    clicks: state.clicks,
    totalEndocraft: state.totalEndocraft,
    totalGenerators,
    distinctGenerators: Object.keys(state.generators).length,
    dragons: state.generators.dragon || 0,
    balises: state.generators.balise || 0,
    upgradesOwned: state.upgrades.length,
    staffIds: state.staff || [],
    cosmeticsCount: (state.cosmetics || []).filter((c) => c !== 'default').length,
    upgradeIds: state.upgrades || [],
    maxGenCount: Math.max(0, ...Object.values(state.generators || {})),
    rainFrenzyCatches: state.rainFrenzyCatches || 0,
    maxOfflineGain: state.maxOfflineGain || 0,
    titleClicks: state.titleClicks || 0,
    questsClaimed: state.questsClaimed || 0,
    casesOpened: state.casesOpened || 0,
    caseLegendaryDrops: state.caseLegendaryDrops || 0,
    applesByType: state.applesByType || {},
    shadowMinisCaught: state.shadowMinisCaught || 0,
    applesClicked: state.applesClicked,
    applesRained: state.applesRained,
    renaissances: state.renaissances,
    bank: state.endocraft,
    playMs: state.playMs,
    clickPower: getClickPower(state),
  };
}

function initialState() {
  return {
    endocraft: 0,
    totalEndocraft: 0,
    // Total À VIE : jamais remis à zéro, même par une Renaissance.
    // C'est lui qui compte pour débloquer les renaissances.
    lifetimeEndocraft: 0,
    clicks: 0,
    generators: {},
    upgrades: [],
    staff: [],
    cosmetics: [],
    equippedCoin: 'default',
    tags: [], // tags de prestige (exclusifs cases)
    equippedTag: null,
    achievements: [],
    applesClicked: 0,
    applesByType: {}, // pommes attrapées par type { doree, orage, ombre, cristal, maudite }
    shadowMinisCaught: 0, // mini-pommes attrapées pendant les tempêtes
    shadowStorm: null, // { endsAt, baseBank, minisSpawned } pendant la tempête
    applesRained: 0, // pommes attrapées pendant les pluies
    rainFrenzyCatches: 0, // pommes de pluie attrapées pendant une frénésie
    maxOfflineGain: 0, // plus gros gain hors-ligne encaissé d'un coup
    titleClicks: 0, // clics sur le titre (secret)
    frenziesStarted: 0, // frénésies déclenchées (à vie)
    pendingCursedAt: 0, // pomme maudite en cours de « doute » (persisté)
    quests: null, // quêtes du jour : { date, list, start, reward, bonusClaimed }
    questsClaimed: 0, // quêtes réclamées (à vie)
    casesOpened: 0, // caisses ouvertes (à vie)
    caseLegendaryDrops: 0, // drops légendaires obtenus
    renaissances: 0,
    lastRenaissanceLifetime: 0,
    playMs: 0,
    boostMult: 1,
    boostEndsAt: 0,
    lastSeen: Date.now(),
    // Révision cloud : incrémentée par les éditions admin (anti-écrasement)
    rev: 0,
  };
}

// ---------- Store ----------

let toastSeq = 0;
// Anti-spam de la vérif de succès déclenchée par les clics (auto-clicker)
let lastClickAchievementCheck = 0;

// ---------- Quêtes quotidiennes : utilitaires ----------

// Date locale au format YYYY-MM-DD (clé de reset à minuit)
function questDateKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// PRNG déterministe : mêmes quêtes toute la journée pour un même joueur
function seededRandom(seedStr) {
  let h = 1779033703;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Instantanés des compteurs à vie (base des deltas du jour)
function questSnapshots(s) {
  return {
    lifetime: s.lifetimeEndocraft || 0,
    clicks: s.clicks || 0,
    gens: Object.values(s.generators || {}).reduce((a, b) => a + b, 0),
    upgrades: (s.upgrades || []).length,
    apples: s.applesClicked || 0,
    rain: s.applesRained || 0,
    frenzy: s.frenziesStarted || 0,
  };
}

function generateDailyQuests(s) {
  const date = questDateKey();
  const pseudo = decodePseudo(getToken()) || 'invité';
  const rand = seededRandom(`${pseudo}|${date}`);

  // La récompense est FIGÉE à la génération : impossible de gonfler sa
  // production dans la journée puis de tout réclamer le soir.
  const reward = Math.max(
    5000,
    Math.round(getProduction(s) * DAILY_QUESTS.rewardSeconds)
  );

  // 3 types distincts tirés du pool
  const pool = [...DAILY_QUESTS.pool];
  const list = [];
  for (let i = 0; i < DAILY_QUESTS.perDay && pool.length > 0; i++) {
    const idx = Math.floor(rand() * pool.length);
    const q = pool.splice(idx, 1)[0];
    let target;
    if (q.type === 'earn') {
      // 15 à 30 minutes de production du matin
      const rate = getProduction(s);
      target = Math.max(10_000, Math.round(rate * (900 + rand() * 900)));
    } else {
      target = Math.round(q.min + rand() * (q.max - q.min));
    }
    list.push({ type: q.type, target, claimed: false, reward });
  }
  return { date, list, start: questSnapshots(s), reward, bonusClaimed: false };
}

// Progression d'une quête = delta du compteur concerné depuis le début du jour
function questProgress(s, type) {
  const start = s.quests?.start || {};
  switch (type) {
    case 'earn':
      return Math.max(0, (s.lifetimeEndocraft || 0) - (start.lifetime || 0));
    case 'clicks':
      return Math.max(0, (s.clicks || 0) - (start.clicks || 0));
    case 'generators':
      return Math.max(
        0,
        Object.values(s.generators || {}).reduce((a, b) => a + b, 0) -
          (start.gens || 0)
      );
    case 'upgrades':
      return Math.max(0, (s.upgrades || []).length - (start.upgrades || 0));
    case 'apples':
      return Math.max(0, (s.applesClicked || 0) - (start.apples || 0));
    case 'rain':
      return Math.max(0, (s.applesRained || 0) - (start.rain || 0));
    case 'frenzy':
      return Math.max(0, (s.frenziesStarted || 0) - (start.frenzy || 0));
    default:
      return 0;
  }
}

// Nettoie un état chargé (localStorage, cloud, admin) : aucune valeur
// hostile (NaN, Infinity, types cassés) ne doit atteindre la boucle de jeu.
function sanitizeLoaded(raw) {
  const num = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);
  const arr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
  const obj = (v) =>
    v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  const gens = {};
  for (const [k, v] of Object.entries(obj(raw.generators))) {
    const n = Math.floor(num(v));
    if (n > 0) gens[k] = n;
  }
  const apples = {};
  for (const [k, v] of Object.entries(obj(raw.applesByType))) {
    apples[k] = Math.floor(num(v));
  }
  return {
    ...raw,
    endocraft: num(raw.endocraft),
    totalEndocraft: num(raw.totalEndocraft),
    lifetimeEndocraft: num(raw.lifetimeEndocraft),
    clicks: Math.floor(num(raw.clicks)),
    generators: gens,
    upgrades: arr(raw.upgrades),
    staff: arr(raw.staff),
    cosmetics: arr(raw.cosmetics),
    achievements: arr(raw.achievements),
    tags: arr(raw.tags),
    equippedCoin: typeof raw.equippedCoin === 'string' ? raw.equippedCoin : 'default',
    equippedTag: typeof raw.equippedTag === 'string' ? raw.equippedTag : null,
    applesByType: apples,
    boostMult: num(raw.boostMult) || 1,
    rev: Math.floor(num(raw.rev)),
    lastRenaissanceLifetime: num(raw.lastRenaissanceLifetime),
    pendingCursedAt: num(raw.pendingCursedAt),
    quests:
      raw.quests && typeof raw.quests === 'object' && Array.isArray(raw.quests.list)
        ? raw.quests
        : null,
  };
}

export const useGame = create((set, get) => ({
  ...initialState(),

  // UI (non sauvegardé)
  apple: null, // { id, x, y, expiresAt }
  nextAppleAt: Date.now() + APPLE.minDelayMs,
  appleRain: null, // { endsAt, spawned } quand la pluie est active
  nextRainSpawnAt: 0,
  rainApples: [], // [{ id, x, fallMs, spawnedAt, mini? }]
  // Préférence d'affichage : 'auto' (heure réelle) | 'day' | 'night'
  dayNightPref: localStorage.getItem('endoclicker_daynight') || 'auto',
  toasts: [],
  offlineReport: null, // { durationMs, gains }
  cloudSyncError: false,
  // Non-nul : ce compte est banni temporairement (sanction anti-triche) —
  // l'horodatage sert au bandeau d'état.
  cloudBannedUntil: 0,
  lastSyncAt: 0,
  // True une fois l'état cloud récupéré au démarrage : aucune sync montante
  // ne doit partir avant, sinon on écrase le cloud avec un local vide.
  cloudReady: false,

  // ---------- Clic sur l'EndoCraft ----------
  click() {
    const s = get();
    const boost = s.boostEndsAt > Date.now() ? s.boostMult : 1;
    const gain = getClickPower(s) * boost;
    set({
      endocraft: s.endocraft + gain,
      totalEndocraft: s.totalEndocraft + gain,
      lifetimeEndocraft: s.lifetimeEndocraft + gain,
      clicks: s.clicks + 1,
    });
    // Tempête de clics active : chaque clic lâche des mini-pommes,
    // dans la limite du plafond de la tempête.
    if (s.shadowStorm && s.shadowStorm.endsAt > Date.now()) {
      const spawned = s.shadowStorm.minisSpawned || 0;
      const remaining = SHADOW_STORM.maxMinisPerStorm - spawned;
      if (remaining > 0) {
        const [min, max] = SHADOW_STORM.minisPerClick;
        const count = Math.min(
          min + Math.floor(Math.random() * (max - min + 1)),
          remaining
        );
        const now = Date.now();
        const minis = [];
        for (let i = 0; i < count; i++) {
          minis.push({
            id: now + i + Math.random(),
            x: 4 + Math.random() * 88,
            fallMs:
              APPLE_RAIN.fallMinMs +
              Math.random() * (APPLE_RAIN.fallMaxMs - APPLE_RAIN.fallMinMs),
            spawnedAt: now,
            mini: true,
          });
        }
        set({
          rainApples: [...s.rainApples, ...minis],
          shadowStorm: { ...s.shadowStorm, minisSpawned: spawned + count },
        });
      }
    }

    // Vérif des succès throttlée : à 30+ clics/s (auto-clicker), passer
    // les 55 checks sur CHAQUE clic plombe le thread — la boucle de jeu
    // re-vérifie de toute façon chaque seconde.
    const nowMs = Date.now();
    if (nowMs - lastClickAchievementCheck >= 400) {
      lastClickAchievementCheck = nowMs;
      get().checkAchievements();
    }
    return gain;
  },

  // ---------- Achats ----------
  buyGenerator(id, amount = 1) {
    const s = get();
    const n = Math.floor(Number(amount));
    const gen = GENERATOR_BY_ID[id];
    if (!gen || !Number.isFinite(n) || n < 1) return false;
    const owned = s.generators[id] || 0;
    const cost = generatorsCost(gen, owned, n, getStaffMults(s).genCost);
    // Garde inversé : NaN/Infinity ne passent JAMAIS un achat
    if (!(s.endocraft >= cost)) return false;
    set({
      endocraft: s.endocraft - cost,
      generators: { ...s.generators, [id]: owned + n },
    });
    playPurchase();
    get().checkAchievements();
    return true;
  },

  buyUpgrade(id) {
    const s = get();
    const up = UPGRADE_BY_ID[id];
    if (!up || s.upgrades.includes(id) || !(s.endocraft >= up.cost)) return false;
    if (up.req && (s.generators[up.req.genId] || 0) < up.req.count) return false;
    // Les améliorations d'équipe exigent que le membre soit recruté
    if (up.staffId && !(s.staff || []).includes(up.staffId)) return false;
    set({
      endocraft: s.endocraft - up.cost,
      upgrades: [...s.upgrades, id],
    });
    playPurchase();
    get().checkAchievements();
    return true;
  },

  // ---------- Équipe (staff) ----------
  buyStaff(id) {
    const s = get();
    const member = STAFF_BY_ID[id];
    if (!member || s.staff.includes(id) || !(s.endocraft >= member.cost)) return false;
    set({
      endocraft: s.endocraft - member.cost,
      staff: [...s.staff, id],
    });
    playPurchase();
    const icon = member.malus ? '💀' : '🤝';
    const title = member.malus
      ? `${member.pseudo} rejoint l’équipe…`
      : `${member.pseudo} rejoint l’équipe !`;
    get().addToast(icon, title, member.effectLabel, 5000);
    get().checkAchievements();
    return true;
  },

  // ---------- Cosmétiques (skins de la pièce) ----------
  buyCosmetic(id) {
    const s = get();
    const skin = COIN_SKIN_BY_ID[id];
    if (!skin || skin.cost === 0 || s.cosmetics.includes(id) || !(s.endocraft >= skin.cost))
      return false;
    set({
      endocraft: s.endocraft - skin.cost,
      cosmetics: [...s.cosmetics, id],
      equippedCoin: id, // équipé immédiatement après l'achat
    });
    playPurchase();
    get().addToast('✨', `${skin.name} débloqué !`, 'Nouveau skin équipé sur votre pièce.', 5000);
    get().checkAchievements();
    return true;
  },

  equipCoin(id) {
    const s = get();
    const skin = COIN_SKIN_BY_ID[id];
    if (!skin) return;
    // Seul le skin de base est gratuit — les exclusives de caisse
    // (EndoCrystal) doivent réellement être possédées.
    const owned = id === 'default' || s.cosmetics.includes(id);
    if (!owned) return;
    set({ equippedCoin: id });
  },

  setDayNight(pref) {
    localStorage.setItem('endoclicker_daynight', pref);
    set({ dayNightPref: pref });
  },

  // ---------- Quêtes quotidiennes ----------
  claimQuest(i) {
    const s = get();
    const q = s.quests?.list?.[i];
    if (!q || q.claimed) return false;
    if (questProgress(s, q.type) < q.target) return false;

    // Récompense figée à la génération des quêtes (anti-exploit)
    const reward = q.reward ?? 5000;
    const list = [...s.quests.list];
    list[i] = { ...q, claimed: true };
    set({
      quests: { ...s.quests, list },
      endocraft: s.endocraft + reward,
      totalEndocraft: s.totalEndocraft + reward,
      lifetimeEndocraft: s.lifetimeEndocraft + reward,
      questsClaimed: s.questsClaimed + 1,
    });
    playPurchase();
    get().addToast('📋', 'Quête terminée !', `+${fmt(reward)} EndoCraft de récompense.`);
    get().checkAchievements();
    return true;
  },

  claimQuestBonus() {
    const s = get();
    if (!s.quests || s.quests.bonusClaimed) return false;
    if (!s.quests.list.every((q) => q.claimed)) return false;

    const bonus = (s.quests.reward ?? 5000) * DAILY_QUESTS.bonusMult;
    set({
      quests: { ...s.quests, bonusClaimed: true },
      endocraft: s.endocraft + bonus,
      totalEndocraft: s.totalEndocraft + bonus,
      lifetimeEndocraft: s.lifetimeEndocraft + bonus,
    });
    playAchievement();
    get().addToast('🏆', 'Journée parfaite !', `Bonus ×${DAILY_QUESTS.bonusMult} : +${fmt(bonus)} EndoCraft.`);
    get().checkAchievements();
    return true;
  },

  // ---------- Cases (ouverture à la CS:GO) ----------
  // Tire un drop SANS l'appliquer : la caisse est payée et le résultat
  // scellé, mais les récompenses ne s'activent qu'au moment de RÉCUPÉRER —
  // sinon une frénésie brûle pendant l'animation du rouleau. Les doublons
  // sont annotés dès le tirage (l'inventaire ne peut pas changer pendant
  // que le rouleau tourne) pour l'affichage, et remboursés au claim.
  openCase(caseId) {
    const s = get();
    const box = CASES.find((c) => c.id === caseId);
    if (!box || !(s.endocraft >= box.cost)) return null;

    // Tirage pondéré
    const total = box.drops.reduce((a, d) => a + d.weight, 0);
    let roll = Math.random() * total;
    let drop = box.drops[0];
    for (const d of box.drops) {
      roll -= d.weight;
      if (roll <= 0) {
        drop = d;
        break;
      }
    }

    // Annotation des doublons (pour l'affichage du rouleau/révélation)
    if (drop.type === 'upgrade' && s.upgrades.includes(drop.upgradeId)) {
      drop = { ...drop, duplicate: true, duplicateCash: Math.max(1000, Math.round(box.cost * (CASE_DUPLICATE_REFUND[drop.rarity] ?? 0.2))) };
    } else if (drop.type === 'skin' && s.cosmetics.includes(drop.skinId)) {
      drop = { ...drop, duplicate: true, duplicateCash: Math.max(1000, Math.round(box.cost * (CASE_DUPLICATE_REFUND[drop.rarity] ?? 0.2))) };
    } else if (drop.type === 'tag' && (s.tags || []).includes(drop.tagId)) {
      drop = { ...drop, duplicate: true, duplicateCash: Math.max(1000, Math.round(box.cost * (CASE_DUPLICATE_REFUND[drop.rarity] ?? 0.2))) };
    }

    set({
      endocraft: s.endocraft - box.cost,
      casesOpened: s.casesOpened + 1,
    });
    // Filet anti-crash : le tirage est persisté tel quel avec le paiement.
    // Si l'onglet meurt avant le « Récupérer », le prochain démarrage
    // réclamera les gains automatiquement.
    try {
      localStorage.setItem(PENDING_CASE_KEY, JSON.stringify({ caseId, drop }));
    } catch {
      /* quota : tant pis pour le filet */
    }
    get().saveLocal();
    return drop;
  },

  // Applique les drops tirés — appelé par le bouton « Récupérer » ET par
  // tous les chemins de sortie du rouleau (Échap, fond, fermeture), pour
  // qu'une caisse payée ne soit jamais perdue.
  claimCase(caseId, drops) {
    const s = get();
    const box = CASES.find((c) => c.id === caseId);
    if (!box || !Array.isArray(drops) || drops.length === 0) return [];

    const patch = {};
    const credit = (amount) => {
      patch.endocraft = (patch.endocraft ?? s.endocraft) + amount;
      patch.totalEndocraft = (patch.totalEndocraft ?? s.totalEndocraft) + amount;
      patch.lifetimeEndocraft =
        (patch.lifetimeEndocraft ?? s.lifetimeEndocraft) + amount;
    };
    const refundDuplicate = (d) => {
      credit(
        d.duplicateCash ??
          Math.max(1000, Math.round(box.cost * (CASE_DUPLICATE_REFUND[d.rarity] ?? 0.2)))
      );
      return { ...d, duplicate: true };
    };
    let wantRain = false;

    const claimed = drops.filter(Boolean).map((drop) => {
      if (drop.type === 'cash') {
        credit(Math.max(1000, box.cost * drop.percent));
      } else if (drop.type === 'nothing') {
        // Plus présent dans les tables V2 — gardé par sécurité
      } else if (drop.type === 'bank') {
        // % de la banque au moment du claim, plafonné à 3× le prix
        credit(Math.max(50, Math.min(s.endocraft * drop.bankPercent, box.cost * 3)));
      } else if (drop.type === 'frenzy') {
        // appliqué après le set(patch) ci-dessous
        get().applyBoost(7, drop.durationMs);
      } else if (drop.type === 'rain') {
        wantRain = true;
      } else if (drop.type === 'upgrade') {
        if (drop.duplicate || s.upgrades.includes(drop.upgradeId)) {
          drop = refundDuplicate(drop);
        } else {
          patch.upgrades = [...s.upgrades, drop.upgradeId];
          if (drop.rarity === 'legendaire') {
            patch.caseLegendaryDrops =
              (patch.caseLegendaryDrops ?? s.caseLegendaryDrops) + 1;
          }
        }
      } else if (drop.type === 'skin') {
        if (drop.duplicate || s.cosmetics.includes(drop.skinId)) {
          drop = refundDuplicate(drop);
        } else {
          patch.cosmetics = [...s.cosmetics, drop.skinId];
          if (drop.rarity === 'legendaire') {
            patch.caseLegendaryDrops =
              (patch.caseLegendaryDrops ?? s.caseLegendaryDrops) + 1;
          }
        }
      } else if (drop.type === 'tag') {
        if (drop.duplicate || (s.tags || []).includes(drop.tagId)) {
          drop = refundDuplicate(drop);
        } else {
          patch.tags = [...(s.tags || []), drop.tagId];
          patch.equippedTag = drop.tagId; // équipé immédiatement
          if (drop.rarity === 'legendaire') {
            patch.caseLegendaryDrops =
              (patch.caseLegendaryDrops ?? s.caseLegendaryDrops) + 1;
          }
        }
      }
      return drop;
    });

    if (Object.keys(patch).length > 0) set(patch);
    if (wantRain) get().startAppleRain();
    try {
      localStorage.removeItem(PENDING_CASE_KEY);
    } catch {
      /* rien */
    }
    get().saveLocal();
    playPurchase();
    get().checkAchievements();
    return claimed;
  },

  equipTag(id) {
    const s = get();
    if (!(s.tags || []).includes(id)) return;
    set({ equippedTag: s.equippedTag === id ? null : id });
  },

  // ---------- Renaissance ----------
  // Tout repart à zéro (sauf succès, cosmétiques, tags, exclusives de
  // caisses et stats) contre un bonus de production permanent et les
  // Braises du Phénix (de quoi redémarrer sans cliquer 200 fois).
  doRenaissance() {
    const s = get();
    const threshold = getRenaissanceThreshold(s.renaissances);
    const lifetime = Number(s.lifetimeEndocraft);
    if (!Number.isFinite(lifetime) || !(lifetime >= threshold)) return false;
    // Empêche les renaissances enchaînées : depuis la dernière renaissance,
    // il faut re-farmer au moins le nouveau seuil.
    const last = Number.isFinite(Number(s.lastRenaissanceLifetime))
      ? Number(s.lastRenaissanceLifetime)
      : 0;
    if (s.renaissances > 0 && !(lifetime - last >= threshold)) return false;

    const newCount = s.renaissances + 1;
    // Les exclusives de cases (kind 'case') survivent à la Renaissance :
    // c'est ce qui justifie leur rareté et le prix des caisses.
    const caseUpgrades = UPGRADES.filter(
      (u) => u.kind === 'case' && s.upgrades.includes(u.id)
    ).map((u) => u.id);
    set({
      // Braises du Phénix : pécule de départ, cumulé par renaissance.
      // Versé en `endocraft` uniquement : il ne compte ni dans le total du
      // cycle ni dans le compteur à vie → aucun enchaînement possible.
      endocraft: newCount * RENAISSANCE.emberBankPerRenaissance,
      totalEndocraft: 0, // lifetimeEndocraft : jamais remis à zéro
      generators: {},
      upgrades: caseUpgrades,
      staff: [],
      renaissances: newCount,
      lastRenaissanceLifetime: lifetime,
      boostMult: 1,
      boostEndsAt: 0,
      shadowStorm: null,
      appleRain: null,
      rainApples: [],
      pendingCursedAt: 0,
    });
    get().addToast(
      '🔥',
      `Renaissance n°${newCount} !`,
      `Bonus permanent ×${getRenaissanceMult(newCount).toFixed(2)} — Braises du Phénix : +${fmt(
        newCount * RENAISSANCE.emberBankPerRenaissance
      )} EndoCraft pour repartir.`,
      7000
    );
    get().checkAchievements();
    // Persiste AVANT de syncer : un crash ne peut pas annuler la renaissance
    // ni laisser un état local périmé écraser le cloud.
    get().saveLocal();
    get().cloudSync();
    return true;
  },

  // ---------- Frénésies ----------
  // Source unique (pommes, caisses, admin) : deux frénésies qui se
  // chevauchent prennent le max des deux, jamais l'écrasement de l'une
  // par l'autre.
  applyBoost(mult, durationMs) {
    const s = get();
    if (!Number.isFinite(mult) || mult <= 1) return;
    if (!Number.isFinite(durationMs) || durationMs <= 0) return;
    const now = Date.now();
    const active = s.boostEndsAt > now;
    // EndoBlaze équipé : frénésies +25 % de durée
    durationMs *= equippedPerk(s)?.id === 'frenzyDuration' ? 1.25 : 1;
    set({
      boostMult: active ? Math.max(s.boostMult, mult) : mult,
      boostEndsAt: active
        ? Math.max(s.boostEndsAt, now + durationMs)
        : now + durationMs,
      frenziesStarted: s.frenziesStarted + 1,
    });
  },

  // ---------- Événements en direct (SSE, déclenchés par un admin) ----------
  // Secret : cliquer sur le titre "EndoClicker"
  clickTitle() {
    const s = get();
    set({ titleClicks: s.titleClicks + 1 });
    get().checkAchievements();
  },

  adminFrenzy(mult, durationMs) {
    if (!Number.isFinite(mult) || mult <= 1) return;
    if (!Number.isFinite(durationMs) || durationMs <= 0) return;
    get().applyBoost(mult, durationMs);
    get().addToast(
      '⚡',
      'Frénésie du staff !',
      `Clics ×${mult} pendant ${Math.round(durationMs / 1000)} s — cadeau de l’administration.`,
      6000
    );
  },

  adminSpawnApple(type) {
    // N'écrase pas une pomme déjà à l'écran (elle serait perdue sans
    // compensation) et reporte le spawn naturel.
    if (get().apple) return;
    const appleType = APPLE_TYPES[type] ? type : get().rollAppleType();
    const now = Date.now();
    set({
      apple: {
        id: now,
        type: appleType,
        x: 12 + Math.random() * 72,
        y: 15 + Math.random() * 65,
        expiresAt: now + APPLE.visibleMs,
      },
      nextAppleAt: now + APPLE.intervalMinMs,
    });
    const def = APPLE_TYPES[appleType];
    get().addToast(
      def.icon,
      'Une pomme est apparue !',
      `L’administration vous envoie une ${def.name.replace(/^Pomme /, '').trim() || def.name} — attrapez-la vite !`,
      5000
    );
  },

  async refreshFromServer() {
    if (!getToken()) return;
    try {
      const { state } = await api('/api/state');
      if (state) {
        get().applyState(state);
        useGame.setState({ cloudReady: true });
        get().addToast(
          '⚙️',
          'Progression mise à jour',
          'Un administrateur a modifié votre progression.',
          5000
        );
      }
    } catch {
      // réseau : la synchro périodique s'en chargera
    }
  },

  // ---------- Pommes variées ----------
  // Tirage pondéré du type d'une pomme qui apparaît
  rollAppleType() {
    const roll = Math.random();
    let acc = 0;
    for (const t of Object.values(APPLE_TYPES)) {
      acc += t.weight;
      if (roll <= acc) return t.id;
    }
    return 'doree';
  },

  clickApple() {
    const s = get();
    if (!s.apple) return null;
    const appleType = s.apple.type || 'doree';
    set({
      apple: null,
      applesClicked: s.applesClicked + 1,
      applesByType: {
        ...s.applesByType,
        [appleType]: Math.floor(Number(s.applesByType?.[appleType]) || 0) + 1,
      },
    });
    playApple();

    // --- Pomme dorée : frénésie ou chanceux ---
    if (appleType === 'doree') {
      const roll = Math.random();
      let acc = 0;
      let reward = 'frenzy';
      for (const [key, r] of Object.entries(APPLE_REWARDS)) {
        acc += r.weight;
        if (roll <= acc) {
          reward = key;
          break;
        }
      }
      // Une frénésie est déjà active ? Le tirage bascule sur le chanceux :
      // jamais de frénésie gaspillée par écrasement.
      if (reward === 'frenzy' && s.boostEndsAt > Date.now()) {
        reward = 'lucky';
      }

      if (reward === 'frenzy') {
        const { mult, durationMs } = APPLE_REWARDS.frenzy;
        get().applyBoost(mult, durationMs);
        get().addToast('🔥', 'Frénésie !', `Clics ×${mult} pendant 30 s`);
        get().checkAchievements();
      } else {
        // EndoRoi équipé : dîme royale 12 % au lieu de 10 %.
        // Le gain est plafonné en secondes de production : un % de banque
        // non bornu est une exponentielle autonome.
        const bankPercent =
          equippedPerk(s)?.id === 'luckyBonus'
            ? 0.12
            : APPLE_REWARDS.lucky.bankPercent;
        const bonus = Math.max(
          25,
          Math.min(
            get().endocraft * bankPercent,
            getProduction(get()) * APPLE_REWARDS.lucky.capSeconds
          )
        );
        set({
          endocraft: get().endocraft + bonus,
          totalEndocraft: get().totalEndocraft + bonus,
          lifetimeEndocraft: get().lifetimeEndocraft + bonus,
        });
        get().addToast(
          '🍀',
          'Chanceux !',
          `+${Math.round(bankPercent * 100)} % de votre banque en bonus`
        );
        get().checkAchievements();
      }

      // Événement rare : la dorée déclenche une pluie de pommes
      if (Math.random() < APPLE_RAIN.triggerChance) {
        get().startAppleRain();
      }
      return { type: reward };
    }

    // --- Pomme d'orage : pluie garantie ---
    if (appleType === 'orage') {
      get().startAppleRain();
      get().checkAchievements();
      return { type: 'orage' };
    }

    // --- Pomme d'ombre : tempête de clics (bornée) ---
    if (appleType === 'ombre') {
      set({
        shadowStorm: {
          endsAt: Date.now() + SHADOW_STORM.durationMs,
          // La banque est FIGÉE au déclenchement : les mini-pommes ne
          // composent plus sur une banque qu'elles gonflent elles-mêmes.
          baseBank: s.endocraft,
          minisSpawned: 0,
        },
      });
      get().addToast(
        '🌑',
        'Tempête de clics !',
        'Pendant 10 s, chaque clic fait tomber des mini-pommes !',
        6000
      );
      get().checkAchievements();
      return { type: 'ombre' };
    }

    // --- Pomme de cristal : 3 minutes de production immédiates ---
    if (appleType === 'cristal') {
      const gain = Math.max(
        1000,
        getProduction(get()) * CRYSTAL_PRODUCTION_SECONDS
      );
      set({
        endocraft: get().endocraft + gain,
        totalEndocraft: get().totalEndocraft + gain,
        lifetimeEndocraft: get().lifetimeEndocraft + gain,
      });
      get().addToast(
        '💎',
        'Gain temporel !',
        `+${fmt(gain)} EndoCraft (3 minutes de production).`
      );
      get().checkAchievements();
      return { type: 'cristal', gain };
    }

    // --- Pomme maudite : 5 s de doute… puis +12 % de banque ---
    // Le « doute » est PERSISTÉ : fermer l'onglet pendant les 5 s ne fait
    // plus perdre la récompense.
    if (appleType === 'maudite') {
      get().addToast('💀', '…', 'Rien ne se passe. C’est inquiétant.', 4500);
      set({ pendingCursedAt: Date.now() });
      return { type: 'maudite' };
    }

    return null;
  },

  // Règlement différé de la pomme maudite (appelé par tick)
  settleCursed() {
    const s = get();
    if (!s.pendingCursedAt) return;
    if (Date.now() < s.pendingCursedAt + CURSED_DELAY_MS) return;
    const bonus = Math.max(
      50,
      Math.min(
        s.endocraft * CURSED_BANK_PERCENT,
        getProduction(s) * CURSED_CAP_SECONDS
      )
    );
    set({
      pendingCursedAt: 0,
      endocraft: s.endocraft + bonus,
      totalEndocraft: s.totalEndocraft + bonus,
      lifetimeEndocraft: s.lifetimeEndocraft + bonus,
    });
    get().addToast(
      '💀',
      'KendiiX l’avait touchée…',
      `…et ça paie : +${Math.round(CURSED_BANK_PERCENT * 100)} % de votre banque !`
    );
    get().checkAchievements();
  },

  // ---------- Pluie de pommes ----------
  startAppleRain() {
    const s = get();
    const now = Date.now();
    const active = s.appleRain && s.appleRain.endsAt > now;
    set({
      // Une pluie déjà active est PROLONGÉE (compteur conservé) : impossible
      // de contourner le plafond de pommes en enchaînant les déclenchements.
      appleRain: active
        ? { ...s.appleRain, endsAt: now + APPLE_RAIN.durationMs }
        : { endsAt: now + APPLE_RAIN.durationMs, spawned: 0 },
      nextRainSpawnAt: now,
    });
    get().addToast(
      '🌧️',
      'Pluie de pommes !',
      'Attrapez-les avant qu’elles ne touchent le sol !',
      5000
    );
  },

  clickRainApple(id) {
    const s = get();
    const fruit = s.rainApples.find((a) => a.id === id);
    if (!fruit) return null;
    // Mini-pommes de la tempête : % de la banque FIGÉE au déclenchement,
    // plafonné en secondes de production. Pluie : % de la banque courante.
    const base = fruit.mini
      ? s.shadowStorm?.baseBank ?? s.endocraft
      : s.endocraft;
    const bankPercent = fruit.mini
      ? SHADOW_STORM.miniBankPercent
      : APPLE_RAIN.bankPercent;
    const capSeconds = fruit.mini
      ? SHADOW_STORM.miniCapSeconds
      : APPLE_RAIN.capSeconds;
    const gain = Math.max(
      APPLE_RAIN.minGain,
      Math.min(base * bankPercent, getProduction(s) * capSeconds)
    );
    set({
      rainApples: s.rainApples.filter((a) => a.id !== id),
      endocraft: s.endocraft + gain,
      totalEndocraft: s.totalEndocraft + gain,
      lifetimeEndocraft: s.lifetimeEndocraft + gain,
      applesRained: fruit.mini ? s.applesRained : s.applesRained + 1,
      shadowMinisCaught: fruit.mini
        ? s.shadowMinisCaught + 1
        : s.shadowMinisCaught,
      // Tempête parfaite : pomme de PLUIE attrapée pendant une frénésie
      ...(s.boostEndsAt > Date.now() && !fruit.mini
        ? { rainFrenzyCatches: s.rainFrenzyCatches + 1 }
        : {}),
    });
    get().checkAchievements();
    return gain;
  },

  // ---------- Boucle de jeu ----------
  tick(dtMs) {
    const s = get();
    const patch = {};
    const now = Date.now(); // déclaré AVANT tout usage (sinon TDZ fatale)

    // Production passive + auto-clicker du Développeur (clics avec la
    // puissance réelle, boost de frénésie inclus)
    const rate = getProduction(s);
    const staffMults = getStaffMults(s);
    let gained = (rate * dtMs) / 1000;
    if (staffMults.autoClickPerSec > 0) {
      const boost = s.boostEndsAt > now ? s.boostMult : 1;
      gained += getClickPower(s) * boost * staffMults.autoClickPerSec * (dtMs / 1000);
    }
    if (gained > 0) {
      patch.endocraft = s.endocraft + gained;
      patch.totalEndocraft = s.totalEndocraft + gained;
      patch.lifetimeEndocraft = s.lifetimeEndocraft + gained;
    }

    patch.playMs = s.playMs + dtMs;
    patch.lastSeen = now;

    // Quêtes du jour : génération au premier tick + reset à minuit local
    if (!s.quests || s.quests.date !== questDateKey()) {
      patch.quests = generateDailyQuests(s);
    }

    // Fin de boost
    if (s.boostEndsAt && s.boostEndsAt <= now) {
      patch.boostMult = 1;
      patch.boostEndsAt = 0;
    }

    // Fin de la tempête de clics
    if (s.shadowStorm && s.shadowStorm.endsAt <= now) {
      patch.shadowStorm = null;
    }

    // Apparition / expiration de la pomme dorée
    if (s.apple && s.apple.expiresAt <= now) {
      patch.apple = null;
    } else if (!s.apple && now >= s.nextAppleAt && rate > 0) {
      // EndoSage équipé : la pomme reste visible 50 % plus longtemps
      const visibleMs =
        APPLE.visibleMs *
        (equippedPerk(s)?.id === 'appleDuration' ? 1.5 : 1);
      patch.apple = {
        id: now,
        type: get().rollAppleType(),
        x: 10 + Math.random() * 78, // % de l'écran (marges réelles)
        y: 15 + Math.random() * 65,
        expiresAt: now + visibleMs,
      };
    }
    if (!s.apple && now >= s.nextAppleAt) {
      const freq = getStaffMults(s).appleFreq;
      const interval =
        APPLE.intervalMinMs +
        Math.random() * (APPLE.intervalMaxMs - APPLE.intervalMinMs);
      patch.nextAppleAt = now + Math.round(interval / freq);
    }

    // Pluie de pommes : spawn des fruits + fin de l'événement
    if (s.appleRain) {
      const rain = s.appleRain;
      if (now >= rain.endsAt) {
        patch.appleRain = null;
        // Les mini-pommes de tempête encore en chute survivent à la fin
        // de la pluie : elles ne partagent le tableau que par commodité.
        patch.rainApples = s.rainApples.filter((a) => a.mini);
      } else if (
        now >= s.nextRainSpawnAt &&
        rain.spawned < APPLE_RAIN.maxApples
      ) {
        const fallMs =
          APPLE_RAIN.fallMinMs +
          Math.random() * (APPLE_RAIN.fallMaxMs - APPLE_RAIN.fallMinMs);
        patch.rainApples = [
          ...s.rainApples,
          {
            id: now + Math.random(),
            x: 3 + Math.random() * 88, // % de la largeur (pomme ~52px)
            fallMs,
            spawnedAt: now,
          },
        ];
        patch.appleRain = { ...rain, spawned: rain.spawned + 1 };
        patch.nextRainSpawnAt =
          now +
          APPLE_RAIN.spawnMinMs +
          Math.random() * (APPLE_RAIN.spawnMaxMs - APPLE_RAIN.spawnMinMs);
      }
    }
    // Retire les pommes arrivées au sol (non attrapées). Part de la liste
    // déjà patchée ci-dessus : sinon le filtre des mini-pommes (fin de
    // pluie) serait écrasé au même tick.
    {
      const base = patch.rainApples ?? s.rainApples;
      if (base.length > 0) {
        const stillFalling = base.filter(
          (a) => now - a.spawnedAt < a.fallMs
        );
        if (stillFalling.length !== base.length) {
          patch.rainApples = stillFalling;
        }
      }
    }

    set(patch);
    // Après le set principal : le règlement de la pomme maudite (s'il y en
    // a un) part d'un état frais — sinon son bonus serait écrasé par patch.
    get().settleCursed();
  },

  // ---------- Succès ----------
  checkAchievements() {
    const s = get();
    const stats = computeStats(s);
    const unlocked = ACHIEVEMENTS.filter(
      (a) => !s.achievements.includes(a.id) && a.check(stats)
    );
    if (unlocked.length === 0) return;
    set({ achievements: [...s.achievements, ...unlocked.map((a) => a.id)] });
    playAchievement();
    for (const a of unlocked) {
      get().addToast(a.icon, `Succès : ${a.name}`, a.desc, 5000);
    }
    if (window.__fx) window.__fx.confetti();
  },

  // ---------- Notifications ----------
  addToast(icon, title, message, duration = 4000) {
    const id = ++toastSeq;
    // Tas plafonné à 5 : une rafale de succès ne remplit pas l'écran
    set({ toasts: [...get().toasts, { id, icon, title, message }].slice(-5) });
    setTimeout(() => {
      set({ toasts: get().toasts.filter((t) => t.id !== id) });
    }, duration);
  },

  // ---------- Sauvegarde ----------
  exportState() {
    const s = get();
    return {
      endocraft: s.endocraft,
      totalEndocraft: s.totalEndocraft,
      lifetimeEndocraft: s.lifetimeEndocraft,
      clicks: s.clicks,
      generators: s.generators,
      upgrades: s.upgrades,
      staff: s.staff,
      cosmetics: s.cosmetics,
      equippedCoin: s.equippedCoin,
      tags: s.tags,
      equippedTag: s.equippedTag,
      achievements: s.achievements,
      applesClicked: s.applesClicked,
      applesByType: s.applesByType,
      shadowMinisCaught: s.shadowMinisCaught,
      applesRained: s.applesRained,
      rainFrenzyCatches: s.rainFrenzyCatches,
      maxOfflineGain: s.maxOfflineGain,
      titleClicks: s.titleClicks,
      frenziesStarted: s.frenziesStarted,
      pendingCursedAt: s.pendingCursedAt,
      quests: s.quests,
      questsClaimed: s.questsClaimed,
      casesOpened: s.casesOpened,
      caseLegendaryDrops: s.caseLegendaryDrops,
      renaissances: s.renaissances,
      lastRenaissanceLifetime: s.lastRenaissanceLifetime || 0,
      playMs: s.playMs,
      lastSeen: s.lastSeen,
      rev: s.rev || 0,
    };
  },

  applyState(loaded) {
    const cur = get();
    const next = { ...initialState(), ...sanitizeLoaded(loaded || {}) };
    // Un succès acquis ne se perd jamais, même sur un état serveur périmé
    if (cur.achievements.length > 0) {
      next.achievements = [
        ...new Set([...next.achievements, ...cur.achievements]),
      ];
    }
    // Une frénésie en cours n'est pas annulée par un état sans boost
    if (!next.boostEndsAt && cur.boostEndsAt > Date.now()) {
      next.boostMult = cur.boostMult;
      next.boostEndsAt = cur.boostEndsAt;
    }
    set({ ...next, lastSeen: Date.now() });
  },

  saveLocal() {
    const state = get().exportState();
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ v: SAVE_VERSION, state }));
    } catch {
      /* quota dépassé : on ignore */
    }
  },

  loadLocal() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // V2 = reset mondial : les sauvegardes plus anciennes sont ignorées
      if (parsed && parsed.v === SAVE_VERSION && parsed.state) {
        return parsed.state;
      }
    } catch {
      /* sauvegarde corrompue */
    }
    return null;
  },

  // Gains d'absence (fermeture d'onglet, onglet en fond prolongé) :
  // même formule pour le démarrage et le retour d'arrière-plan.
  applyAwayCatchup(awayMs) {
    const s = get();
    const rate = getProduction(s);
    if (rate <= 0 || awayMs <= 30_000) return null;
    const capped = Math.min(
      awayMs,
      OFFLINE_CAP_MS + getStaffMults(s).offlineCapBonusMs
    );
    const eff = Math.min(1, OFFLINE_EFFICIENCY + getStaffMults(s).offlineEffBonus);
    const gains = (rate * capped * eff) / 1000;
    if (gains < 1) return null;
    set({
      endocraft: s.endocraft + gains,
      totalEndocraft: s.totalEndocraft + gains,
      lifetimeEndocraft: s.lifetimeEndocraft + gains,
      maxOfflineGain: Math.max(s.maxOfflineGain || 0, gains),
    });
    return { durationMs: capped, gains, eff };
  },

  // Appelé une fois au démarrage : charge la sauvegarde + calcule les gains hors-ligne
  load() {
    const local = get().loadLocal();
    if (local) {
      const away = Date.now() - (local.lastSeen || Date.now());
      get().applyState(local);
      const report = get().applyAwayCatchup(Math.max(0, away));
      // Quêtes du jour (générées si absentes / date différente)
      if (!get().quests || get().quests.date !== questDateKey()) {
        set({ quests: generateDailyQuests(get()) });
      }
      set({ offlineReport: report });
      if (report) get().checkAchievements();
    } else {
      // Première partie (ou reset mondial V2 : l'ancienne save est ignorée)
      set({ quests: generateDailyQuests(get()) });
    }

    // Une caisse payée mais jamais réclamée (onglet fermé pendant le
    // rouleau) : les gains sont rendus au démarrage.
    try {
      const raw = localStorage.getItem(PENDING_CASE_KEY);
      if (raw) {
        const pending = JSON.parse(raw);
        localStorage.removeItem(PENDING_CASE_KEY);
        if (pending?.caseId && pending?.drop) {
          get().claimCase(pending.caseId, [pending.drop]);
          get().addToast(
            '🎁',
            'Gains récupérés',
            'Une caisse restée ouverte a été encaissée automatiquement.'
          );
        }
      }
    } catch {
      /* tirage illisible : on ne crashe pas au démarrage */
    }
  },

  // Déconnexion : la progression du compte ne doit pas fuiter vers le
  // prochain compte (ou invité) ouvert sur le même navigateur.
  resetForLogout() {
    try {
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem(PENDING_CASE_KEY);
    } catch {
      /* rien */
    }
    set({
      ...initialState(),
      // Événements UI en cours : une pomme de l'ancien compte ne doit pas
      // rester cliquable par le suivant.
      apple: null,
      appleRain: null,
      rainApples: [],
      nextRainSpawnAt: 0,
      nextAppleAt: Date.now() + APPLE.minDelayMs,
      offlineReport: null,
      toasts: [],
      cloudReady: true, // un invité repart de zéro, pas de fusion à attendre
      quests: generateDailyQuests({ ...initialState() }),
    });
  },

  // ---------- Sync cloud ----------
  // opts.migration : true pour une fusion post-login (progression locale en
  // avance) — le serveur la borne à ce que la production déclarée permet.
  async cloudSync(opts = {}) {
    if (!getToken()) return;
    // Au démarrage, on attend d'avoir récupéré l'état cloud (useAuth.init)
    // avant d'envoyer quoi que ce soit.
    if (!get().cloudReady) return;
    // Compte banni (sanction anti-triche) : inutile de marteler l'API
    if (get().cloudBannedUntil > Date.now()) return;
    const s = get();
    try {
      await api('/api/state', {
        method: 'PUT',
        body: {
          state: s.exportState(),
          // Taux déclaré : production + auto-clicker, boost de frénésie inclus
          // (sinon les gains ×7 de la frénésie dépassent le plafond anti-triche)
          productionRate:
            getTotalRate(s) *
            (s.boostEndsAt > Date.now() ? s.boostMult : 1),
          migration: opts.migration === true,
        },
      });
      set({ cloudSyncError: false, lastSyncAt: Date.now() });
    } catch (e) {
      if (e.status === 409 && e.data?.state) {
        // Un administrateur a modifié la progression : on applique sa version
        get().applyState(e.data.state);
        get().addToast(
          '⚙️',
          'Progression modifiée',
          'Un administrateur a mis à jour votre progression.',
          6000
        );
        // Resync immédiat avec la révision à jour
        get().cloudSync();
        set({ cloudSyncError: false });
      } else if (e.status === 422) {
        // Refus anti-triche : on retentera au prochain cycle (toutes les 60 s).
        // Le temps écoulé grandissant, une synchro légitime finira par passer —
        // on ne gèle JAMAIS les tentatives, sinon le score resterait figé.
        set({ cloudSyncError: true });
      } else if (e.status === 403 && e.data?.bannedUntil) {
        // Sanction : progression cloud remise à zéro, API fermée 24 h.
        set({ cloudSyncError: true, cloudBannedUntil: e.data.bannedUntil });
      }
      // Autres erreurs réseau : on retentera au prochain cycle
    }
  },
}));

// ---------- Boucle globale (démarrée depuis App) ----------

let loopStarted = false;
// Horodatage du dernier tick exécuté : sert de base au rattrapage
// d'arrière-plan (les timers sont throttlés/suspendus par le navigateur).
let lastTickAt = Date.now();

export function startGameLoop() {
  if (loopStarted) return;
  loopStarted = true;

  const TICK = 100;
  let lastAchievementCheck = 0;
  let lastSave = 0;
  let lastCloudSync = 0;

  // Un SEUL onglet mène la danse (sinon : double production, saves et
  // syncs concurrentes qui s'écrasent). Les autres onglets suivent l'état
  // du leader via l'événement `storage` et reprennent la main s'il meurt.
  const leadLoop = () => {
    setInterval(() => {
      const now = Date.now();
      // dt réel plafonné à 1 s : un onglet en arrière-plan (timers throttlés
      // à ~1 Hz) continue de produire en temps réel, sans emprunter de
      // « gros dt » gratuit au retour.
      const dt = Math.min(1000, Math.max(0, now - lastTickAt));
      lastTickAt = now;
      if (dt === 0) return;

      const store = useGame.getState();
      store.tick(dt);

      if (now - lastAchievementCheck >= 1000) {
        lastAchievementCheck = now;
        store.checkAchievements();
      }
      if (now - lastSave >= AUTOSAVE_MS) {
        lastSave = now;
        store.saveLocal();
      }
      if (now - lastCloudSync >= CLOUD_SYNC_MS) {
        lastCloudSync = now;
        store.cloudSync();
      }
    }, TICK);
  };

  let following = false;
  const followLeader = () => {
    if (following) return; // un seul abonnement par onglet
    following = true;
    window.addEventListener('storage', (e) => {
      if (e.key !== SAVE_KEY || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed && parsed.v === SAVE_VERSION && parsed.state) {
          useGame.getState().applyState(parsed.state);
        }
      } catch {
        /* save du leader illisible : on attend la suivante */
      }
    });
  };

  const tryLead = () => {
    navigator.locks
      .request(
        'endoclicker-loop',
        { ifAvailable: true },
        (lock) => {
          if (!lock) {
            // Quelqu'un mène déjà : ce classe un miroir passif — l'événement
            // `storage` (déclenché chez les AUTRES onglets à chaque écriture
            // du leader) lui applique l'état à jour.
            followLeader();
            return;
          }
          leadLoop();
          return new Promise(() => {}); // détient le verrou jusqu'à la fermeture
        }
      )
      .catch(() => leadLoop()); //locks indisponible : on assume (rare)
  };

  if (navigator.locks?.request) {
    tryLead();
    // Si l'onglet leader se ferme, un suiveur reprend la main
    setInterval(() => {
      if (navigator.locks?.request) {
        navigator.locks
          .query({ name: 'endoclicker-loop' })
          .then((info) => {
            if (!info.held || info.held.length === 0) tryLead();
          })
          .catch(() => {});
      }
    }, 5_000);
  } else {
    leadLoop();
  }

  // Sauvegarde de secours avant fermeture
  window.addEventListener('beforeunload', () => {
    useGame.getState().saveLocal();
    useGame.getState().cloudSync();
  });
  document.addEventListener('visibilitychange', () => {
    const state = document.visibilityState;
    if (state === 'hidden') {
      useGame.getState().saveLocal();
      useGame.getState().cloudSync();
    } else {
      // Retour sur l'onglet : rattrapage de la période où les timers
      // étaient suspendus (base = dernier tick réellement exécuté),
      // puis sync immédiate.
      const away = Date.now() - lastTickAt;
      if (away > 30_000) useGame.getState().applyAwayCatchup(away);
      useGame.getState().cloudSync();
    }
  });
}
