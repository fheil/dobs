import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db, { isUniqueViolation } from '../db.js';
import { authenticate, signToken } from '../auth-middleware.js';
import { getSettings } from '../settings.js';
import { isBlocked, recordFailure, recordSuccess, TOO_MANY } from '../rate-limit.js';
import { LIMITS, hasControlChars } from '../limits.js';
import { ADMIN_USERNAME } from '../admin-bootstrap.js';
import { publicUser, setDisplayName, usernameClashesWithDisplayName } from '../users.js';

const router = Router();

// Compared against when the username doesn't exist, so a login takes the
// same time either way (no username probing via response times).
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 12);

const passwordError = password => {
  if (typeof password !== 'string' || password.length < 8) return 'Passwort muss mindestens 8 Zeichen haben.';
  if (Buffer.byteLength(password) > LIMITS.passwordBytes) return `Passwort ist zu lang (höchstens ${LIMITS.passwordBytes} Zeichen, Umlaute zählen doppelt).`;
  return null;
};

router.post('/register', (req, res) => {
  if (!getSettings().registration_enabled) return res.status(403).json({ error: 'Registrierung ist derzeit deaktiviert.' });
  const { username, password } = req.body || {};
  const name = typeof username === 'string' ? username.trim() : '';
  if (name.length < 3 || name.length > LIMITS.username || hasControlChars(name)) {
    return res.status(400).json({ error: `Benutzername muss 3 bis ${LIMITS.username} Zeichen haben.` });
  }
  const pwError = passwordError(password);
  if (pwError) return res.status(400).json({ error: pwError });
  if (usernameClashesWithDisplayName(name)) return res.status(409).json({ error: 'Benutzername bereits vergeben.' });
  try {
    // Who becomes admin on sign-up: with ADMIN_USERNAME set only that name
    // (and only while there is no admin yet), otherwise the very first user.
    const noAdminYet = !db.prepare('SELECT 1 FROM users WHERE admin = 1').get();
    const admin = ADMIN_USERNAME
      ? (noAdminYet && name === ADMIN_USERNAME ? 1 : 0)
      : (db.prepare('SELECT 1 FROM users LIMIT 1').get() ? 0 : 1);
    const info = db.prepare('INSERT INTO users (username, password_hash, admin) VALUES (?, ?, ?)').run(name, bcrypt.hashSync(password, 12), admin);
    const user = { id: Number(info.lastInsertRowid), username: name, token_version: 0 };
    res.status(201).json({ token: signToken(user), user: publicUser(user.id) });
  } catch (e) { res.status(isUniqueViolation(e) ? 409 : 500).json({ error: isUniqueViolation(e) ? 'Benutzername bereits vergeben.' : 'Registrierung fehlgeschlagen.' }); }
});

router.post('/login', (req, res) => {
  if (isBlocked(req.ip)) return res.status(429).json(TOO_MANY);
  const { username, password } = req.body || {};
  const user = db.prepare('SELECT id, username, password_hash, admin, token_version FROM users WHERE username = ?')
    .get(typeof username === 'string' ? username.trim() : '');
  const valid = bcrypt.compareSync(typeof password === 'string' ? password : '', user?.password_hash || DUMMY_HASH);
  if (!user || !valid) {
    recordFailure(req.ip);
    return res.status(401).json({ error: 'Ungültige Zugangsdaten.' });
  }
  recordSuccess(req.ip);
  res.json({ token: signToken(user), user: publicUser(user.id) });
});

router.get('/registration-status', (_req, res) => {
  res.json({ enabled: getSettings().registration_enabled });
});

// Changing the password logs out every other session: token_version goes up,
// which invalidates all older tokens. This session gets a fresh token.
router.put('/password', authenticate, (req, res) => {
  if (isBlocked(req.ip)) return res.status(429).json(TOO_MANY);
  const { currentPassword, newPassword } = req.body || {};
  const pwError = passwordError(newPassword);
  if (pwError) return res.status(400).json({ error: pwError });
  const user = db.prepare('SELECT id, username, password_hash, token_version FROM users WHERE id = ?').get(req.user.id);
  if (!user || !bcrypt.compareSync(typeof currentPassword === 'string' ? currentPassword : '', user.password_hash)) {
    recordFailure(req.ip);
    return res.status(401).json({ error: 'Aktuelles Passwort ist falsch.' });
  }
  recordSuccess(req.ip);
  db.prepare('UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?')
    .run(bcrypt.hashSync(newPassword, 12), user.id);
  res.json({ success: true, token: signToken({ ...user, token_version: user.token_version + 1 }) });
});

// Personal settings of the current user.
const readPreferences = userId => {
  const u = db.prepare('SELECT report_start_day, report_end_day FROM users WHERE id = ?').get(userId);
  return { reportStartDay: u.report_start_day, reportEndDay: u.report_end_day };
};

router.get('/preferences', authenticate, (req, res) => {
  res.json(readPreferences(req.user.id));
});

router.put('/preferences', authenticate, (req, res) => {
  const start = Number(req.body?.reportStartDay);
  const end = Number(req.body?.reportEndDay);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > 6 || start > end) {
    return res.status(400).json({ error: 'Ungültiger Wochentagsbereich.' });
  }
  db.prepare('UPDATE users SET report_start_day = ?, report_end_day = ? WHERE id = ?').run(start, end, req.user.id);
  res.json(readPreferences(req.user.id));
});

router.get('/me', authenticate, (req, res) => {
  const user = publicUser(req.user.id);
  if (!user) return res.status(401).json({ error: 'Benutzer existiert nicht mehr.' });
  res.json({ user });
});

// Own display name ('' clears it).
router.put('/profile', authenticate, (req, res) => {
  const { user, error, status } = setDisplayName(req.user.id, req.body?.displayName);
  if (error) return res.status(status).json({ error });
  res.json({ user });
});

export default router;
