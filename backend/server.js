// ── v2025-06-11 ──────────────────────────────────────────────────────────────
// ── Safety: if a stale cached express-rate-limit exists in node_modules,
// delete it NOW before anything requires it so ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
// can never be thrown. This handles Render's persistent node_modules cache.
try {
  const path = require('path');
  const fs   = require('fs');
  const rlDir = path.join(__dirname, 'node_modules', 'express-rate-limit');
  if (fs.existsSync(rlDir)) {
    fs.rmSync(rlDir, { recursive: true, force: true });
    console.log('[startup] Removed stale express-rate-limit from node_modules cache.');
  }
} catch (_) {}

const cron = require('node-cron');
const dns = require('dns');
// Override system DNS with Google's public resolvers to fix querySrv ECONNREFUSED
// on networks where the local DNS server blocks or misroutes SRV lookups.
try { dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']); } catch (_) {}

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
// ── Zero-dependency rate limiter — replaces express-rate-limit entirely.
// express-rate-limit throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR on Render
// (a proxy host) even with app.set('trust proxy', 1) + validate:false due
// to stale cached node_modules.  This implementation has no such issue.
function makeRateLimiter({ windowMs, max, message }) {
  const store = new Map(); // ip → { count, resetAt }
  // Sweep stale entries every 10 minutes to avoid memory leak on long uptime
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of store) {
      if (now > entry.resetAt) store.delete(ip);
    }
  }, 10 * 60 * 1000).unref();

  return function rateLimitMiddleware(req, res, next) {
    // Honour the proxy-set header; fall back to socket address
    const ip =
      (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      'unknown';
    const now = Date.now();
    let entry = store.get(ip);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(ip, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      return res.status(429).json(
        typeof message === 'object' ? message : { error: message || 'Too many requests.' }
      );
    }
    next();
  };
}
// nodemailer replaced by Brevo HTTP API (no IP-whitelist issues)
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'edutechexos-jwt-secret-2026';
const JWT_EXPIRY = '7d';

// ── Brevo HTTP API helper (no SMTP / no IP whitelist needed) ─────────────────
// Supports: to (array of {email,name?}), bcc (optional array), subject, html.
// Use bcc for bulk sends — one API call, one email credit, no cross-leakage.
async function sendBrevoEmail({ to, bcc, subject, html }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) { console.error('[Brevo] BREVO_API_KEY not set'); return { ok: false, brevoError: 'NOT_CONFIGURED' }; }

  const fromRaw  = process.env.SMTP_FROM || 'EduTechExOS <edutechexos121@gmail.com>';
  const fromEmail = (fromRaw.match(/<(.+)>/) || [])[1] || fromRaw.trim();
  const fromName  = fromRaw.replace(/<.*>/, '').trim() || 'EduTechExOS';

  const toList = Array.isArray(to) ? to : [{ email: String(to) }];
  const bccCount = Array.isArray(bcc) ? bcc.length : 0;
  const totalRecipients = toList.length + bccCount;
  console.log(`[Brevo] Sending "${subject}" → ${totalRecipients} recipient(s)`);

  const payload = { sender: { name: fromName, email: fromEmail }, to: toList, subject, htmlContent: html };
  if (Array.isArray(bcc) && bcc.length > 0) payload.bcc = bcc;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const b = await res.text();
    console.error('[Brevo] FAILED', res.status, b);
    return { ok: false, brevoError: `${res.status}: ${b}` };
  }
  console.log(`[Brevo] OK — queued for ${totalRecipients} recipient(s)`);
  return { ok: true };
}

const app = express();

// Render (and most PaaS hosts) sit behind a reverse proxy that sets
// X-Forwarded-For. Tell Express to trust the first proxy hop so that
// express-rate-limit can identify real client IPs correctly.
app.set('trust proxy', 1);

const httpServer = http.createServer(app);

// Allow requests from the Vercel frontend and local dev
const ALLOWED_ORIGINS = [
  'https://edutechexos.vercel.app',

  /\.vercel\.app$/,           // any Vercel preview deploy
  /^http:\/\/localhost(:\d+)?$/,  // any localhost port (dev)
];

