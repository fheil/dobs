import { Router } from 'express';
import db, { isUniqueViolation, transaction } from '../db.js';
import { authenticate, requireAdmin } from '../auth-middleware.js';
import { getSettings, updateSettings } from '../settings.js';
import { LIMITS, hasControlChars } from '../limits.js';
import { setDisplayName } from '../users.js';

const router = Router();
router.use(authenticate, requireAdmin);

// ----- Benutzer / Admin-Rechte -----

router.get('/users', (_req, res) => {
  const users = db.prepare(`
    SELECT id, username, display_name, admin FROM users
    ORDER BY COALESCE(display_name, username) COLLATE NOCASE
  `).all();
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

router.put('/users/:id/display-name', (req, res) => {
  const { user, error, status } = setDisplayName(Number(req.params.id), req.body?.displayName);
  if (error) return res.status(status).json({ error });
  res.json({ id: user.id, display_name: user.displayName });
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
const projectNameError = name => {
  if (!name) return 'Projektname erforderlich.';
  if (name.length > LIMITS.projectName || hasControlChars(name)) return `Projektname darf höchstens ${LIMITS.projectName} Zeichen haben.`;
  return null;
};

const uniqueError = (e, res) => {
  if (isUniqueViolation(e)) return res.status(409).json({ error: 'Ein Projekt mit diesem Namen gibt es schon.' });
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
  const nameError = projectNameError(name);
  if (nameError) return res.status(400).json({ error: nameError });
  try {
    const id = transaction(() => {
      const info = db.prepare('INSERT INTO projects (name) VALUES (?)').run(name);
      // The creating admin gets access right away.
      db.prepare("INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, 'write')").run(info.lastInsertRowid, req.user.id);
      return info.lastInsertRowid;
    });
    res.status(201).json(projectRow(id));
  } catch (e) { uniqueError(e, res); }
});

router.put('/projects/:id', (req, res) => {
  const name = cleanName(req.body?.name);
  const nameError = projectNameError(name);
  if (nameError) return res.status(400).json({ error: nameError });
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
  const project_id = Number(req.body?.project_id);
  const user_id = Number(req.body?.user_id);
  const role = req.body?.role ?? null;
  if (role !== null && role !== 'read' && role !== 'write') {
    return res.status(400).json({ error: 'Ungültige Rolle.' });
  }
  if (!db.prepare('SELECT 1 FROM projects WHERE id = ?').get(project_id) || !db.prepare('SELECT 1 FROM users WHERE id = ?').get(user_id)) {
    return res.status(404).json({ error: 'Projekt oder Benutzer nicht gefunden.' });
  }
  // A project lead always has "Lesen+Schreiben": no downgrade, no removal
  // until the lead role is taken away.
  if (role !== 'write' && db.prepare('SELECT 1 FROM project_leads WHERE project_id = ? AND user_id = ?').get(project_id, user_id)) {
    return res.status(409).json({ error: 'Diese Person ist Projektleitung und hat immer Lesen+Schreiben – erst die Projektleitung entfernen.' });
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

// ----- Projektleitung -----

export const MAX_LEADS = 2;

router.get('/leads', (_req, res) => {
  res.json(db.prepare('SELECT project_id, user_id FROM project_leads').all());
});

// Body: { user_ids: [id, ...] } - replaces the project's leads (0 to 2 people).
// Leads always get "Lesen+Schreiben" (added, or upgraded from "Lesen").
router.put('/projects/:id/leads', (req, res) => {
  const projectId = Number(req.params.id);
  if (!db.prepare('SELECT 1 FROM projects WHERE id = ?').get(projectId)) {
    return res.status(404).json({ error: 'Projekt nicht gefunden.' });
  }
  const raw = req.body?.user_ids;
  const ids = Array.isArray(raw) ? [...new Set(raw.map(Number))] : null;
  if (!ids || ids.some(id => !Number.isInteger(id))) return res.status(400).json({ error: 'Ungültige Auswahl.' });
  if (ids.length > MAX_LEADS) return res.status(400).json({ error: `Höchstens ${MAX_LEADS} Personen können ein Projekt leiten.` });
  if (ids.some(id => !db.prepare('SELECT 1 FROM users WHERE id = ?').get(id))) {
    return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
  }
  transaction(() => {
    db.prepare('DELETE FROM project_leads WHERE project_id = ?').run(projectId);
    for (const id of ids) {
      db.prepare('INSERT INTO project_leads (project_id, user_id) VALUES (?, ?)').run(projectId, id);
      db.prepare(`
        INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, 'write')
        ON CONFLICT (project_id, user_id) DO UPDATE SET role = 'write'
      `).run(projectId, id);
    }
  });
  res.json({
    leads: db.prepare('SELECT project_id, user_id FROM project_leads WHERE project_id = ?').all(projectId),
    members: db.prepare('SELECT project_id, user_id, role FROM project_members WHERE project_id = ?').all(projectId)
  });
});

export default router;
