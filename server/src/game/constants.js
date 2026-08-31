// ============================================================
// EndoClicker — définitions du jeu (V2)
// (générateurs, améliorations, succès, pomme dorée)
// ============================================================

import { fmt } from './format.js';

export const COST_FACTOR = 1.15;

// Part de la production qui s'ajoute à la puissance de clic.
// Les multiplicateurs de clic (staff, exclusives) ne s'appliquent
// QU'aux pioches : sinon le clic devient la stratégie dominante.
export const CLICK_PRODUCTION_SHARE = 0.05;

// ---------- Générateurs (production passive d'EndoCraft) ----------
// Textures : Pixel Perfection CE (CC BY-SA 4.0) — voir client/public/textures/
// Courbe V2 : payback 1er achat de 30 s (bûcheron) à ~12 min (shulker),
// puis redescente (cœur 750 s) — les paliers ×60 font le reste.
export const GENERATORS = [
  {
    id: 'bucheron',
    name: 'Bûcheron',
    icon: '/textures/iron_axe.png',
    baseCost: 15,
    baseRate: 0.5,
    desc: 'Abat des forêts entières pendant que vous cliquez.',
  },
  {
    id: 'mineur',
    name: 'Mineur',
    icon: '/textures/iron_pickaxe.png',
    baseCost: 100,
    baseRate: 3,
    desc: 'Creuse sans relâche à la recherche de pépites d’EndoCraft.',
  },
  {
    id: 'pecheur',
    name: 'Pêcheur automatique',
    icon: '/textures/fishing_rod.png',
    baseCost: 1_100,
    baseRate: 12,
    desc: 'Remonte des trésors au bout de sa canne à pêche infinie.',
  },
  {
    id: 'ferme',
    name: 'Ferme à mobs',
    icon: '/textures/rotten_flesh.png',
    baseCost: 12_000,
    baseRate: 66,
    desc: 'Une exploitation bien rodée… et parfaitement légale.',
  },
  {
    id: 'villageois',
    name: 'Villageois trader',
    icon: '/textures/emerald.png',
    baseCost: 130_000,
    baseRate: 390,
    desc: 'Hhhmm. Il revend tout, toujours plus cher.',
  },
  {
    id: 'golem',
    name: 'Golem de fer',
    icon: '/textures/iron_ingot.png',
    baseCost: 1.4e6,
    baseRate: 2_000,
    desc: 'Imposant, loyal, et étonnamment doué pour le commerce.',
  },
  {
    id: 'nether',
    name: 'Portail du Nether',
    icon: '/textures/obsidian.png',
    baseCost: 2e7,
    baseRate: 17_400,
    desc: 'Le nectar du Nether se monnaie très cher.',
  },
  {
    id: 'deepdark',
    name: 'Mineur du Deep Dark',
    icon: '/textures/diamond.png',
    baseCost: 3.3e8,
    baseRate: 4.4e5,
    desc: 'Il extrait en silence… surtout ne réveillez pas le Warden.',
  },
  {
    id: 'end',
    name: 'Portail de l’End',
    icon: '/textures/ender_eye.png',
    baseCost: 5.1e9,
    baseRate: 5.6e6,
    desc: 'Un passage direct vers les cités de l’End.',
  },
  {
    id: 'dragon',
    name: 'Ender Dragon',
    icon: '/textures/dragon_egg.png',
    baseCost: 7.5e10,
    baseRate: 7.5e7,
    desc: 'Apprivoisé, il garde jalousement votre trésor.',
  },
  {
    id: 'shulker',
    name: 'Shulker de l’End',
    icon: '/textures/shulker_shell.png',
    baseCost: 8e11,
    baseRate: 8e8,
    desc: 'Sa boîte contient plus d’EndoCraft que l’univers lui-même.',
  },
  {
    id: 'wither',
    name: 'Wither dompté',
    icon: '/textures/nether_star.png',
    baseCost: 1e13,
    baseRate: 1.06e10,
    desc: 'Trois têtes valent mieux qu’une.',
  },
  {
    id: 'balise',
    name: 'Balise de l’Infini',
    icon: '/textures/beacon.png',
    baseCost: 1.2e14,
    baseRate: 7e10,
    desc: 'Son rayon transmue la bedrock en EndoCraft.',
  },
  {
    id: 'trident',
    name: 'Trident légendaire',
    icon: '/textures/trident.png',
    baseCost: 1.5e15,
    baseRate: 1.1e12,
    desc: 'Arraché à un Guardian, il canalise la foudre… et les pépites.',
  },
  {
    id: 'totem',
    name: 'Totem d’immortalité',
    icon: '/textures/totem_of_undying.png',
    baseCost: 2e16,
    baseRate: 2e13,
    desc: 'Il ramène votre fortune d’entre les morts. Indéfiniment.',
  },
  {
    id: 'coeur',
    name: 'Cœur de l’Ancien',
    icon: '/textures/heart_of_the_sea.png',
    baseCost: 3e17,
    baseRate: 4e14,
    desc: 'Battez au rythme de l’océan primordial. Chaque pulsation paie.',
  },
];

// ---------- Améliorations de clic (paliers de pioches) ----------
export const CLICK_UPGRADES = [
  { id: 'pick-bois', name: 'Pioche en bois', icon: '/textures/wooden_pickaxe.png', cost: 150, mult: 2, desc: 'L’essentiel pour débuter.' },
  { id: 'pick-pierre', name: 'Pioche en pierre', icon: '/textures/stone_pickaxe.png', cost: 1_500, mult: 2, desc: 'Un cran au-dessus.' },
  { id: 'pick-fer', name: 'Pioche en fer', icon: '/textures/iron_pickaxe.png', cost: 2e4, mult: 2, desc: 'Solide et fiable.' },
  { id: 'pick-diamant', name: 'Pioche en diamant', icon: '/textures/diamond_pickaxe.png', cost: 3e5, mult: 2, desc: 'Brille de mille éclats.' },
  { id: 'pick-netherite', name: 'Pioche en netherite', icon: '/textures/netherite_pickaxe.png', cost: 5e6, mult: 3, desc: 'L’arme ultime du mineur.' },
  { id: 'ench-efficacite', name: 'Enchantement Efficacité V', icon: '/textures/enchanted_book.png', cost: 1e8, mult: 3, desc: 'Vos clics deviennent fulgurants.' },
  { id: 'ench-fortune', name: 'Enchantement Fortune III', icon: '/textures/experience_bottle.png', cost: 2e9, mult: 4, desc: 'Chaque clic rapporte une fortune.' },
  { id: 'ench-mending', name: 'Enchantement Mending', icon: '/textures/redstone.png', cost: 5e10, mult: 4, desc: 'Vos clics se réparent en vous enrichissant.' },
  { id: 'griffe-wither', name: 'Griffe du Wither', icon: '/textures/nether_star.png', cost: 5e12, mult: 4, desc: 'Arrachée du boss lui-même. Ça griffe fort.' },
];

