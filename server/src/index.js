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
import { normalizeIp, getBan } from './sanction.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

// Compte administrateur (créé s'il manque, jamais écrasé)
seedAdmin();

const app = express();
// Derrière le reverse-proxy (Dokploy/Traefik) : req.ip doit être l'IP
// réelle du joueur (X-Forwarded-For), sinon un bannissement IP
// frapperait celle du proxy — c'est-à-dire tout le monde.
// Ajuster TRUST_PROXY au nombre de proxies en cascade si besoin.
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));
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

// IP bannie (sanction anti-triche) : tout l'API est fermé 24 h.
app.use('/api', (req, res, next) => {
  const ban = getBan(normalizeIp(req.ip));
  if (ban) {
    const until = new Date(ban.until).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return res.status(403).json({
      error: `Triche détectée : progression remise à zéro et accès bloqué jusqu'à ${until}.`,
      bannedUntil: ban.until,
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
  // Corps JSON malformé et autres erreurs de parsing : le code d'origine
  // (400) est plus juste qu'un 500 générique.
  if (res.headersSent) return next(err);
  console.error(err);
  res.status(err.statusCode || err.status || 500).json({
    error: err.expose && err.message ? err.message : 'Erreur interne du serveur',
  });
});

app.listen(PORT, () => {
  console.log(`EndoClicker server listening on http://localhost:${PORT}`);
});
