import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { ADMIN_PSEUDO } from '../db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'endoclicker-dev-secret-change-me';
const TOKEN_TTL = '30d';

if (!process.env.JWT_SECRET) {
  console.warn(
    '⚠️  JWT_SECRET non défini ! Les tokens sont signés avec le secret de dev.\n' +
      '   Définissez JWT_SECRET (ex : openssl rand -hex 32) avant la mise en production.'
  );
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, pseudo: user.pseudo }, JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token manquant' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db
      .prepare('SELECT id, pseudo FROM users WHERE id = ?')
      .get(payload.sub);
    if (!user) return res.status(401).json({ error: 'Compte introuvable' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

// Réserve les routes d'administration au compte défini par ADMIN_PSEUDO
export function isAdmin(req, res, next) {
  if (req.user.pseudo.toLowerCase() !== ADMIN_PSEUDO) {
    return res.status(403).json({ error: 'Accès réservé à l’administration' });
  }
  next();
}