// ---------- Overclocks (auto-clicker d'Emmanuel2403) ----------
export const AUTO_CLICK_UPGRADES = [
  { id: 'overclock-1', kind: 'autoClick', name: 'Overclock I', icon: '/textures/repeater.png', cost: 1e9, autoClickBonus: 1, desc: 'Auto-clicker : +1 clic/s (3 cumulés).' },
  { id: 'overclock-2', kind: 'autoClick', name: 'Overclock II', icon: '/textures/blaze_powder.png', cost: 1e10, autoClickBonus: 2, desc: 'Auto-clicker : +2 clics/s (5 cumulés).' },
  { id: 'overclock-3', kind: 'autoClick', name: 'Overclock III', icon: '/textures/beacon.png', cost: 1e11, autoClickBonus: 3, desc: 'Auto-clicker : +3 clics/s. La machine est chaude.' },
];

// ---------- Améliorations hors-ligne ----------
export const OFFLINE_UPGRADES = [
  { id: 'lanterne', kind: 'offline', name: 'Lanterne de mineur', icon: '/textures/torch.png', cost: 1e9, offlineEffBonus: 0.2, desc: 'Gains hors-ligne : +20 % d’efficacité.' },
  { id: 'veilleur', kind: 'offline', name: 'Veilleur de nuit', icon: '/textures/soul_torch.png', cost: 1e10, offlineCapBonusMs: 2 * 3600_000, desc: 'Gains hors-ligne : plafond +2 h.' },
  { id: 'horloge-nether', kind: 'offline', name: 'Horloge du Nether', icon: '/textures/quartz.png', cost: 1e11, offlineEffBonus: 0.2, desc: 'Gains hors-ligne : +20 % d’efficacité supplémentaires.' },
];

// ---------- Améliorations de générateurs (auto-générées) ----------
// Débloquées quand on possède assez d'exemplaires du générateur.
// Les hauts paliers rapportent plus que ×2 : jusqu'à ×60 par générateur.
const GEN_UPGRADE_TIERS = [
  { count: 10, costMult: 12, mult: 2, label: 'Confirmés' },
  { count: 25, costMult: 120, mult: 2, label: 'Experts' },
  { count: 50, costMult: 1_500, mult: 3, label: 'Vétérans' },
  { count: 100, costMult: 20_000, mult: 5, label: 'Légendaires' },
];

export const GENERATOR_UPGRADES = GENERATORS.flatMap((gen) =>
  GEN_UPGRADE_TIERS.map((tier) => ({
    id: `gen-${gen.id}-${tier.count}`,
    kind: 'gen',
    genId: gen.id,
    name: `${gen.name}s ${tier.label.toLowerCase()}`,
    icon: gen.icon,
    cost: Math.ceil(gen.baseCost * tier.costMult),
    mult: tier.mult,
    req: { genId: gen.id, count: tier.count },
    desc: `Production des ${gen.name.toLowerCase()}s ×${tier.mult}. Requiert ${tier.count} exemplaires.`,
  }))
);

// ---------- Améliorations globales (production totale) ----------
// Couronne de fin de run : au-delà du 16e générateur, rachetées à
// chaque Renaissance. Elles ne surviennent PAS au reset — c'est le but.
export const GLOBAL_UPGRADES = [
  {
    id: 'global-lingot',
    kind: 'global',
    name: 'Lingot de l’au-delà',
    icon: '/textures/netherite_ingot.png',
    cost: 4e17,
    mult: 2,
    desc: 'Production totale ×2. Forgé dans un feu qui n’existe pas.',
  },
  {
    id: 'global-elytra',
    kind: 'global',
    name: 'Ailes de l’End',
    icon: '/textures/elytra.png',
    cost: 6e18,
    mult: 2,
    desc: 'Production totale ×2. Planer au-dessus de la concurrence.',
  },
  {
    id: 'global-bedrock',
    kind: 'global',
    name: 'Socle de bedrock',
    icon: '/textures/bedrock.png',
    cost: 1e20,
    mult: 2,
    desc: 'Production totale ×2. L’économie ne s’effondrera plus jamais.',
  },
];

// ---------- Améliorations d'équipe (icône = tête du membre) ----------
// Nécessitent d'avoir recruté le membre concerné.
export const STAFF_UPGRADES = [
  {
    id: 'up-goatandcow', kind: 'staff', staffId: 'goatandcow',
    name: 'GoatAndCow — Égo surdimensionné',
    icon: '/heads/GoatAndCow.png', cost: 1e12,
    productionMult: 1.3, clickMult: 1.3,
    desc: 'Production ×1,3 et clics ×1,3. Son ego prend deux postes.',
  },
  {
    id: 'up-emmanuel2403', kind: 'staff', staffId: 'emmanuel2403',
    name: 'Emmanuel2403 — Deuxième développeur',
    icon: '/heads/Emmanuel2403.png', cost: 3e11,
    autoClickPerSec: 2,
    desc: 'Auto-clicker : +2 clics/s. Il a cloné l’auto-clicker.',
  },
  {
    id: 'up-kuani', kind: 'staff', staffId: 'kuani',
    name: 'Kuani — Le bureau doré',
    icon: '/heads/Kuani.png', cost: 8e10,
    productionMult: 1.25,
    desc: 'Production ×1,25. Même le bureau produit de la valeur.',
  },
  {
    id: 'up-lulu62111', kind: 'staff', staffId: 'lulu62111',
    name: 'Lulu62111 — Salle de clash officielle',
    icon: '/heads/Lulu62111.png', cost: 5e10,
    clickMult: 1.4,
    desc: 'Clics ×1,4. Ses tickets motivent tout le monde.',
  },
  {
    id: 'up-mathzmath', kind: 'staff', staffId: 'mathzmath',
    name: 'MathZMath — Câblage refait par un pro',
    icon: '/heads/MathZMath.png', cost: 1e11,
    offlineEffBonus: 0.15,
    desc: 'Gains hors-ligne : +15 % d’efficacité. Zéro euro de réseau cette fois.',
  },
  {
    id: 'up-zoxxio', kind: 'staff', staffId: 'zoxxio',
    name: 'ZoxXio — Container de tours Eiffel',
    icon: '/heads/ZoxXio.png', cost: 1e11,
    genCostMult: 0.96,
    desc: 'Générateurs −4 %. En gros au kilomètre.',
  },
  {
    id: 'up-letsgo2myhome', kind: 'staff', staffId: 'letsgo2myhome',
    name: 'LetsGo2Myhome — Veilleuse anti-sommeil',
    icon: '/heads/LetsGo2Myhome.png', cost: 1e11,
    appleFreqMult: 1.15,
    desc: 'Pommes dorées ×1,15 plus fréquentes. Il les voit arriver de loin.',
  },
  {
    id: 'up-fl0ryoz', kind: 'staff', staffId: 'fl0ryoz',
    name: 'Fl0ryoz — Nuit blanche éternelle',
    icon: '/heads/Fl0ryoz.png', cost: 1e11,
    offlineCapBonusMs: 2 * 3600_000,
    desc: 'Gains hors-ligne : plafond +2 h. Il ne dort plus depuis 2019.',
  },
  {
    id: 'up-azale_e', kind: 'staff', staffId: 'azale_e',
    name: 'Azale_e — Ménage de printemps',
    icon: '/heads/Azale_e.png', cost: 1e11,
    appleFreqMult: 1.1,
    desc: 'Pommes ×1,10 plus fréquentes. Elle balaie le verger, elles tombent toutes seules.',
  },
  {
    id: 'up-kendiix', kind: 'staff', staffId: 'kendiix',
    name: 'KendiiX — Formation MELEC avancée',
    icon: '/heads/KendiiX.png', cost: 1e6,
    productionMult: 0.889,
    desc: 'Production ×0,9 → ×0,8. Il a encore suivi une formation.',
  },
];

