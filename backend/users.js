import db from './db.js';
import { LIMITS, hasControlChars } from './limits.js';

// What other users see: the display name, or the login name if none is set.
export const DISPLAY = (alias = 'u') => `COALESCE(${alias}.display_name, ${alias}.username)`;

// The name shown for a user must be unique among all *visible* names, so
// nobody can pose as someone else in reactions or as an author. A visible
// name is a display name, or the login name of a user without one.
function nameTaken(name, exceptUserId) {
  return !!db.prepare(`
    SELECT 1 FROM users
    WHERE id <> ? AND (display_name = ? COLLATE NOCASE OR username = ? COLLATE NOCASE)
  `).get(exceptUserId, name, name);
}

// Sets (or with '' clears) a user's display name. Returns { user } or { error }.
export function setDisplayName(userId, value) {
  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(userId);
  if (!user) return { error: 'Benutzer nicht gefunden.', status: 404 };

  const name = typeof value === 'string' ? value.trim() : '';
  if (name && (name.length < 2 || name.length > LIMITS.displayName || hasControlChars(name))) {
    return { error: `Anzeigename muss 2 bis ${LIMITS.displayName} Zeichen haben.`, status: 400 };
  }
  // Clearing makes the login name visible again - it must not collide either.
  if (nameTaken(name || user.username, userId)) {
    return { error: 'Dieser Name wird schon verwendet.', status: 409 };
  }
  db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(name || null, userId);
  return { user: publicUser(userId) };
}

// The current user as the frontend needs it.
export function publicUser(userId) {
  const u = db.prepare('SELECT id, username, display_name, admin FROM users WHERE id = ?').get(userId);
  return u && { id: u.id, username: u.username, displayName: u.display_name || null, admin: !!u.admin };
}

// A new login name may not equal anyone's display name (case-insensitive).
export const usernameClashesWithDisplayName = name =>
  !!db.prepare('SELECT 1 FROM users WHERE display_name = ? COLLATE NOCASE').get(name);
