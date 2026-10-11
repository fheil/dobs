import { Router } from 'express';
import db from '../db.js';
import { authenticate, requireAdmin } from '../auth-middleware.js';
import { accentFromEnv as accentColor } from '../accent.js';

const router = Router();

const readConfig = () => {
  const c = db.prepare('SELECT report_start_day, report_end_day FROM config WHERE id = 1').get();
  return { accentColor, reportStartDay: c.report_start_day, reportEndDay: c.report_end_day };
};

// Public (the accent color is also needed on the login page).
router.get('/', (_req, res) => {
  res.json(readConfig());
});

router.put('/', authenticate, requireAdmin, (req, res) => {
  const start = Number(req.body?.reportStartDay);
  const end = Number(req.body?.reportEndDay);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > 6 || start > end) {
    return res.status(400).json({ error: 'Ungültiger Wochentagsbereich.' });
  }
  db.prepare('UPDATE config SET report_start_day = ?, report_end_day = ? WHERE id = 1').run(start, end);
  res.json(readConfig());
});

export default router;
