import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { seedAdmin } from './db.js';
import { authRouter } from './auth.js';
import { stateRouter } from './state.js';
import { leaderboardRouter } from './leaderboard.js';
import { adminRouter } from './admin.js';
import { eventsRouter } from './events.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

// Compte administrateur (créé s'il manque, jamais écrasé)
seedAdmin();

const app = express();
app.use(express.json({ limit: '256kb' }));

// Journal des requêtes API (diagnostic des synchros)
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    const start = Date.now();
    console.log(
      `→ ${new Date().toISOString().slice(11, 19)} ${req.method} ${req.path}`
    );
    res.on('finish', () => {
      console.log(
        `← ${res.statusCode} (${Date.now() - start} ms)`
      );
    });
  }
  next();
});

// --- API ---
app.use('/api/auth', authRouter);
app.use('/api', stateRouter);
app.use('/api', leaderboardRouter);
app.use('/api/admin', adminRouter);
app.use('/api', eventsRouter);

// --- Front buildé (production) ---
// Résout le dossier dist selon le contexte : monorepo en dev (server/src →
// ../../client/dist) ou image Docker (app à plat → ../client/dist).
const distCandidates = [
  process.env.DIST_DIR,
  path.join(__dirname, '..', '..', 'client', 'dist'),
  path.join(__dirname, '..', 'client', 'dist'),
].filter(Boolean);
const distDir = distCandidates.find((p) => fs.existsSync(p));

if (distDir) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  console.warn('⚠️  Aucun build client trouvé (lancez `npm run build` dans client/)');
}

// --- Erreurs ---
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

app.listen(PORT, () => {
  console.log(`EndoClicker server listening on http://localhost:${PORT}`);
});
