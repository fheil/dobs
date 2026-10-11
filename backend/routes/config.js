import { Router } from 'express';
import { accentFromEnv as accentColor } from '../accent.js';

const router = Router();

// Public (the accent color is also needed on the login page).
router.get('/', (_req, res) => {
  res.json({ accentColor });
});

export default router;
