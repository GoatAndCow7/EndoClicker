// Test live du classement « à vie » et de la renaissance (serveur sur :3999)
const BASE = 'http://localhost:3999';
const { inventorySpent, theoreticalProduction } = await import('./src/economy.js');

let pass = 0, fail = 0;
const check = (name, cond) => {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}`); }
};

async function register(pseudo) {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pseudo, password: 'motdepasse1' }),
  }).then((r) => r.json());
  return res.token;
}

async function put(token, body) {
  const res = await fetch(`${BASE}/api/state`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

const tokA = await register('Phenix');
const tokB = await register('Deuxieme');

// --- Phenix : R1 en cours, cycle 2 — inventaire autofinancé ---
const inv = {
  generators: { dragon: 10, end: 30, deepdark: 30, nether: 40 },
  upgrades: ['pick-bois', 'pick-pierre', 'pick-fer'],
  staff: [], cosmetics: [],
};
const spent = inventorySpent(inv);
const anchor = 6.5e12; // seuils des 3 premières renaissances... non, R1 : 500 B
const cycle = spent * 1.05;
const stateA1 = {
  ...inv,
  endocraft: 1e11,
  totalEndocraft: cycle,
  lifetimeEndocraft: anchor + cycle,
  lastRenaissanceLifetime: anchor,
  clicks: 5000, playMs: 30 * 3600_000, renaissances: 1,
  achievements: ['click-1', 'renaissance-1'],
};
const rateA = theoreticalProduction({ ...stateA1, equippedCoin: 'default' });
let r = await put(tokA, { productionRate: rateA, state: stateA1 });
check('Phenix : sync honnête acceptée (' + r.status + ')', r.status === 200);

// --- Deuxieme : jamais renaissé, cycle == à-vie ---
const invB = {
  generators: { end: 8, deepdark: 15, nether: 30 },
  upgrades: ['pick-bois'], staff: [], cosmetics: [],
};
const spentB = inventorySpent(invB);
const cycleB = spentB * 1.1;
const stateB = {
  ...invB,
  endocraft: 5e8,
  totalEndocraft: cycleB,
  lifetimeEndocraft: cycleB,
  lastRenaissanceLifetime: 0,
  clicks: 2000, playMs: 12 * 3600_000, renaissances: 0,
  achievements: ['click-1'],
};
r = await put(tokB, { productionRate: theoreticalProduction(stateB), state: stateB });
check('Deuxieme : sync honnête acceptée (' + r.status + ')', r.status === 200);

// --- Phenix renaît : le cycle retombe, l'à-vie (donc le rang) reste ---
const stateA2 = {
  generators: { bucheron: 30, mineur: 20 },
  upgrades: ['pick-bois'], staff: [], cosmetics: [],
  endocraft: 5e8,
  totalEndocraft: 900,
  lifetimeEndocraft: anchor + cycle + 900,
  lastRenaissanceLifetime: anchor + cycle,
  clicks: 5000, playMs: 31 * 3600_000, renaissances: 2,
  achievements: ['click-1', 'renaissance-1'],
};
r = await put(tokA, { productionRate: 200, state: stateA2 });
check('Phenix : sync post-renaissance acceptée (' + r.status + ')', r.status === 200);

const board = await fetch(`${BASE}/api/leaderboard`).then((x) => x.json());
check(
  'classement : Phenix tête avec son À-VIE malgré un cycle à 900',
  board.leaderboard[0]?.pseudo === 'Phenix' &&
    board.leaderboard[0].totalEndocraft === anchor + cycle + 900
);
check(
  'classement : Deuxieme derrière avec son à-vie (cycle == à-vie pour lui)',
  board.leaderboard[1]?.pseudo === 'Deuxieme' &&
    board.leaderboard[1].totalEndocraft === cycleB
);

const profile = await fetch(`${BASE}/api/profile/Phenix`).then((x) => x.json());
check('profil : rang #1 conservé après renaissance', profile.profile.rank === 1);
check('profil : score = à-vie', profile.profile.totalEndocraft === anchor + cycle + 900);

// --- CSP et nosniff présents ---
const head = await fetch(`${BASE}/`);
const csp = head.headers.get('content-security-policy');
check('CSP stricte servie', /script-src 'self'/.test(csp || ''));
check('nosniff servi', head.headers.get('x-content-type-options') === 'nosniff');

// --- Autoclicker externe : les gains par clics doivent passer la fenêtre
//     de gain même sans production passive (c'est la base du genre) ---
const tokC = await register('Grindeur');
const base = {
  endocraft: 500, totalEndocraft: 3000, lifetimeEndocraft: 3000,
  lastRenaissanceLifetime: 0, clicks: 100, playMs: 60_000, renaissances: 0,
  generators: {}, upgrades: ['pick-bois'], staff: [], cosmetics: [],
  achievements: ['click-1'],
};
r = await put(tokC, { productionRate: 1, state: base });
check('Grindeur : première sync acceptée (' + r.status + ')', r.status === 200);
await new Promise((res) => setTimeout(res, 4000));
// 4 s d'autoclicker agressif (+1100 clics) sous frénésie ×7 :
// puissance ×2 (pick-bois) → +15 400 gagnés, sans production passive.
const ground = {
  ...base,
  clicks: 1200,
  totalEndocraft: 15_400,
  lifetimeEndocraft: 15_400,
  playMs: 64_000,
};
r = await put(tokC, { productionRate: 1, state: ground });
check(
  'Grindeur : gains d\'autoclicker acceptés au-delà du taux de production (' + r.status + ')',
  r.status === 200
);

console.log(`\n${pass} ok, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