export const CASE_UPGRADES = [
  {
    id: 'case-pioche-destin', kind: 'case', rarity: 'epique',
    name: 'Pioche du Destin', icon: '/textures/netherite_pickaxe.png',
    clickMult: 4,
    desc: 'Clics ×4, pour toujours. Le plus gros multiplicateur de clic du jeu : il se cumule avec vos pioches et les bonus de l’équipe. Conservée après une Renaissance.',
  },
  {
    id: 'case-coeur-serveur', kind: 'case', rarity: 'epique',
    name: 'Cœur du Serveur', icon: '/textures/heart_of_the_sea.png',
    productionMult: 2,
    desc: 'Production passive ×2, pour toujours. Tous vos générateurs rapportent deux fois plus, sans condition. Conservée après une Renaissance.',
  },
  {
    id: 'case-oeil-kendiix', kind: 'case', rarity: 'rare',
    name: 'Œil de KendiiX', icon: '/textures/ender_eye.png',
    productionMult: 1.111,
    desc: 'Production ×1,11 en permanence. Il regarde ailleurs : le malus de KendiiX (×0,9) est annulé si vous l’avez recruté. Conservée après une Renaissance.',
  },
  {
    id: 'case-benediction', kind: 'case', rarity: 'legendaire',
    name: 'Bénédiction de l’End', icon: '/textures/beacon.png',
    productionMult: 3,
    desc: 'Production passive ×3, pour toujours. La perle de l’End : le plus gros bonus de production permanent du jeu. Conservée après une Renaissance.',
  },
  {
    id: 'case-verger-infini', kind: 'case', rarity: 'rare',
    name: 'Verger infini', icon: '/textures/golden_apple.png',
    appleFreqMult: 2,
    desc: 'Les pommes dorées apparaissent deux fois plus souvent, pour toujours. Se cumule avec LetsGo2Myhome (×1,3) et Azale_e (×1,15). Conservée après une Renaissance.',
  },
  {
    id: 'case-mains-dorees', kind: 'case', rarity: 'rare',
    name: 'Mains dorées', icon: '/textures/golden_apple.png',
    clickMult: 2,
    desc: 'Clics ×2, pour toujours. Se cumule avec vos pioches et les bonus de l’équipe (Lulu62111, GoatAndCow…). Conservée après une Renaissance.',
  },
];

// ---------- Liste unifiée ----------
export const UPGRADES = [
  ...CLICK_UPGRADES.map((u) => ({
    ...u,
    kind: 'click',
    desc: `Puissance de clic ×${u.mult}. ${u.desc}`,
  })),
  ...GENERATOR_UPGRADES,
  ...GLOBAL_UPGRADES,
  ...AUTO_CLICK_UPGRADES,
  ...OFFLINE_UPGRADES,
  ...STAFF_UPGRADES,
  ...CASE_UPGRADES,
];

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));
export const GENERATOR_BY_ID = Object.fromEntries(
  GENERATORS.map((g) => [g.id, g])
);

