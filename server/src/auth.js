import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db, now, ADMIN_PSEUDO } from './db.js';
import { signToken } from './middleware/auth.js';

export const authRouter = Router();

const PSEUDO_RE = /^[a-zA-Z0-9_-]{3,16}$/;

authRouter.post('/register', (req, res) => {
  const { pseudo, password } = req.body || {};
  if (!pseudo || !password) {
    return res.status(400).json({ error: 'Pseudo et mot de passe requis' });
  }
  if (!PSEUDO_RE.test(pseudo)) {
    return res.status(400).json({
      error: 'Pseudo : 3 à 16 caractères (lettres, chiffres, - ou _)',
    });
  }
  // Le pseudo administrateur ne peut jamais être pris par quelqu'un d'autre
  if (pseudo.toLowerCase() === ADMIN_PSEUDO) {
    return res.status(403).json({ error: 'Ce pseudo est réservé' });
  }
  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: 'Mot de passe : 6 caractères minimum' });
  }

  const existing = db
    .prepare('SELECT id FROM users WHERE pseudo = ? COLLATE NOCASE')
    .get(pseudo);
  if (existing) {
    return res.status(409).json({ error: 'Ce pseudo est déjà pris' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const t = now();
  const info = db
    .prepare(
      'INSERT INTO users (pseudo, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?)'
    )
    .run(pseudo, hash, t, t);

  const token = signToken({ id: info.lastInsertRowid, pseudo });
  res.status(201).json({ token, pseudo });
});

authRouter.post('/login', (req, res) => {
  const { pseudo, password } = req.body || {};
  if (!pseudo || !password) {
    return res.status(400).json({ error: 'Pseudo et mot de passe requis' });
  }
  const user = db
    .prepare('SELECT id, pseudo, password_hash FROM users WHERE pseudo = ? COLLATE NOCASE')
    .get(pseudo);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Pseudo ou mot de passe incorrect' });
  }
  // Horodate le login : ouvre la fenêtre de migration (fusion d'une
  // progression locale en avance, sans contrôle anti-triche)
  db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now(), user.id);
  const token = signToken(user);
  res.json({ token, pseudo: user.pseudo });
});
