import db from './db.js';

// Optional ADMIN_USERNAME: only a sign-up with exactly this name becomes the
// first admin. Without it, the very first registered user does - which on a
// freshly deployed public server could be somebody else.
export const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || '').trim() || null;

// Self-healing when no admin exists at all (e.g. after editing users in
// sqlite-web): promote the ADMIN_USERNAME user if set, otherwise the oldest
// user - never a random account when ADMIN_USERNAME is configured.
if (!db.prepare('SELECT 1 FROM users WHERE admin = 1').get()) {
  if (ADMIN_USERNAME) db.prepare('UPDATE users SET admin = 1 WHERE username = ?').run(ADMIN_USERNAME);
  else db.prepare('UPDATE users SET admin = 1 WHERE id = (SELECT min(id) FROM users)').run();
}
