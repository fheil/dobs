import { Router } from 'express';
import db from '../db.js';
import { authenticate } from '../auth-middleware.js';

const router = Router();
router.use(authenticate);

// Projects the current user is assigned to, with their role.
router.get('/', (req, res) => {
  res.json(db.prepare(`
    SELECT p.id, p.name, m.role
    FROM projects p JOIN project_members m ON m.project_id = p.id
    WHERE m.user_id = ?
    ORDER BY p.name COLLATE NOCASE
  `).all(req.user.id));
});

export default router;
