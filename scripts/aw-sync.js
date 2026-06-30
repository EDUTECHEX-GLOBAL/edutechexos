#!/usr/bin/env node
/**
 * aw-sync.js — EduTechExOS × ActivityWatch bridge
 *
 * ONE-TIME SETUP:
 *   1. Install ActivityWatch from https://activitywatch.net  (runs in system tray)
 *   2. node aw-sync.js          ← run this once; it stays running in the background
 *      (or add it to Windows Task Scheduler / Mac launchd to auto-start on boot)
 *
 * HOW IT WORKS:
 *   - The script listens on localhost:7891 for signals from EduTechExOS
 *   - When you LOG IN  to EduTechExOS → syncing starts automatically
 *   - When you LOG OUT of EduTechExOS → syncing stops automatically
 *   - Every day: login activates it, logout stops it — no token management needed
 *
 * ENV VARS (optional):
 *   EDUTECHEX_BACKEND — backend URL   (default: Render URL)
 *   AW_BASE           — ActivityWatch (default: http://localhost:5600/api/0)
 *   SYNC_INTERVAL_MS  — sync interval (default: 300000 = 5 min)
 *   AW_SYNC_PORT      — local control port (default: 7891)
 */

const http     = require('http');
const BACKEND  = process.env.EDUTECHEX_BACKEND  || 'https://edutechexos-ueoq.onrender.com';
const AW_BASE  = process.env.AW_BASE            || 'http://localhost:5600/api/0';
const INTERVAL = parseInt(process.env.SYNC_INTERVAL_MS || '300000', 10);
const PORT     = parseInt(process.env.AW_SYNC_PORT     || '7891',   10);

// ─── State ────────────────────────────────────────────────────────────────────

let currentToken  = null;   // set on /activate, cleared on /deactivate
let syncTimer     = null;   // setInterval handle

// ─── AW helpers ───────────────────────────────────────────────────────────────

async function awFetch(path) {
  const res = await fetch(`${AW_BASE}${path}`);
  if (!res.ok) throw new Error(`AW ${path} → ${res.status}`);
  return res.json();
}

async function fetchEvents(bucketId, start, end) {
  try {
    return await awFetch(`/buckets/${encodeURIComponent(bucketId)}/events?start=${start}&end=${end}&limit=10000`);
  } catch { return []; }
}

// ─── Main sync ────────────────────────────────────────────────────────────────

async function sync() {
  if (!currentToken) return;

  try {
    const buckets   = await awFetch('/buckets');
    const bucketIds = Object.keys(buckets);

    const windowId = bucketIds.find(id => id.startsWith('aw-watcher-window'));
    const afkId    = bucketIds.find(id => id.startsWith('aw-watcher-afk'));
    const webId    = bucketIds.find(id => id.includes('web') || id.startsWith('aw-watcher-web'));

    if (!windowId) {
      console.warn('[aw-sync] No window watcher bucket — is ActivityWatch running?');
      return;
    }

    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const end   = now.toISOString();

    const [windowEvents, afkEvents, webEvents] = await Promise.all([
      fetchEvents(windowId, start, end),
      afkId ? fetchEvents(afkId, start, end) : Promise.resolve([]),
      webId ? fetchEvents(webId, start, end) : Promise.resolve([]),
    ]);

    // App time breakdown
    const appMinutes = {};
    for (const ev of windowEvents) {
      const app = ev.data?.app || ev.data?.title || 'Unknown';
      appMinutes[app] = (appMinutes[app] || 0) + (ev.duration || 0) / 60;
    }
    for (const ev of webEvents) {
      try {
        const site = new URL(ev.data?.url || '').hostname.replace('www.', '');
        appMinutes[`🌐 ${site}`] = (appMinutes[`🌐 ${site}`] || 0) + (ev.duration || 0) / 60;
      } catch { /* bad URL */ }
    }

    // AFK
    let totalAfkMinutes = 0;
    let isAfk = false;
    for (const ev of afkEvents) {
      if (ev.data?.status === 'afk') totalAfkMinutes += (ev.duration || 0) / 60;
    }
    const lastAfk = afkEvents[afkEvents.length - 1];
    if (lastAfk?.data?.status === 'afk') isAfk = true;

    const rawTotal          = Object.values(appMinutes).reduce((s, v) => s + v, 0);
    const totalActiveMinutes = Math.max(0, Math.round(rawTotal - totalAfkMinutes));
    const lastWindow        = windowEvents[windowEvents.length - 1];
    const currentApp        = lastWindow?.data?.app   || '';
    const currentTitle      = lastWindow?.data?.title || '';

    const appBreakdown = Object.entries(appMinutes)
      .map(([app, minutes]) => ({ app, minutes: Math.round(minutes * 10) / 10 }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 15);

    // IST date string so backend stores under the right local date
    const istOffset = 5.5 * 60 * 60 * 1000;
    const dateStr   = new Date(now.getTime() + istOffset).toISOString().slice(0, 10);

    const res = await fetch(`${BACKEND}/api/activity/aw-sync`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentToken}` },
      body:    JSON.stringify({ dateStr, currentApp, currentTitle, isAfk, totalActiveMinutes, totalAfkMinutes: Math.round(totalAfkMinutes), appBreakdown }),
    });

    if (res.status === 401) {
      console.warn('[aw-sync] Token expired — waiting for next login to re-activate.');
      stopSync();
      return;
    }
    if (!res.ok) {
      console.error(`[aw-sync] Backend error ${res.status}:`, await res.text());
      return;
    }

    const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    console.log(`[aw-sync] ✓ ${time} — ${currentApp || 'idle'} — active ${totalActiveMinutes}m, afk ${Math.round(totalAfkMinutes)}m`);

  } catch (err) {
    console.error('[aw-sync] Sync error:', err.message);
  }
}

// ─── Activate / deactivate ────────────────────────────────────────────────────

function startSync(token) {
  currentToken = token;
  if (syncTimer) clearInterval(syncTimer);
  console.log('[aw-sync] ▶ Activated — syncing every', INTERVAL / 1000, 's');
  sync(); // immediate first sync
  syncTimer = setInterval(sync, INTERVAL);
}

function stopSync() {
  currentToken = null;
  if (syncTimer) { clearInterval(syncTimer); syncTimer = null; }
  console.log('[aw-sync] ⏹ Deactivated — waiting for next login.');
}

// ─── Local control server ─────────────────────────────────────────────────────
// The EduTechExOS browser app calls these on login / logout.

const ALLOWED_ORIGINS = [
  'https://edutechexos.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
];

const server = http.createServer((req, res) => {
  const origin = req.headers.origin || '';
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'POST' && req.url === '/activate') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const { token } = JSON.parse(body);
        if (!token) { res.writeHead(400); res.end('missing token'); return; }
        startSync(token);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400); res.end('bad json');
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/deactivate') {
    stopSync();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ active: !!currentToken, backend: BACKEND }));
    return;
  }

  res.writeHead(404); res.end('not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`
  ╔══════════════════════════════════════════════════════════════╗
  ║   EduTechExOS × ActivityWatch Sync                          ║
  ║   Control server listening on localhost:${PORT}               ║
  ║                                                              ║
  ║   • Log in  to EduTechExOS → syncing starts automatically   ║
  ║   • Log out of EduTechExOS → syncing stops automatically    ║
  ║                                                              ║
  ║   Keep this window open (or add to startup programs).        ║
  ╚══════════════════════════════════════════════════════════════╝
  `);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[aw-sync] Port ${PORT} is already in use — another instance may be running.`);
    process.exit(1);
  }
  throw err;
});
