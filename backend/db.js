// Node's built-in SQLite: no native npm module, so the image build needs no
// binary download or compiler (works behind restrictive proxies).
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const dataDir = process.env.DATA_DIR || '/app/data';
const dbFile = path.join(dataDir, 'dobs.db');

// Most common deployment mistake: a host data dir not owned by the
// container user. Fail with a message that says how to fix it.
function exitDataDirNotWritable(cause) {
  const uid = process.getuid?.() ?? '?';
  console.error(
    `Datenverzeichnis ${dataDir} ist für den Backend-User (UID ${uid}) nicht beschreibbar` +
    (cause ? ` (${cause})` : '') + '.\n' +
    `Auf dem Host das gemountete Verzeichnis dem Container-User geben, z. B.: chown -R ${uid}:${uid} <BASE_DIR>/<BINDS>/data`
  );
  process.exit(1);
}

try {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.accessSync(dataDir, fs.constants.R_OK | fs.constants.W_OK);
  if (fs.existsSync(dbFile)) fs.accessSync(dbFile, fs.constants.R_OK | fs.constants.W_OK);
} catch (e) {
  exitDataDirNotWritable(e.code);
}

let db;
try {
  db = new DatabaseSync(dbFile);
} catch (e) {
  if (e.errcode === 14) exitDataDirNotWritable('SQLITE_CANTOPEN'); // e.g. WAL/SHM files owned by another user
  throw e;
}

// busy_timeout: wait up to 5 s for a lock (e.g. held by sqlite-web) instead
// of failing right away.
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');

// Runs fn inside a transaction; rolls back if it throws.
export function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

// SQLITE_CONSTRAINT_UNIQUE (extended result code 2067).
export const isUniqueViolation = e => e?.errcode === 2067;

// entry_date: "YYYY-MM-DD" (Pflicht), entry_time: "HH:MM" oder '' (optional).
// Ein Hindernis gilt als gelöst, sobald done = 1 ist.
// project_members.role: 'read' (nur Lesen) oder 'write' (Lesen+Schreiben).
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  -- What others see; NULL = show the login name. Unique (index below).
  display_name TEXT,
  password_hash TEXT NOT NULL,
  admin INTEGER NOT NULL DEFAULT 0,
  -- Raised on password change; tokens carry it and go stale when it differs.
  token_version INTEGER NOT NULL DEFAULT 0,
  -- Which weekdays the user's Report lists: 0 = Montag ... 6 = Sonntag.
  report_start_day INTEGER NOT NULL DEFAULT 0,
  report_end_day INTEGER NOT NULL DEFAULT 6,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_display_name ON users(display_name COLLATE NOCASE);

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
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
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

CREATE INDEX IF NOT EXISTS idx_entries_project_date ON entries(project_id, entry_date);

-- App-wide rules for deleting/locking entries (single row, set by admins).
CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  delete_allowed INTEGER NOT NULL DEFAULT 1,
  delete_done_allowed INTEGER NOT NULL DEFAULT 0,
  delete_reacted_allowed INTEGER NOT NULL DEFAULT 0,
  lock_reacted INTEGER NOT NULL DEFAULT 1,
  admins_see_deleted INTEGER NOT NULL DEFAULT 1,
  registration_enabled INTEGER NOT NULL DEFAULT 1
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

export function roleFor(userId, projectId) {
  return db.prepare('SELECT role FROM project_members WHERE user_id = ? AND project_id = ?').get(userId, projectId)?.role || null;
}

export default db;