// ---------- Équipe (améliorations spéciales : le staff du serveur) ----------
// Icônes = têtes des joueurs (client/public/heads/), récupérées via mc-heads.net
export const STAFF = [
  {
    id: 'goatandcow',
    pseudo: 'GoatAndCow',
    role: 'Créateur',
    roleClass: 'chip chip-warning',
    icon: '/heads/GoatAndCow.png',
    cost: 1e9,
    effects: { productionMult: 1.3, clickMult: 1.3 },
    desc: 'Moi. Le créateur. Le meilleur, tout simplement. Ce jeu est mon génie — applaudissez, c’est gratuit.',
    effectLabel: 'Production ×1,30 et clics ×1,30',
  },
  {
    id: 'emmanuel2403',
    pseudo: 'Emmanuel2403',
    role: 'Développeur',
    roleClass: 'chip chip-info',
    icon: '/heads/Emmanuel2403.png',
    cost: 5e7,
    effects: { autoClickPerSec: 2 },
    desc: 'Il reprend le serveur en main. Première mise à jour : un auto-clicker.',
    effectLabel: '2 clics automatiques par seconde',
  },
  {
    id: 'kuani',
    pseudo: 'Kuani',
    role: 'Gérant',
    roleClass: 'chip chip-accent',
    icon: '/heads/Kuani.png',
    cost: 2.5e7,
    effects: { productionMult: 1.25 },
    desc: 'Le meilleur, mais il a peur du changement… faut bien lui trouver un défaut.',
    effectLabel: 'Production ×1,25',
  },
  {
    id: 'lulu62111',
    pseudo: 'Lulu62111',
    role: 'Admin',
    roleClass: 'chip chip-danger',
    icon: '/heads/Lulu62111.png',
    cost: 8e6,
    effects: { clickMult: 2 },
    desc: 'Encore un bébé, mais il clash dans les tickets — ça fait son charme.',
    effectLabel: 'Clics ×2',
  },
  {
    id: 'mathzmath',
    pseudo: 'MathZMath',
    role: 'Gérant',
    roleClass: 'chip chip-accent',
    icon: '/heads/MathZMath.png',
    cost: 5e6,
    effects: { offlineEffBonus: 0.15 },
    desc: 'Chacun son taff, on ne touche pas à ce qu’on ne sait pas faire. Il a essayé : 200 € de réseau.',
    effectLabel: 'Gains hors-ligne : 60 % → 75 %',
  },
  {
    id: 'zoxxio',
    pseudo: 'ZoxXio',
    role: 'Modo',
    roleClass: 'chip chip-info',
    icon: '/heads/ZoxXio.png',
    cost: 4e6,
    effects: { genCostMult: 0.94 },
    desc: 'Le pak-pak des tours Eiffel. Il négocie même vos générateurs.',
    effectLabel: 'Générateurs −6 %',
  },
  {
    id: 'letsgo2myhome',
    pseudo: 'LetsGo2Myhome',
    role: 'Modo',
    roleClass: 'chip chip-info',
    icon: '/heads/LetsGo2Myhome.png',
    cost: 3e6,
    effects: { appleFreqMult: 1.3 },
    desc: 'Il veille surtout la nuit — rien ne lui échappe, surtout pas les pommes dorées.',
    effectLabel: 'Pommes dorées ×1,3 plus fréquentes',
  },
  {
    id: 'fl0ryoz',
    pseudo: 'Fl0ryoz',
    role: 'Modo',
    roleClass: 'chip chip-info',
    icon: '/heads/Fl0ryoz.png',
    cost: 2e6,
    effects: { offlineCapBonusMs: 4 * 3600_000 },
    desc: 'Là depuis la nuit des temps. Il modérait déjà avant la première pierre posée.',
    effectLabel: '+4 h de gains hors-ligne (18 h max)',
  },
  {
    id: 'azale_e',
    pseudo: 'Azale_e',
    role: 'Modo',
    roleClass: 'chip chip-info',
    icon: '/heads/Azale_e.png',
    cost: 2e6,
    effects: { productionMult: 1.15 },
    desc: 'Elle devrait être à la cuisine, mais finalement, elle est là.',
    effectLabel: 'Production ×1,15',
  },
  {
    id: 'kendiix',
    pseudo: 'KendiiX',
    role: 'Modélisateur',
    roleClass: 'chip chip-storm',
    icon: '/heads/KendiiX.png',
    cost: 1,
    effects: { productionMult: 0.9 },
    malus: true,
    desc: 'Il comprend tout de travers — il est en bac pro MELEC après tout. Au moins, il a le mérite d’être là.',
    effectLabel: 'Production ×0,90 (oui, c’est un malus)',
  },
];

export const STAFF_BY_ID = Object.fromEntries(STAFF.map((m) => [m.id, m]));

