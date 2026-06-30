// ── Safety: remove stale express-rate-limit from Render's cached node_modules ─
try {
  const path = require('path');
  const fs   = require('fs');
  const rlDir = path.join(__dirname, 'node_modules', 'express-rate-limit');
  if (fs.existsSync(rlDir)) {
    fs.rmSync(rlDir, { recursive: true, force: true });
    console.log('[startup] Removed stale express-rate-limit from node_modules cache.');
  }
} catch (_) {}

const dns = require('dns');
try { dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']); } catch (_) {}

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const { connectDatabase } = require('./src/config/database');
const { createSocketServer } = require('./src/socket/index');
const { startCronJobs } = require('./src/cron/jobs');
const routes = require('./src/routes/index');
const { RemovedMember } = require('./src/models/index');
const { revokedEmails } = require('./src/utils/helpers');
const { errorHandler } = require('./src/middleware/errorHandler');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Lightweight security headers. Deliberately omits CSP / X-Frame-Options /
// Cross-Origin-Resource-Policy because this API serves images & PDFs that the
// Vercel frontend loads cross-origin — those headers would break them.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  next();
});

const httpServer = http.createServer(app);

const io = createSocketServer(httpServer);
app.set('io', io);

const { ALLOWED_ORIGINS } = require('./src/utils/helpers');
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = ALLOWED_ORIGINS.some((o) =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    if (allowed) return callback(null, true);
    console.warn(`[CORS] Blocked origin: ${origin}`);
    callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json({ limit: '25mb' }));

app.get('/health', (req, res) => {
  const { getConnectionStatus } = require('./src/config/database');
  const db = getConnectionStatus();
  const readyStateLabel = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    db: {
      connected: db.connected,
      state: readyStateLabel[db.readyState] ?? db.readyState,
      lastError: db.lastError ?? null,
    },
    env: {
      MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'MISSING',
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'MISSING',
      BREVO_API_KEY: process.env.BREVO_API_KEY ? 'SET' : 'MISSING',
      INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET ? 'SET' : 'MISSING',
    },
  });
});

connectDatabase();

app.use(routes);

app.use(errorHandler);

startCronJobs(io);

const PORT = process.env.PORT || 10002;
httpServer.listen(PORT, () => {
  console.log(`Backend Server running on port ${PORT}`);

  RemovedMember.find({}).lean().then((docs) => {
    docs.forEach((d) => revokedEmails.add(d.email.toLowerCase()));
    if (docs.length) console.log(`[startup] ${docs.length} revoked email(s) loaded`);
  }).catch(() => {});

  const SELF_URL = process.env.RENDER_EXTERNAL_URL;
  if (SELF_URL) {
    const pinger = require('https');
    setInterval(() => {
      pinger.get(`${SELF_URL}/health`, (res) => res.resume()).on('error', () => {});
    }, 14 * 60 * 1000);
  }
});

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Waiting 3 seconds before retry...`);
    setTimeout(() => {
      httpServer.close();
      httpServer.listen(PORT);
    }, 3000);
  } else {
    throw err;
  }
});
