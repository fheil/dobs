import { Router } from 'express';
import db, { roleFor } from '../db.js';
import { authenticate, isCurrentUserAdmin } from '../auth-middleware.js';
import { REACTION_KINDS, othersReactionCounts, reactionsFor, withReactions } from '../reactions.js';
import { getSettings } from '../settings.js';
import { LIMITS } from '../limits.js';

const router = Router();
router.use(authenticate);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const TEXT_FIELDS = ['title', 'content', 'obstacles'];

// Validates/normalizes whatever subset of fields is present in the body.
// Returns { values } or { error }.
function parseFields(b) {
  const values = {};
  if ('entry_date' in b) {
    if (!DATE_RE.test(b.entry_date || '')) return { error: 'Gültiges Datum (JJJJ-MM-TT) erforderlich.' };
    values.entry_date = b.entry_date;
  }
  if ('entry_time' in b) {
    const t = b.entry_time || '';
    if (t && !TIME_RE.test(t)) return { error: 'Uhrzeit muss das Format HH:MM haben.' };
    values.entry_time = t;
  }
  for (const f of TEXT_FIELDS) {
    if (!(f in b)) continue;
    values[f] = typeof b[f] === 'string' ? b[f] : '';
    if (values[f].length > LIMITS[f]) return { error: `Text zu lang (höchstens ${LIMITS[f]} Zeichen).` };
  }
  if ('done' in b) values.done = b.done ? 1 : 0;
  return { values };
}

const SELECT = `SELECT e.*, u.username, d.username AS deleted_by_name
  FROM entries e JOIN users u ON u.id = e.user_id LEFT JOIN users d ON d.id = e.deleted_by`;
const toJson = row => row && { ...row, done: !!row.done };

// What the current user may do with an entry, and why not - computed here so
// the UI and the checks below can never disagree.
function permissionsFor(entry, { userId, isAdmin, role, settings, othersCount }) {
  const deleted = !!entry.deleted_at;
  const canEdit = !deleted && entry.user_id === userId && role === 'write';
  const contentLocked = canEdit && settings.lock_reacted && othersCount > 0;

  let deleteBlocked = null;
  if (deleted) deleteBlocked = 'Eintrag ist bereits gelöscht.';
  else if (isAdmin) deleteBlocked = null; // Admins dürfen immer löschen.
  else if (!canEdit) deleteBlocked = 'Du kannst nur eigene Einträge löschen.';
  else if (!settings.delete_allowed) deleteBlocked = 'Löschen ist deaktiviert.';
  else if (entry.done && !settings.delete_done_allowed) deleteBlocked = 'Erledigte Einträge können nicht gelöscht werden. Nimm zuerst „Erledigt“ heraus.';
  else if (othersCount > 0 && !settings.delete_reacted_allowed) {
    deleteBlocked = `Gesperrt: ${othersCount} ${othersCount === 1 ? 'Reaktion' : 'Reaktionen'} anderer Benutzer.`;
  }

  return {
    canEdit,
    contentLocked,
    canDelete: !deleteBlocked,
    deleteBlocked,
    canRestore: deleted && isAdmin
  };
}

// Adds reactions + permissions to entry rows (all from the given request).
function decorate(rows, req) {
  const userId = req.user.id;
  const isAdmin = isCurrentUserAdmin(req);
  const settings = getSettings();
  const others = othersReactionCounts(rows.map(r => r.id));
  const roles = new Map();
  const roleOf = projectId => {
    if (!roles.has(projectId)) roles.set(projectId, roleFor(userId, projectId));
    return roles.get(projectId);
  };
  return withReactions(rows.map(toJson), userId).map(e => ({
    ...e,
    permissions: permissionsFor(e, { userId, isAdmin, role: roleOf(e.project_id), settings, othersCount: others.get(e.id) })
  }));
}

const byId = (id, req) => decorate([db.prepare(`${SELECT} WHERE e.id = ?`).get(id)], req)[0];

