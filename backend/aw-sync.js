/**
 * aw-sync.js — ActivityWatch → EduTechExOS bridge
 *
 * Run this on each team member's machine (where ActivityWatch is installed).
 * It reads ActivityWatch's local REST API every 5 minutes and pushes a summary
 * to the EduTechExOS backend so admins can see live desktop activity.
 *
 * Usage:
 *   node aw-sync.js --email you@edutechex.in --password yourpassword
 *
 * Or set environment variables:
 *   AW_EMAIL=you@edutechex.in AW_PASSWORD=yourpassword node aw-sync.js
 *
 * Optional:
 *   --api   https://edutechexos-backend.onrender.com  (default)
 *   --aw    http://localhost:5600                      (default)
 *   --interval 5                                       (minutes, default 5)
 */

const https  = require('https');
const http   = require('http');
const url    = require('url');

// ── Config ────────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const getArg  = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };

const EMAIL    = getArg('--email')    || process.env.AW_EMAIL    || '';
const PASSWORD = getArg('--password') || process.env.AW_PASSWORD || '';
const API_BASE = getArg('--api')      || process.env.AW_API_BASE || 'https://edutechexos-backend.onrender.com';
const AW_BASE  = getArg('--aw')       || process.env.AW_BASE     || 'http://localhost:5600';
const INTERVAL = parseInt(getArg('--interval') || process.env.AW_INTERVAL || '5', 10);

if (!EMAIL || !PASSWORD) {
  console.error('Error: --email and --password are required.');
  console.error('Usage: node aw-sync.js --email you@example.com --password secret');
  process.exit(1);
}

let authToken = null;

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function request(baseUrl, path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed  = new url.URL(baseUrl + path);
    const isHttps = parsed.protocol === 'https:';
    const lib     = isHttps ? https : http;
    const opts    = {
      hostname: parsed.hostname,
      port:     parsed.port || (isHttps ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method,
      headers:  { 'Content-Type': 'application/json', ...headers },
      timeout:  15000,
    };
    if (body) {
      const raw = JSON.stringify(body);
      opts.headers['Content-Length'] = Buffer.byteLength(raw);
    }
    const req = lib.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ── Auth ──────────────────────────────────────────────────────────────────────
async function login() {
  console.log(`[auth] Logging in as ${EMAIL}…`);
  const res = await request(API_BASE, '/api/auth/login', 'POST', { email: EMAIL, password: PASSWORD });
  if (res.status === 200 && res.body?.token) {
    authToken = res.body.token;
    console.log('[auth] Login successful.');
    return true;
  }
  console.error('[auth] Login failed:', res.body?.error || res.status);
  return false;
}

// ── ActivityWatch queries ─────────────────────────────────────────────────────
async function getAWBuckets() {
  const res = await request(AW_BASE, '/api/0/buckets/');
  return res.status === 200 ? res.body : {};
}

async function queryEvents(bucketId, start, end) {
  const res = await request(AW_BASE, `/api/0/buckets/${encodeURIComponent(bucketId)}/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&limit=1000`);
  return res.status === 200 && Array.isArray(res.body) ? res.body : [];
}

async function getCurrentWindow(bucketId) {
  const res = await request(AW_BASE, `/api/0/buckets/${encodeURIComponent(bucketId)}/events?limit=1`);
  return res.status === 200 && Array.isArray(res.body) && res.body.length > 0 ? res.body[0] : null;
}

// ── Build today's summary ─────────────────────────────────────────────────────
async function buildSummary() {
  const buckets = await getAWBuckets();
  const keys    = Object.keys(buckets);

  // Find the right buckets by type
  const windowBucket = keys.find((k) => buckets[k].type === 'currentwindow' || k.includes('aw-watcher-window'));
  const afkBucket    = keys.find((k) => buckets[k].type === 'afkstatus'     || k.includes('aw-watcher-afk'));

  if (!windowBucket) {
    console.warn('[aw] No window-watcher bucket found. Is ActivityWatch running?');
    return null;
  }

  // Today's date range (local midnight to now)
  const now        = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay   = now.toISOString();

  // Current window (most recent event)
  const currentEvent = await getCurrentWindow(windowBucket);
  const currentApp   = currentEvent?.data?.app   || currentEvent?.data?.title || '';
  const currentTitle = currentEvent?.data?.title  || '';

  // Today's window events → app breakdown
  const windowEvents = await queryEvents(windowBucket, startOfDay, endOfDay);
  const appMinutes   = {};
  let totalActiveSec = 0;

  for (const ev of windowEvents) {
    const dur = ev.duration || 0;
    const app = ev.data?.app || ev.data?.title || 'Unknown';
    appMinutes[app] = (appMinutes[app] || 0) + dur;
    totalActiveSec += dur;
  }

  const appBreakdown = Object.entries(appMinutes)
    .map(([app, secs]) => ({ app, minutes: Math.round(secs / 60) }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 15);

  // AFK data
  let isAfk           = false;
  let totalAfkSec     = 0;
  let totalActiveSec2 = totalActiveSec;

  if (afkBucket) {
    const afkEvents = await queryEvents(afkBucket, startOfDay, endOfDay);
    const latestAfk = afkEvents[0];
    isAfk = latestAfk?.data?.status === 'afk';

    for (const ev of afkEvents) {
      if (ev.data?.status === 'afk') totalAfkSec += (ev.duration || 0);
      else totalActiveSec2 = Math.max(totalActiveSec2, totalActiveSec);
    }
  }

  return {
    currentApp,
    currentTitle,
    isAfk,
    totalActiveMinutes: Math.round(totalActiveSec / 60),
    totalAfkMinutes:    Math.round(totalAfkSec / 60),
    appBreakdown,
  };
}

// ── Sync loop ─────────────────────────────────────────────────────────────────
async function sync() {
  try {
    const summary = await buildSummary();
    if (!summary) return;

    const res = await request(
      API_BASE,
      '/api/activity/aw-sync',
      'POST',
      summary,
      { Authorization: `Bearer ${authToken}` }
    );

    if (res.status === 401) {
      console.warn('[sync] Token expired — re-logging in…');
      const ok = await login();
      if (ok) await sync();
      return;
    }

    if (res.body?.success) {
      const ts = new Date().toLocaleTimeString();
      console.log(`[sync] ${ts} — app: ${summary.currentApp || '(none)'} | active: ${summary.totalActiveMinutes}m | afk: ${summary.isAfk ? 'yes' : 'no'}`);
    } else {
      console.error('[sync] Server error:', res.body?.error || res.status);
    }
  } catch (err) {
    console.error('[sync] Error:', err.message);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  const ok = await login();
  if (!ok) process.exit(1);

  console.log(`[aw-sync] Started. Syncing every ${INTERVAL} minute(s). Press Ctrl+C to stop.`);

  await sync(); // run immediately on start

  setInterval(sync, INTERVAL * 60 * 1000);
})();
