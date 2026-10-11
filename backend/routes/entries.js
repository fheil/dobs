import { Router } from 'express';
import db, { roleFor } from '../db.js';
import { authenticate } from '../auth-middleware.js';

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
    if (f in b) values[f] = typeof b[f] === 'string' ? b[f] : '';
  }
  if ('done' in b) values.done = b.done ? 1 : 0;
  return { values };
}

const SELECT = 'SELECT e.*, u.username FROM entries e JOIN users u ON u.id = e.user_id';
const toJson = row => row && { ...row, done: !!row.done };
const byId = id => toJson(db.prepare(`${SELECT} WHERE e.id = ?`).get(id));

// Every read needs at least read access to ?project_id; sets req.projectId.
function requireProjectAccess(req, res, next) {
  const projectId = Number(req.query.project_id);
  if (!projectId || !roleFor(req.user.id, projectId)) {
    return res.status(403).json({ error: 'Kein Zugriff auf dieses Projekt.' });
  }
  req.projectId = projectId;
  next();
}

// Changing an entry: only its author, and only with write access to its project.
function loadOwnWritableEntry(req, res, next) {
  const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(req.params.id);
  if (!entry || !roleFor(req.user.id, entry.project_id)) return res.status(404).json({ error: 'Eintrag nicht gefunden.' });
  if (entry.user_id !== req.user.id || roleFor(req.user.id, entry.project_id) !== 'write') {
    return res.status(403).json({ error: 'Keine Schreibrechte für diesen Eintrag.' });
  }
  req.entry = entry;
  next();
}

// GET /api/entries?project_id=N&from=YYYY-MM-DD&to=YYYY-MM-DD (beide inklusive)
router.get('/', requireProjectAccess, (req, res) => {
  const { from, to } = req.query;
  if (!DATE_RE.test(from || '') || !DATE_RE.test(to || '')) {
    return res.status(400).json({ error: 'Parameter from und to (JJJJ-MM-TT) erforderlich.' });
  }
  const rows = db.prepare(
    `${SELECT} WHERE e.project_id = ? AND e.entry_date BETWEEN ? AND ? ORDER BY e.entry_date, e.entry_time, e.id`
  ).all(req.projectId, from, to);
  res.json(rows.map(toJson));
});

// Offene Hindernisse: nicht erledigt und Hindernisse-Feld nicht leer.
// order=asc (Standard): am längsten offen zuerst.
router.get('/obstacles', requireProjectAccess, (req, res) => {
  const dir = req.query.order === 'desc' ? 'DESC' : 'ASC';
  const rows = db.prepare(`
    ${SELECT}
    WHERE e.project_id = ? AND e.done = 0 AND trim(e.obstacles) <> ''
    ORDER BY e.entry_date ${dir}, e.entry_time ${dir}, e.id ${dir}
  `).all(req.projectId);
  res.json(rows.map(toJson));
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
  res.status(201).json(byId(info.lastInsertRowid));
});

router.put('/:id', loadOwnWritableEntry, (req, res) => {
  const { values, error } = parseFields(req.body || {});
  if (error) return res.status(400).json({ error });
  const keys = Object.keys(values);
  if (!keys.length) return res.status(400).json({ error: 'Keine Felder zum Aktualisieren.' });

  db.prepare(`UPDATE entries SET ${keys.map(k => `${k} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`)
    .run(...keys.map(k => values[k]), req.entry.id);
  res.json(byId(req.entry.id));
});

router.delete('/:id', loadOwnWritableEntry, (req, res) => {
  const r = db.prepare('DELETE FROM entries WHERE id = ?').run(req.entry.id);
  res.json({ deleted: r.changes });
});

export default router;