// Deleted entries are only listed for admins, and only if the switch is on.
const showDeleted = req => getSettings().admins_see_deleted && isCurrentUserAdmin(req);
const notDeleted = req => (showDeleted(req) ? '' : 'AND e.deleted_at IS NULL');

// Every read needs at least read access to ?project_id; sets req.projectId.
function requireProjectAccess(req, res, next) {
  const projectId = Number(req.query.project_id);
  if (!projectId || !roleFor(req.user.id, projectId)) {
    return res.status(403).json({ error: 'Kein Zugriff auf dieses Projekt.' });
  }
  req.projectId = projectId;
  next();
}

// Loads :id as req.entry (with req.perms) if the user can see its project.
// Deleted entries are only found by admins.
function loadEntry(req, res, next) {
  const row = db.prepare(`${SELECT} WHERE e.id = ?`).get(req.params.id);
  const visible = row && roleFor(req.user.id, row.project_id) && (!row.deleted_at || isCurrentUserAdmin(req));
  if (!visible) return res.status(404).json({ error: 'Eintrag nicht gefunden.' });
  req.entry = decorate([row], req)[0];
  req.perms = req.entry.permissions;
  next();
}

// Reacting needs only read access, but not on deleted entries.
function requireActive(req, res, next) {
  if (req.entry.deleted_at) return res.status(409).json({ error: 'Eintrag ist gelöscht.' });
  next();
}

// GET /api/entries?project_id=N&from=YYYY-MM-DD&to=YYYY-MM-DD (beide inklusive)
router.get('/', requireProjectAccess, (req, res) => {
  const { from, to } = req.query;
  if (!DATE_RE.test(from || '') || !DATE_RE.test(to || '')) {
    return res.status(400).json({ error: 'Parameter from und to (JJJJ-MM-TT) erforderlich.' });
  }
  const rows = db.prepare(
    `${SELECT} WHERE e.project_id = ? AND e.entry_date BETWEEN ? AND ? ${notDeleted(req)} ORDER BY e.entry_date, e.entry_time, e.id`
  ).all(req.projectId, from, to);
  res.json(decorate(rows, req));
});

// Offene Hindernisse: nicht erledigt und Hindernisse-Feld nicht leer.
// order=asc (Standard): am längsten offen zuerst.
router.get('/obstacles', requireProjectAccess, (req, res) => {
  const dir = req.query.order === 'desc' ? 'DESC' : 'ASC';
  const rows = db.prepare(`
    ${SELECT}
    WHERE e.project_id = ? AND e.done = 0 AND trim(e.obstacles) <> '' ${notDeleted(req)}
    ORDER BY e.entry_date ${dir}, e.entry_time ${dir}, e.id ${dir}
  `).all(req.projectId);
  res.json(decorate(rows, req));
});

router.post('/', (req, res) => {
  const b = req.body || {};
  const projectId = Number(b.project_id);
  if (!projectId || roleFor(req.user.id, projectId) !== 'write') {
    return res.status(403).json({ error: 'Keine Schreibrechte für dieses Projekt.' });
  }
  if (!('entry_date' in b)) return res.status(400).json({ error: 'Datum erforderlich.' });
  const { values, error } = parseFields(b);
  if (error) return res.status(400).json({ error });

  const info = db.prepare(
    'INSERT INTO entries (user_id, project_id, entry_date, entry_time, title, content, obstacles, done) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    req.user.id,
    projectId,
    values.entry_date,
    values.entry_time ?? '',
    values.title ?? '',
    values.content ?? '',
    values.obstacles ?? '',
    values.done ?? 0
  );
  res.status(201).json(byId(info.lastInsertRowid, req));
});