// ---------- Succès ----------
// `check` reçoit des stats agrégées du joueur.
export const ACHIEVEMENTS = [
  { id: 'click-1', name: 'Premier clic', icon: '👆', desc: 'Cliquer une fois sur l’EndoCraft.', check: (s) => s.clicks >= 1 },
  { id: 'click-100', name: 'Doigts agiles', icon: '✋', desc: 'Atteindre 100 clics.', check: (s) => s.clicks >= 100 },
  { id: 'click-1000', name: 'Machine à cliquer', icon: '🖱️', desc: 'Atteindre 1 000 clics.', check: (s) => s.clicks >= 1000 },
  { id: 'click-10000', name: 'Légende du clic', icon: '🏆', desc: 'Atteindre 10 000 clics.', check: (s) => s.clicks >= 10000 },
  { id: 'click-atomique', name: 'Clic atomique', icon: '💪', desc: 'Atteindre 1 million d’EndoCraft par clic.', check: (s) => s.clickPower >= 1e6 },
  { id: 'speed-1m', name: 'Éclair', icon: '⚡', desc: 'Récolter 1 milliard d’EndoCraft en moins de 4 heures de jeu.', check: (s) => s.totalEndocraft >= 1e9 && s.playMs <= 14_400_000 },
  { id: 'speed-1b', name: 'Supersonique', icon: '🚀', desc: 'Récolter 1 000 milliards d’EndoCraft en moins de 8 heures de jeu.', check: (s) => s.totalEndocraft >= 1e12 && s.playMs <= 28_800_000 },
  { id: 'total-100', name: 'Premières pépites', icon: '🪙', desc: 'Récolter 100 EndoCraft au total.', check: (s) => s.totalEndocraft >= 100 },
  { id: 'total-10k', name: 'Petite fortune', icon: '💰', desc: 'Récolter 10 000 EndoCraft au total.', check: (s) => s.totalEndocraft >= 1e4 },
  { id: 'total-1m', name: 'Millionnaire', icon: '🤑', desc: 'Récolter 1 million d’EndoCraft au total.', check: (s) => s.totalEndocraft >= 1e6 },
  { id: 'total-100m', name: 'Magnat de l’End', icon: '🏦', desc: 'Récolter 100 millions d’EndoCraft au total.', check: (s) => s.totalEndocraft >= 1e8 },
  { id: 'total-10b', name: 'Économie de l’End', icon: '🌌', desc: 'Récolter 10 milliards d’EndoCraft au total.', check: (s) => s.totalEndocraft >= 1e10 },
  { id: 'total-1t', name: 'Endo-Trillionnaire', icon: '🌠', desc: 'Récolter 1 000 milliards d’EndoCraft au total.', check: (s) => s.totalEndocraft >= 1e12 },
  { id: 'total-1qa', name: 'Économie galactique', icon: '🌌', desc: 'Récolter 1 quadrillion d’EndoCraft au total.', check: (s) => s.totalEndocraft >= 1e15 },
  { id: 'bank-1t', name: 'Grosses poches', icon: '👖', desc: 'Avoir 100 000 milliards d’EndoCraft en banque d’un coup.', check: (s) => s.bank >= 1e14 },
  { id: 'gen-1', name: 'Premier employé', icon: '🪓', desc: 'Acheter un premier générateur.', check: (s) => s.totalGenerators >= 1 },
  { id: 'gen-10', name: 'Petite équipe', icon: '👥', desc: 'Posséder 10 générateurs.', check: (s) => s.totalGenerators >= 10 },
  { id: 'gen-50', name: 'Entreprise prospère', icon: '🏢', desc: 'Posséder 50 générateurs.', check: (s) => s.totalGenerators >= 50 },
  { id: 'gen-100', name: 'Empire industriel', icon: '🏭', desc: 'Posséder 100 générateurs.', check: (s) => s.totalGenerators >= 100 },
  { id: 'all-gens', name: 'Collectionneur', icon: '🗃️', desc: 'Posséder au moins un exemplaire de chaque générateur.', check: (s) => s.distinctGenerators >= GENERATORS.length },
  { id: 'dragon', name: 'Maître du dragon', icon: '🐉', desc: 'Apprivoiser l’Ender Dragon.', check: (s) => s.dragons >= 1 },
  { id: 'dragon-25', name: 'Élevage de dragons', icon: '🐲', desc: 'Posséder 25 Ender Dragons simultanément.', check: (s) => s.dragons >= 25 },
  { id: 'balise', name: 'Full Beam', icon: '🗼', desc: 'Construire une Balise de l’Infini.', check: (s) => s.balises >= 1 },
  { id: 'up-5', name: 'Bien équipé', icon: '🔧', desc: 'Acheter 5 améliorations.', check: (s) => s.upgradesOwned >= 5 },
  { id: 'up-15', name: 'Suréquipé', icon: '⚙️', desc: 'Acheter 15 améliorations.', check: (s) => s.upgradesOwned >= 15 },
  { id: 'up-25', name: 'Arsenal complet', icon: '🛠️', desc: 'Acheter 25 améliorations.', check: (s) => s.upgradesOwned >= 25 },
  { id: 'apple-1', name: 'Pomme chanceuse', icon: '🍎', desc: 'Attraper une pomme dorée.', check: (s) => s.applesClicked >= 1 },
  { id: 'degustateur', name: 'Dégustateur', icon: '🍽️', desc: 'Attraper au moins une pomme de chaque type.', check: (s) => ['doree', 'orage', 'ombre', 'cristal', 'maudite'].every((t) => (s.applesByType?.[t] || 0) >= 1) },
  { id: 'cristal-10', name: 'Collectionneur de cristaux', icon: '💎', desc: 'Attraper 10 pommes de cristal.', check: (s) => (s.applesByType?.cristal || 0) >= 10 },
  { id: 'maudite-10', name: 'C’est bon, j’aime ça', icon: '☠️', desc: 'Attraper 10 pommes maudites. Le doute devient une habitude.', check: (s) => (s.applesByType?.maudite || 0) >= 10 },
  { id: 'boucherie-50', name: 'Boucherie', icon: '🔨', desc: 'Attraper 50 mini-pommes pendant les tempêtes de clics.', check: (s) => (s.shadowMinisCaught || 0) >= 50 },
  { id: 'apple-10', name: 'Verger magique', icon: '🍏', desc: 'Attraper 10 pommes dorées.', check: (s) => s.applesClicked >= 10 },
  { id: 'apple-25', name: 'Verger légendaire', icon: '🌳', desc: 'Attraper 25 pommes dorées.', check: (s) => s.applesClicked >= 25 },
  { id: 'rain-1', name: 'Sous la pluie', icon: '🌧️', desc: 'Attraper une pomme pendant une pluie de pommes.', check: (s) => s.applesRained >= 1 },
  { id: 'rain-20', name: 'Danse de la pluie', icon: '☔', desc: 'Attraper 20 pommes durant les pluies.', check: (s) => s.applesRained >= 20 },
  { id: 'renaissance-1', name: 'Phénix', icon: '🔥', desc: 'Renaître une première fois.', check: (s) => s.renaissances >= 1 },
  { id: 'renaissance-5', name: 'Cycle éternel', icon: '♻️', desc: 'Renaître 5 fois. Le grind n’a plus de secret.', check: (s) => s.renaissances >= 5 },
  { id: 'renaissance-10', name: 'Bouddha du clic', icon: '🧘', desc: 'Renaître 10 fois. Le cycle n’a plus d’emprise sur vous.', check: (s) => s.renaissances >= 10 },
  { id: 'cosmetic-all', name: 'Garde-robe complète', icon: '👛', desc: 'Posséder tous les skins de pièce payants.', check: (s) => s.cosmeticsCount >= 3 },
  { id: 'masochiste', name: 'Masochiste', icon: '😈', desc: 'Améliorer KendiiX. Volontairement. Avec vos EndoCraft.', check: (s) => s.upgradeIds.includes('up-kendiix') },
  { id: 'direction', name: 'Direction générale', icon: '🏛️', desc: 'Recruter toute l’équipe ET acheter toutes ses améliorations (20 objets).', check: (s) => s.staffIds.length >= STAFF.length && STAFF_UPGRADES.every((u) => s.upgradeIds.includes(u.id)) },
  { id: 'centurion', name: 'Centurion', icon: '💯', desc: 'Posséder 100 exemplaires d’un même générateur.', check: (s) => s.maxGenCount >= 100 },
  { id: 'tempete', name: 'Tempête parfaite', icon: '🌪️', desc: 'Attraper une pomme de pluie pendant une frénésie.', check: (s) => s.rainFrenzyCatches >= 1 },
  { id: 'dormir-riche', name: 'Dormir riche', icon: '😴', desc: 'Encaisser 1 000 milliards d’EndoCraft de gains hors-ligne d’un coup.', check: (s) => s.maxOfflineGain >= 1e12 },
  { id: 'curieux', name: 'Le curieux', icon: '🧐', desc: 'Un secret bien caché quelque part sur cette page…', check: (s) => s.titleClicks >= 25 },
  { id: 'quest-1', name: 'Premier jour au travail', icon: '📋', desc: 'Réclamer une quête quotidienne.', check: (s) => s.questsClaimed >= 1 },
  { id: 'quest-50', name: 'Employé du mois', icon: '💼', desc: 'Réclamer 50 quêtes quotidiennes. Le CDI est signé.', check: (s) => s.questsClaimed >= 50 },
  { id: 'case-1', name: 'Parieur', icon: '🎁', desc: 'Ouvrir une première caisse.', check: (s) => s.casesOpened >= 1 },
  { id: 'case-25', name: 'Accro au jeu', icon: '🎰', desc: 'Ouvrir 25 caisses. La maison gagne toujours… sauf ici.', check: (s) => s.casesOpened >= 25 },
  { id: 'case-legend', name: 'Main bénie', icon: '🌟', desc: 'Obtenir un drop LÉGENDAIRE dans une caisse.', check: (s) => s.caseLegendaryDrops >= 1 },
  { id: 'time-1h', name: 'Accro', icon: '⏰', desc: 'Jouer pendant 1 heure.', check: (s) => s.playMs >= 3600_000 },
  { id: 'time-10h', name: 'Légende vivante', icon: '🗿', desc: 'Jouer pendant 10 heures.', check: (s) => s.playMs >= 10 * 3600_000 },
  { id: 'staff-kendiix', name: 'Pourquoi ?', icon: '💀', desc: 'Recruter KendiiX. Vous n’aviez vraiment rien de mieux à faire.', check: (s) => s.staffIds.includes('kendiix') },
  { id: 'staff-all', name: 'Équipe au complet', icon: '👑', desc: 'Recruter toute l’équipe. Oui, même lui.', check: (s) => s.staffIds.length >= STAFF.length },
  { id: 'cosmetic-1', name: 'Chic !', icon: '🎩', desc: 'Acheter un cosmétique pour votre pièce.', check: (s) => s.cosmeticsCount >= 1 },
];

