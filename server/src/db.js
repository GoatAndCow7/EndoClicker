import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

// Pseudo de l'administrateur (droits admin + pseudo réservé à l'inscription)
export const ADMIN_PSEUDO = (process.env.ADMIN_PSEUDO || 'GoatAndCow').toLowerCase();

export const db = new Database(path.join(DATA_DIR, 'endoclicker.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pseudo TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    last_login_at INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS states (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    state TEXT NOT NULL,
    total_endocraft REAL NOT NULL DEFAULT 0,
    achievements INTEGER NOT NULL DEFAULT 0,
    -- Date du dernier reset de score (anti-triche, en ms)
    baseline_at INTEGER NOT NULL,
    -- Plafond théorique de gain depuis baseline (endocraft/s max plausible)
    baseline_rate REAL NOT NULL DEFAULT 0,
    -- Révision de l'état : incrémentée à chaque édition admin.
    -- Sert d'accès concurrentiel optimiste (409 si le client est périmé).
    rev INTEGER NOT NULL DEFAULT 0,
    renaissances INTEGER NOT NULL DEFAULT 0,
    -- Désactivé par un admin : la synchro de ce joueur ignore l'anti-triche
    anti_cheat_disabled INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_states_total ON states(total_endocraft DESC);
`);

// Migration : bases créées avant l'ajout de colonnes
{
  const cols = db.prepare('PRAGMA table_info(states)').all();
  if (!cols.some((c) => c.name === 'rev')) {
    db.exec('ALTER TABLE states ADD COLUMN rev INTEGER NOT NULL DEFAULT 0');
  }
  if (!cols.some((c) => c.name === 'renaissances')) {
    db.exec('ALTER TABLE states ADD COLUMN renaissances INTEGER NOT NULL DEFAULT 0');
  }
  if (!cols.some((c) => c.name === 'anti_cheat_disabled')) {
    db.exec('ALTER TABLE states ADD COLUMN anti_cheat_disabled INTEGER NOT NULL DEFAULT 0');
  }
  const userCols = db.prepare('PRAGMA table_info(users)').all();
  if (!userCols.some((c) => c.name === 'last_login_at')) {
    db.exec('ALTER TABLE users ADD COLUMN last_login_at INTEGER NOT NULL DEFAULT 0');
  }
}

// --- Reset mondial ---
// Incrémentée à chaque grande refonte d'équilibrage. Au démarrage, si la
// base est plus ancienne, toute la progression est effacée (les comptes
// sont conservés) : tout le monde repart sur une base propre et équitable.
const WORLD_VERSION = 2;
db.exec('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value INTEGER NOT NULL)');
{
  const row = db.prepare("SELECT value FROM meta WHERE key = 'world_version'").get();
  if (!row || row.value < WORLD_VERSION) {
    db.prepare('DELETE FROM states').run();
    db.prepare(
      "INSERT OR REPLACE INTO meta (key, value) VALUES ('world_version', ?)"
    ).run(WORLD_VERSION);
    console.log(
      `♻️ V2 : reset mondial appliqué (version du monde ${WORLD_VERSION}).` +
        ` Progression de tous les joueurs remise à zéro, comptes conservés.`
    );
  }
}

export function now() {
  return Date.now();
}

// --- Compte administrateur ---
// Créé au démarrage s'il n'existe pas (jamais écrasé s'il existe).
// Mot de passe : variable ADMIN_PASSWORD, sinon généré et affiché en log.
export function seedAdmin() {
  const existing = db
    .prepare('SELECT id FROM users WHERE pseudo = ? COLLATE NOCASE')
    .get(ADMIN_PSEUDO);
  if (existing) return;

  let password = process.env.ADMIN_PASSWORD;
  let generated = false;
  if (!password || password.length < 6) {
    password = crypto.randomBytes(12).toString('hex');
    generated = true;
  }

  const t = now();
  db.prepare(
    'INSERT INTO users (pseudo, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?)'
  ).run(ADMIN_PSEUDO, bcrypt.hashSync(password, 10), t, t);

  if (generated) {
    console.log(
      `👑 Compte administrateur « ${ADMIN_PSEUDO} » créé automatiquement.\n` +
        `   Mot de passe généré (changez-le ensuite depuis le panel) : ${password}\n` +
        `   Astuce : définissez ADMIN_PASSWORD pour choisir le vôtre.`
    );
  } else {
    console.log(`👑 Compte administrateur « ${ADMIN_PSEUDO} » créé (mot de passe ADMIN_PASSWORD).`);
  }
}
