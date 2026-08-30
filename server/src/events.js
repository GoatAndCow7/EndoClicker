import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { db } from './db.js';
import { JWT_SECRET } from './middleware/auth.js';

// ============================================================
// Événements en direct (Server-Sent Events)
// - Connexion = joueur EN LIGNE
// - Le serveur peut pousser : frénésie, pomme, mise à jour d'état…
// - Reconnexion automatique par le navigateur (retry: 3 s)
// ============================================================

export const eventsRouter = Router();

// userId → Set<res> (un joueur peut avoir plusieurs onglets ouverts)
const connections = new Map();

eventsRouter.get('/events', (req, res) => {
  // EventSource ne peut pas envoyer d'en-têtes : le token passe en query
  let payload;
  try {
    payload = jwt.verify(String(req.query.token || ''), JWT_SECRET);
  } catch {
    return res.status(401).end();
  }
  const user = db
    .prepare('SELECT id, pseudo FROM users WHERE id = ?')
    .get(payload.sub);
  if (!user) return res.status(401).end();

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    // Désactive le buffering des reverse proxies (Traefik/Dokploy)
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 3000\n\n');
  res.write(`event: hello\ndata: ${JSON.stringify({ pseudo: user.pseudo })}\n\n`);

  let set = connections.get(user.id);
  if (!set) {
    set = new Set();
    connections.set(user.id, set);
  }
  set.add(res);

  // Battement de cœur : garde la connexion vivante
  const ping = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      /* connexion morte */
    }
  }, 25_000);

  req.on('close', () => {
    clearInterval(ping);
    const s = connections.get(user.id);
    if (s) {
      s.delete(res);
      if (s.size === 0) connections.delete(user.id);
    }
  });
});

// Envoie un événement à toutes les connexions d'un joueur.
// Retourne false si le joueur n'a aucune connexion active (hors ligne).
export function sendToUser(userId, event, data) {
  const set = connections.get(userId);
  if (!set || set.size === 0) return false;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  let delivered = 0;
  for (const res of set) {
    try {
      res.write(payload);
      delivered++;
    } catch {
      /* connexion morte, nettoyée au close */
    }
  }
  return delivered > 0;
}

export function isOnline(userId) {
  const set = connections.get(userId);
  return !!set && set.size > 0;
}