// ---------- Cosmétiques (skins de la pièce cliquable) ----------
// Chaque skin apporte un POUVOIR UNIQUE quand il est équipé (perk),
// en plus de sa palette d'effets visuels (fx).
export const COIN_SKINS = [
  {
    id: 'default',
    name: 'EndoCraft',
    icon: '/logo.png',
    cost: 0,
    desc: 'La pièce originale du serveur. Un classique intemporel.',
    perk: { label: 'Aucun pouvoir — juste la classe intemporelle.' },
    // Thème par défaut (orange) — voir fx.js
  },
  {
    id: 'endosage',
    name: 'EndoSage',
    icon: '/cosmetics/endosage.png',
    cost: 5e9,
    desc: 'La version sage de la pièce. Verte, apaisante, redoutable.',
    perk: {
      id: 'appleDuration',
      label: 'Sagesse : les pommes dorées restent visibles 50 % plus longtemps (18 s).',
    },
    fx: {
      colors: ['#7ed957', '#a8e6a3', '#5bbf4a', '#c9f2c0', '#8ed081'],
      float: '#c9f7c1',
      glow: 'rgba(110, 198, 96, 0.6)',
      halo: 'rgba(126, 217, 87, 0.3)',
      ripple: 'rgba(168, 230, 163, 0.85)',
    },
  },
  {
    id: 'endoblaze',
    name: 'EndoBlaze',
    icon: '/cosmetics/endoblaze.png',
    cost: 1e10,
    desc: 'La pièce du Nexus de feu. Sa gemme brûle d’un millénaire de clics.',
    perk: {
      id: 'frenzyDuration',
      label: 'Cœur ardent : les frénésies durent 25 % plus longtemps (37,5 s).',
    },
    fx: {
      colors: ['#e8641a', '#f59b3d', '#ffd98a', '#ffebb0', '#8a3823'],
      float: '#ffebb0',
      glow: 'rgba(245, 155, 61, 0.6)',
      halo: 'rgba(232, 100, 26, 0.3)',
      ripple: 'rgba(255, 217, 138, 0.85)',
    },
  },
  {
    id: 'endoroi',
    name: 'EndoRoi',
    icon: '/cosmetics/endoroi.png',
    cost: 2e10,
    desc: 'La pièce de ceux qui cliquent sur un trône. Couronne incluse.',
    perk: {
      id: 'luckyBonus',
      label: 'Dîme royale : les pommes chanceuses rapportent 12 % de la banque (au lieu de 10 %).',
    },
    fx: {
      colors: ['#ffd700', '#ffeb9e', '#d4a843', '#fb8113', '#fff3c4'],
      float: '#fff3c4',
      glow: 'rgba(255, 215, 0, 0.6)',
      halo: 'rgba(255, 215, 0, 0.28)',
      ripple: 'rgba(255, 226, 130, 0.85)',
    },
  },
  {
    id: 'endocrystal',
    name: 'EndoCrystal',
    icon: '/cosmetics/endocrystal.png',
    caseOnly: true,
    cost: 0,
    desc: 'LÉGENDAIRE — EXCLUSIF CAISSE. Le cristal de l’End bat au rythme de votre empire.',
    perk: {
      id: 'productionBoost',
      label: 'Résonance cristalline : production ×1,5 tant que la pièce est équipée.',
    },
    fx: {
      colors: ['#ff5fd2', '#ffa3e0', '#e0218a', '#ffd1ef', '#c2185b'],
      float: '#ffd1ef',
      glow: 'rgba(255, 95, 210, 0.6)',
      halo: 'rgba(255, 95, 210, 0.32)',
      ripple: 'rgba(255, 163, 224, 0.85)',
    },
  },
];

// ---------- Tags (titres affichés au classement, exclusifs cases) ----------
export const TAGS = [
  { id: 'tag-parieur', rarity: 'commun', label: 'le Parieur' },
  { id: 'tag-chanceux', rarity: 'rare', label: 'le Chanceux' },
  { id: 'tag-main-benie', rarity: 'epique', label: 'la Main bénie' },
  { id: 'tag-empereur', rarity: 'legendaire', label: 'Empereur du Hasard' },
];
export const TAG_BY_ID = Object.fromEntries(TAGS.map((t) => [t.id, t]));

export const COIN_SKIN_BY_ID = Object.fromEntries(
  COIN_SKINS.map((s) => [s.id, s])
);

// ---------- Quêtes quotidiennes ----------
// 3 quêtes par jour, générées de façon déterministe (pseudo + date) :
// impossible de les reroll en rafraîchissant. Reset à minuit (heure locale).
// La progression se mesure en delta de compteurs à vie sur la journée.
export const DAILY_QUESTS = {
  perDay: 3,
  rewardSeconds: 90, // récompense ≈ 1,5 min de production par quête (figée au spawn)
  bonusMult: 4, // bonus toutes-quêtes : journée parfaite = 6 min de production
  pool: [
    { type: 'clicks', label: 'Clicateur', icon: '👆', min: 200, max: 600, fmt: (n) => `Cliquez ${n} fois sur la pièce` },
    { type: 'earn', label: 'Paye du jour', icon: '💰', dynamic: true, fmt: (n) => `Récoltez ${fmt(n)} EndoCraft` },
    { type: 'generators', label: 'Expansion', icon: '🪓', min: 8, max: 20, fmt: (n) => `Achetez ${n} générateurs` },
    { type: 'upgrades', label: 'Modernisation', icon: '⬆️', min: 1, max: 3, fmt: (n) => `Achetez ${n} amélioration${n > 1 ? 's' : ''}` },
    { type: 'apples', label: 'Verger', icon: '🍎', min: 1, max: 2, fmt: (n) => `Attrapez ${n} pomme${n > 1 ? 's' : ''} dorée${n > 1 ? 's' : ''}` },
    { type: 'rain', label: 'Danse de la pluie', icon: '🌧️', min: 4, max: 12, fmt: (n) => `Attrapez ${n} pommes de pluie` },
    { type: 'frenzy', label: 'Embrasement', icon: '🔥', min: 1, max: 2, fmt: (n) => `Déclenchez ${n} frénési${n > 1 ? 'es' : 'e'}` },
  ],
};

