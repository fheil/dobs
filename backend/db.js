import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const dataDir = process.env.DATA_DIR || '/app/data';
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'dobs.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// entry_date: "YYYY-MM-DD" (Pflicht), entry_time: "HH:MM" oder '' (optional).
// Ein Hindernis gilt als gelöst, sobald done = 1 ist.
// project_members.role: 'read' (nur Lesen) oder 'write' (Lesen+Schreiben).
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  admin INTEGER NOT NULL DEFAULT 0,
  -- Which weekdays the user's Report lists: 0 = Montag ... 6 = Sonntag.
  report_start_day INTEGER NOT NULL DEFAULT 0,
  report_end_day INTEGER NOT NULL DEFAULT 6,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS project_members (
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('read', 'write')),
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE RESTRICT,
  entry_date TEXT NOT NULL,
  entry_time TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  obstacles TEXT NOT NULL DEFAULT '',
  done INTEGER NOT NULL DEFAULT 0,
  -- Deleting only archives: hidden from everyone, restorable by admins.
  deleted_at TEXT,
  deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- App-wide rules for deleting/locking entries (single row, set by admins).
CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  delete_allowed INTEGER NOT NULL DEFAULT 1,
  delete_done_allowed INTEGER NOT NULL DEFAULT 0,
  delete_reacted_allowed INTEGER NOT NULL DEFAULT 0,
  lock_reacted INTEGER NOT NULL DEFAULT 1,
  admins_see_deleted INTEGER NOT NULL DEFAULT 1
);

INSERT OR IGNORE INTO app_settings (id) VALUES (1);
`);

// Per-user feedback on entries from anyone with (at least) read access:
// one 1-5 star rating each, plus toggles 'shocked' (very surprised by the
// obstacle) and 'support' (offers support).
db.exec(`
CREATE TABLE IF NOT EXISTS entry_ratings (
  entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (entry_id, user_id)
);

CREATE TABLE IF NOT EXISTS entry_reactions (
  entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('shocked', 'support')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (entry_id, user_id, kind)
);
`);

// Migration for databases created before projects/admin existed.
const columns = table => db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
if (!columns('users').includes('admin')) {
  db.exec('ALTER TABLE users ADD COLUMN admin INTEGER NOT NULL DEFAULT 0');
}
for (const col of ['report_start_day INTEGER NOT NULL DEFAULT 0', 'report_end_day INTEGER NOT NULL DEFAULT 6']) {
  if (!columns('users').includes(col.split(' ')[0])) db.exec(`ALTER TABLE users ADD COLUMN ${col}`);
}
// The report week used to be a global setting.
db.exec('DROP TABLE IF EXISTS config');
for (const col of ['deleted_at TEXT', 'deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL']) {
  if (!columns('entries').includes(col.split(' ')[0])) db.exec(`ALTER TABLE entries ADD COLUMN ${col}`);
}
if (!columns('entries').includes('project_id')) {
  db.exec('ALTER TABLE entries ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE RESTRICT');
}

db.exec(`
DROP INDEX IF EXISTS idx_entries_user_date;
CREATE INDEX IF NOT EXISTS idx_entries_project_date ON entries(project_id, entry_date);
`);

// Without any admin nobody could manage projects - promote the oldest user.
if (!db.prepare('SELECT 1 FROM users WHERE admin = 1').get()) {
  db.prepare('UPDATE users SET admin = 1 WHERE id = (SELECT min(id) FROM users)').run();
}

export function roleFor(userId, projectId) {
  return db.prepare('SELECT role FROM project_members WHERE user_id = ? AND project_id = ?').get(userId, projectId)?.role || null;
}

export default db;
