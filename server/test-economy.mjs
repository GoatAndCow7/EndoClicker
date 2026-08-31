// Tests des invariantes économiques (lancé depuis server/)
import { verifyEconomy, inventorySpent, theoreticalProduction } from './src/economy.js';
import { ACHIEVEMENTS } from '../client/src/game/constants.js';

const HOUR = 3600_000;
let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}`); }
}

// --- 1. Débutant honnête : 2 h de jeu, quelques générateurs ---
const honest1 = {
  endocraft: 5000, totalEndocraft: 50_000, lifetimeEndocraft: 50_000,
  clicks: 3000, playMs: 2 * HOUR, renaissances: 0, lastRenaissanceLifetime: 0,
  generators: { bucheron: 12, mineur: 5 }, upgrades: ['pick-bois'], staff: [],
  cosmetics: [], achievements: ['click-1'],
};
let r = verifyEconomy(honest1, { accountAgeMs: 3 * HOUR, declaredRate: 25 });
check('débutant honnête accepté', r.ok);

// --- 2. Fin de jeu honnête : autofinancé (on paie ce qu'on possède) ---
const inv = {
  generators: { bucheron: 150, mineur: 120, pecheur: 100, ferme: 90, villageois: 80, golem: 70, nether: 60, deepdark: 50, end: 40, dragon: 30, shulker: 20, wither: 12, balise: 8 },
  upgrades: ['pick-bois','pick-pierre','pick-fer','pick-diamant','pick-netherite','ench-efficacite','ench-fortune','gen-bucheron-10','gen-mineur-10','gen-pecheur-10'],
  staff: ['goatandcow','kuani','lulu62111'],
  cosmetics: ['endosage'],
};
const spentInv = inventorySpent(inv);
const rate2 = theoreticalProduction({ ...inv, renaissances: 3, equippedCoin: 'default' });
// Identité client : cycle = à-vie − ancre (chaque gain crédite les deux,
// la Renaissance remet le cycle à zéro). L'ancre couvre les seuils des
// 3 renaissances (500 B × 13 ≈ 6,5 T).
const cycle2 = spentInv * 1.05;
const honest2 = {
  endocraft: 5e11,
  totalEndocraft: cycle2,
  lifetimeEndocraft: 6.5e12 + cycle2,
  lastRenaissanceLifetime: 6.5e12,
  clicks: 40_000, playMs: 40 * HOUR, renaissances: 3,
  ...inv, achievements: ['click-1','total-1m'],
};
r = verifyEconomy(honest2, { accountAgeMs: 5 * 24 * HOUR, declaredRate: rate2 });
check('fin de jeu honnête accepté (inventaire payé ' + spentInv.toExponential(2) + ', taux ' + rate2.toExponential(2) + ')', r.ok);
check('taux déclaré plafonné à la capacité réelle', r.maxRate >= rate2);

// --- 1b. Identité cycle / à vie : 1e308 à vie avec 1e67 au cycle ---
r = verifyEconomy(
  { ...honest1, lifetimeEndocraft: 1.47e308, totalEndocraft: 1e67, playMs: 10 * HOUR },
  { accountAgeMs: 24 * HOUR }
);
check('cycle 1e67 vs à-vie 1.47e308 refusé (raison=' + r.reason + ')', !r.ok);

// --- 3. « Max tout le jeu » : ×1000 partout, lifetime bidon bas ---
const cheat1 = {
  ...honest1,
  generators: Object.fromEntries(['bucheron','mineur','pecheur','ferme','villageois','golem','nether','deepdark','end','dragon','shulker','wither','balise','trident','totem','coeur'].map((g) => [g, 1000])),
  upgrades: [], staff: [], lifetimeEndocraft: 1e6, totalEndocraft: 1e6,
};
r = verifyEconomy(cheat1, { accountAgeMs: 3 * HOUR });
check('« Max tout le jeu » refusé (raison=' + r.reason + ')', !r.ok);

// --- 4. lifetime 1.47e308 (float max du panneau) ---
const cheat2 = { ...honest1, lifetimeEndocraft: 1.47e308, totalEndocraft: 1e67, endocraft: 2.67e67, playMs: 10 * HOUR, renaissances: 0, lastRenaissanceLifetime: 0 };
r = verifyEconomy(cheat2, { accountAgeMs: 24 * HOUR });
check('état 1e308/1e67 refusé (raison=' + r.reason + ')', !r.ok);

// --- 5. « +1 T Oc » en banque ---
const cheat3 = { ...honest1, endocraft: 1e12 };
r = verifyEconomy(cheat3, { accountAgeMs: 3 * HOUR });
check('solde 1 T refusé (raison=' + r.reason + ')', !r.ok);

// --- 6. « Plein rebirth » : 10 000 renaissances ---
const cheat4 = { ...honest1, renaissances: 10_000, lifetimeEndocraft: 1e15, lastRenaissanceLifetime: 1e15 };
r = verifyEconomy(cheat4, { accountAgeMs: 24 * HOUR });
check('10 000 renaissances refusées (raison=' + r.reason + ')', !r.ok);

// --- 7. Taux déclaré gonflé (pour caler le plafond serveur) ---
r = verifyEconomy(honest1, { accountAgeMs: 3 * HOUR, declaredRate: 1e18 });
check('taux déclaré 1e18 refusé (raison=' + r.reason + ')', !r.ok);

// --- 8. Migration invité honnête : 20 h de farm avant inscription ---
const guest = {
  endocraft: 8e7, totalEndocraft: 4e8, lifetimeEndocraft: 4e8,
  clicks: 9_000, playMs: 20 * HOUR, renaissances: 0, lastRenaissanceLifetime: 0,
  generators: { bucheron: 60, mineur: 40, pecheur: 25, ferme: 15, villageois: 8, golem: 3 },
  upgrades: ['pick-bois','pick-pierre','pick-fer','gen-bucheron-10'], staff: [], cosmetics: [],
};
r = verifyEconomy(guest, { accountAgeMs: 5 * 60_000, declaredRate: 4000 });
check('migration invité honnête acceptée', r.ok);

// --- 9. Tricheur rusé : inventaire énorme MAIS lifetime gonflé pour payer ---
// lifetime 1e40 + gens ×300 : passe l'inventaire mais les gains sont
// impossibles dans la fenêtre réelle.
const cheat5 = {
  endocraft: 1, totalEndocraft: 1e30, lifetimeEndocraft: 1e40, lastRenaissanceLifetime: 1e40,
  clicks: 100, playMs: 50 * HOUR, renaissances: 0,
  generators: { coeur: 300, totem: 300 }, upgrades: [], staff: [], cosmetics: [],
};
r = verifyEconomy(cheat5, { accountAgeMs: 3 * 24 * HOUR });
check('lifetime gonflé + total 1e30 refusé (raison=' + r.reason + ')', !r.ok);

// --- 10. Champs Infinity ---
r = verifyEconomy({ ...honest1, lifetimeEndocraft: Infinity }, { accountAgeMs: HOUR });
check('Infinity refusé (raison=' + r.reason + ')', !r.ok);

// --- 11. Clics impossibles ---
r = verifyEconomy({ ...honest1, clicks: 5e9, totalEndocraft: 60_000, lifetimeEndocraft: 60_000 }, { accountAgeMs: 3 * HOUR });
check('5e9 clics en 2 h refusés (raison=' + r.reason + ')', !r.ok);

// --- 12. Renaissance juste après reset (inventaire faible, lifetime énorme) ---
const reset = {
  endocraft: 5e8, totalEndocraft: 1e9, lifetimeEndocraft: 6e12,
  lastRenaissanceLifetime: 6e12, clicks: 30_000, playMs: 60 * HOUR,
  renaissances: 2, generators: { bucheron: 40, mineur: 20 }, upgrades: ['pick-bois'], staff: [], cosmetics: [],
};
r = verifyEconomy(reset, { accountAgeMs: 8 * 24 * HOUR, declaredRate: 500 });
check('joueur juste après renaissance accepté', r.ok);

// --- 13. « Renaissance 600 » : boucle de renaissances forgée ---
// Version fainéante (ancre et total à vie dérisoires)…
const r600 = {
  endocraft: 1, totalEndocraft: 1e20, lifetimeEndocraft: 1e15, lastRenaissanceLifetime: 0,
  clicks: 100, playMs: HOUR, renaissances: 600,
  generators: { coeur: 50 }, upgrades: [], staff: [], cosmetics: [],
};
r = verifyEconomy(r600, { accountAgeMs: 24 * HOUR });
check('Renaissance 600 (lifetime bas) refusée (raison=' + r.reason + ')', !r.ok);
// …et version « soignée » : tout est gonflé pour sembler cohérent.
const r600b = { ...r600, lifetimeEndocraft: 1e297, lastRenaissanceLifetime: 1e297 };
r = verifyEconomy(r600b, { accountAgeMs: 24 * HOUR });
check('Renaissance 600 (lifetime gonflé à 1e297) refusée (raison=' + r.reason + ')', !r.ok);
// La courbe de coûts (×1,15 par achat) et les resets de banque à chaque
// Renaissance plafonnent l'économie : aucun état R600 ne se tient, même
// gonflé partout. Un joueur qui monte haut honnêtement reste accepté —
// construit par construction : gains = taux × temps réel.
const r8 = {
  endocraft: 1e14, totalEndocraft: 1e15, renaissances: 8,
  lifetimeEndocraft: 2.2e15, lastRenaissanceLifetime: 1.2e15,
  clicks: 40_000, playMs: 100 * HOUR,
  generators: { dragon: 10, shulker: 5, wither: 2, end: 20, deepdark: 30 },
  upgrades: ['pick-bois','pick-pierre','pick-fer','gen-dragon-10'],
  staff: [], cosmetics: [], achievements: ['click-1','total-1t'],
};
const rate8 = theoreticalProduction(r8);
r = verifyEconomy(r8, { accountAgeMs: 60 * 24 * HOUR, declaredRate: rate8 });
check('Renaissance 8 honnête (semaines de jeu) acceptée (taux ' + rate8.toExponential(2) + ')', r.ok);

// --- 14. « Tous les succès » en 12 minutes de jeu ---
const allAch = {
  endocraft: 100, totalEndocraft: 500, lifetimeEndocraft: 500,
  clicks: 50, playMs: 12 * 60_000, renaissances: 0, lastRenaissanceLifetime: 0,
  generators: {}, upgrades: [], staff: [], cosmetics: [],
  achievements: ACHIEVEMENTS.map((a) => a.id),
};
r = verifyEconomy(allAch, { accountAgeMs: HOUR });
check('tous les succès refusés (raison=' + r.reason + ')', !r.ok);
// Un vrai collectionneur (compteurs à la hauteur, gains plausibles) passe.
const collector = {
  endocraft: 1e12, totalEndocraft: 5e15, lifetimeEndocraft: 1.8e17,
  clicks: 12_000, playMs: 50 * HOUR, renaissances: 12,
  lastRenaissanceLifetime: 1.75e17,
  generators: { dragon: 15, end: 30, deepdark: 30, nether: 40 },
  upgrades: ['pick-bois','pick-pierre','pick-fer'], staff: [],
  cosmetics: ['endosage', 'endoblaze', 'endoroi'],
  achievements: ACHIEVEMENTS.map((a) => a.id),
  applesClicked: 30, applesByType: { doree: 10, orage: 5, ombre: 5, cristal: 12, maudite: 11 },
  shadowMinisCaught: 60, applesRained: 25, questsClaimed: 55,
  casesOpened: 30, caseLegendaryDrops: 2, titleClicks: 30,
};
r = verifyEconomy(collector, { accountAgeMs: 90 * 24 * HOUR, declaredRate: theoreticalProduction(collector) });
check('collectionneur honnête accepté', r.ok);

console.log(`\n${pass} ok, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