// ---------- Cases (ouverture à la CS:GO) ----------
// Les upgrades « case » ci-dessous sont EXCLUSIVES : impossibles à acheter,
// elles ne sortent que des cases. Superieures aux upgrades classiques.
export const RARITIES = {
  commun: { label: 'Commun', color: '#4b9cd8', glow: 'rgba(75, 156, 216, 0.5)' },
  rare: { label: 'Rare', color: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.6)' },
  epique: { label: 'Épique', color: '#ec4899', glow: 'rgba(236, 72, 153, 0.65)' },
  legendaire: { label: 'Légendaire', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.75)' },
};

// Remboursement d'un doublon (upgrade/skin/tag déjà possédé),
// en % du prix de la caisse — la chance ne rend pas fou, mais
// elle ne punit plus non plus d'être déjà riche.
export const CASE_DUPLICATE_REFUND = {
  commun: 0.15,
  rare: 0.2,
  epique: 0.2,
  legendaire: 0.25,
};

// Une caisse = un coût + une table de drops pondérée.
// Règle d'or : on gagne TOUJOURS quelque chose — le plancher est le
// « petit lot » (30 % du prix), jamais zéro, jamais une perte sèche.
// Équilibrage V2 : EV cash ~57-62 % du prix, le reste en frénésies,
// pluies et exclusives pour un joueur qui ne les possède pas encore.
export const CASES = [
  {
    id: 'bois', name: 'Caisse en bois', icon: '/cases/bois.png',
    cost: 1e6,
    desc: 'Pour commencer. Surtout du rembobinage, rarement mieux.',
    drops: [
      { weight: 24, rarity: 'commun', type: 'cash', percent: 0.3, label: 'Petit lot — 30 % du prix' },
      { weight: 15, rarity: 'commun', type: 'cash', percent: 1, label: 'Cash ×1 — caisse remboursée' },
      { weight: 10, rarity: 'commun', type: 'frenzy', durationMs: 15_000, label: 'Frénésie 15 s' },
      { weight: 9, rarity: 'commun', type: 'cash', percent: 1.25, label: 'Cash ×1,25' },
      { weight: 4, rarity: 'commun', type: 'tag', tagId: 'tag-parieur', label: 'Tag « le Parieur »' },
      { weight: 10, rarity: 'rare', type: 'cash', percent: 1.4, label: 'Cash ×1,4' },
      { weight: 6, rarity: 'rare', type: 'bank', bankPercent: 0.04, label: '+4 % de votre banque' },
      { weight: 8, rarity: 'rare', type: 'rain', label: 'Pluie de pommes' },
      { weight: 2, rarity: 'rare', type: 'frenzy', durationMs: 30_000, label: 'Frénésie 30 s' },
      { weight: 6, rarity: 'rare', type: 'cash', percent: 2, label: 'Cash ×2' },
      { weight: 4, rarity: 'epique', type: 'upgrade', upgradeId: 'case-mains-dorees' },
      { weight: 2, rarity: 'epique', type: 'bank', bankPercent: 0.06, label: '+6 % de votre banque' },
    ],
  },
  {
    id: 'nether', name: 'Caisse du Nether', icon: '/cases/nether.png',
    cost: 5e7,
    desc: 'Le feu aux fesses — quand ça veut bien tomber.',
    drops: [
      { weight: 24, rarity: 'commun', type: 'cash', percent: 0.3, label: 'Petit lot — 30 % du prix' },
      { weight: 14, rarity: 'commun', type: 'cash', percent: 1, label: 'Cash ×1 — caisse remboursée' },
      { weight: 8, rarity: 'commun', type: 'frenzy', durationMs: 20_000, label: 'Frénésie 20 s' },
      { weight: 10, rarity: 'commun', type: 'cash', percent: 1.25, label: 'Cash ×1,25' },
      { weight: 6, rarity: 'rare', type: 'frenzy', durationMs: 90_000, label: 'Frénésie 90 s' },
      { weight: 10, rarity: 'rare', type: 'cash', percent: 1.5, label: 'Cash ×1,5' },
      { weight: 6, rarity: 'rare', type: 'bank', bankPercent: 0.04, label: '+4 % de votre banque' },
      { weight: 5, rarity: 'rare', type: 'upgrade', upgradeId: 'case-verger-infini' },
      { weight: 5, rarity: 'rare', type: 'upgrade', upgradeId: 'case-oeil-kendiix' },
      { weight: 3, rarity: 'rare', type: 'tag', tagId: 'tag-chanceux', label: 'Tag « le Chanceux »' },
      { weight: 5, rarity: 'epique', type: 'cash', percent: 2.5, label: 'Cash ×2,5' },
      { weight: 4, rarity: 'epique', type: 'upgrade', upgradeId: 'case-pioche-destin' },
    ],
  },
  {
    id: 'end', name: 'Caisse de l’End', icon: '/cases/ender.png',
    cost: 1e9,
    desc: 'Là où vivent les légendes. Et beaucoup de rembobinage.',
    drops: [
      { weight: 30, rarity: 'commun', type: 'cash', percent: 0.3, label: 'Petit lot — 30 % du prix' },
      { weight: 16, rarity: 'commun', type: 'cash', percent: 1.25, label: 'Cash ×1,25' },
      { weight: 10, rarity: 'rare', type: 'cash', percent: 1.5, label: 'Cash ×1,5' },
      { weight: 6, rarity: 'rare', type: 'bank', bankPercent: 0.04, label: '+4 % de votre banque' },
      { weight: 7, rarity: 'rare', type: 'upgrade', upgradeId: 'case-oeil-kendiix' },
      { weight: 5, rarity: 'rare', type: 'frenzy', durationMs: 30_000, label: 'Frénésie 30 s' },
      { weight: 4, rarity: 'epique', type: 'cash', percent: 3, label: 'Cash ×3' },
      { weight: 5, rarity: 'epique', type: 'bank', bankPercent: 0.06, label: '+6 % de votre banque' },
      { weight: 4, rarity: 'epique', type: 'upgrade', upgradeId: 'case-coeur-serveur' },
      { weight: 3, rarity: 'epique', type: 'upgrade', upgradeId: 'case-pioche-destin' },
      { weight: 2, rarity: 'epique', type: 'tag', tagId: 'tag-main-benie', label: 'Tag « la Main bénie »' },
      { weight: 3, rarity: 'legendaire', type: 'upgrade', upgradeId: 'case-benediction' },
      { weight: 3, rarity: 'legendaire', type: 'skin', skinId: 'endocrystal', label: 'Skin ENDOCRYSTAL 💗 (production ×1,5 !)' },
      { weight: 2, rarity: 'legendaire', type: 'tag', tagId: 'tag-empereur', label: 'Tag « Empereur du Hasard »' },
    ],
  },
];