router.put('/:id', loadEntry, (req, res) => {
  if (!req.perms.canEdit) return res.status(403).json({ error: 'Keine Schreibrechte für diesen Eintrag.' });
  const { values, error } = parseFields(req.body || {});
  if (error) return res.status(400).json({ error });
  const keys = Object.keys(values);
  if (!keys.length) return res.status(400).json({ error: 'Keine Felder zum Aktualisieren.' });
  if (req.perms.contentLocked && keys.some(k => k !== 'done')) {
    return res.status(403).json({ error: 'Andere haben auf diesen Eintrag reagiert – nur „Erledigt“ lässt sich noch ändern.' });
  }

  db.prepare(`UPDATE entries SET ${keys.map(k => `${k} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`)
    .run(...keys.map(k => values[k]), req.entry.id);
  res.json(byId(req.entry.id, req));
});

// Body: { stars: 1..5 } sets the own rating, { stars: null } removes it.
router.put('/:id/rating', loadEntry, requireActive, (req, res) => {
  const stars = req.body?.stars;
  if (stars === null) {
    db.prepare('DELETE FROM entry_ratings WHERE entry_id = ? AND user_id = ?').run(req.entry.id, req.user.id);
  } else if (Number.isInteger(stars) && stars >= 1 && stars <= 5) {
    db.prepare(`
      INSERT INTO entry_ratings (entry_id, user_id, stars) VALUES (?, ?, ?)
      ON CONFLICT (entry_id, user_id) DO UPDATE SET stars = excluded.stars, updated_at = datetime('now')
    `).run(req.entry.id, req.user.id, stars);
  } else {
    return res.status(400).json({ error: 'Bewertung muss 1 bis 5 Sterne sein.' });
  }
  res.json(reactionsFor([req.entry.id], req.user.id).get(req.entry.id));
});

// Body: { active: true | false } - toggles the own 'shocked'/'support' reaction.
router.put('/:id/reactions/:kind', loadEntry, requireActive, (req, res) => {
  const { kind } = req.params;
  if (!REACTION_KINDS.includes(kind)) return res.status(404).json({ error: 'Unbekannte Reaktion.' });
  if (req.body?.active) {
    db.prepare('INSERT OR IGNORE INTO entry_reactions (entry_id, user_id, kind) VALUES (?, ?, ?)').run(req.entry.id, req.user.id, kind);
  } else {
    db.prepare('DELETE FROM entry_reactions WHERE entry_id = ? AND user_id = ? AND kind = ?').run(req.entry.id, req.user.id, kind);
  }
  res.json(reactionsFor([req.entry.id], req.user.id).get(req.entry.id));
});

// Deleting archives the entry; admins can restore or purge it.
router.delete('/:id', loadEntry, (req, res) => {
  if (!req.perms.canDelete) return res.status(403).json({ error: req.perms.deleteBlocked });
  db.prepare("UPDATE entries SET deleted_at = datetime('now'), deleted_by = ? WHERE id = ?").run(req.user.id, req.entry.id);
  res.json(byId(req.entry.id, req));
});

// Restore/purge: non-admins get a plain 404 - they learn nothing about
// what admins can do.
const NOT_FOUND = { error: 'Eintrag nicht gefunden.' };

router.post('/:id/restore', loadEntry, (req, res) => {
  if (!req.perms.canRestore) return res.status(404).json(NOT_FOUND);
  db.prepare('UPDATE entries SET deleted_at = NULL, deleted_by = NULL WHERE id = ?').run(req.entry.id);
  res.json(byId(req.entry.id, req));
});

// Final removal (with its ratings/reactions) of an already deleted entry.
router.delete('/:id/purge', loadEntry, (req, res) => {
  if (!isCurrentUserAdmin(req)) return res.status(404).json(NOT_FOUND);
  if (!req.entry.deleted_at) return res.status(409).json({ error: 'Nur bereits gelöschte Einträge können endgültig entfernt werden.' });
  db.prepare('DELETE FROM entries WHERE id = ?').run(req.entry.id);
  res.json({ purged: 1 });
});

export default router;
