import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { authenticate, isCurrentUserAdmin } from '../auth-middleware.js';

const router = Router();
const secret = process.env.JWT_SECRET || 'change-this-secret-in-production';
const registrationEnabled = process.env.REGISTRATION_ENABLED !== 'false';
const tokenFor = user => jwt.sign({ id: user.id, username: user.username }, secret, { expiresIn: '7d' });

router.post('/register', (req, res) => {
  if (!registrationEnabled) return res.status(403).json({ error: 'Registrierung ist derzeit deaktiviert.' });
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || username.trim().length < 3 || typeof password !== 'string' || password.length < 8)
    return res.status(400).json({ error: 'Benutzername (mind. 3 Zeichen) und Passwort (mind. 8 Zeichen) erforderlich.' });
  try {
    // The very first user becomes admin, so somebody can manage projects.
    const admin = db.prepare('SELECT 1 FROM users LIMIT 1').get() ? 0 : 1;
    const info = db.prepare('INSERT INTO users (username, password_hash, admin) VALUES (?, ?, ?)').run(username.trim(), bcrypt.hashSync(password, 12), admin);
    const user = { id: Number(info.lastInsertRowid), username: username.trim(), admin: !!admin };
    res.status(201).json({ token: tokenFor(user), user });
  } catch (e) { res.status(e.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 409 : 500).json({ error: e.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 'Benutzername bereits vergeben.' : 'Registrierung fehlgeschlagen.' }); }
});

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = db.prepare('SELECT id, username, password_hash, admin FROM users WHERE username = ?').get(typeof username === 'string' ? username.trim() : '');
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) return res.status(401).json({ error: 'Ungültige Zugangsdaten.' });
  res.json({ token: tokenFor(user), user: { id: user.id, username: user.username, admin: !!user.admin } });
});

router.get('/registration-status', (_req, res) => {
  res.json({ enabled: registrationEnabled });
});

router.put('/password', authenticate, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ error: 'Neues Passwort muss mindestens 8 Zeichen haben.' });
  }
  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!user || !bcrypt.compareSync(currentPassword || '', user.password_hash)) {
    return res.status(401).json({ error: 'Aktuelles Passwort ist falsch.' });
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 12), req.user.id);
  res.json({ success: true });
});

router.get('/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(401).json({ error: 'Benutzer existiert nicht mehr.' });
  res.json({ user: { ...user, admin: isCurrentUserAdmin(req) } });
});

export default router;
