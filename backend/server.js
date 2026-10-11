import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import entriesRoutes from './routes/entries.js';
import projectsRoutes from './routes/projects.js';
import adminRoutes from './routes/admin.js';
import configRoutes from './routes/config.js';
import iconsRoutes from './routes/icons.js';

dotenv.config();

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:8060';
app.use(cors({ origin: corsOrigin, credentials: true }));

app.use(express.json({ limit: '1mb' }));
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

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Interner Serverfehler.' });
});

const port = Number(process.env.PORT) || 8050;
app.listen(port, '0.0.0.0', () => console.log(`dobs Backend listening on http://0.0.0.0:${port}`));