// Socket.IO server — same CORS rules as Express
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowed = ALLOWED_ORIGINS.some((o) =>
        typeof o === 'string' ? o === origin : o.test(origin)
      );
      if (allowed) return callback(null, true);
      callback(new Error(`CORS policy: origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

io.on('connection', (socket) => {
  // Client joins a channel room so it only receives messages for that channel
  socket.on('join_channel', (channelId) => {
    socket.join(channelId);
  });

  socket.on('leave_channel', (channelId) => {
    socket.leave(channelId);
  });

  // Typing indicators — broadcast to everyone else in the channel room
  socket.on('typing_start', ({ channelId, userName }) => {
    if (!channelId || !userName) return;
    socket.to(channelId).emit('user_typing', { channelId, userName });
  });

  socket.on('typing_stop', ({ channelId, userName }) => {
    if (!channelId || !userName) return;
    socket.to(channelId).emit('user_stopped_typing', { channelId, userName });
  });

  // ── Direct Message rooms ──────────────────────────────────────────────
  // Each DM conversation gets a room named dm:emailA::emailB (sorted)
  socket.on('join_dm', ({ myEmail, partnerEmail }) => {
    if (!myEmail || !partnerEmail) return;
    const room = 'dm:' + [myEmail.toLowerCase(), partnerEmail.toLowerCase()].sort().join('::');
    socket.join(room);
  });

  socket.on('leave_dm', ({ myEmail, partnerEmail }) => {
    if (!myEmail || !partnerEmail) return;
    const room = 'dm:' + [myEmail.toLowerCase(), partnerEmail.toLowerCase()].sort().join('::');
    socket.leave(room);
  });

  socket.on('dm_typing_start', ({ myEmail, partnerEmail }) => {
    if (!myEmail || !partnerEmail) return;
    const room = 'dm:' + [myEmail.toLowerCase(), partnerEmail.toLowerCase()].sort().join('::');
    socket.to(room).emit('dm_user_typing', { fromEmail: myEmail });
  });

  socket.on('dm_typing_stop', ({ myEmail, partnerEmail }) => {
    if (!myEmail || !partnerEmail) return;
    const room = 'dm:' + [myEmail.toLowerCase(), partnerEmail.toLowerCase()].sort().join('::');
    socket.to(room).emit('dm_user_stopped_typing', { fromEmail: myEmail });
  });

  socket.on('disconnect', () => {
    // rooms are automatically cleaned up on disconnect
  });
});

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Render health-check)
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

// Handle OPTIONS preflight for all routes (required for requests with
// Content-Type: application/json or Authorization headers)
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());

// ── Rate Limiting ─────────────────────────────────────────────────────────────
// Auth endpoints: strict limit to prevent brute-force / credential stuffing
const authLimiter = makeRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many auth attempts. Please wait 15 minutes before trying again.' },
});

// Message/API endpoints: generous limit for normal usage
const apiLimiter = makeRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  message: { error: 'Too many requests. Please slow down.' },
});

// Global fallback
const globalLimiter = makeRateLimiter({
  windowMs: 60 * 1000,
  max: 300,
  message: { error: 'Too many requests.' },
});

app.use('/api/auth/', authLimiter);
// globalLimiter covers GET/PATCH/DELETE on /api/access-requests (admin ops need headroom).
// POST is the public signup form — keep strict limit to prevent spam.
app.use('/api/messages', apiLimiter);
app.use('/api/kanban', apiLimiter);
app.use('/api/', globalLimiter);

// --- 1. MongoDB Connection ---
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.warn('WARNING: MONGODB_URI environment variable is missing. DB routes will fail.');
}

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB Atlas');
    // ── Drop any accidental TTL indexes on accessrequests ─────────────
    // If MongoDB Atlas created a TTL on requestedAt, users vanish after
    // that window. We remove it at startup so accounts are permanent.
    mongoose.connection.collection('accessrequests').indexes()
      .then((idxs) => {
        idxs.forEach((idx) => {
          if (idx.expireAfterSeconds !== undefined) {
            mongoose.connection.collection('accessrequests')
              .dropIndex(idx.name)
              .then(() => console.log('[startup] Removed TTL index on accessrequests:', idx.name))
              .catch((e) => console.warn('[startup] Could not drop TTL index:', e.message));
          }
        });
      })
      .catch(() => {});
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB Atlas (non-fatal):', err);
  });

// ── Daily Email Digest — 8:00 AM IST = 2:30 AM UTC ───────────────────────────
// Summarises the last 24 h of workspace messages and emails every user.
cron.schedule('30 2 * * *', async () => {
  console.log('[digest] Running daily email digest…');
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const msgs = await Message.find({ timestamp: { $gte: since } }).sort({ timestamp: 1 }).lean();
    if (!msgs.length) { console.log('[digest] No messages in last 24 h — skipping.'); return; }

    // Group by channelId, skip DM rooms
    const byChannel = {};
    msgs.forEach((m) => {
      if (m.channelId?.startsWith('dm-')) return;
      if (!byChannel[m.channelId]) byChannel[m.channelId] = [];
      byChannel[m.channelId].push(m);
    });

    // Collect all user emails
    const dbUsers = await AccessRequest.find({ status: 'approved' }).lean().catch(() => []);
    const allEmails = [
      ...VALID_ACCOUNTS.map((a) => a.email),
      ...dbUsers.map((u) => u.email),
    ];

    // Build HTML sections per channel
    const channelHtml = Object.entries(byChannel).map(([chId, chMsgs]) => {
      const rows = chMsgs.slice(-6).map((m) => `
        <tr>
          <td style="padding:4px 8px;font-size:12px;font-weight:700;color:#3E4A89;white-space:nowrap;">${m.sender}</td>
          <td style="padding:4px 8px;font-size:13px;color:#1E2636;">${(m.text || '').replace(/<[^>]+>/g, '').slice(0, 150)}</td>
        </tr>`).join('');
      return `
        <div style="margin-bottom:20px;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#7C859E;"># ${chId}</p>
          <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid rgba(62,74,137,0.10);">${rows}</table>
          <p style="margin:4px 0 0;font-size:11px;color:#9BA6D3;">${chMsgs.length} message${chMsgs.length !== 1 ? 's' : ''}</p>
        </div>`;
    }).join('');

    const dateLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const html = `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px 16px;">
        <div style="background:linear-gradient(135deg,#1E2538,#3E4A89);padding:22px 26px;border-radius:14px 14px 0 0;">
          <h1 style="color:#fff;font-size:22px;font-weight:900;margin:0 0 4px;">EduTechExOS Daily Digest</h1>
          <p style="color:rgba(255,255,255,.65);font-size:13px;margin:0;">${dateLabel}</p>
        </div>
        <div style="background:#FAF8F5;padding:24px 26px;border-radius:0 0 14px 14px;border:1px solid rgba(62,74,137,.12);border-top:none;">
          <p style="color:#4A5578;font-size:14px;margin:0 0 20px;">Here's what happened in your workspace in the last 24 hours:</p>
          ${channelHtml || '<p style="color:#9BA6D3;font-size:13px;">No channel messages today.</p>'}
          <div style="margin-top:24px;padding-top:16px;border-top:1px solid rgba(62,74,137,.08);">
            <a href="https://edutechexos.vercel.app" style="display:inline-block;background:#3E4A89;color:#fff;padding:11px 22px;border-radius:9px;font-weight:700;font-size:13px;text-decoration:none;">Open EduTechExOS →</a>
          </div>
          <p style="margin:16px 0 0;font-size:11px;color:#9BA6D3;">You receive this because you are a member of EduTechExOS. To unsubscribe, ask your admin.</p>
        </div>
      </div>`;

    if (allEmails.length === 0) { console.log('[digest] No users to email.'); return; }

    // Send ONE Brevo API call with all recipients in BCC.
    // Benefits vs. N individual calls:
    //   • Uses 1 email credit (not N) — avoids hitting the free-plan daily limit
    //   • One rate-limit slot instead of N — no partial sends
    //   • All users get it or none do — no "some received, some didn't"
    //   • BCC means recipients can't see each other's addresses
    const [primaryEmail, ...restEmails] = allEmails;
    const bccList = restEmails.map(e => ({ email: e }));
    const r = await sendBrevoEmail({
      to: [{ email: primaryEmail }],
      bcc: bccList.length > 0 ? bccList : undefined,
      subject: `EduTechExOS Daily Digest — ${dateLabel}`,
      html,
    });
    console.log(`[digest] ${r.ok ? `Sent to all ${allEmails.length} users.` : `FAILED: ${r.brevoError}`}`);
  } catch (err) {
    console.error('[digest] Error:', err);
  }
}, { timezone: 'UTC' });

// --- 2. Schemas & Models ---
const MessageSchema = new mongoose.Schema(
  {
    clientId:    { type: String },
    channelId:   { type: String, required: true, index: true },
    sender:      { type: String, required: true },
    senderEmail: { type: String, index: true },
    initials:    { type: String, required: true },
    color:       { type: String, required: true },
    text:        { type: String, default: '' },
    timestamp:   { type: Date, default: Date.now },
    // ── optional message payload fields ──────────────────────────────
    audioUrl:    { type: String },
    videoUrl:    { type: String },
    files:       [{ name: String, url: String, type: String }],
    editedAt:    { type: Date },
    parentId:    { type: String },
    reactions:   { type: mongoose.Schema.Types.Mixed, default: {} },
    poll:        { type: mongoose.Schema.Types.Mixed },
    linkPreview: { type: mongoose.Schema.Types.Mixed },
  },
  // strict: false → any extra fields the client sends are stored as-is
  // so future message types never get silently dropped
  { strict: false }
);
MessageSchema.index({ text: 'text', sender: 'text' });
const Message = mongoose.model('Message', MessageSchema);

// ── Auto-password generator for new user sign-up requests ────────────────────
function generatePassword() {
  const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower   = 'abcdefghjkmnpqrstuvwxyz';
  const digits  = '23456789';
  const symbols = '@#$!';
  const all     = upper + lower + digits + symbols;
  let pw =
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    digits[Math.floor(Math.random() * digits.length)] +
    symbols[Math.floor(Math.random() * symbols.length)];
  for (let i = 0; i < 8; i++) pw += all[Math.floor(Math.random() * all.length)];
  return pw.split('').sort(() => Math.random() - 0.5).join('');
}

// ── Hardcoded accounts — passwords loaded from env vars, never from source ────
// Set these in Render → Environment: SYS_PASS_ADMIN, SYS_PASS_ADITYA, etc.
const VALID_ACCOUNTS = [
  { email: 'admin@edutechex.in',        password: process.env.SYS_PASS_ADMIN   || '', name: 'Admin',            role: 'Admin'    },
  { email: 'aditya@edutechex.in',       password: process.env.SYS_PASS_ADITYA  || '', name: 'Aditya Cherikuri', role: 'Manager'  },
  { email: 'dev.rk@edutechex.in',       password: process.env.SYS_PASS_DEV_RK  || '', name: 'Developer RK',     role: 'Developer'},
  { email: 'design.sa@edutechex.in',    password: process.env.SYS_PASS_DESIGN  || '', name: 'Designer SA',      role: 'Designer' },
  { email: 'mohan.kumar@edutechex.in',  password: process.env.SYS_PASS_MOHAN_K || '', name: 'Mohan K.',         role: 'Member'   },
  { email: 'mohan.reddy@edutechex.in',  password: process.env.SYS_PASS_MOHAN_R || '', name: 'Mohan R.',         role: 'Member'   },
  { email: 'mohan.sen@edutechex.in',    password: process.env.SYS_PASS_MOHAN_S || '', name: 'Mohan S.',         role: 'Member'   },
];

const AccessRequestSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  email:       { type: String, required: true, index: true },
  password:    { type: String, required: true },
  role:        { type: String, required: true },
  status:      { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  requestedAt: { type: Date, default: Date.now },
  channelId:   { type: String },
  channelIds:  [{ type: String }],
});
const AccessRequest = mongoose.model('AccessRequest', AccessRequestSchema);

// ── Leave requests ────────────────────────────────────────────────────────────
const LeaveSchema = new mongoose.Schema({
  email:       { type: String, required: true, index: true },
  name:        { type: String, required: true },
  type:        { type: String, enum: ['instant', 'planned'], required: true },
  leaveCategory: { type: String, enum: ['sick', 'vacation', 'personal', 'emergency', 'other'], default: 'other' },
  startDate:   { type: String, required: true }, // YYYY-MM-DD
  endDate:     { type: String, default: '' },    // YYYY-MM-DD (planned only)
  duration:    { type: String, enum: ['half', 'full'], default: 'full' }, // instant only
  reason:      { type: String, required: true },
  status:      { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  adminNote:   { type: String, default: '' },
  requestedAt: { type: Date, default: Date.now },
});
const Leave = mongoose.model('Leave', LeaveSchema);

// ── Password reset codes (TTL: 15 min) ──────────────────────────────────────
const ResetCodeSchema = new mongoose.Schema({
  email:     { type: String, required: true, index: true },
  code:      { type: String, required: true },
  expiresAt: { type: Date,   required: true },
  used:      { type: Boolean, default: false },
});
const ResetCode = mongoose.model('ResetCode', ResetCodeSchema);

const KanbanTaskSchema = new mongoose.Schema(
  {
    text:             { type: String, required: true },
    assignee:         { type: String, required: true },
    assigneeEmail:    { type: String, index: true },
    assigneeInitials: { type: String, required: true },
    sourceChannel:    { type: String, required: true },
    status:           { type: String, enum: ['todo', 'inprogress', 'done'], default: 'todo' },
    createdAt:        { type: Date, default: Date.now },
  },
  { strict: false }
);
KanbanTaskSchema.index({ text: 'text', assignee: 'text' });
const KanbanTask = mongoose.model('KanbanTask', KanbanTaskSchema);

const WikiPageSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  channelId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  createdBy: { type: String, index: true },
}, {
  timestamps: true
});
WikiPageSchema.index({ title: 'text', content: 'text' });
const WikiPage = mongoose.model('WikiPage', WikiPageSchema);

// Bookmark schema — persisted per-user on backend
const BookmarkSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, index: true },
  messageId: { type: String, required: true },
  channelId: { type: String, required: true },
  text:      { type: String, default: '' },
  sender:    { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });
BookmarkSchema.index({ userEmail: 1, messageId: 1 }, { unique: true });
const Bookmark = mongoose.model('Bookmark', BookmarkSchema);

const NotificationSchema = new mongoose.Schema({
  type: { type: String, default: 'mention' },
  actor: { type: String, required: true },
  actorInitials: { type: String, default: '' },
  actorColor: { type: String, default: '#4f46e5' },
  message: { type: String, required: true },
  channel: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  recipientEmails: [{ type: String }],
});
const Notification = mongoose.model('Notification', NotificationSchema);

// ── Webhook schema ────────────────────────────────────────────────────────────
const WebhookSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  channelId: { type: String, required: true },
  type:      { type: String, enum: ['github', 'generic'], required: true },
  token:     { type: String, required: true, unique: true, index: true },
  secret:    { type: String, default: '' },    // GitHub HMAC secret (optional)
  active:    { type: Boolean, default: true },
  lastUsed:  { type: Date },
  createdAt: { type: Date, default: Date.now },
});
const Webhook = mongoose.model('Webhook', WebhookSchema);

// ── LoginEvent schema — tracks real login timestamps per user ─────────────────
const LoginEventSchema = new mongoose.Schema({
  email:    { type: String, required: true, index: true },
  name:     { type: String, default: '' },
  loginAt:  { type: Date, default: Date.now, index: true },
  dateStr:  { type: String, required: true, index: true }, // YYYY-MM-DD (IST)
});
LoginEventSchema.index({ email: 1, dateStr: 1 });
const LoginEvent = mongoose.model('LoginEvent', LoginEventSchema);

// ── AWActivity schema — stores ActivityWatch desktop data synced by aw-sync.js ─
const AWActivitySchema = new mongoose.Schema({
  email:               { type: String, required: true, index: true },
  name:                { type: String, default: '' },
  dateStr:             { type: String, required: true, index: true }, // YYYY-MM-DD IST
  currentApp:          { type: String, default: '' },
  currentTitle:        { type: String, default: '' },
  isAfk:               { type: Boolean, default: false },
  totalActiveMinutes:  { type: Number, default: 0 },
  totalAfkMinutes:     { type: Number, default: 0 },
  appBreakdown:        [{ app: String, minutes: Number }], // top apps by usage time
  lastSync:            { type: Date, default: Date.now },
}, { timestamps: true });
AWActivitySchema.index({ email: 1, dateStr: 1 }, { unique: true });
const AWActivity = mongoose.model('AWActivity', AWActivitySchema);

// ── ActivitySession schema — tracks app usage time per user per day ───────────
// Heartbeat is sent every 60 s from the dashboard. Each ping adds up to 2 min
// (capped so a forgotten tab doesn't inflate counts).
const ActivitySessionSchema = new mongoose.Schema({
  email:          { type: String, required: true, index: true },
  name:           { type: String, default: '' },
  dateStr:        { type: String, required: true, index: true }, // YYYY-MM-DD IST
  totalMinutes:   { type: Number, default: 0 },
  lastHeartbeat:  { type: Date, default: null },
  messageCount:   { type: Number, default: 0 },
  taskCount:      { type: Number, default: 0 },
});
ActivitySessionSchema.index({ email: 1, dateStr: 1 }, { unique: true });
const ActivitySession = mongoose.model('ActivitySession', ActivitySessionSchema);

// ── MediaFile schema — separate storage for audio/video with access control ───
const MediaFileSchema = new mongoose.Schema({
  ownerEmail:  { type: String, required: true, index: true },
  channelId:   { type: String, required: true, index: true },
  messageId:   { type: String, index: true },
  kind:        { type: String, enum: ['audio', 'video', 'screen'], required: true },
  url:         { type: String, required: true },
  mimeType:    { type: String, default: '' },
  sizeBytes:   { type: Number, default: 0 },
  uploadedAt:  { type: Date, default: Date.now },
});
const MediaFile = mongoose.model('MediaFile', MediaFileSchema);

// ── RemovedMember schema — persists which hardcoded system members have been removed by admin ─
const RemovedMemberSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  removedAt: { type: Date, default: Date.now },
});
const RemovedMember = mongoose.model('RemovedMember', RemovedMemberSchema);

// ── UserSettings schema — stores per-user preferences synced across devices ─────
const UserSettingsSchema = new mongoose.Schema({
  email:                { type: String, required: true, unique: true, index: true },
  displayName:          { type: String, default: '' },
  avatarEmoji:          { type: String, default: '' },
  status:               { type: String, enum: ['online', 'away', 'busy', 'offline'], default: 'online' },
  meetLink:             { type: String, default: '' },
  emailNotifications:   { type: Boolean, default: true },
  desktopNotifications: { type: Boolean, default: false },
  soundNotifications:   { type: Boolean, default: true },
  compactChat:          { type: Boolean, default: false },
  fontSize:             { type: String, enum: ['normal', 'large'], default: 'normal' },
  enterToSend:          { type: Boolean, default: false },
  darkMode:             { type: Boolean, default: false },
}, { timestamps: true });
const UserSettings = mongoose.model('UserSettings', UserSettingsSchema);

// ── PinnedMessage schema — team-shared pins per channel ───────────────────────
const PinnedMessageSchema = new mongoose.Schema({
  channelId: { type: String, required: true, index: true },
  messageId: { type: String, required: true },
  pinnedBy:  { type: String, required: true },
  pinnedAt:  { type: Date, default: Date.now },
});
PinnedMessageSchema.index({ channelId: 1, messageId: 1 }, { unique: true });
const PinnedMessage = mongoose.model('PinnedMessage', PinnedMessageSchema);

// ── UserKey schema — stores each user's ECDH public key for DM E2E encryption ──
const UserKeySchema = new mongoose.Schema({
  email:     { type: String, required: true, unique: true, index: true },
  publicKey: { type: String, required: true }, // JWK JSON string
  updatedAt: { type: Date, default: Date.now },
});
const UserKey = mongoose.model('UserKey', UserKeySchema);

// ── AdminAvailability schema — admin marks date slots as available/busy ────────
const AdminAvailabilitySchema = new mongoose.Schema({
  date:       { type: String, required: true, index: true }, // YYYY-MM-DD IST
  adminEmail: { type: String, required: true, default: 'admin@edutechex.in' },
  slots: [{
    time:   { type: String, required: true }, // e.g. "09:00", "10:30", "All Day"
    status: { type: String, enum: ['available', 'busy', 'ooo'], default: 'available' },
    label:  { type: String, default: '' },
  }],
}, { timestamps: true });
AdminAvailabilitySchema.index({ date: 1, adminEmail: 1 }, { unique: true });
const AdminAvailability = mongoose.model('AdminAvailability', AdminAvailabilitySchema);

// ── MeetingRequest schema — user requests a call/meeting with admin ────────────
const MeetingRequestSchema = new mongoose.Schema({
  userEmail:  { type: String, required: true },
  userName:   { type: String, required: true },
  adminEmail: { type: String, required: true, default: 'admin@edutechex.in' },
  date:       { type: String, required: true }, // YYYY-MM-DD
  time:       { type: String, required: true }, // e.g. "09:00"
  purpose:    { type: String, default: '' },
  status:     { type: String, enum: ['pending', 'confirmed', 'declined'], default: 'pending' },
}, { timestamps: true });
const MeetingRequest = mongoose.model('MeetingRequest', MeetingRequestSchema);

// ── WorkspaceChannel schema — replaces hardcoded channel list ─────────────────
const WorkspaceChannelSchema = new mongoose.Schema({
  _id:         { type: String, required: true },
  name:        { type: String, required: true },
  description: { type: String, default: '' },
  isDefault:   { type: Boolean, default: false },
  createdBy:   { type: String, default: '' },
  order:       { type: Number, default: 0 },
}, { timestamps: true });
const WorkspaceChannel = mongoose.model('WorkspaceChannel', WorkspaceChannelSchema);

const DEFAULT_WORKSPACE_CHANNELS = [
  { _id: 'general',          name: 'general',          description: 'Team-wide announcements and updates',              isDefault: true, order: 0 },
  { _id: 'skillnaav',        name: 'skillnaav',        description: 'Career navigation & skill gap analysis product',   isDefault: true, order: 1 },
  { _id: 'edutechexassessa', name: 'edutechexassessa', description: 'Assessment platform & adaptive question engine',   isDefault: true, order: 2 },
  { _id: 'edutechex',        name: 'edutechex',        description: 'Core platform — Cambridge, IB, teacher training', isDefault: true, order: 3 },
];

// ── MeetingAccess schema — tracks who has access to a specific scheduled meeting
const MeetingAccessSchema = new mongoose.Schema({
  messageId:       { type: String, required: true, index: true },
  channelId:       { type: String, required: true },
  hostEmail:       { type: String, required: true },
  allowedEmails:   [{ type: String }],  // from "Mentioned people" + host
  grantedEmails:   [{ type: String }],  // extra grants by host at runtime
  createdAt:       { type: Date, default: Date.now },
});
MeetingAccessSchema.index({ messageId: 1, channelId: 1 }, { unique: true });
const MeetingAccess = mongoose.model('MeetingAccess', MeetingAccessSchema);

// ── Revoked-email set — populated immediately when admin deletes a user.
// Blocks their JWT on every subsequent API call without a DB round-trip.
// Resets on server restart, but deleted users can't log in again (DB record gone)
// so a new JWT can never be issued to them after restart.
const revokedEmails = new Set();

// ── Auth middleware ──────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      const decoded = jwt.verify(token, JWT_SECRET);
      // Immediately reject deleted users — their JWT is no longer valid
      if (revokedEmails.has(decoded.email?.toLowerCase())) {
        return res.status(401).json({ success: false, error: 'Account removed. Please contact admin.' });
      }
      req.user = decoded; // { email, name, role }
    } catch (err) {
      // Token invalid — continue without auth, will fall back to query params
    }
  }
  next();
}

function getUserEmail(req) {
  // Prefer JWT-authenticated user, fall back to query/body param
  if (req.user && req.user.email) return req.user.email.toLowerCase();
  if (req.query.userEmail) return String(req.query.userEmail).toLowerCase();
  if (req.body && req.body.userEmail) return String(req.body.userEmail).toLowerCase();
  return null;
}

// --- 3. API Endpoints ---

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Apply auth middleware to all /api/* routes except auth endpoints
app.use(/^\/api\/(?!auth\/|access-requests|digest|health).*/, authMiddleware);

// ─── Auth Routes ──────────────────────────────────────────────────────────────

// POST /api/access-requests — user submits signup request (password auto-generated)
app.post('/api/access-requests', authLimiter, async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const emailClean = String(email).trim().toLowerCase();

    // Don't let someone shadow a hardcoded account
    if (VALID_ACCOUNTS.some((a) => a.email === emailClean)) {
      return res.status(409).json({ success: false, error: 'This email is already registered as a system account.' });
    }

    const existing = await AccessRequest.findOne({ email: emailClean }).lean();
    if (existing) {
      return res.json({
        success: true,
        exists: true,
        status: existing.status,
        message:
          existing.status === 'approved'
            ? 'Your access is approved. You can sign in now.'
            : existing.status === 'rejected'
            ? 'Your previous request was declined. Please contact admin.'
            : 'Your account is pending admin approval. Check your email for your temporary password.',
      });
    }

    // Generate a strong random password and email it to the user immediately
    const plainPassword = generatePassword();
    const request = new AccessRequest({ name, email: emailClean, password: await bcrypt.hash(plainPassword, 10), role });
    const saved = await request.save();
    const { _id, __v, ...rest } = saved.toObject();

    const appUrl = process.env.APP_URL || 'https://edutechexos.vercel.app';

    // ── Email 1: credentials to the new user ──────────────────────────────
    sendBrevoEmail({
      to: [{ email: emailClean, name }],
      subject: 'EduTechExOS — Your account has been created',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#FAF8F5;border-radius:12px;">
          <div style="background:linear-gradient(135deg,#191E2F,#252D45);border-radius:10px;padding:24px;text-align:center;margin-bottom:24px;">
            <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:-0.5px;">EduTechExOS</h1>
            <p style="color:rgba(255,255,255,0.6);margin:6px 0 0;font-size:13px;">Team Operating System</p>
          </div>
          <h2 style="color:#1E2636;font-size:18px;margin:0 0 12px;">Hi ${name}, your account is ready 👋</h2>
          <p style="color:#4A5578;font-size:14px;line-height:1.6;margin:0 0 16px;">
            Your EduTechExOS account has been created. You can sign in right now using the credentials below.
            Your account is <strong>pending admin approval</strong> — you will have full access once the admin approves your request.
          </p>
          <div style="background:#fff;border:2px solid rgba(91,79,219,0.18);border-radius:10px;padding:20px;margin-bottom:20px;">
            <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#9BA6D3;text-transform:uppercase;letter-spacing:1px;">Your login credentials</p>
            <p style="margin:6px 0;font-size:14px;color:#1E2636;"><strong>Email:</strong> ${emailClean}</p>
            <p style="margin:6px 0;font-size:16px;color:#5B4FDB;font-weight:700;letter-spacing:0.04em;font-family:monospace;background:#ECEAF8;padding:8px 12px;border-radius:6px;"><strong>Password:</strong> ${plainPassword}</p>
            <p style="margin:6px 0;font-size:13px;color:#4A5578;"><strong>Role:</strong> ${role}</p>
          </div>
          <p style="color:#EF476F;font-size:13px;font-weight:600;margin:0 0 16px;">⚠ Please change this password after your first sign-in via your profile settings.</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${appUrl}/sign-up-login-screen" style="display:inline-block;background:#5B4FDB;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:700;">Sign In to EduTechExOS →</a>
          </div>
          <p style="color:#7C859E;font-size:12px;line-height:1.5;text-align:center;">You'll receive full access once the admin approves your account.</p>
          <hr style="border:none;border-top:1px solid rgba(62,74,137,0.10);margin:24px 0;" />
          <p style="color:#B0B8D1;font-size:11px;text-align:center;margin:0;">EduTechExOS · Powered by EduTechEx</p>
        </div>`,
    }).catch(() => {});

    // ── Email 2: alert to the admin ────────────────────────────────────────
    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || (VALID_ACCOUNTS.find(a => a.role === 'Admin') || {}).email;
    if (adminEmail) {
      sendBrevoEmail({
        to: [{ email: adminEmail }],
        subject: `EduTechExOS — New access request from ${name}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
            <h2 style="color:#1E2636;">New access request</h2>
            <p style="color:#4A5578;font-size:14px;">A new user has requested access to EduTechExOS. They have been sent a temporary password and can sign in, but will see a restricted view until you approve.</p>
            <div style="background:#F7F6F2;border-radius:8px;padding:16px;margin:16px 0;">
              <p style="margin:4px 0;font-size:13px;"><strong>Name:</strong> ${name}</p>
              <p style="margin:4px 0;font-size:13px;"><strong>Email:</strong> ${emailClean}</p>
              <p style="margin:4px 0;font-size:13px;"><strong>Role:</strong> ${role}</p>
            </div>
            <p style="color:#4A5578;font-size:13px;">Log in to the admin panel to approve or reject this request.</p>
          </div>`,
      }).catch(() => {});
    }

    res.json({
      success: true,
      request: {
        ...rest,
        id: _id.toString(),
        requestedAt: rest.requestedAt instanceof Date ? rest.requestedAt.toISOString() : rest.requestedAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/access-requests — admin fetches all requests
app.get('/api/access-requests', authMiddleware, async (req, res) => {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, error: 'Admin access required.' });
  }
  try {
    const requests = await AccessRequest.find({}).sort({ requestedAt: -1 }).lean();
    const formatted = requests.map(({ _id, __v, password, ...rest }) => ({
      ...rest,
      id: _id.toString(),
      requestedAt: rest.requestedAt instanceof Date ? rest.requestedAt.toISOString() : rest.requestedAt,
    }));
    res.json({ success: true, requests: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PATCH /api/access-requests/:id — admin approves, rejects or updates user role/channel
app.patch('/api/access-requests/:id', authMiddleware, async (req, res) => {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, error: 'Admin access required.' });
  }
  try {
    const { id } = req.params;
    const { status, channelId, channelIds, role } = req.body;

    const updateFields = {};
    if (status !== undefined) updateFields.status = status;
    if (channelId !== undefined) updateFields.channelId = channelId;
    if (channelIds !== undefined) updateFields.channelIds = Array.isArray(channelIds) ? channelIds : [];
    if (role !== undefined) updateFields.role = role;

    const updated = await AccessRequest.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ success: false, error: 'Request not found' });
    const { _id, __v, ...rest } = updated;

    // Broadcast member change so all connected clients refresh their member list
    if (status === 'approved' || role !== undefined || channelId !== undefined || channelIds !== undefined) {
      io.emit('member_updated', {
        memberId: `member-${_id.toString()}`,
        email: rest.email,
        role: rest.role,
        channelId: rest.channelId,
        channelIds: rest.channelIds || [],
        status: rest.status,
      });
    }
    // Notify the affected user's browser directly so they can update their UI
    if (status === 'approved') io.emit('access_approved', { email: rest.email });
    if (status === 'rejected') io.emit('access_rejected', { email: rest.email });

    // ── Email notifications on approval / rejection ────────────────────────
    const appUrl = process.env.APP_URL || 'https://edutechexos.vercel.app';
    if (status === 'approved') {
      sendBrevoEmail({
        to: [{ email: rest.email, name: rest.name }],
        subject: '🎉 EduTechExOS — Your access has been approved!',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#FAF8F5;border-radius:12px;">
            <div style="background:linear-gradient(135deg,#191E2F,#252D45);border-radius:10px;padding:24px;text-align:center;margin-bottom:24px;">
              <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:-0.5px;">EduTechExOS</h1>
              <p style="color:rgba(255,255,255,0.6);margin:6px 0 0;font-size:13px;">Team Operating System</p>
            </div>
            <h2 style="color:#1E2636;font-size:20px;margin:0 0 12px;">Welcome aboard, ${rest.name}! 🚀</h2>
            <p style="color:#4A5578;font-size:14px;line-height:1.6;margin:0 0 20px;">
              Your access to <strong>EduTechExOS</strong> has been approved by the admin. You can now sign in and start collaborating with the team.
            </p>
            <div style="background:#fff;border:1px solid rgba(62,74,137,0.12);border-radius:10px;padding:16px;margin-bottom:20px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#9BA6D3;text-transform:uppercase;letter-spacing:1px;">Your login credentials</p>
              <p style="margin:4px 0;font-size:13px;color:#4A5578;"><strong>Email:</strong> ${rest.email}</p>
              <p style="margin:4px 0;font-size:13px;color:#4A5578;"><strong>Password:</strong> The one you set when you signed up</p>
              <p style="margin:4px 0;font-size:13px;color:#4A5578;"><strong>Role:</strong> ${rest.role}</p>
            </div>
            <div style="text-align:center;margin:24px 0;">
              <a href="${appUrl}/sign-up-login-screen" style="display:inline-block;background:#3E4A89;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:700;letter-spacing:0.3px;">Sign In to EduTechExOS →</a>
            </div>
            <p style="color:#9BA6D3;font-size:12px;text-align:center;">If you have any questions, reach out to your workspace admin.</p>
            <hr style="border:none;border-top:1px solid rgba(62,74,137,0.10);margin:24px 0;" />
            <p style="color:#B0B8D1;font-size:11px;text-align:center;margin:0;">EduTechExOS · Powered by EduTechEx</p>
          </div>`,
      }).catch(() => {});
    } else if (status === 'rejected') {
      sendBrevoEmail({
        to: [{ email: rest.email, name: rest.name }],
        subject: 'EduTechExOS — Update on your access request',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#FAF8F5;border-radius:12px;">
            <div style="background:linear-gradient(135deg,#191E2F,#252D45);border-radius:10px;padding:24px;text-align:center;margin-bottom:24px;">
              <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:-0.5px;">EduTechExOS</h1>
            </div>
            <h2 style="color:#1E2636;font-size:18px;margin:0 0 12px;">Hi ${rest.name},</h2>
            <p style="color:#4A5578;font-size:14px;line-height:1.6;margin:0 0 16px;">
              Thank you for your interest in <strong>EduTechExOS</strong>. After review, the admin was unable to approve your access request at this time.
            </p>
            <p style="color:#4A5578;font-size:14px;line-height:1.6;margin:0 0 16px;">
              If you believe this was a mistake or would like to discuss further, please contact your workspace admin directly.
            </p>
            <hr style="border:none;border-top:1px solid rgba(62,74,137,0.10);margin:24px 0;" />
            <p style="color:#B0B8D1;font-size:11px;text-align:center;margin:0;">EduTechExOS · Powered by EduTechEx</p>
          </div>`,
      }).catch(() => {});
    }

    res.json({
      success: true,
      request: {
        ...rest,
        id: _id.toString(),
        requestedAt: rest.requestedAt instanceof Date ? rest.requestedAt.toISOString() : rest.requestedAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/members/system — admin permanently removes a hardcoded system member
// Stores the email in RemovedMember so they are filtered out of /api/members on every refresh.
// Shared handler used by both DELETE and POST versions of this endpoint.
async function removeMemberHandler(req, res) {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, error: 'Admin access required.' });
  }
  try {
    const { email, memberId } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'email is required.' });

    // Persist the removal so it survives server restarts
    await RemovedMember.findOneAndUpdate(
      { email: email.toLowerCase() },
      { email: email.toLowerCase(), removedAt: new Date() },
      { upsert: true, new: true }
    );

    // Revoke JWT so they are logged out immediately if online
    revokedEmails.add(email.toLowerCase());

    // Real-time: remove from every client's member list + force-logout the removed user
    if (memberId) io.emit('member_removed', { memberId });
    io.emit('user_forcefully_removed', { email: email.toLowerCase() });

    res.json({ success: true, removedEmail: email });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}
app.delete('/api/members/system', authMiddleware, removeMemberHandler);
// POST alias — some reverse-proxies (Render free) silently 404 DELETE on certain paths
app.post('/api/members/remove', authMiddleware, removeMemberHandler);

// POST /api/members/system/restore — admin re-activates a previously removed system member
app.post('/api/members/system/restore', authMiddleware, async (req, res) => {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, error: 'Admin access required.' });
  }
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'email is required.' });
    await RemovedMember.deleteOne({ email: email.toLowerCase() });
    // Also un-revoke the JWT (remove from in-memory set)
    revokedEmails.delete(email.toLowerCase());
    res.json({ success: true, restoredEmail: email });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/access-requests/:id — admin removes a user
