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

// Secret de signature obligatoire en production : sans lui, n'importe qui
// peut forger des tokens (dont admin) avec le secret de dev public du dépôt.
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error(
    '🛑 JWT_SECRET non défini en production — le serveur refuse de démarrer.\n' +
      '   Générez un secret (ex : openssl rand -hex 32) et définissez JWT_SECRET.'
  );
  process.exit(1);
}

// Compte administrateur (créé s'il manque, jamais écrasé)
seedAdmin();

const app = express();
// Derrière le reverse-proxy (Dokploy/Traefik) : req.ip doit être l'IP
// réelle du joueur (X-Forwarded-For), sinon un bannissement IP
// frapperait celle du proxy — c'est-à-dire tout le monde.
// Ajuster TRUST_PROXY au nombre de proxies en cascade si besoin.
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));
app.use(express.json({ limit: '256kb' }));

// Content-Security-Policy : le jeu n'a aucun script inline ni externe —
// un script injecté dans la page (userscript naïf, XSS) ne s'exécute pas.
// Les extensions navigateur en MAIN world passent outre, mais celles-là
// se heurtent à la validation serveur.
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; media-src 'self'; connect-src 'self'; " +
      "object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

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

// IP bannie (sanction anti-triche) : PLUS AUCUN accès — ni l'API, ni le
// site lui-même (page, assets). Une mini-page autonome l'explique.
const BAN_PAGE = (until) => `<!doctype html>
<html lang="fr"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Accès suspendu — EndoClicker</title>
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:#14100c; color:#f3ede4; font-family:system-ui, sans-serif; }
  .card { max-width:420px; margin:16px; padding:32px 28px; text-align:center;
          background:#1d1712; border:1px solid #3a2c1e; border-radius:16px; }
  h1 { margin:0 0 12px; font-size:20px; color:#f59b3d; }
  p { margin:6px 0; font-size:14px; line-height:1.5; color:#c9bfae; }
  .until { font-size:16px; font-weight:700; color:#f3ede4; }
</style></head>
<body><div class="card">
  <h1>🚫 Accès suspendu</h1>
  <p>Triche détectée : la progression de ce compte a été remise à zéro
     et l'accès au site est fermé pendant 24 heures.</p>
  <p class="until">Fin de la suspension : ${until}</p>
  <p>Si vous pensez qu'il s'agit d'une erreur, contactez l'équipe
     EndoCraft.</p>
</div></body></html>`;

app.use((req, res, next) => {
  const ban = getBan(normalizeIp(req.ip));
  if (!ban) return next();
  const until = new Date(ban.until).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  if (req.path.startsWith('/api')) {
    return res.status(403).json({
      error: `Triche détectée : progression remise à zéro et accès bloqué jusqu'à ${until}.`,
      bannedUntil: ban.until,
    });
  }
  res.status(403)
    .set('Content-Type', 'text/html; charset=utf-8')
    .set('Cache-Control', 'no-store')
    .send(BAN_PAGE(until));
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