// ---------- Renaissance (prestige) ----------
// À partir du seuil farmé DEPUIS LA DERNIERE RENAISSANCE (le total à vie
// ne suffit plus : impossible d'enchaîner les renaissances sur un gros
// total historique), on peut tout recommencer à zéro contre :
// - un bonus de production permanent B(n) = (1 + 0,25n) × 1,15^n
// - les « Braises du Phénix » : n × 500 M d'EndoCraft de départ
// On garde : succès, cosmétiques, tags, exclusives de caisses, stats.
// On perd : solde (remplacé par les braises), générateurs, améliorations,
// équipe.
export const RENAISSANCE = {
  baseThreshold: 5e11, // 500 B pour la 1ère renaissance
  thresholdGrowth: 3, // ×3 par renaissance suivante (1,5 T, 4,5 T, 13,5 T…)
  multPerRenaissance: 0.25, // part additive du bonus : +25 % par renaissance
  multGrowth: 1.15, // part multiplicative : ×1,15 par renaissance
  emberBankPerRenaissance: 5e8, // Braises du Phénix : 500 M par renaissance
};

// Bonus de production permanent pour n renaissances
export function getRenaissanceMult(n) {
  return (1 + RENAISSANCE.multPerRenaissance * n) * Math.pow(RENAISSANCE.multGrowth, n || 0);
}

// Seuil de la PROCHAINE renaissance (count = renaissances déjà faites)
export function getRenaissanceThreshold(count) {
  return (
    RENAISSANCE.baseThreshold * Math.pow(RENAISSANCE.thresholdGrowth, count || 0)
  );
}

// ---------- Pomme dorée ----------
export const APPLE = {
  minDelayMs: 60_000, // délai minimal avant la 1ère apparition
  intervalMinMs: 90_000,
  intervalMaxMs: 200_000,
  visibleMs: 12_000,
};

// ---------- Pommes variées ----------
// À chaque apparition, le type est tiré au sort (weight). Teinte visuelle
// via filtre CSS sur la texture dorée.
export const APPLE_TYPES = {
  doree: {
    id: 'doree', name: 'Pomme dorée', weight: 0.55, icon: '🍎',
    filter: 'none',
    title: 'Pomme dorée ! Attrapez-la vite !',
  },
  orage: {
    id: 'orage', name: "Pomme d'orage", weight: 0.15, icon: '🌧️',
    filter: 'hue-rotate(180deg) saturate(1.2) brightness(0.95)',
    title: "Pomme d'orage ! Pluie garantie !",
  },
  ombre: {
    id: 'ombre', name: "Pomme d'ombre", weight: 0.13, icon: '🌑',
    filter: 'hue-rotate(270deg) brightness(0.55) saturate(1.4)',
    title: "Pomme d'ombre ! La tempête de clics approche…",
  },
  cristal: {
    id: 'cristal', name: 'Pomme de cristal', weight: 0.1, icon: '💎',
    filter: 'hue-rotate(195deg) brightness(1.35) saturate(0.55)',
    title: 'Pomme de cristal ! Le temps vous paie cash.',
  },
  maudite: {
    id: 'maudite', name: 'Pomme maudite', weight: 0.07, icon: '💀',
    filter: 'hue-rotate(85deg) brightness(0.7) saturate(1.3)',
    title: 'Pomme maudite… KendiiX l’a touchée.',
  },
};

export const APPLE_REWARDS = {
  // Si une frénésie est déjà active, la pomme dorée bascule sur
  // la récompense « chanceuse » : jamais de frénésie gaspillée.
  frenzy: { weight: 0.65, mult: 7, durationMs: 30_000 },
  lucky: { weight: 0.35, bankPercent: 0.1, capSeconds: 300 }, // 12 % avec EndoRoi
};

// Tempête de clics (pomme d'ombre) — bornée : les mini-pommes sont
// plafonnées en nombre et en gain, sur une banque figée au déclenchement.
export const SHADOW_STORM = {
  durationMs: 10_000,
  minisPerClick: [1, 2], // mini-pommes lâchées par clic
  maxMinisPerStorm: 60, // plafond : pas de tempête infinie
  miniBankPercent: 0.002, // +0,2 % de la banque de départ par mini
  miniCapSeconds: 5, // …plafonné à 5 s de production par mini
};

// Pomme de cristal : minutes de production versées immédiatement
export const CRYSTAL_PRODUCTION_SECONDS = 180;

// Pomme maudite : délai de doute avant le jackpot
export const CURSED_DELAY_MS = 5_000;
export const CURSED_BANK_PERCENT = 0.12; // +12 % de la banque
export const CURSED_CAP_SECONDS = 900; // plafonné à 15 min de production

// ---------- Pluie de pommes (événement rare) ----------
// Déclenchée avec de faibles chances en attrapant une pomme dorée :
// des pommes tombent du haut de l'écran, chacune attrapée rapporte
// un petit % de la banque. Se cumule avec la récompense normale.
export const APPLE_RAIN = {
  triggerChance: 0.08, // 8 % de chance par pomme dorée attrapée (l'orage la provoque aussi)
  durationMs: 10_000, // durée de l'événement
  spawnMinMs: 450, // intervalle entre les pommes
  spawnMaxMs: 700,
  fallMinMs: 2_800, // durée de chute d'une pomme
  fallMaxMs: 4_200,
  maxApples: 10, // plafond sur l'événement complet
  bankPercent: 0.01, // 1 % de la banque par pomme attrapée
  capSeconds: 30, // …plafonné à 30 s de production par pomme
  minGain: 25, // plancher pour les débutants
};
