import 'dotenv/config';
import './guard.js';
import express from 'express';
import compression from 'compression';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { requireAuth } from './auth.js';
import authRoutes from './routes/auth.js';
import transactionsRoutes from './routes/transactions.js';
import targetsRoutes from './routes/targets.js';
import historyRoutes from './routes/history.js';
import syncRoutes from './routes/sync.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = express();
// Zeabur runs a single reverse proxy in front of the app; trusting exactly
// one hop lets express-rate-limit read the real client IP from X-Forwarded-For
// without tripping its permissive-trust-proxy validation error.
app.set('trust proxy', 1);
app.use(compression());
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/transactions', requireAuth, transactionsRoutes);
app.use('/api/targets', requireAuth, targetsRoutes);
app.use('/api/history', requireAuth, historyRoutes);
// Machine-to-machine sync (Massiv Control Panel) — authenticated by its own
// static key, not the login session.
app.use('/api/sync', syncRoutes);

const distDir = path.join(__dirname, '..', 'dist');
app.use(express.static(distDir));
app.get(/^(?!\/api\/).*/, (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Financial Flow server listening on port ${PORT}`);
});
