import jwt from 'jsonwebtoken';
import db from './db.js';

const secret = process.env.JWT_SECRET || 'change-this-secret-in-production';

export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentifizierung erforderlich.' });

  try { req.user = jwt.verify(token, secret); next(); }
  catch { return res.status(401).json({ error: 'Ungültiges oder abgelaufenes Token.' }); }
}

// Re-checks users.admin fresh from the DB on every call, never trusting a
// value baked into the token.
export function isCurrentUserAdmin(req) {
  return !!db.prepare('SELECT admin FROM users WHERE id = ?').get(req.user.id)?.admin;
}

export function requireAdmin(req, res, next) {
  if (!isCurrentUserAdmin(req)) return res.status(403).json({ error: 'Nur für Admins.' });
  next();
}

export default authenticate;
