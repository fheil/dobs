import jwt from 'jsonwebtoken';
import db from './db.js';

// Refuse to run without a real secret: with a known/guessable one anybody
// could forge tokens, including admin ones.
const KNOWN_PLACEHOLDERS = ['change-this-secret-in-production', 'please-change-me-with-a-long-random-string'];
const secret = process.env.JWT_SECRET || '';
if (secret.length < 32 || KNOWN_PLACEHOLDERS.includes(secret)) {
  console.error('JWT_SECRET fehlt oder ist unsicher: mindestens 32 zufällige Zeichen setzen, z. B. mit "openssl rand -hex 32".');
  process.exit(1);
}

// tv = the user's token_version: raising it (password change) invalidates
// every token issued before.
export const signToken = user => jwt.sign(
  { id: user.id, username: user.username, tv: user.token_version ?? 0 },
  secret,
  { algorithm: 'HS256', expiresIn: '7d' }
);

export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentifizierung erforderlich.' });

  let payload;
  try { payload = jwt.verify(token, secret, { algorithms: ['HS256'] }); }
  catch { return res.status(401).json({ error: 'Ungültiges oder abgelaufenes Token.' }); }

  const row = db.prepare('SELECT token_version FROM users WHERE id = ?').get(payload.id);
  if (!row || row.token_version !== payload.tv) {
    return res.status(401).json({ error: 'Ungültiges oder abgelaufenes Token.' });
  }
  req.user = payload;
  next();
}

// Re-checks users.admin fresh from the DB on every call, never trusting a
// value baked into the token.
export function isCurrentUserAdmin(req) {
  return !!db.prepare('SELECT admin FROM users WHERE id = ?').get(req.user.id)?.admin;
}

// Non-admins get a plain 404, so the admin API doesn't reveal itself.
export function requireAdmin(req, res, next) {
  if (!isCurrentUserAdmin(req)) return res.status(404).json({ error: 'Nicht gefunden.' });
  next();
}

export default authenticate;
