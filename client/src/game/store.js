import { create } from 'zustand';
import {
  GENERATORS,
  GENERATOR_BY_ID,
  UPGRADES,
  UPGRADE_BY_ID,
  ACHIEVEMENTS,
  STAFF,
  STAFF_BY_ID,
  COIN_SKINS,
  COIN_SKIN_BY_ID,
  RENAISSANCE,
  getRenaissanceThreshold,
  COST_FACTOR,
  APPLE,
  APPLE_REWARDS,
  APPLE_TYPES,
  APPLE_RAIN,
  SHADOW_STORM,
  CRYSTAL_PRODUCTION_SECONDS,
  CURSED_DELAY_MS,
  CURSED_BANK_PERCENT,
  DAILY_QUESTS,
  CASES,
  CASE_UPGRADES,
  TAG_BY_ID,
} from './constants';
import { api, getToken, decodePseudo } from '../api/client';
import { playPurchase, playAchievement, playApple } from './audio';

const SAVE_KEY = 'endoclicker_save_v1';
const AUTOSAVE_MS = 5_000;
const CLOUD_SYNC_MS = 60_000;
const OFFLINE_CAP_MS = 8 * 3600_000; // 8 h
const OFFLINE_EFFICIENCY = 0.5;

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
    if (!state.upgrades.includes(u.id)) continue;
    if (u.kind === 'gen') genMult[u.genId] = (genMult[u.genId] || 1) * u.mult;
    if (u.kind === 'global') globalMult *= u.mult;
  }
  let rate = 0;
  for (const g of GENERATORS) {
    rate += (state.generators[g.id] || 0) * g.baseRate * (genMult[g.id] || 1);
  }
  // Bonus permanent des Renaissances (+15 % chacune, additif) et
  // Résonance de l'EndoCrystal (×1,5 si équipé)
  const renaissanceMult =
    1 + (state.renaissances || 0) * RENAISSANCE.multPerRenaissance;
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
  // Le clic profite aussi de 5 % de la production passive
  return (mult + getProduction(state) * 0.05) * getStaffMults(state).click;
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
    shadowStorm: null, // { endsAt } pendant la tempête de clics
    applesRained: 0, // pommes attrapées pendant les pluies
    rainFrenzyCatches: 0, // pommes de pluie attrapées pendant une frénésie
    maxOfflineGain: 0, // plus gros gain hors-ligne encaissé d'un coup
    titleClicks: 0, // clics sur le titre (secret)
    frenziesStarted: 0, // frénésies déclenchées (à vie)
    quests: null, // quêtes du jour : { date, list, start, bonusClaimed }
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

  // 3 types distincts tirés du pool
  const pool = [...DAILY_QUESTS.pool];
  const list = [];
  for (let i = 0; i < DAILY_QUESTS.perDay && pool.length > 0; i++) {
    const idx = Math.floor(rand() * pool.length);
    const q = pool.splice(idx, 1)[0];
    let target;
    if (q.type === 'earn') {
      // 10 à 20 minutes de production actuelle
      const rate = getProduction(s);
      target = Math.max(10_000, Math.round(rate * (600 + rand() * 600)));
    } else {
      target = Math.round(q.min + rand() * (q.max - q.min));
    }
    list.push({ type: q.type, target, claimed: false });
  }
  return { date, list, start: questSnapshots(s), bonusClaimed: false };
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

