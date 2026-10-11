import { Router } from 'express';
import db from '../db.js';
import { authenticate, requireAdmin } from '../auth-middleware.js';
import { getSettings, updateSettings } from '../settings.js';

const router = Router();
router.use(authenticate, requireAdmin);

// ----- Benutzer / Admin-Rechte -----

router.get('/users', (_req, res) => {
  const users = db.prepare('SELECT id, username, admin FROM users ORDER BY username COLLATE NOCASE').all();
  res.json(users.map(u => ({ ...u, admin: !!u.admin })));
});

router.put('/users/:id/admin', (req, res) => {
  const targetId = Number(req.params.id);
  if (targetId === req.user.id) {
    return res.status(400).json({ error: 'Du kannst deinen eigenen Admin-Status nicht ändern.' });
  }
  const r = db.prepare('UPDATE users SET admin = ? WHERE id = ?').run(req.body?.admin ? 1 : 0, targetId);
  if (!r.changes) return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
  res.json({ id: targetId, admin: !!req.body?.admin });
});

// ----- Löschen & Sperren -----

router.get('/settings', (_req, res) => {
  res.json(getSettings());
});

router.put('/settings', (req, res) => {
  res.json(updateSettings(req.body || {}));
});

// ----- Projekte -----

const projectRow = id => db.prepare(`
  SELECT p.id, p.name, (SELECT count(*) FROM entries e WHERE e.project_id = p.id) AS entry_count,
    (SELECT count(*) FROM entries e WHERE e.project_id = p.id AND e.deleted_at IS NOT NULL) AS deleted_count
  FROM projects p WHERE p.id = ?
`).get(id);

const cleanName = name => (typeof name === 'string' ? name.trim() : '');

const uniqueError = (e, res) => {
  if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'Ein Projekt mit diesem Namen gibt es schon.' });
  throw e;
};

router.get('/projects', (_req, res) => {
  res.json(db.prepare(`
    SELECT p.id, p.name, (SELECT count(*) FROM entries e WHERE e.project_id = p.id) AS entry_count,
    (SELECT count(*) FROM entries e WHERE e.project_id = p.id AND e.deleted_at IS NOT NULL) AS deleted_count
    FROM projects p ORDER BY p.id
  `).all());
});

router.post('/projects', (req, res) => {
  const name = cleanName(req.body?.name);
  if (!name) return res.status(400).json({ error: 'Projektname erforderlich.' });
  try {
    const id = db.transaction(() => {
      const info = db.prepare('INSERT INTO projects (name) VALUES (?)').run(name);
      // The creating admin gets access right away.
      db.prepare("INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, 'write')").run(info.lastInsertRowid, req.user.id);
      return info.lastInsertRowid;
    })();
    res.status(201).json(projectRow(id));
  } catch (e) { uniqueError(e, res); }
});

router.put('/projects/:id', (req, res) => {
  const name = cleanName(req.body?.name);
  if (!name) return res.status(400).json({ error: 'Projektname erforderlich.' });
  try {
    const r = db.prepare('UPDATE projects SET name = ? WHERE id = ?').run(name, req.params.id);
    if (!r.changes) return res.status(404).json({ error: 'Projekt nicht gefunden.' });
    res.json(projectRow(req.params.id));
  } catch (e) { uniqueError(e, res); }
});

router.delete('/projects/:id', (req, res) => {
  const project = projectRow(req.params.id);
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden.' });
  if (project.entry_count > 0) {
    return res.status(409).json({ error: 'Projekte mit Einträgen können nicht gelöscht werden (auch gelöschte Einträge zählen, bis ein Admin sie endgültig entfernt).' });
  }
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ deleted: 1 });
});

// ----- Projektzuordnung -----

router.get('/members', (_req, res) => {
  res.json(db.prepare('SELECT project_id, user_id, role FROM project_members').all());
});

// Body: { project_id, user_id, role: 'read' | 'write' | null } - null removes access.
router.put('/members', (req, res) => {
  const { project_id, user_id, role } = req.body || {};
  if (role !== null && role !== 'read' && role !== 'write') {
    return res.status(400).json({ error: 'Ungültige Rolle.' });
  }
  if (!db.prepare('SELECT 1 FROM projects WHERE id = ?').get(project_id) || !db.prepare('SELECT 1 FROM users WHERE id = ?').get(user_id)) {
    return res.status(404).json({ error: 'Projekt oder Benutzer nicht gefunden.' });
  }
  if (role === null) {
    db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?').run(project_id, user_id);
  } else {
    db.prepare(`
      INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)
      ON CONFLICT (project_id, user_id) DO UPDATE SET role = excluded.role
    `).run(project_id, user_id, role);
  }
  res.json({ project_id, user_id, role });
});

export default router;