app.delete('/api/access-requests/:id', authMiddleware, async (req, res) => {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, error: 'Admin access required.' });
  }
  try {
    const { id } = req.params;
    // Fetch the user BEFORE deleting so we can broadcast their email.
    // If they don't exist, return 404 — a silent "success" on a missing record
    // would cause the frontend to remove from UI while the DB record stays intact.
    const target = await AccessRequest.findById(id).lean();
    if (!target) {
      return res.status(404).json({ success: false, error: 'User not found. They may have already been removed.' });
    }
    const removedEmail = target.email;

    await AccessRequest.findByIdAndDelete(id);

    // Revoke their JWT immediately — all subsequent API calls return 401
    if (removedEmail) revokedEmails.add(removedEmail.toLowerCase());

    // Broadcast to all connected clients:
    // 1. member_removed         — removes the row from every member list instantly
    // 2. user_forcefully_removed — the removed user's UI detects their email and forces logout
    io.emit('member_removed', { memberId: `member-${id}` });
    io.emit('user_forcefully_removed', { email: removedEmail.toLowerCase() });

    res.json({ success: true, removedEmail });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ── Leave endpoints ──────────────────────────────────────────────────────────

// POST /api/leaves — user submits a leave request
app.post('/api/leaves', authMiddleware, async (req, res) => {
  try {
    const { type, leaveCategory, startDate, endDate, duration, reason } = req.body;
    if (!type || !startDate || !reason) {
      return res.status(400).json({ success: false, error: 'type, startDate and reason are required.' });
    }
    const leave = new Leave({
      email: req.user.email,
      name:  req.user.name,
      type, leaveCategory, startDate,
      endDate:  endDate  || '',
      duration: duration || 'full',
      reason,
    });
    const saved = await leave.save();
    const { _id, __v, ...rest } = saved.toObject();

    // Notify admin via email — use real inbox from env, fall back to system account email
    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || (VALID_ACCOUNTS.find(a => a.role === 'Admin') || {}).email;
    const appUrl = process.env.APP_URL || 'https://edutechexos.vercel.app';
    const typeLabel  = type === 'instant' ? 'Emergency / Instant' : 'Planned';
    const catLabel   = { sick: 'Sick', vacation: 'Vacation', personal: 'Personal', emergency: 'Emergency', other: 'Other' }[leaveCategory] || leaveCategory;
    const dateRange  = type === 'instant'
      ? `${startDate} (${duration === 'half' ? 'Half day' : 'Full day'})`
      : `${startDate} → ${endDate || startDate}`;

    if (adminEmail) {
      sendBrevoEmail({
        to: [{ email: adminEmail }],
        subject: `EduTechExOS — Leave request from ${req.user.name}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#FAF8F5;border-radius:12px;">
            <div style="background:linear-gradient(135deg,#191E2F,#252D45);border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;">
              <h1 style="color:#fff;margin:0;font-size:20px;">EduTechExOS</h1>
              <p style="color:rgba(255,255,255,0.6);margin:4px 0 0;font-size:12px;">Leave Management</p>
            </div>
            <h2 style="color:#1E2636;font-size:17px;margin:0 0 12px;">New Leave Request</h2>
            <div style="background:#fff;border:1px solid rgba(62,74,137,0.12);border-radius:10px;padding:16px;margin-bottom:20px;">
              <p style="margin:4px 0;font-size:13px;color:#4A5578;"><strong>Name:</strong> ${req.user.name}</p>
              <p style="margin:4px 0;font-size:13px;color:#4A5578;"><strong>Email:</strong> ${req.user.email}</p>
              <p style="margin:4px 0;font-size:13px;color:#4A5578;"><strong>Type:</strong> ${typeLabel}</p>
              <p style="margin:4px 0;font-size:13px;color:#4A5578;"><strong>Category:</strong> ${catLabel}</p>
              <p style="margin:4px 0;font-size:13px;color:#4A5578;"><strong>Dates:</strong> ${dateRange}</p>
              <p style="margin:4px 0;font-size:13px;color:#4A5578;"><strong>Reason:</strong> ${reason}</p>
            </div>
            <div style="text-align:center;">
              <a href="${appUrl}/admin" style="display:inline-block;background:#3E4A89;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:13px;font-weight:700;">Review in Admin Panel →</a>
            </div>
          </div>`,
      }).catch(() => {});
    }

    // Real-time socket notification to admin
    io.emit('leave_requested', { leaveId: _id.toString(), email: req.user.email, name: req.user.name, type, startDate, endDate });

    res.json({ success: true, leave: { ...rest, id: _id.toString() } });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/leaves — user gets own leaves, admin gets all
app.get('/api/leaves', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'Admin';
    const query = isAdmin ? {} : { email: req.user.email };
    const leaves = await Leave.find(query).sort({ requestedAt: -1 }).lean();
    const formatted = leaves.map(({ _id, __v, ...rest }) => ({ ...rest, id: _id.toString() }));
    res.json({ success: true, leaves: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PATCH /api/leaves/:id — admin approves or rejects a leave request
app.patch('/api/leaves/:id', authMiddleware, async (req, res) => {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, error: 'Admin access required.' });
  }
  try {
    const { status, adminNote } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'status must be approved or rejected.' });
    }
    const updated = await Leave.findByIdAndUpdate(
      req.params.id,
      { $set: { status, adminNote: adminNote || '' } },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ success: false, error: 'Leave not found.' });
    const { _id, __v, ...rest } = updated;

    // Emit to the user's browser
    io.emit('leave_updated', { leaveId: _id.toString(), email: rest.email, status, adminNote: rest.adminNote });

    // Email the user
    const appUrl = process.env.APP_URL || 'https://edutechexos.vercel.app';
    const statusLabel = status === 'approved' ? '✅ Approved' : '❌ Rejected';
    const typeLabel   = rest.type === 'instant' ? 'Emergency / Instant' : 'Planned';
    const dateRange   = rest.type === 'instant'
      ? `${rest.startDate} (${rest.duration === 'half' ? 'Half day' : 'Full day'})`
      : `${rest.startDate} → ${rest.endDate || rest.startDate}`;

    sendBrevoEmail({
      to: [{ email: rest.email, name: rest.name }],
      subject: `EduTechExOS — Your leave request has been ${status}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#FAF8F5;border-radius:12px;">
          <div style="background:linear-gradient(135deg,#191E2F,#252D45);border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;">
            <h1 style="color:#fff;margin:0;font-size:20px;">EduTechExOS</h1>
          </div>
          <h2 style="color:#1E2636;font-size:17px;margin:0 0 8px;">Hi ${rest.name}, your leave has been ${statusLabel}</h2>
          <div style="background:#fff;border:1px solid rgba(62,74,137,0.12);border-radius:10px;padding:16px;margin:16px 0;">
            <p style="margin:4px 0;font-size:13px;color:#4A5578;"><strong>Type:</strong> ${typeLabel}</p>
            <p style="margin:4px 0;font-size:13px;color:#4A5578;"><strong>Dates:</strong> ${dateRange}</p>
            <p style="margin:4px 0;font-size:13px;color:#4A5578;"><strong>Reason:</strong> ${rest.reason}</p>
            ${rest.adminNote ? `<p style="margin:8px 0 4px;font-size:13px;color:#4A5578;"><strong>Admin note:</strong> ${rest.adminNote}</p>` : ''}
          </div>
          <div style="text-align:center;">
            <a href="${appUrl}/dashboard" style="display:inline-block;background:#3E4A89;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:13px;font-weight:700;">Go to Dashboard →</a>
          </div>
        </div>`,
    }).catch(() => {});

    res.json({ success: true, leave: { ...rest, id: _id.toString() } });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/members — returns all members (hardcoded + approved requests)
app.get('/api/members', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized. Please log in first.' });
    }

    const allHardcoded = [
      { id: 'member-ac', name: 'Aditya Cherikuri', email: 'aditya@edutechex.in', role: 'Manager', initials: 'AC', status: 'online', color: '#2563eb' },
      { id: 'member-rk', name: 'Ram K Aluru', email: 'dev.rk@edutechex.in', role: 'Developer', initials: 'RK', status: 'online', color: '#7c3aed' },
      { id: 'member-sa', name: 'Sneha Agarwal', email: 'design.sa@edutechex.in', role: 'Designer', initials: 'SA', status: 'away', color: '#0891b2' },
      { id: 'member-tm', name: 'Tarun Mehta', email: 'tarun@edutechex.in', role: 'Lead', initials: 'TM', status: 'offline', color: '#059669' },
      { id: 'member-mk', name: 'Mohan Kumar', email: 'mohan.kumar@edutechex.in', role: 'Developer', initials: 'MK', status: 'online', color: '#dc2626' },
      { id: 'member-mr', name: 'Mohan Reddy', email: 'mohan.reddy@edutechex.in', role: 'Developer', initials: 'MR', status: 'online', color: '#eab308' },
      { id: 'member-ms', name: 'Mohan Sen', email: 'mohan.sen@edutechex.in', role: 'Developer', initials: 'MS', status: 'online', color: '#0891b2' },
    ];

    // Filter out any system members that an admin has permanently removed
    const removedDocs = await RemovedMember.find({}).lean();
    const removedEmailSet = new Set(removedDocs.map(r => r.email.toLowerCase()));
    const hardcoded = allHardcoded.filter(m => !removedEmailSet.has(m.email.toLowerCase()));

    const approvedRequests = await AccessRequest.find({ status: 'approved' }).lean();

    const colors = ['#2d6a4f', '#52b788', '#7c3aed', '#a78bfa', '#1b4332', '#c4b5fd'];
    const getDeterministicColor = (email) => {
      let hash = 0;
      for (let i = 0; i < email.length; i++) {
        hash = email.charCodeAt(i) + ((hash << 5) - hash);
      }
      const index = Math.abs(hash) % colors.length;
      return colors[index];
    };

    const dbMembers = approvedRequests.map((r) => {
      const initials = r.name
        .split(' ')
        .map((p) => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      // Normalise: channelIds is authoritative when explicitly set (even []);
      // only fall back to legacy channelId when channelIds was never stored.
      const ids = Array.isArray(r.channelIds)
        ? r.channelIds
        : (r.channelId ? [r.channelId] : []);
      return {
        id: `member-${r._id.toString()}`,
        name: r.name,
        email: r.email,
        role: r.role,
        status: 'online',
        color: getDeterministicColor(r.email),
        initials,
        channelId: r.channelId,
        channelIds: ids,
      };
    });

    const allMembers = [...hardcoded];
    dbMembers.forEach((dbm) => {
      if (!allMembers.some((m) => m.email.toLowerCase() === dbm.email.toLowerCase())) {
        allMembers.push(dbm);
      }
    });

    res.json({ success: true, members: allMembers });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/members — admin directly creates a new approved user
app.post('/api/members', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Only admins can add members directly.' });
    }

    const { name, email, role, channelId } = req.body;
    const emailClean = String(email).trim().toLowerCase();

    const VALID_EMAILS = [
      'admin@edutechex.in', 'aditya@edutechex.in', 'dev.rk@edutechex.in',
      'design.sa@edutechex.in', 'tarun@edutechex.in', 'mohan.kumar@edutechex.in',
      'mohan.reddy@edutechex.in', 'mohan.sen@edutechex.in'
    ];
    if (VALID_EMAILS.includes(emailClean)) {
      return res.status(409).json({ success: false, error: 'This email belongs to a system account.' });
    }

    const existing = await AccessRequest.findOne({ email: emailClean }).lean();
    if (existing) {
      return res.status(409).json({ success: false, error: 'A user request/account with this email already exists.' });
    }

    // Auto-generate a secure random password
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let generatedPassword = 'Edx@';
    for (let i = 0; i < 10; i++) generatedPassword += charset[Math.floor(Math.random() * charset.length)];

    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    const request = new AccessRequest({
      name,
      email: emailClean,
      password: hashedPassword,
      role,
      status: 'approved',
      channelId,
    });

    const saved = await request.save();
    const { _id, __v, ...rest } = saved.toObject();

    // Email the generated password to the new user
    sendBrevoEmail({
      to: [{ email: emailClean, name }],
      subject: 'Your EduTechExOS account has been created',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#f8f9ff;border-radius:12px;">
          <h2 style="color:#3E4A89;margin:0 0 16px;">Welcome to EduTechExOS, ${name}!</h2>
          <p style="color:#4A5578;">An admin has created an account for you. Here are your login credentials:</p>
          <div style="background:#fff;border:1px solid #d1d5f0;border-radius:8px;padding:20px;margin:20px 0;">
            <p style="margin:0 0 8px;color:#4A5578;"><strong>Email:</strong> ${emailClean}</p>
            <p style="margin:0;color:#4A5578;"><strong>Password:</strong> <code style="background:#f0f2ff;padding:4px 8px;border-radius:4px;font-size:15px;letter-spacing:1px;">${generatedPassword}</code></p>
          </div>
          <p style="color:#9BA6D3;font-size:13px;">Please change your password after your first login. If you did not expect this email, contact your workspace admin.</p>
        </div>`,
    }).catch(() => {});

    res.json({
      success: true,
      generatedPassword, // returned so admin can see it once in the UI
      member: {
        id: `member-${_id.toString()}`,
        name: rest.name,
        email: rest.email,
        role: rest.role,
        status: 'online',
        color: '#4f46e5',
        initials: rest.name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2),
        channelId: rest.channelId,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});


// GET /api/login-status — returns who logged in today (for calendar green/red dots)
app.get('/api/login-status', authMiddleware, async (req, res) => {
  try {
    const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const events = await LoginEvent.find({ dateStr }).lean();
    const loggedInEmails = events.map((e) => e.email);
    res.json({ success: true, dateStr, loggedInEmails });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/my-attendance — returns current user's own login dates (last 90 days)
app.get('/api/my-attendance', authMiddleware, async (req, res) => {
  try {
    const email = req.user?.email?.toLowerCase();
    if (!email) return res.status(401).json({ success: false });
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const events = await LoginEvent.find({ email, loginAt: { $gte: ninetyDaysAgo } }).lean();
    const dates = [...new Set(events.map((e) => e.dateStr))].sort();
    res.json({ success: true, dates });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/login-history — returns 30-day login history per user (for calendar heatmap)
app.get('/api/login-history', authMiddleware, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const events = await LoginEvent.find({ loginAt: { $gte: thirtyDaysAgo } }).lean();
    const history = {};
    events.forEach((e) => {
      if (!history[e.email]) history[e.email] = [];
      if (!history[e.email].includes(e.dateStr)) history[e.email].push(e.dateStr);
    });
    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── Activity tracking endpoints ──────────────────────────────────────────────

// POST /api/activity/heartbeat — dashboard pings every 60 s while active
// Adds up to 2 minutes per ping (cap prevents idle tabs from inflating counts).
app.post('/api/activity/heartbeat', authMiddleware, async (req, res) => {
  try {
    const email = req.user?.email?.toLowerCase();
    const name  = req.user?.name ?? '';
    if (!email) return res.status(401).json({ success: false });

    const now = new Date();
    // Build IST date string
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    const dateStr = istDate.toISOString().slice(0, 10);

    const session = await ActivitySession.findOneAndUpdate(
      { email, dateStr },
      { $setOnInsert: { email, name, dateStr, totalMinutes: 0, messageCount: 0, taskCount: 0 } },
      { upsert: true, new: true }
    );

    // Calculate minutes to add — cap at 2 min per ping regardless of gap
    let minutesToAdd = 1;
    if (session.lastHeartbeat) {
      const gapMs = now - new Date(session.lastHeartbeat);
      const gapMin = gapMs / 60000;
      minutesToAdd = Math.min(Math.round(gapMin), 2);
    }

    await ActivitySession.updateOne(
      { email, dateStr },
      { $set: { lastHeartbeat: now, name }, $inc: { totalMinutes: minutesToAdd } }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/activity/stats — admin only, returns per-user stats for last 7 days
app.get('/api/activity/stats', authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Admin only.' });
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const istOffset = 5.5 * 60 * 60 * 1000;
    const cutoffStr = new Date(sevenDaysAgo.getTime() + istOffset).toISOString().slice(0, 10);

    // Aggregate session time per user over last 7 days
    const sessions = await ActivitySession.find({ dateStr: { $gte: cutoffStr } }).lean();

    const statsMap = {};
    sessions.forEach((s) => {
      if (!statsMap[s.email]) {
        statsMap[s.email] = {
          email: s.email,
          name: s.name,
          totalMinutes: 0,
          activeDays: 0,
          lastSeen: null,
          messageCount: 0,
          taskCount: 0,
        };
      }
      const u = statsMap[s.email];
      u.totalMinutes  += s.totalMinutes  || 0;
      u.messageCount  += s.messageCount  || 0;
      u.taskCount     += s.taskCount     || 0;
      u.activeDays    += 1;
      if (!u.lastSeen || (s.lastHeartbeat && new Date(s.lastHeartbeat) > new Date(u.lastSeen))) {
        u.lastSeen = s.lastHeartbeat;
      }
    });

    // Also include members who haven't had a session yet (show zeros)
    const allRequests = await AccessRequest.find({ status: 'approved' }).lean();
    allRequests.forEach((r) => {
      if (!statsMap[r.email.toLowerCase()]) {
        statsMap[r.email.toLowerCase()] = {
          email: r.email.toLowerCase(),
          name: r.name,
          totalMinutes: 0,
          activeDays: 0,
          lastSeen: null,
          messageCount: 0,
          taskCount: 0,
        };
      }
    });

    res.json({ success: true, stats: Object.values(statsMap) });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/activity/aw-sync — aw-sync.js script sends ActivityWatch data every 5 min
app.post('/api/activity/aw-sync', authMiddleware, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    const email = req.user.email.toLowerCase();
    const name  = req.user.name || '';
    const { currentApp, currentTitle, isAfk, totalActiveMinutes, totalAfkMinutes, appBreakdown } = req.body;

    const istOffset = 5.5 * 60 * 60 * 1000;
    const dateStr = new Date(Date.now() + istOffset).toISOString().slice(0, 10);

    await AWActivity.findOneAndUpdate(
      { email, dateStr },
      {
        $set: {
          name,
          currentApp:         currentApp         || '',
          currentTitle:       currentTitle        || '',
          isAfk:              isAfk               ?? false,
          totalActiveMinutes: totalActiveMinutes  || 0,
          totalAfkMinutes:    totalAfkMinutes     || 0,
          appBreakdown:       Array.isArray(appBreakdown) ? appBreakdown.slice(0, 15) : [],
          lastSync:           new Date(),
        },
      },
      { upsert: true, new: true }
    );

    // Broadcast to admin in real-time so the dashboard updates instantly
    io.emit('aw_sync', { email, currentApp: currentApp || '', isAfk: isAfk ?? false });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/activity/aw — admin fetches AW data for a given date (default: today IST)
// Query: ?date=YYYY-MM-DD
app.get('/api/activity/aw', authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Admin only.' });
    }
    const istOffset = 5.5 * 60 * 60 * 1000;
    const todayIST = new Date(Date.now() + istOffset).toISOString().slice(0, 10);
    const dateStr = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date) ? req.query.date : todayIST;

    const records = await AWActivity.find({ dateStr }).lean();
    res.json({ success: true, records, dateStr });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/activity/message — increments message count for today's session
app.post('/api/activity/message', authMiddleware, async (req, res) => {
  try {
    const email = req.user?.email?.toLowerCase();
    if (!email) return res.status(401).json({ success: false });
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const dateStr = new Date(now.getTime() + istOffset).toISOString().slice(0, 10);
    await ActivitySession.findOneAndUpdate(
      { email, dateStr },
      { $inc: { messageCount: 1 }, $set: { name: req.user?.name ?? '' }, $setOnInsert: { totalMinutes: 0, taskCount: 0, activeDays: 0 } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch {
    res.json({ success: true }); // non-critical — never fail a message send
  }
});

// POST /api/members/:id/promote-admin — admin promotes a user to admin (max 3 admins)
app.post('/api/members/:id/promote-admin', authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Only admins can promote users.' });
    }

    // Count current admins (hardcoded + DB)
    const HARDCODED_ADMINS = VALID_ACCOUNTS.filter((a) => a.role === 'Admin').length;
    const dbAdmins = await AccessRequest.countDocuments({ status: 'approved', role: 'Admin' });
    const totalAdmins = HARDCODED_ADMINS + dbAdmins;

    if (totalAdmins >= 3) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 3 admins allowed. Remove an existing admin first.',
      });
    }

    const { id } = req.params;
    const updated = await AccessRequest.findByIdAndUpdate(
      id,
      { $set: { role: 'Admin' } },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ success: false, error: 'User not found.' });

    io.emit('member_updated', {
      memberId: `member-${id}`,
      email: updated.email,
      role: 'Admin',
      channelId: updated.channelId,
    });

    res.json({ success: true, message: `${updated.name} is now an Admin.` });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/admin/broadcast-email — admin sends a custom email to every user
// Sends to all VALID_ACCOUNTS + all approved DB users in one BCC call.
app.post('/api/admin/broadcast-email', authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Admin access required.' });
    }
    const { subject, message } = req.body;
    if (!subject || !subject.trim()) return res.status(400).json({ success: false, error: 'Subject is required.' });
    if (!message || !message.trim()) return res.status(400).json({ success: false, error: 'Message is required.' });

    const dbUsers = await AccessRequest.find({ status: 'approved' }).lean().catch(() => []);
    const removedSystemEmails = new Set(
      (await RemovedMember.find({}).lean().catch(() => [])).map(r => r.email.toLowerCase())
    );
    const allEmails = [
      ...VALID_ACCOUNTS.filter(a => !removedSystemEmails.has(a.email.toLowerCase())).map((a) => a.email),
      ...dbUsers.map((u) => u.email),
    ];

    if (allEmails.length === 0) {
      return res.json({ success: false, error: 'No users to send to.' });
    }

    const appUrl = process.env.APP_URL || 'https://edutechexos.vercel.app';
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#FAF8F5;border-radius:12px;">
        <div style="background:linear-gradient(135deg,#191E2F,#252D45);border-radius:10px;padding:24px;text-align:center;margin-bottom:24px;">
          <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:-0.5px;">EduTechExOS</h1>
          <p style="color:rgba(255,255,255,0.6);margin:6px 0 0;font-size:13px;">Message from Admin</p>
        </div>
        <div style="background:#fff;border:1px solid rgba(62,74,137,0.12);border-radius:10px;padding:20px 24px;margin-bottom:20px;">
          <p style="white-space:pre-wrap;font-size:14px;color:#1E2636;line-height:1.7;margin:0;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        </div>
        <div style="text-align:center;margin:20px 0;">
          <a href="${appUrl}" style="display:inline-block;background:#3E4A89;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:13px;font-weight:700;">Open EduTechExOS →</a>
        </div>
        <hr style="border:none;border-top:1px solid rgba(62,74,137,0.10);margin:20px 0;" />
        <p style="color:#B0B8D1;font-size:11px;text-align:center;margin:0;">EduTechExOS · Sent by workspace admin</p>
      </div>`;

    const [primary, ...rest] = allEmails;
    const r = await sendBrevoEmail({
      to: [{ email: primary }],
      bcc: rest.length > 0 ? rest.map(e => ({ email: e })) : undefined,
      subject: subject.trim(),
      html,
    });

    if (!r.ok) {
      if (r.brevoError === 'NOT_CONFIGURED') {
        return res.status(503).json({
          success: false,
          error: 'Email service not configured. Please set the BREVO_API_KEY environment variable in your Render backend settings, then redeploy.',
        });
      }
      const brevoStatus = parseInt((r.brevoError || '').split(':')[0], 10);
      if (brevoStatus === 401) {
        return res.status(503).json({
          success: false,
          error: 'Invalid Brevo API key (401). Double-check BREVO_API_KEY in Render environment variables.',
        });
      }
      if (brevoStatus === 403) {
        return res.status(503).json({
          success: false,
          error: 'Brevo rejected the request (403): the server IP is not on the authorised list. Go to Brevo → Account → Security → Authorised IPs and add the Render server IP, or disable IP restriction.',
        });
      }
      return res.status(502).json({ success: false, error: `Email provider error (${brevoStatus || 'unknown'}): ${r.brevoError}` });
    }

    console.log(`[broadcast] Admin ${req.user.email} sent "${subject.trim()}" to ${allEmails.length} users.`);
    res.json({ success: true, sentTo: allEmails.length });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/meeting-access — create/get meeting access record
app.post('/api/meeting-access', authMiddleware, async (req, res) => {
  try {
    const { messageId, channelId, hostEmail, allowedEmails } = req.body;
    if (!messageId || !channelId || !hostEmail) {
      return res.status(400).json({ success: false, error: 'messageId, channelId, and hostEmail are required.' });
    }
    const doc = await MeetingAccess.findOneAndUpdate(
      { messageId, channelId },
      { $setOnInsert: { hostEmail, allowedEmails: allowedEmails || [], grantedEmails: [] } },
      { upsert: true, new: true }
    ).lean();
    res.json({ success: true, access: doc });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/meeting-access/:messageId — check if current user can join meeting
app.get('/api/meeting-access/:messageId', authMiddleware, async (req, res) => {
  try {
    const doc = await MeetingAccess.findOne({ messageId: req.params.messageId }).lean();
    if (!doc) return res.json({ success: true, canJoin: true, exists: false });

    const userEmail = req.user?.email?.toLowerCase() || '';
    const allowed = doc.allowedEmails.map((e) => e.toLowerCase());
    const granted = doc.grantedEmails.map((e) => e.toLowerCase());
    const canJoin = userEmail === doc.hostEmail.toLowerCase()
      || allowed.includes(userEmail)
      || granted.includes(userEmail);

    res.json({ success: true, canJoin, hostEmail: doc.hostEmail, exists: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PATCH /api/meeting-access/:messageId/grant — host grants access to an email
app.patch('/api/meeting-access/:messageId/grant', authMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'email is required.' });

    const doc = await MeetingAccess.findOne({ messageId: req.params.messageId }).lean();
    if (!doc) return res.status(404).json({ success: false, error: 'Meeting access record not found.' });

    if (req.user?.email?.toLowerCase() !== doc.hostEmail.toLowerCase() && req.user?.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Only the meeting host or admin can grant access.' });
    }

    await MeetingAccess.findByIdAndUpdate(doc._id, { $addToSet: { grantedEmails: email.toLowerCase() } });

    // Notify the specific user that they've been granted access
    io.emit('meeting_access_granted', { messageId: req.params.messageId, email: email.toLowerCase() });

    res.json({ success: true, message: `Access granted to ${email}.` });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});



// ── Meeting Invite Email ───────────────────────────────────────────────────────

// POST /api/meetings/invite — send a meeting invite email to selected invitees only
app.post('/api/meetings/invite', authMiddleware, async (req, res) => {
  try {
    const { title, time, joinLink, channelId, inviteeEmails } = req.body;
    if (!title || !joinLink) {
      return res.status(400).json({ success: false, error: 'title and joinLink are required.' });
    }

    // Build the full member map (hardcoded + approved DB users)
    const allMap = new Map(VALID_ACCOUNTS.map(a => [a.email.toLowerCase(), { email: a.email, name: a.name }]));
    try {
      const dbUsers = await AccessRequest.find({ status: 'approved' }).lean();
      for (const u of dbUsers) {
        if (!allMap.has(u.email.toLowerCase())) allMap.set(u.email.toLowerCase(), { email: u.email, name: u.name });
      }
    } catch (_) { /* non-fatal */ }

    // If inviteeEmails provided, send only to those; otherwise fall back to everyone
    let to;
    if (Array.isArray(inviteeEmails) && inviteeEmails.length > 0) {
      to = inviteeEmails
        .map(e => allMap.get(e.toLowerCase()) ?? { email: e, name: e })
        .filter(r => r.email);
    } else {
      to = Array.from(allMap.values());
    }

    // Exclude the scheduler themselves
    const senderEmail = req.user?.email?.toLowerCase();
    if (senderEmail) to = to.filter(r => r.email.toLowerCase() !== senderEmail);
    const hostName = req.user?.name || req.user?.email || 'A team member';

    const html = `
      <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:32px;">
        <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#0A1128,#1E2E5C);padding:24px 28px;">
            <p style="margin:0;color:rgba(212,175,55,0.7);font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">EduTechExOS · Meeting Invite</p>
            <h1 style="margin:8px 0 0;font-size:22px;color:#fff;">${title}</h1>
          </div>
          <div style="padding:28px;">
            <p style="margin:0 0 20px;color:#334155;font-size:14px;line-height:1.7;">
              <strong>${hostName}</strong> has scheduled a meeting and invited you.
            </p>
            ${time ? `
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding:14px 16px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
              <span style="font-size:20px;">📅</span>
              <div>
                <p style="margin:0;font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;">Scheduled Time</p>
                <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#1e293b;">${time}</p>
              </div>
            </div>` : ''}
            <div style="margin-bottom:28px;padding:14px 16px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
              <p style="margin:0;font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;">Channel</p>
              <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#1e293b;">#${channelId || 'general'}</p>
            </div>
            <a href="${joinLink}" style="display:inline-block;padding:14px 32px;background:#D4AF37;color:#0A1128;font-weight:800;font-size:13px;text-decoration:none;border-radius:8px;">
              Join Meeting →
            </a>
            <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;word-break:break-all;">
              Or copy this link:<br/>
              <a href="${joinLink}" style="color:#3E4A89;">${joinLink}</a>
            </p>
          </div>
          <div style="background:#f8fafc;padding:14px 28px;border-top:1px solid #f1f5f9;text-align:center;font-size:11px;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;">
            &copy; 2026 EduTechExOS &middot; Institutional Team OS
          </div>
        </div>
      </div>`;

    const subject = `Meeting Invite: ${title}${time ? ' · ' + time : ''}`;
    const [primaryRecipient, ...otherRecipients] = to;
    const bccRecipients = otherRecipients.map(r => ({ email: r.email }));
    const { ok } = await sendBrevoEmail({
      to: [{ email: primaryRecipient.email }],
      bcc: bccRecipients.length > 0 ? bccRecipients : undefined,
      subject,
      html,
    });
    console.log(`[meeting-invite] ${ok ? 'OK' : 'FAILED'} → ${to.length} recipients (BCC)`);
    res.json({ success: true, sent: to.length, ok });
  } catch (err) {
    console.error('[meeting-invite]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/media — register a media file (audio/video/screen) with access control
app.post('/api/media', authMiddleware, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    const { channelId, messageId, kind, url, mimeType, sizeBytes } = req.body;
    if (!channelId || !kind || !url) {
      return res.status(400).json({ success: false, error: 'channelId, kind, and url are required.' });
    }
    const file = new MediaFile({
      ownerEmail: req.user.email,
      channelId,
      messageId: messageId || null,
      kind: ['audio', 'video', 'screen'].includes(kind) ? kind : 'audio',
      url,
      mimeType: mimeType || '',
      sizeBytes: sizeBytes || 0,
    });
    const saved = await file.save();
    res.json({ success: true, mediaId: saved._id.toString() });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/media/:id — verify access before returning media URL
app.get('/api/media/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    const file = await MediaFile.findById(req.params.id).lean();
    if (!file) return res.status(404).json({ success: false, error: 'Media file not found.' });

    const isOwner = file.ownerEmail.toLowerCase() === req.user.email.toLowerCase();
    const isAdmin = req.user.role === 'Admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Access denied. Only the sender and admin can access this recording.' });
    }

    res.json({ success: true, url: file.url, kind: file.kind, mimeType: file.mimeType });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/auth/login — validate credentials, returns user object
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'invalid', message: 'Email and password are required.' });
    }
    const emailClean = String(email).trim().toLowerCase();

    // 1. Check hardcoded accounts first (skip if admin has removed this system member)
    const isSystemRemoved = await RemovedMember.exists({ email: emailClean });
    const hardcoded = isSystemRemoved ? null : VALID_ACCOUNTS.find((a) => a.email === emailClean && a.password === password);
    if (hardcoded) {
      const token = jwt.sign(
        { email: hardcoded.email, name: hardcoded.name, role: hardcoded.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );
      // Record login event for hardcoded accounts too
      try {
        const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        await LoginEvent.findOneAndUpdate(
          { email: emailClean, dateStr },
          { $set: { name: hardcoded.name, loginAt: new Date() } },
          { upsert: true }
        );
        io.emit('login_status_updated', { email: emailClean, dateStr, loggedIn: true });
      } catch (_) {}
      return res.json({ success: true, user: hardcoded, token });
    }

    // 2. Check DB access requests
    const request = await AccessRequest.findOne({ email: emailClean }).lean();

    if (!request) {
      return res.status(401).json({ success: false, error: 'invalid', message: 'Invalid credentials. Use an approved user account.' });
    }
    // Support both bcrypt-hashed and legacy plain-text passwords (migration path).
    // On plain-text match, immediately re-hash and save so the account self-heals.
    const bcryptMatch = await bcrypt.compare(password, request.password).catch(() => false);
    const plainMatch  = !bcryptMatch && request.password === password;
    if (!bcryptMatch && !plainMatch) {
      return res.status(401).json({ success: false, error: 'invalid', message: 'Invalid credentials. Use an approved user account.' });
    }
    if (plainMatch) {
      // Silently upgrade the stored password to a bcrypt hash
      bcrypt.hash(password, 10).then((h) =>
        AccessRequest.findOneAndUpdate({ email: emailClean }, { $set: { password: h } })
      ).catch(() => {});
    }
    if (request.status === 'rejected') {
      return res.status(401).json({ success: false, error: 'rejected', message: 'Your access request was declined. Contact admin.' });
    }

    // Pending ✓ — user can sign in but sees restricted dashboard until approved
    if (request.status === 'pending') {
      const token = jwt.sign(
        { email: request.email, name: request.name, role: request.role, status: 'pending' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );
      return res.json({
        success: true,
        user: { email: request.email, name: request.name, role: request.role, status: 'pending' },
        token,
      });
    }

    // Approved ✓
    const token = jwt.sign(
      { email: request.email, name: request.name, role: request.role, status: 'approved' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    // Record login event
    try {
      const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      await LoginEvent.findOneAndUpdate(
        { email: emailClean, dateStr },
        { $set: { name: request.name, loginAt: new Date() } },
        { upsert: true }
      );
      io.emit('login_status_updated', { email: emailClean, dateStr, loggedIn: true });
    } catch (_) {}

    return res.json({
      success: true,
      user: { email: request.email, name: request.name, role: request.role, status: 'approved' },
      token,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ── Helper: send password-reset email via Brevo API ──────────────────────────
async function sendResetEmail(toEmail, toName, code) {
  const html = `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:32px;">
      <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#4f46e5,#3b82f6);color:#fff;padding:24px 28px;">
          <h1 style="margin:0;font-size:22px;">EduTechEx<span style="color:#93c5fd;">OS</span></h1>
          <p style="margin:6px 0 0;color:#e0e7ff;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Password Reset</p>
        </div>
        <div style="padding:28px;">
          <p style="margin:0 0 16px;color:#334155;font-size:15px;">Hello ${toName},</p>
          <p style="margin:0 0 20px;color:#334155;font-size:15px;">Use the code below to reset your password — it expires in <strong>15 minutes</strong>.</p>
          <div style="letter-spacing:8px;font-size:32px;font-weight:800;color:#4f46e5;background:#eef2ff;border-radius:14px;padding:18px;text-align:center;margin-bottom:24px;">${code}</div>
          <p style="margin:0;color:#64748b;font-size:13px;">If you didn't request this, ignore this email.</p>
        </div>
        <div style="background:#f8fafc;padding:16px 28px;border-top:1px solid #f1f5f9;text-align:center;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">&copy; 2026 EduTechExOS</div>
      </div>
    </div>`;

  const { ok } = await sendBrevoEmail({ to: [{ email: toEmail, name: toName }], subject: `EduTechExOS: Password reset code ${code}`, html });
  return { ok };
}

// POST /api/auth/forgot-password — generate + email a 6-digit reset code
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email is required.' });
    const emailClean = String(email).trim().toLowerCase();

    // Hardcoded system accounts cannot self-reset
    if (VALID_ACCOUNTS.some((a) => a.email === emailClean)) {
      return res.status(400).json({
        success: false,
        error: 'System accounts cannot reset their password via this form. Contact admin directly.',
      });
    }

    // Use same generic message regardless of whether email is registered (prevents enumeration)
    const GENERIC_OK = 'If this email is registered, a reset code has been sent.';
    const request = await AccessRequest.findOne({ email: emailClean }).lean();
    if (!request) return res.json({ success: true, message: GENERIC_OK });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Remove any old unused codes for this email
    await ResetCode.deleteMany({ email: emailClean });
    await new ResetCode({ email: emailClean, code, expiresAt }).save();

    await sendResetEmail(emailClean, request.name, code);

    res.json({ success: true, message: GENERIC_OK });
  } catch (err) {
    console.error('[forgot-password]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/auth/reset-password — validate code + update password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ success: false, error: 'Email, code, and new password are required.' });
    }
    const emailClean = String(email).trim().toLowerCase();

    const resetCode = await ResetCode.findOne({ email: emailClean, code: String(code), used: false }).lean();
    if (!resetCode) {
      return res.status(400).json({ success: false, error: 'Invalid or expired reset code.' });
    }
    if (new Date(resetCode.expiresAt) < new Date()) {
      await ResetCode.findByIdAndDelete(resetCode._id);
      return res.status(400).json({ success: false, error: 'Reset code has expired. Please request a new one.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
    }

    await AccessRequest.findOneAndUpdate({ email: emailClean }, { $set: { password: await bcrypt.hash(newPassword, 10) } });
    await ResetCode.findByIdAndUpdate(resetCode._id, { $set: { used: true } });

    res.json({ success: true, message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    console.error('[reset-password]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/admin/set-password — admin sets/creates a DB user's password directly
// Body: { email, password, name?, role?, status? }
// Creates the account (approved) if it doesn't exist yet.
app.post('/api/admin/set-password', authMiddleware, async (req, res) => {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, error: 'Admin access required.' });
  }
  try {
    const { email, password, name, role, status } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'email and password are required.' });
    }
    const emailClean = String(email).trim().toLowerCase();
    if (password.length < 4) {
      return res.status(400).json({ success: false, error: 'Password must be at least 4 characters.' });
    }
    // Block shadowing hardcoded system accounts
    if (VALID_ACCOUNTS.some((a) => a.email === emailClean)) {
      return res.status(409).json({ success: false, error: 'Cannot override a system account via this endpoint.' });
    }
    const hashed = await bcrypt.hash(String(password), 10);
    const existing = await AccessRequest.findOne({ email: emailClean }).lean();
    if (existing) {
      await AccessRequest.findOneAndUpdate(
        { email: emailClean },
        { $set: { password: hashed, ...(role ? { role } : {}), ...(status ? { status } : {}), ...(name ? { name } : {}) } }
      );
      return res.json({ success: true, action: 'updated', email: emailClean });
    }
    // Create new approved account
    const newUser = new AccessRequest({
      name: name || emailClean.split('@')[0],
      email: emailClean,
      password: hashed,
      role: role || 'Member',
      status: status || 'approved',
    });
    await newUser.save();
    return res.json({ success: true, action: 'created', email: emailClean });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/auth/change-password — verify current password then set a new one
app.post('/api/auth/change-password', async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Email, current password, and new password are required.' });
    }
    const emailClean = String(email).trim().toLowerCase();

    // Hardcoded system accounts cannot self-change password
    if (VALID_ACCOUNTS.some((a) => a.email === emailClean)) {
      return res.status(400).json({
        success: false,
        error: 'System accounts cannot change their password here. Ask the admin to update it directly.',
      });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({ success: false, error: 'New password must be at least 8 characters.' });
    }

    const request = await AccessRequest.findOne({ email: emailClean }).lean();
    if (!request) {
      return res.status(404).json({ success: false, error: 'Account not found.' });
    }
    const passwordMatch = await bcrypt.compare(currentPassword, request.password)
      .catch(() => false); // if stored value isn't a valid hash (legacy plain-text), fall back
    const legacyMatch = !passwordMatch && request.password === currentPassword;
    if (!passwordMatch && !legacyMatch) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect.' });
    }

    await AccessRequest.findOneAndUpdate({ email: emailClean }, { $set: { password: await bcrypt.hash(newPassword, 10) } });
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    console.error('[change-password]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── Email Digest ─────────────────────────────────────────────────────────────
//
// Builds and sends a daily digest email to all team members covering:
//  • Message count per channel (last 24 h)
//  • Open Kanban tasks
//  • Upcoming scheduled meetings
//
// POST /api/digest  — trigger manually (admin use / testing)
// Cron             — fires automatically every day at 09:00 IST (03:30 UTC)

async function buildDigestHtml(since) {
  const sinceDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Recent messages grouped by channel
  const recentMsgs = await Message.find({ timestamp: { $gte: sinceDate } }).lean();
  const byChannel = {};
  recentMsgs.forEach((m) => {
    byChannel[m.channelId] = (byChannel[m.channelId] || 0) + 1;
  });
  const channelRows = Object.entries(byChannel)
    .sort(([, a], [, b]) => b - a)
    .map(([ch, cnt]) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;">#${ch}</td><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;font-weight:700;color:#4f46e5;">${cnt}</td></tr>`)
    .join('');

  // Open Kanban tasks
  const openTasks = await KanbanTask.find({ status: { $ne: 'done' } }).lean();
  const taskRows = openTasks.slice(0, 10)
    .map((t) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;">${t.text.slice(0, 80)}</td><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;">${t.assignee}</td><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;"><span style="background:${t.status==='inprogress'?'#dbeafe':'#fef9c3'};color:${t.status==='inprogress'?'#1d4ed8':'#854d0e'};padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;">${t.status}</span></td></tr>`)
    .join('');

  // Upcoming meetings (messages starting with "Meeting Scheduled:")
  const upcomingMeetings = await Message.find({ text: /^Meeting Scheduled:/, timestamp: { $gte: sinceDate } }).lean();
  const meetingRows = upcomingMeetings
    .map((m) => {
      const title = (m.text.match(/Meeting Scheduled:\s*(.+)/) || [])[1] || 'Meeting';
      const time  = (m.text.match(/Time:\s*(.+)/)             || [])[1] || '';
      const link  = (m.text.match(/Join Link:\s*(https?:\/\/\S+)/) || [])[1] || '#';
      return `<tr><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;">${title}</td><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;">${time}</td><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;"><a href="${link}" style="color:#4f46e5;font-weight:700;">Join →</a></td></tr>`;
    })
    .join('');

  const dateLabel = sinceDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  return `
  <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:32px;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#1a3a2a,#4f46e5);padding:24px 28px;">
        <p style="margin:0;color:#a5f3fc;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">EduTechExOS</p>
        <h1 style="margin:6px 0 0;font-size:22px;color:#fff;">Daily Digest</h1>
        <p style="margin:4px 0 0;color:#c7d2fe;font-size:13px;">${dateLabel}</p>
      </div>

      <!-- Channel activity -->
      <div style="padding:24px 28px 0;">
        <h2 style="margin:0 0 12px;font-size:14px;font-weight:800;color:#1e293b;text-transform:uppercase;letter-spacing:1px;">📣 Channel Activity (last 24 h)</h2>
        ${channelRows ? `<table style="width:100%;border-collapse:collapse;font-size:13px;"><tr style="background:#f8fafc;"><th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Channel</th><th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Messages</th></tr>${channelRows}</table>` : '<p style="font-size:13px;color:#94a3b8;">No messages in the last 24 hours.</p>'}
      </div>

      <!-- Open tasks -->
      <div style="padding:24px 28px 0;">
        <h2 style="margin:0 0 12px;font-size:14px;font-weight:800;color:#1e293b;text-transform:uppercase;letter-spacing:1px;">📋 Open Tasks (${openTasks.length})</h2>
        ${taskRows ? `<table style="width:100%;border-collapse:collapse;font-size:13px;"><tr style="background:#f8fafc;"><th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Task</th><th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;">Assignee</th><th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;">Status</th></tr>${taskRows}</table>` : '<p style="font-size:13px;color:#94a3b8;">No open tasks right now 🎉</p>'}
      </div>

      <!-- Meetings -->
      <div style="padding:24px 28px;">
        <h2 style="margin:0 0 12px;font-size:14px;font-weight:800;color:#1e293b;text-transform:uppercase;letter-spacing:1px;">📅 Meetings Scheduled</h2>
        ${meetingRows ? `<table style="width:100%;border-collapse:collapse;font-size:13px;"><tr style="background:#f8fafc;"><th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;">Title</th><th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;">Time</th><th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;">Link</th></tr>${meetingRows}</table>` : '<p style="font-size:13px;color:#94a3b8;">No meetings scheduled recently.</p>'}
      </div>

      <!-- Footer -->
      <div style="background:#f8fafc;padding:16px 28px;border-top:1px solid #f1f5f9;text-align:center;font-size:11px;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;">&copy; 2026 EduTechExOS &middot; Internal Team OS</div>
    </div>
  </div>`;
}

async function sendDigestEmails(since) {
  const html = await buildDigestHtml(since);

  // ── Build recipient list: hardcoded + ALL approved DB users ──────────
  // Previously only VALID_ACCOUNTS got the digest — new users were excluded.
  const toMap = new Map(VALID_ACCOUNTS.map((a) => [a.email, { email: a.email, name: a.name }]));
  try {
    const dbUsers = await AccessRequest.find({ status: 'approved' }).lean();
    for (const u of dbUsers) {
      if (!toMap.has(u.email)) toMap.set(u.email, { email: u.email, name: u.name });
    }
  } catch (e) {
    console.warn('[digest] Could not fetch DB users for digest:', e.message);
  }
  const allRecipients = Array.from(toMap.values());
  const [primaryRecipient, ...otherRecipients] = allRecipients;

  const subject = `EduTechExOS: Daily Team Digest — ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  const { ok } = await sendBrevoEmail({
    to: [{ email: primaryRecipient.email }],
    bcc: otherRecipients.length > 0 ? otherRecipients.map(r => ({ email: r.email })) : undefined,
    subject,
    html,
  });
  const recipients = allRecipients.map((r) => r.email).join(', ');
  console.log(`[digest] Brevo send ${ok ? 'OK' : 'FAILED'} → ${allRecipients.length} recipients (BCC): ${recipients}`);
  return { recipients };
}

// POST /api/digest — manual trigger (admin / testing)
app.post('/api/digest', async (req, res) => {
  try {
    const since = req.body.since ? new Date(req.body.since) : undefined;
    const result = await sendDigestEmails(since);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[digest]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ── Cron: send digest daily at 09:00 IST = 03:30 UTC ─────────────────────────
// Uses node-cron (required at top of file) for reliable scheduling.
cron.schedule('30 3 * * *', async () => {
  console.log('[digest-cron] Firing daily digest at 03:30 UTC (09:00 IST)');
  try {
    const result = await sendDigestEmails();
    console.log(`[digest-cron] Digest sent → ${result.recipients}`);
    if (result.testUrl) console.log(`[digest-cron] Preview: ${result.testUrl}`);
  } catch (err) {
    console.error('[digest-cron] Failed:', err);
  }
}, {
  timezone: 'UTC',
});

console.log('[digest-cron] Scheduled daily digest at 03:30 UTC (09:00 IST) via node-cron');

// ─── Message Routes ────────────────────────────────────────────────────────────

// ── Message formatter helper ──────────────────────────────────────────────────
function formatMessage(msg, requestingUser) {
  const { _id, __v, ...rest } = msg;
  // Skip messages hidden for this specific user
  if (requestingUser && (rest.deletedForUsers || []).includes(requestingUser)) return null;
  // Soft-deleted for everyone — return placeholder (WhatsApp style)
  if (rest.deletedForEveryone) {
    return {
      id: _id.toString(),
      channelId: rest.channelId,
      sender: rest.sender,
      initials: rest.initials,
      color: rest.color,
      timestamp: rest.timestamp instanceof Date ? rest.timestamp.toISOString() : rest.timestamp,
      parentId: rest.parentId,
      isDeleted: true,
      text: '',
    };
  }
  return {
    ...rest,
    id: _id.toString(),
    timestamp: rest.timestamp instanceof Date ? rest.timestamp.toISOString() : rest.timestamp,
    ...(rest.editedAt ? { editedAt: rest.editedAt instanceof Date ? rest.editedAt.toISOString() : rest.editedAt } : {}),
  };
}

// ── OG Link Preview unfurl ───────────────────────────────────────────────────
app.get('/api/og', async (req, res) => {
  const url = String(req.query.url || '');
  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ success: false, error: 'Valid URL required' });
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EduTechExOSBot/1.0; +https://edutechexos.vercel.app)' },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const html = await resp.text();

    const og = (prop) => {
      const m = html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']{1,400})["']`, 'i'))
               || html.match(new RegExp(`<meta[^>]+content=["']([^"']{1,400})["'][^>]+property=["']og:${prop}["']`, 'i'));
      return m?.[1]?.trim() || '';
    };
    const meta = (name) => {
      const m = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']{1,400})["']`, 'i'))
               || html.match(new RegExp(`<meta[^>]+content=["']([^"']{1,400})["'][^>]+name=["']${name}["']`, 'i'));
      return m?.[1]?.trim() || '';
    };
    const titleTag = (html.match(/<title[^>]*>([^<]{1,200})<\/title>/i) || [])[1]?.trim() || '';

    res.json({
      success: true,
      preview: {
        url,
        title:       og('title')       || meta('title')       || titleTag,
        description: og('description') || meta('description') || '',
        image:       og('image')       || '',
        siteName:    og('site_name')   || '',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ── E2E Encryption key endpoints ─────────────────────────────────────────────

// POST /api/keys — upsert your own public key (called once on login)
app.post('/api/keys', authMiddleware, async (req, res) => {
  try {
    const email = req.user?.email?.toLowerCase();
    if (!email) return res.status(401).json({ success: false, error: 'Auth required.' });
    const { publicKey } = req.body;
    if (!publicKey || typeof publicKey !== 'string') {
      return res.status(400).json({ success: false, error: 'publicKey required.' });
    }
    await UserKey.findOneAndUpdate(
      { email },
      { email, publicKey, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/keys/:email — fetch any user's public key (auth required)
app.get('/api/keys/:email', authMiddleware, async (req, res) => {
  try {
    const email = req.params.email?.toLowerCase();
    const record = await UserKey.findOne({ email }).lean();
    if (!record) return res.status(404).json({ success: false, error: 'No key found.' });
    res.json({ success: true, publicKey: record.publicKey });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ── Availability endpoints ────────────────────────────────────────────────────

// GET /api/availability — any authenticated user fetches admin availability
app.get('/api/availability', authMiddleware, async (req, res) => {
  try {
    const { month } = req.query; // YYYY-MM — returns whole month if given
    const filter = {};
    if (month) filter.date = { $regex: `^${month}` };
    const records = await AdminAvailability.find(filter).sort({ date: 1 }).lean();
    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/availability — admin upserts slots for a date
app.post('/api/availability', authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Admin only.' });
    }
    const { date, slots } = req.body;
    if (!date || !Array.isArray(slots)) {
      return res.status(400).json({ success: false, error: 'date and slots required.' });
    }
    const record = await AdminAvailability.findOneAndUpdate(
      { date, adminEmail: req.user.email },
      { date, adminEmail: req.user.email, slots },
      { upsert: true, new: true }
    );
    res.json({ success: true, record });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/availability/:date — admin clears a date
app.delete('/api/availability/:date', authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Admin only.' });
    }
    await AdminAvailability.deleteOne({ date: req.params.date, adminEmail: req.user.email });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ── Meeting-request endpoints ─────────────────────────────────────────────────

// GET /api/meeting-requests — admin sees all, user sees their own
app.get('/api/meeting-requests', authMiddleware, async (req, res) => {
  try {
    const email = req.user?.email?.toLowerCase();
    const filter = req.user?.role === 'Admin' ? {} : { userEmail: email };
    const requests = await MeetingRequest.find(filter).sort({ date: 1, time: 1 }).lean();
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/meeting-requests — any user books a slot
app.post('/api/meeting-requests', authMiddleware, async (req, res) => {
  try {
    const { date, time, purpose, adminEmail } = req.body;
    if (!date || !time) return res.status(400).json({ success: false, error: 'date and time required.' });
    const mr = new MeetingRequest({
      userEmail: req.user.email,
      userName:  req.user.name,
      adminEmail: adminEmail || 'admin@edutechex.in',
      date, time, purpose: purpose || '',
    });
    const saved = await mr.save();
    // Notify admin via email
    sendBrevoEmail({
      to: [{ email: adminEmail || 'admin@edutechex.in' }],
      subject: `Meeting request from ${req.user.name} on ${date} at ${time}`,
      html: `<p><strong>${req.user.name}</strong> (${req.user.email}) has requested a meeting on <strong>${date}</strong> at <strong>${time}</strong>.</p><p>Purpose: ${purpose || 'Not specified'}</p>`,
    }).catch(() => {});
    res.json({ success: true, request: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PATCH /api/meeting-requests/:id — admin confirms or declines
app.patch('/api/meeting-requests/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Admin only.' });
    }
    const { status } = req.body;
    const updated = await MeetingRequest.findByIdAndUpdate(
      req.params.id, { status }, { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ success: false, error: 'Not found.' });
    // Notify user
    sendBrevoEmail({
      to: [{ email: updated.userEmail }],
      subject: `Your meeting request on ${updated.date} at ${updated.time} has been ${status}`,
      html: `<p>Hi <strong>${updated.userName}</strong>,</p><p>Your meeting request for <strong>${updated.date}</strong> at <strong>${updated.time}</strong> has been <strong>${status}</strong> by the admin.</p>`,
    }).catch(() => {});
    res.json({ success: true, request: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ── Excel export endpoint ─────────────────────────────────────────────────────

// GET /api/members/export — admin downloads all members as an Excel file
app.get('/api/members/export', authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Admin only.' });
    }
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EduTechExOS';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Members');
    sheet.columns = [
      { header: 'Name',        key: 'name',        width: 24 },
      { header: 'Email',       key: 'email',       width: 30 },
      { header: 'Role',        key: 'role',        width: 14 },
      { header: 'Status',      key: 'status',      width: 12 },
      { header: 'Password',    key: 'password',    width: 20 },
      { header: 'Created At',  key: 'createdAt',   width: 22 },
    ];

    // Style header row
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3E4A89' } };
      cell.alignment = { horizontal: 'center' };
    });

    // Add DB members (access requests with approved status)
    const dbMembers = await AccessRequest.find({ status: 'approved' }).lean();
    dbMembers.forEach((m) => {
      sheet.addRow({
        name:      m.name,
        email:     m.email,
        role:      m.role,
        status:    'approved',
        password:  '(hidden)',
        createdAt: m.requestedAt ? new Date(m.requestedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
      });
    });

    // Alternate row shading
    sheet.eachRow((row, i) => {
      if (i > 1) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFF0F2FF' : 'FFFFFFFF' } };
        });
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="edutechexos-members-${new Date().toISOString().slice(0,10)}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET Messages — supports two modes:
//   1. ?channelId=X[&before=ISO_TIMESTAMP][&limit=N]  → paginated single-channel
//   2. (no channelId) → last PAGE_SIZE messages per channel for initial load
const PAGE_SIZE = 50;

app.get('/api/messages', async (req, res) => {
  try {
    const requestingUser = getUserEmail(req);
    const { channelId, before, limit } = req.query;
    const pageSize = Math.min(parseInt(limit) || PAGE_SIZE, 100);

    if (channelId) {
      // ── Paginated single-channel load ───────────────────────────────────────
      const filter = { channelId: String(channelId) };
      if (before) filter.timestamp = { $lt: new Date(before) };

      const msgs = await Message.find(filter)
        .sort({ timestamp: -1 })
        .limit(pageSize + 1)   // fetch one extra to detect hasMore
        .lean();

      const hasMore = msgs.length > pageSize;
      const page = msgs.slice(0, pageSize).reverse(); // oldest-first for the client

      const formatted = page.map((m) => formatMessage(m, requestingUser)).filter(Boolean);
      return res.json({ success: true, messages: formatted, hasMore, channelId });
    }

    // ── Initial load: last PAGE_SIZE per channel ────────────────────────────
    const allChannelIds = await Message.distinct('channelId');
    const grouped  = {};
    const hasMoreMap = {};

    for (const chId of allChannelIds) {
      const msgs = await Message.find({ channelId: chId })
        .sort({ timestamp: -1 })
        .limit(pageSize + 1)
        .lean();

      hasMoreMap[chId] = msgs.length > pageSize;
      const page = msgs.slice(0, pageSize).reverse();
      grouped[chId] = page.map((m) => formatMessage(m, requestingUser)).filter(Boolean);
    }

    res.json({ success: true, messages: grouped, hasMore: hasMoreMap });
  } catch (err) {
    console.error('[GET /api/messages] Error:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST Message
app.post('/api/messages', async (req, res) => {
  try {
    const { id, ...messageData } = req.body;
    const userEmail = getUserEmail(req);
    // Attach senderEmail from auth if not already provided
    if (userEmail && !messageData.senderEmail) {
      messageData.senderEmail = userEmail;
    }
    const newMessage = new Message({
      ...messageData,
      clientId: id,
    });
    const savedMsg = await newMessage.save();
    const { _id, __v, ...rest } = savedMsg.toObject();
    const payload = {
      ...rest,
      id: _id.toString(),
      timestamp: rest.timestamp instanceof Date ? rest.timestamp.toISOString() : rest.timestamp,
      ...(rest.editedAt ? { editedAt: rest.editedAt instanceof Date ? rest.editedAt.toISOString() : rest.editedAt } : {}),
    };

    // Broadcast to all clients subscribed to this channel room (including sender)
    io.to(payload.channelId).emit('new_message', { channelId: payload.channelId, message: payload });

    res.json({ success: true, message: payload });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE Message — soft-delete by default; ?hard=true for admin permanent delete
app.delete('/api/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { scope, userEmail, hard } = req.query;

    if (hard === 'true') {
      const msg = await Message.findByIdAndDelete(id).lean();
      if (msg) io.to(msg.channelId).emit('message_deleted', { channelId: msg.channelId, messageId: id });
      return res.json({ success: true, deleted: 'permanent' });
    }

    if (scope === 'me' && userEmail) {
      await Message.findByIdAndUpdate(id, { $addToSet: { deletedForUsers: userEmail } });
      return res.json({ success: true, deleted: 'for-me' });
    }

    // Default: soft-delete for everyone
    const updated = await Message.findByIdAndUpdate(
      id,
      { deletedAt: new Date(), deletedForEveryone: true, deletedBy: userEmail || 'unknown' },
      { new: true }
    ).lean();

    if (updated) {
      // Broadcast so other clients immediately show the "deleted" placeholder
      io.to(updated.channelId).emit('message_deleted', { channelId: updated.channelId, messageId: id });
    }

    res.json({ success: true, deleted: 'for-everyone' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PATCH Message — partial update: text edit, reactions, poll votes
app.patch('/api/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body; // { text, editedAt } | { reactions } | { poll }

    const updated = await Message.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    const { _id, __v, ...rest } = updated;
    const payload = {
      ...rest,
      id: _id.toString(),
      timestamp: rest.timestamp instanceof Date ? rest.timestamp.toISOString() : rest.timestamp,
      ...(rest.editedAt ? { editedAt: rest.editedAt instanceof Date ? rest.editedAt.toISOString() : rest.editedAt } : {}),
    };

    // Real-time broadcast so other clients see the change immediately
    io.to(payload.channelId).emit('message_updated', { channelId: payload.channelId, message: payload });

    res.json({ success: true, message: payload });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── Full-text search across messages, wiki pages, and tasks ─────────────────
// GET /api/search?q=<query>&limit=<n>   (auth required)
app.get('/api/search', authMiddleware, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    if (!q) return res.json({ success: true, results: [], total: 0 });

    const textFilter = { $text: { $search: q } };
    const scoreProj = { score: { $meta: 'textScore' } };

    const [msgDocs, wikiDocs, taskDocs] = await Promise.all([
      Message.find(textFilter, scoreProj).sort({ score: { $meta: 'textScore' } }).limit(limit).lean(),
      WikiPage.find(textFilter, scoreProj).sort({ score: { $meta: 'textScore' } }).limit(10).lean(),
      KanbanTask.find(textFilter, scoreProj).sort({ score: { $meta: 'textScore' } }).limit(10).lean(),
    ]);

    const results = [
      ...msgDocs.map(d => ({
        type: 'message', id: String(d._id), channelId: d.channelId,
        text: d.text, sender: d.sender, timestamp: d.timestamp, score: d.score,
      })),
      ...wikiDocs.map(d => ({
        type: 'wiki', id: String(d._id), channelId: d.channelId,
        text: `${d.title}: ${String(d.content).replace(/<[^>]*>/g, '').slice(0, 200)}`,
        sender: d.createdBy, timestamp: d.updatedAt, score: d.score,
      })),
      ...taskDocs.map(d => ({
        type: 'task', id: String(d._id), channelId: d.sourceChannel,
        text: `${d.text} → ${d.assignee} [${d.status}]`,
        sender: d.assignee, timestamp: d.createdAt, score: d.score,
      })),
    ].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, limit);

    res.json({ success: true, results, total: results.length });
  } catch (err) {
    // If text index doesn't exist yet, fall back to regex search
    if (String(err).includes('text index')) {
      const q = String(req.query.q || '').trim();
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const msgs = await Message.find({ text: re }).limit(20).lean();
      return res.json({
        success: true,
        results: msgs.map(d => ({ type: 'message', id: String(d._id), channelId: d.channelId, text: d.text, sender: d.sender, timestamp: d.timestamp })),
        total: msgs.length,
      });
    }
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET Kanban Tasks (filtered by user)
app.get('/api/kanban', async (req, res) => {
  try {
    const requestingUser = getUserEmail(req);
    const filter = requestingUser
      ? { $or: [{ assigneeEmail: requestingUser }, { assigneeEmail: { $exists: false } }, { assigneeEmail: null }] }
      : {};
    const tasks = await KanbanTask.find(filter).sort({ createdAt: 1 }).lean();
    const formatted = tasks.map(({ _id, __v, ...rest }) => ({
      ...rest,
      id: _id.toString(),
      createdAt: rest.createdAt instanceof Date ? rest.createdAt.toISOString() : rest.createdAt,
    }));
    res.json({ success: true, tasks: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST Kanban Task
app.post('/api/kanban', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    const body = { ...req.body };
    if (userEmail && !body.assigneeEmail) {
      body.assigneeEmail = userEmail;
    }
    const task = new KanbanTask(body);
    const saved = await task.save();
    const { _id, __v, ...rest } = saved.toObject();
    res.json({
      success: true,
      task: {
        ...rest,
        id: _id.toString(),
        createdAt: rest.createdAt instanceof Date ? rest.createdAt.toISOString() : rest.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PATCH Kanban Task (update status or other fields)
app.patch('/api/kanban/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await KanbanTask.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ success: false, error: 'Task not found' });
    const { _id, __v, ...rest } = updated;
    res.json({
      success: true,
      task: {
        ...rest,
        id: _id.toString(),
        createdAt: rest.createdAt instanceof Date ? rest.createdAt.toISOString() : rest.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE Kanban Task
app.delete('/api/kanban/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await KanbanTask.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET Wiki Pages (filtered by user)
app.get('/api/wikipages', async (req, res) => {
  try {
    const requestingUser = getUserEmail(req);
    const filter = requestingUser
      ? { $or: [{ createdBy: requestingUser }, { createdBy: { $exists: false } }, { createdBy: null }] }
      : {};
    const pages = await WikiPage.find(filter).sort({ updatedAt: -1 }).lean();
    const formatted = pages.map((p) => {
      return {
        id: p._id,
        channelId: p.channelId,
        title: p.title,
        content: p.content,
        createdAt: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: p.updatedAt ? p.updatedAt.toISOString() : new Date().toISOString(),
      };
    });
    res.json({ success: true, pages: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST/UPSERT Wiki Page
app.post('/api/wikipages', async (req, res) => {
  try {
    const { id, channelId, title, content } = req.body;
    const userEmail = getUserEmail(req);
    const setFields = { channelId, title, content, updatedAt: new Date() };
    const setOnInsertFields = userEmail ? { createdBy: userEmail } : {};
    const updated = await WikiPage.findOneAndUpdate(
      { _id: id },
      { $set: setFields, $setOnInsert: setOnInsertFields },
      { upsert: true, new: true }
    ).lean();
    
    const { _id, ...rest } = updated;
    res.json({
      success: true,
      page: {
        ...rest,
        id: _id,
        createdAt: updated.createdAt ? updated.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: updated.updatedAt ? updated.updatedAt.toISOString() : new Date().toISOString(),
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE Wiki Page
app.delete('/api/wikipages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await WikiPage.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── Bookmarks ────────────────────────────────────────────────────────────────

// GET Bookmarks for the authenticated user
app.get('/api/bookmarks', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    if (!userEmail) {
      return res.status(400).json({ success: false, error: 'userEmail required' });
    }
    const bookmarks = await Bookmark.find({ userEmail }).sort({ timestamp: -1 }).lean();
    const formatted = bookmarks.map(({ _id, __v, ...rest }) => ({
      ...rest,
      id: _id.toString(),
      timestamp: rest.timestamp instanceof Date ? rest.timestamp.toISOString() : rest.timestamp,
    }));
    res.json({ success: true, bookmarks: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST Bookmark (toggle — if exists, remove; otherwise add)
app.post('/api/bookmarks/toggle', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    const { messageId, channelId, text, sender, timestamp } = req.body;
    if (!userEmail || !messageId) {
      return res.status(400).json({ success: false, error: 'userEmail and messageId required' });
    }
    const existing = await Bookmark.findOne({ userEmail, messageId }).lean();
    if (existing) {
      await Bookmark.deleteOne({ userEmail, messageId });
      return res.json({ success: true, bookmarked: false });
    }
    const bookmark = new Bookmark({ userEmail, messageId, channelId, text, sender, timestamp });
    await bookmark.save();
    res.json({ success: true, bookmarked: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE Bookmark
app.delete('/api/bookmarks/:id', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    const { id } = req.params;
    const bookmark = await Bookmark.findOneAndDelete({ _id: id, userEmail });
    if (!bookmark) {
      return res.status(404).json({ success: false, error: 'Bookmark not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── Notifications ────────────────────────────────────────────────────────────

// GET Notifications (for a specific recipient email)
app.get('/api/notifications', async (req, res) => {
  try {
    const email = getUserEmail(req) || req.query.email;
    const query = email
      ? { $or: [{ recipientEmails: { $size: 0 } }, { recipientEmails: email.toLowerCase() }] }
      : {};
    const notifs = await Notification.find(query).sort({ timestamp: -1 }).limit(60).lean();
    const formatted = notifs.map(({ _id, __v, ...rest }) => ({
      ...rest,
      id: _id.toString(),
      timestamp: rest.timestamp instanceof Date ? rest.timestamp.toISOString() : rest.timestamp,
    }));
    res.json({ success: true, notifications: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST Notification
app.post('/api/notifications', async (req, res) => {
  try {
    // Normalise recipientEmails to lowercase so the GET query matches correctly
    const body = {
      ...req.body,
      recipientEmails: (req.body.recipientEmails ?? []).map((e) => String(e).toLowerCase()),
    };
    const notif = new Notification(body);
    const saved = await notif.save();
    const { _id, __v, ...rest } = saved.toObject();
    res.json({
      success: true,
      notification: {
        ...rest,
        id: _id.toString(),
        timestamp: rest.timestamp instanceof Date ? rest.timestamp.toISOString() : rest.timestamp,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── Generic email relay endpoint ─────────────────────────────────────────────
// Called by Vercel server actions so ALL emails go through Render's stable IP.
// POST /api/email  { to, subject, htmlContent }
app.post('/api/email', async (req, res) => {
  try {
    const { to, subject, htmlContent } = req.body;
    if (!to || !subject || !htmlContent) {
      return res.status(400).json({ success: false, error: 'to, subject, htmlContent are required' });
    }
    const recipients = Array.isArray(to) ? to : [{ email: String(to) }];
    const result = await sendBrevoEmail({ to: recipients, subject, html: htmlContent });
    if (!result.ok) {
      console.error('[/api/email] Brevo rejected the request:', result.brevoError);
      return res.status(502).json({ success: false, error: result.brevoError ?? 'Brevo send failed' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── Webhook CRUD ─────────────────────────────────────────────────────────────

const crypto = require('crypto');

function generateWebhookToken() {
  return crypto.randomBytes(24).toString('hex'); // 48-char hex token
}

// Helper: post a bot message to a channel via Socket.IO + MongoDB
async function postBotMessage(channelId, text) {
  const msg = new Message({
    channelId,
    sender:   'EduTechExOS Bot',
    initials: 'EB',
    color:    '#4f46e5',
    text,
    timestamp: new Date(),
  });
  const saved = await msg.save();
  const { _id, __v, ...rest } = saved.toObject();
  const payload = {
    ...rest,
    id: _id.toString(),
    timestamp: rest.timestamp instanceof Date ? rest.timestamp.toISOString() : rest.timestamp,
  };
  io.to(channelId).emit('new_message', { channelId, message: payload });
  return payload;
}

// GET /api/webhooks — list all webhooks
app.get('/api/webhooks', authMiddleware, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const hooks = await Webhook.find({}).sort({ createdAt: -1 }).lean();
    const formatted = hooks.map(({ _id, __v, ...rest }) => ({
      ...rest,
      id: _id.toString(),
      createdAt: rest.createdAt instanceof Date ? rest.createdAt.toISOString() : rest.createdAt,
      lastUsed:  rest.lastUsed  instanceof Date ? rest.lastUsed.toISOString()  : rest.lastUsed,
    }));
    res.json({ success: true, webhooks: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/webhooks — create a new webhook
app.post('/api/webhooks', authMiddleware, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const { name, channelId, type, secret } = req.body;
    if (!name || !channelId || !type) {
      return res.status(400).json({ success: false, error: 'name, channelId, and type are required' });
    }
    const token = generateWebhookToken();
    const hook = new Webhook({ name, channelId, type, token, secret: secret || '' });
    const saved = await hook.save();
    const { _id, __v, ...rest } = saved.toObject();
    res.json({
      success: true,
      webhook: {
        ...rest,
        id: _id.toString(),
        createdAt: rest.createdAt instanceof Date ? rest.createdAt.toISOString() : rest.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PATCH /api/webhooks/:id — toggle active / update name
app.patch('/api/webhooks/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const { id } = req.params;
    const updates = {};
    if (req.body.active  !== undefined) updates.active  = req.body.active;
    if (req.body.name    !== undefined) updates.name    = req.body.name;
    if (req.body.secret  !== undefined) updates.secret  = req.body.secret;
    const updated = await Webhook.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
    if (!updated) return res.status(404).json({ success: false, error: 'Webhook not found' });
    const { _id, __v, ...rest } = updated;
    res.json({
      success: true,
      webhook: {
        ...rest,
        id: _id.toString(),
        createdAt: rest.createdAt instanceof Date ? rest.createdAt.toISOString() : rest.createdAt,
        lastUsed:  rest.lastUsed  instanceof Date ? rest.lastUsed.toISOString()  : rest.lastUsed,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/webhooks/:id
app.delete('/api/webhooks/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    await Webhook.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── Webhook Receivers ────────────────────────────────────────────────────────

// POST /webhook/github/:token  — receives GitHub events
app.post('/webhook/github/:token', express.json({ type: '*/*' }), async (req, res) => {
  try {
    const hook = await Webhook.findOne({ token: req.params.token, type: 'github', active: true }).lean();
    if (!hook) return res.status(404).json({ error: 'Webhook not found or inactive' });

    // Optionally verify HMAC signature
    if (hook.secret) {
      const sig = req.headers['x-hub-signature-256'];
      const expected = 'sha256=' + crypto.createHmac('sha256', hook.secret).update(JSON.stringify(req.body)).digest('hex');
      if (sig !== expected) return res.status(401).json({ error: 'Invalid signature' });
    }

    const event   = req.headers['x-github-event'] || 'push';
    const payload = req.body;
    let text = '';

    if (event === 'push') {
      const repo    = payload.repository?.full_name ?? 'repo';
      const branch  = (payload.ref || '').replace('refs/heads/', '');
      const pusher  = payload.pusher?.name ?? 'someone';
      const commits = (payload.commits || []).length;
      const msg     = payload.head_commit?.message?.split('\n')[0] ?? '';
      text = `🔀 **[${repo}]** ${pusher} pushed ${commits} commit${commits !== 1 ? 's' : ''} to \`${branch}\`${msg ? `: "${msg}"` : ''}`;
    } else if (event === 'pull_request') {
      const pr     = payload.pull_request;
      const action = payload.action;
      const repo   = payload.repository?.full_name ?? 'repo';
      text = `🔁 **[${repo}]** PR #${pr?.number} **${action}**: "${pr?.title}" by ${pr?.user?.login ?? 'someone'} → ${pr?.html_url}`;
    } else if (event === 'issues') {
      const issue  = payload.issue;
      const action = payload.action;
      const repo   = payload.repository?.full_name ?? 'repo';
      text = `🐛 **[${repo}]** Issue #${issue?.number} **${action}**: "${issue?.title}" → ${issue?.html_url}`;
    } else if (event === 'release') {
      const release = payload.release;
      const repo    = payload.repository?.full_name ?? 'repo';
      text = `🚀 **[${repo}]** Release **${release?.tag_name}** published: "${release?.name}" → ${release?.html_url}`;
    } else {
      text = `⚡ **GitHub** event \`${event}\` received from ${payload.repository?.full_name ?? 'unknown repo'}`;
    }

    await Webhook.findByIdAndUpdate(hook._id, { lastUsed: new Date() });
    await postBotMessage(hook.channelId, text);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[webhook/github]', err);
    res.status(500).json({ error: String(err) });
  }
});

// POST /webhook/incoming/:token  — generic receiver (Zapier, Make, IFTTT, etc.)
// Expects JSON body: { text: string, title?: string, color?: string }
app.post('/webhook/incoming/:token', express.json({ type: '*/*' }), async (req, res) => {
  try {
    const hook = await Webhook.findOne({ token: req.params.token, type: 'generic', active: true }).lean();
    if (!hook) return res.status(404).json({ error: 'Webhook not found or inactive' });

    const { text, title } = req.body;
    if (!text) return res.status(400).json({ error: '`text` field is required in payload' });

    const message = title ? `**${title}**\n${text}` : text;
    await Webhook.findByIdAndUpdate(hook._id, { lastUsed: new Date() });
    await postBotMessage(hook.channelId, message);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[webhook/incoming]', err);
    res.status(500).json({ error: String(err) });
  }
});

// ─── User Settings ────────────────────────────────────────────────────────────

const SETTINGS_FIELDS = [
  'displayName', 'avatarEmoji', 'status', 'meetLink',
  'emailNotifications', 'desktopNotifications', 'soundNotifications',
  'compactChat', 'fontSize', 'enterToSend', 'darkMode',
];

// GET /api/settings — load current user's settings
app.get('/api/settings', authMiddleware, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    const doc = await UserSettings.findOne({ email: req.user.email.toLowerCase() }).lean();
    res.json({ success: true, settings: doc || null });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/settings — upsert current user's settings
app.put('/api/settings', authMiddleware, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    const email = req.user.email.toLowerCase();
    const updateFields = {};
    SETTINGS_FIELDS.forEach((key) => { if (req.body[key] !== undefined) updateFields[key] = req.body[key]; });
    const doc = await UserSettings.findOneAndUpdate(
      { email },
      { $set: updateFields },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    res.json({ success: true, settings: doc });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── Pinned Messages ──────────────────────────────────────────────────────────

// GET /api/pinned — all pinned message IDs grouped by channel
app.get('/api/pinned', authMiddleware, async (req, res) => {
  try {
    const pins = await PinnedMessage.find({}).sort({ pinnedAt: 1 }).lean();
    const grouped = {};
    pins.forEach((p) => {
      if (!grouped[p.channelId]) grouped[p.channelId] = [];
      if (!grouped[p.channelId].includes(p.messageId)) grouped[p.channelId].push(p.messageId);
    });
    res.json({ success: true, pinnedMessageIds: grouped });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/pinned — pin a message
app.post('/api/pinned', authMiddleware, async (req, res) => {
  try {
    const { channelId, messageId } = req.body;
    if (!channelId || !messageId) {
      return res.status(400).json({ success: false, error: 'channelId and messageId are required.' });
    }
    const pinnedBy = req.user?.email || 'unknown';
    await PinnedMessage.findOneAndUpdate(
      { channelId, messageId },
      { $setOnInsert: { channelId, messageId, pinnedBy, pinnedAt: new Date() } },
      { upsert: true }
    );
    // Broadcast so all clients show the pin in real-time
    io.emit('message_pinned', { channelId, messageId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/pinned/:channelId/:messageId — unpin a message
app.delete('/api/pinned/:channelId/:messageId', authMiddleware, async (req, res) => {
  try {
    const { channelId, messageId } = req.params;
    await PinnedMessage.deleteOne({ channelId, messageId });
    io.emit('message_unpinned', { channelId, messageId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── Workspace Channels ───────────────────────────────────────────────────────

// GET /api/channels — returns all workspace channels (seeds defaults if empty)
app.get('/api/channels', authMiddleware, async (req, res) => {
  try {
    let channels = await WorkspaceChannel.find({}).sort({ order: 1 }).lean();
    if (channels.length === 0) {
      await WorkspaceChannel.insertMany(DEFAULT_WORKSPACE_CHANNELS);
      channels = DEFAULT_WORKSPACE_CHANNELS;
    }
    const formatted = channels.map(({ _id, __v, createdAt, updatedAt, ...rest }) => ({
      ...rest,
      id: _id,
      createdAt: createdAt instanceof Date ? createdAt.toISOString() : createdAt,
    }));
    res.json({ success: true, channels: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/channels — admin creates a new workspace channel
app.post('/api/channels', authMiddleware, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'name is required.' });
    const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const exists = await WorkspaceChannel.findById(id).lean();
    if (exists) return res.status(409).json({ success: false, error: 'A channel with this name already exists.' });
    const count = await WorkspaceChannel.countDocuments();
    const channel = new WorkspaceChannel({
      _id: id, name: id, description: description || '',
      isDefault: false, createdBy: req.user.email, order: count,
    });
    const saved = await channel.save();
    const { _id, __v, ...rest } = saved.toObject();
    io.emit('channel_created', { ...rest, id: _id });
    res.json({ success: true, channel: { ...rest, id: _id } });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PATCH /api/channels/:id — update channel name/description (admin only)
app.patch('/api/channels/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Only admins can edit channels.' });
    }
    const updates = {};
    if (req.body.name)        updates.name        = req.body.name;
    if (req.body.description !== undefined) updates.description = req.body.description;
    const updated = await WorkspaceChannel.findByIdAndUpdate(
      req.params.id, { $set: updates }, { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ success: false, error: 'Channel not found.' });
    const { _id, __v, ...rest } = updated;
    res.json({ success: true, channel: { ...rest, id: _id } });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/channels/:id — delete a non-default channel (admin only)
app.delete('/api/channels/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Only admins can delete channels.' });
    }
    const channel = await WorkspaceChannel.findById(req.params.id).lean();
    if (!channel) return res.status(404).json({ success: false, error: 'Channel not found.' });
    if (channel.isDefault) return res.status(400).json({ success: false, error: 'Default channels cannot be deleted.' });
    await WorkspaceChannel.findByIdAndDelete(req.params.id);
    io.emit('channel_deleted', { channelId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ── Global error handler (logs to console + Sentry if configured) ─────────────
app.use((err, req, res, next) => {
  console.error('[server error]', err);
  // Forward to Sentry if DSN is configured
  if (process.env.SENTRY_DSN) {
    try {
      const Sentry = require('@sentry/node');
      Sentry.captureException(err, { extra: { url: req.url, method: req.method } });
    } catch (_) {}
  }
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Start Server
const PORT = process.env.PORT || 10002;
httpServer.listen(PORT, () => {
  console.log(`Backend Server running on port ${PORT}`);

  // Ping /health every 14 min to prevent Render free tier from sleeping.
  // Uses https.get (Node 16 safe) rather than the global fetch (Node 18+).
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