export const useGame = create((set, get) => ({
  ...initialState(),

  // UI (non sauvegardé)
  apple: null, // { id, x, y, expiresAt }
  nextAppleAt: Date.now() + APPLE.minDelayMs,
  appleRain: null, // { endsAt, spawned } quand la pluie est active
  nextRainSpawnAt: 0,
  rainApples: [], // [{ id, x, fallMs, spawnedAt }]
  // Préférence d'affichage : 'auto' (heure réelle) | 'day' | 'night'
  dayNightPref: localStorage.getItem('endoclicker_daynight') || 'auto',
  toasts: [],
  offlineReport: null, // { durationMs, gains }
  cloudSyncError: false,
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

    // Tempête de clics active : chaque clic lâche des mini-pommes
    if (s.shadowStorm && s.shadowStorm.endsAt > Date.now()) {
      const [min, max] = SHADOW_STORM.minisPerClick;
      const count = min + Math.floor(Math.random() * (max - min + 1));
      const now = Date.now();
      const minis = [];
      for (let i = 0; i < count; i++) {
        minis.push({
          id: now + i + Math.random(),
          x: 5 + Math.random() * 90,
          fallMs:
            APPLE_RAIN.fallMinMs +
            Math.random() * (APPLE_RAIN.fallMaxMs - APPLE_RAIN.fallMinMs),
          spawnedAt: now,
          mini: true,
        });
      }
      set({ rainApples: [...s.rainApples, ...minis] });
    }

    get().checkAchievements();
    return gain;
  },

  // ---------- Achats ----------
  buyGenerator(id, amount = 1) {
    const s = get();
    const gen = GENERATOR_BY_ID[id];
    const owned = s.generators[id] || 0;
    const cost = generatorsCost(gen, owned, amount, getStaffMults(s).genCost);
    if (s.endocraft < cost) return false;
    set({
      endocraft: s.endocraft - cost,
      generators: { ...s.generators, [id]: owned + amount },
    });
    playPurchase();
    get().checkAchievements();
    return true;
  },

  buyUpgrade(id) {
    const s = get();
    const up = UPGRADE_BY_ID[id];
    if (!up || s.upgrades.includes(id) || s.endocraft < up.cost) return false;
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
    if (!member || s.staff.includes(id) || s.endocraft < member.cost) return false;
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
    if (!skin || skin.cost === 0 || s.cosmetics.includes(id) || s.endocraft < skin.cost)
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
    if (skin.cost > 0 && !s.cosmetics.includes(id)) return;
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

    const reward = Math.max(
      1000,
      Math.round(getProduction(s) * DAILY_QUESTS.rewardSeconds)
    );
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

    const bonus =
      Math.max(1000, Math.round(getProduction(s) * DAILY_QUESTS.rewardSeconds)) *
      DAILY_QUESTS.bonusMult;
    set({
      quests: { ...s.quests, bonusClaimed: true },
      endocraft: s.endocraft + bonus,
      totalEndocraft: s.totalEndocraft + bonus,
      lifetimeEndocraft: s.lifetimeEndocraft + bonus,
    });
    playAchievement();
    get().addToast('🏆', 'Journée parfaite !', `Bonus ×3 : +${fmt(bonus)} EndoCraft.`);
    get().checkAchievements();
    return true;
  },

  // ---------- Cases (ouverture à la CS:GO) ----------
  // Tire un drop, l'applique immédiatement et le retourne pour l'animation.
  // Un doublon d'upgrade exclusive est converti en cash (2× le prix).
  openCase(caseId) {
    const s = get();
    const box = CASES.find((c) => c.id === caseId);
    if (!box || s.endocraft < box.cost) return null;

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

    const patch = {
      endocraft: s.endocraft - box.cost,
      casesOpened: s.casesOpened + 1,
    };

    // Application du prix
    if (drop.type === 'cash') {
      const gain = Math.max(1000, box.cost * drop.percent);
      patch.endocraft += gain;
      patch.totalEndocraft = s.totalEndocraft + gain;
      patch.lifetimeEndocraft = s.lifetimeEndocraft + gain;
    } else if (drop.type === 'nothing') {
      // Rien du tout — le vrai rembobinage
    } else if (drop.type === 'bank') {
      // Bonus immédiat : % de la banque, plafonné à 3× le prix de la caisse
      // (sinon les grosses banques rendent les cases gratuites)
      const gain = Math.max(
        50,
        Math.min(s.endocraft * drop.bankPercent, box.cost * 3)
      );
      patch.endocraft += gain;
      patch.totalEndocraft = s.totalEndocraft + gain;
      patch.lifetimeEndocraft = s.lifetimeEndocraft + gain;
    } else if (drop.type === 'frenzy') {
      patch.boostMult = 7;
      patch.boostEndsAt = Date.now() + drop.durationMs;
      patch.frenziesStarted = s.frenziesStarted + 1;
    } else if (drop.type === 'rain') {
      patch.totalEndocraft = s.totalEndocraft;
      patch.lifetimeEndocraft = s.lifetimeEndocraft;
    } else if (drop.type === 'upgrade') {
      const alreadyOwned = s.upgrades.includes(drop.upgradeId);
      if (alreadyOwned) {
        // Doublon → rien du tout
        drop = { ...drop, duplicate: true };
      } else {
        patch.upgrades = [...s.upgrades, drop.upgradeId];
        if (drop.rarity === 'legendaire') {
          patch.caseLegendaryDrops = s.caseLegendaryDrops + 1;
        }
      }
    } else if (drop.type === 'skin') {
      const alreadyOwned = s.cosmetics.includes(drop.skinId);
      if (alreadyOwned) {
        drop = { ...drop, duplicate: true };
      } else {
        patch.cosmetics = [...s.cosmetics, drop.skinId];
        if (drop.rarity === 'legendaire') {
          patch.caseLegendaryDrops = s.caseLegendaryDrops + 1;
        }
      }
    } else if (drop.type === 'tag') {
      const alreadyOwned = (s.tags || []).includes(drop.tagId);
      if (alreadyOwned) {
        drop = { ...drop, duplicate: true };
      } else {
        patch.tags = [...(s.tags || []), drop.tagId];
        patch.equippedTag = drop.tagId; // équipé immédiatement
        if (drop.rarity === 'legendaire') {
          patch.caseLegendaryDrops = s.caseLegendaryDrops + 1;
        }
      }
    }

    set(patch);
    playPurchase();
    if (drop.type === 'rain') get().startAppleRain();
    get().checkAchievements();
    return drop;
  },

  equipTag(id) {
    const s = get();
    if (!(s.tags || []).includes(id)) return;
    set({ equippedTag: s.equippedTag === id ? null : id });
  },

  // ---------- Renaissance ----------
  // Tout repart à zéro (sauf succès, cosmétiques et stats) contre un
  // multiplicateur de production permanent.
  doRenaissance() {
    const s = get();
    if (s.lifetimeEndocraft < getRenaissanceThreshold(s.renaissances)) return false;
    // Empêche les renaissances enchaînées : depuis la dernière renaissance,
    // il faut re-farmer au moins le nouveau seuil. lastRenaissanceLifetime
    // absent (vieille save) = 0, donc le check s'applique aussi.
    if (s.renaissances > 0) {
      const sinceLast = s.lifetimeEndocraft - (s.lastRenaissanceLifetime || 0);
      if (sinceLast < getRenaissanceThreshold(s.renaissances)) return false;
    }
    const newCount = s.renaissances + 1;
    // Les exclusives de cases (kind 'case') survivent à la Renaissance :
    // c'est ce qui justifie leur rareté et le prix des caisses.
    const caseUpgrades = UPGRADES.filter(
      (u) => u.kind === 'case' && s.upgrades.includes(u.id)
    ).map((u) => u.id);
    set({
      endocraft: 0,
      totalEndocraft: 0, // lifetimeEndocraft : jamais remis à zéro
      generators: {},
      upgrades: caseUpgrades,
      staff: [],
      renaissances: newCount,
      lastRenaissanceLifetime: s.lifetimeEndocraft,
      boostMult: 1,
      boostEndsAt: 0,
    });
    get().addToast(
      '🔥',
      `Renaissance n°${newCount} !`,
      `Production permanente +${Math.round(
        newCount * RENAISSANCE.multPerRenaissance * 100
      )} %. Bienvenue dans le cycle.`,
      7000
    );
    get().checkAchievements();
    get().cloudSync();
    return true;
  },

  // ---------- Événements en direct (SSE, déclenchés par un admin) ----------
  // Secret : cliquer sur le titre "EndoClicker"
  clickTitle() {
    const s = get();
    set({ titleClicks: s.titleClicks + 1 });
    get().checkAchievements();
  },

  adminFrenzy(mult, durationMs) {
    set({
      boostMult: mult,
      boostEndsAt: Date.now() + durationMs,
      frenziesStarted: get().frenziesStarted + 1,
    });
    get().addToast(
      '⚡',
      'Frénésie du staff !',
      `Clics ×${mult} pendant ${Math.round(durationMs / 1000)} s — cadeau de l’administration.`,
      6000
    );
  },

  adminSpawnApple(type) {
    const appleType = APPLE_TYPES[type] ? type : get().rollAppleType();
    set({
      apple: {
        id: Date.now(),
        type: appleType,
        x: 15 + Math.random() * 70,
        y: 15 + Math.random() * 70,
        expiresAt: Date.now() + APPLE.visibleMs,
      },
    });
    const def = APPLE_TYPES[appleType];
    get().addToast(
      def.icon,
      'Une pomme est apparue !',
      `L’administration vous a envoyé ${def.name.includes('la') ? 'une' : 'une'} ${def.name.replace(/^Pomme (d'orange|de|d')?/, '').trim() || def.name} — attrapez-la vite !`,
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
        [appleType]: (s.applesByType?.[appleType] || 0) + 1,
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

      if (reward === 'frenzy') {
        const { mult } = APPLE_REWARDS.frenzy;
        // EndoBlaze équipé : frénésie +25 % de durée
        const durationMs =
          APPLE_REWARDS.frenzy.durationMs *
          (equippedPerk(s)?.id === 'frenzyDuration' ? 1.25 : 1);
        set({
          boostMult: mult,
          boostEndsAt: Date.now() + durationMs,
          frenziesStarted: s.frenziesStarted + 1,
        });
        get().addToast('🔥', 'Frénésie !', `Clics ×${mult} pendant 30 s`);
        get().checkAchievements();
      } else {
        // EndoRoi équipé : dîme royale 15 % au lieu de 10 %
        const bankPercent = equippedPerk(s)?.id === 'luckyBonus' ? 0.15 : 0.1;
        const bonus = Math.max(25, get().endocraft * bankPercent);
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

    // --- Pomme d'ombre : tempête de clics ---
    if (appleType === 'ombre') {
      set({ shadowStorm: { endsAt: Date.now() + SHADOW_STORM.durationMs } });
      get().addToast(
        '🌑',
        'Tempête de clics !',
        'Pendant 10 s, chaque clic fait tomber des mini-pommes !',
        6000
      );
      get().checkAchievements();
      return { type: 'ombre' };
    }

    // --- Pomme de cristal : 2 minutes de production immédiates ---
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
        `+${fmt(gain)} EndoCraft (2 minutes de production).`
      );
      get().checkAchievements();
      return { type: 'cristal', gain };
    }

    // --- Pomme maudite : 5 s de doute… puis +20 % de banque ---
    if (appleType === 'maudite') {
      get().addToast('💀', '…', 'Rien ne se passe. C’est inquiétant.', 4500);
      setTimeout(() => {
        const cur = get();
        const bonus = Math.max(50, cur.endocraft * CURSED_BANK_PERCENT);
        set({
          endocraft: cur.endocraft + bonus,
          totalEndocraft: cur.totalEndocraft + bonus,
          lifetimeEndocraft: cur.lifetimeEndocraft + bonus,
        });
        get().addToast(
          '💀',
          'KendiiX l’avait touchée…',
          `…et ça paie : +${Math.round(CURSED_BANK_PERCENT * 100)} % de votre banque !`
        );
        get().checkAchievements();
      }, CURSED_DELAY_MS);
      return { type: 'maudite' };
    }

    return null;
  },

  // ---------- Pluie de pommes ----------
  startAppleRain() {
    set({
      appleRain: { endsAt: Date.now() + APPLE_RAIN.durationMs, spawned: 0 },
      nextRainSpawnAt: Date.now(),
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
    // Mini-pommes de la tempête : 0,5 % de banque ; pluie : 2 %
    const bankPercent = fruit.mini
      ? SHADOW_STORM.miniBankPercent
      : APPLE_RAIN.bankPercent;
    const gain = Math.max(APPLE_RAIN.minGain, s.endocraft * bankPercent);
    set({
      rainApples: s.rainApples.filter((a) => a.id !== id),
      endocraft: s.endocraft + gain,
      totalEndocraft: s.totalEndocraft + gain,
      lifetimeEndocraft: s.lifetimeEndocraft + gain,
      applesRained: fruit.mini ? s.applesRained : s.applesRained + 1,
      shadowMinisCaught: fruit.mini
        ? s.shadowMinisCaught + 1
        : s.shadowMinisCaught,
      // Tempête parfaite : pomme attrapée pendant une frénésie
      ...(s.boostEndsAt > Date.now()
        ? { rainFrenzyCatches: s.rainFrenzyCatches + 1 }
        : {}),
    });
    return gain;
  },

  // ---------- Boucle de jeu ----------
  tick(dtMs) {
    const s = get();
    const patch = {};

    // Production passive + auto-clicker du Développeur (clics avec la
    // puissance réelle, boost de frénésie inclus)
    const rate = getProduction(s);
    const staffMults = getStaffMults(s);
    let gained = (rate * dtMs) / 1000;
    if (staffMults.autoClickPerSec > 0) {
      const boost = s.boostEndsAt > Date.now() ? s.boostMult : 1;
      gained += getClickPower(s) * boost * staffMults.autoClickPerSec * (dtMs / 1000);
    }
    if (gained > 0) {
      patch.endocraft = s.endocraft + gained;
      patch.totalEndocraft = s.totalEndocraft + gained;
      patch.lifetimeEndocraft = s.lifetimeEndocraft + gained;
    }

    patch.playMs = s.playMs + dtMs;
    patch.lastSeen = Date.now();

    // Quêtes du jour : génération au premier tick + reset à minuit local
    if (!s.quests || s.quests.date !== questDateKey()) {
      patch.quests = generateDailyQuests(s);
    }

    // Fin de boost
    if (s.boostEndsAt && s.boostEndsAt <= Date.now()) {
      patch.boostMult = 1;
      patch.boostEndsAt = 0;
    }

    // Fin de la tempête de clics
    if (s.shadowStorm && s.shadowStorm.endsAt <= now) {
      patch.shadowStorm = null;
    }

    // Apparition / expiration de la pomme dorée
    const now = Date.now();
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
        x: 10 + Math.random() * 80, // % de l'écran
        y: 15 + Math.random() * 70,
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
        patch.rainApples = [];
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
            x: 3 + Math.random() * 94, // % de la largeur d'écran
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
    // Retire les pommes arrivées au sol (non attrapées)
    if (s.rainApples.length > 0) {
      const stillFalling = s.rainApples.filter(
        (a) => now - a.spawnedAt < a.fallMs
      );
      if (stillFalling.length !== s.rainApples.length) {
        patch.rainApples = stillFalling;
      }
    }

    set(patch);
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
    set({ toasts: [...get().toasts, { id, icon, title, message }] });
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
      quests: s.quests,
      questsClaimed: s.questsClaimed,
      casesOpened: s.casesOpened,
      caseLegendaryDrops: s.caseLegendaryDrops,
      renaissances: s.renaissances,
      playMs: s.playMs,
      lastSeen: s.lastSeen,
      rev: s.rev || 0,
    };
  },

  applyState(loaded) {
    set({ ...initialState(), ...loaded, lastSeen: Date.now() });
  },

  saveLocal() {
    const state = get().exportState();
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, state }));
    } catch {
      /* quota dépassé : on ignore */
    }
  },

  loadLocal() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.v === 1 && parsed.state) return parsed.state;
    } catch {
      /* sauvegarde corrompue */
    }
    return null;
  },

  // Appelé une fois au démarrage : charge la sauvegarde + calcule les gains hors-ligne
  load() {
    const local = get().loadLocal();
    if (!local) return;
    const state = { ...initialState(), ...local };
    const rate = getProduction(state);

    // Migration UNIQUE : les vieilles sauvegardes n'ont pas de compteur à vie —
    // on le sème une seule fois avec le total de l'époque. (Un max() à chaque
    // chargement posait problème : une modification admin du total à la
    // hausse puis à la baisse laissait le compteur à vie bloqué au max.)
    if (local.lifetimeEndocraft === undefined) {
      state.lifetimeEndocraft = state.totalEndocraft || 0;
    }

    // Gains hors-ligne (plafond étendu par Fl0ryoz, efficacité par MathZMath)
    const away = Date.now() - (local.lastSeen || Date.now());
    let offlineReport = null;
    if (rate > 0 && away > 30_000) {
      const capped = Math.min(away, OFFLINE_CAP_MS + getStaffMults(state).offlineCapBonusMs);
      const eff = Math.min(1, OFFLINE_EFFICIENCY + getStaffMults(state).offlineEffBonus);
      const gains = (rate * capped * eff) / 1000;
      if (gains >= 1) {
        state.endocraft += gains;
        state.totalEndocraft += gains;
        state.lifetimeEndocraft += gains;
        state.maxOfflineGain = Math.max(state.maxOfflineGain || 0, gains);
        offlineReport = { durationMs: capped, gains, eff };
      }
    }

    get().applyState(state);
    // Quêtes du jour (générées si absentes / date différente)
    if (!state.quests || state.quests.date !== questDateKey()) {
      set({ quests: generateDailyQuests(get()) });
    }
    set({ offlineReport });
  },

  // ---------- Sync cloud ----------
  // opts.migration : true pour une fusion post-login (progression locale en
  // avance) — le serveur l'accepte sans contrôle dans la fenêtre post-login.
  async cloudSync(opts = {}) {
    if (!getToken()) return;
    // Au démarrage, on attend d'avoir récupéré l'état cloud (useAuth.init)
    // avant d'envoyer quoi que ce soit.
    if (!get().cloudReady) return;
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
      }
      // Autres erreurs réseau : on retentera au prochain cycle
    }
  },
}));

// ---------- Boucle globale (démarrée depuis App) ----------

let loopStarted = false;

export function startGameLoop() {
  if (loopStarted) return;
  loopStarted = true;

  const TICK = 100;
  let lastAchievementCheck = 0;
  let lastSave = 0;
  let lastCloudSync = 0;

  setInterval(() => {
    const store = useGame.getState();
    store.tick(TICK);

    const now = Date.now();
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

  // Sauvegarde de secours avant fermeture
  window.addEventListener('beforeunload', () => {
    useGame.getState().saveLocal();
  });
  document.addEventListener('visibilitychange', () => {
    const state = document.visibilityState;
    if (state === 'hidden') {
      useGame.getState().saveLocal();
      useGame.getState().cloudSync();
    } else if (state === 'visible') {
      // Retour sur l'onglet : sync immédiate (les timers étaient ralentis
      // en arrière-plan, le score serveur peut être en retard)
      useGame.getState().cloudSync();
    }
  });
}
