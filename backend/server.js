import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import entriesRoutes from './routes/entries.js';
import projectsRoutes from './routes/projects.js';
import adminRoutes from './routes/admin.js';
import configRoutes from './routes/config.js';
import iconsRoutes from './routes/icons.js';
import './admin-bootstrap.js';

dotenv.config();

const app = express();
app.disable('x-powered-by');
// Exactly one reverse proxy (Traefik or the frontend's nginx) sits in front:
// req.ip is then the real client address from X-Forwarded-For (used by the
// login rate limit) and can't be spoofed by the client itself.
app.set('trust proxy', 1);

// Security headers for API responses (the HTML pages get theirs from nginx).
app.use((_req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'"
  });
  next();
});

const corsOrigin = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:8060';
app.use(cors({ origin: corsOrigin, credentials: true }));

app.use(express.json({ limit: '100kb' }));
app.use((req, _res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

// Health-Check für Traefik
app.get('/health', (_req, res) => res.json({ ok: true, service: 'dobs-backend', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/entries', entriesRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/config', configRoutes);
app.use('/api/icons', iconsRoutes);

// Client errors from the body parser (too large, malformed JSON) keep their
// 4xx status; everything else is a logged 500 without details for the client.
app.use((err, _req, res, _next) => {
  const status = err.status >= 400 && err.status < 500 ? err.status : 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 413 ? 'Anfrage zu groß.' : status === 500 ? 'Interner Serverfehler.' : 'Ungültige Anfrage.' });
});

const port = Number(process.env.PORT) || 8050;
app.listen(port, '0.0.0.0', () => console.log(`dobs Backend listening on http://0.0.0.0:${port}`));
