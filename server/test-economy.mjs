// Tests des invariantes économiques (lancé depuis server/)
import { verifyEconomy, inventorySpent, theoreticalProduction } from './src/economy.js';

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
const playSec2 = 40 * 3600;
const honest2 = {
  endocraft: 5e11,
  totalEndocraft: rate2 * playSec2 * 2,
  lifetimeEndocraft: spentInv * 1.1 + 6.5e12, // inventaire + seuils des 3 renaissances
  lastRenaissanceLifetime: 6.5e12,
  clicks: 40_000, playMs: 40 * HOUR, renaissances: 3,
  ...inv, achievements: ['click-1','total-1m'],
};
r = verifyEconomy(honest2, { accountAgeMs: 5 * 24 * HOUR, declaredRate: rate2 });
check('fin de jeu honnête accepté (inventaire payé ' + spentInv.toExponential(2) + ', taux ' + rate2.toExponential(2) + ')', r.ok);
check('taux déclaré plafonné à la capacité réelle', r.maxRate >= rate2);

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

console.log(`\n${pass} ok, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
