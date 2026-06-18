#!/usr/bin/env node
/**
 * aw-sync.js — EduTechExOS × ActivityWatch bridge
 *
 * Reads today's activity from your local ActivityWatch instance
 * (localhost:5600) and syncs it to the EduTechExOS backend every 5 minutes.
 *
 * SETUP (one time per team member):
 *   1. Install ActivityWatch from https://activitywatch.net
 *   2. Run ActivityWatch — it sits in your system tray
 *   3. Set your login token below (copy from browser → F12 → Application →
 *      Local Storage → edutechex_token → token value)
 *   4. node aw-sync.js
 *      (or: set it to auto-start with Windows Task Scheduler / Mac launchd)
 *
 * ENV VARS (optional, override the values below):
 *   EDUTECHEX_TOKEN   — your JWT from EduTechExOS login
 *   EDUTECHEX_BACKEND — backend URL (default: Render URL)
 *   AW_BASE           — ActivityWatch base URL (default: http://localhost:5600)
 *   SYNC_INTERVAL_MS  — how often to sync in ms (default: 300000 = 5 min)
 */

const TOKEN    = process.env.EDUTECHEX_TOKEN    || 'PASTE_YOUR_TOKEN_HERE';
const BACKEND  = process.env.EDUTECHEX_BACKEND  || 'https://edutechexos-backend.onrender.com';
const AW_BASE  = process.env.AW_BASE            || 'http://localhost:5600/api/0';
const INTERVAL = parseInt(process.env.SYNC_INTERVAL_MS || '300000', 10); // 5 min

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function awFetch(path) {
  const res = await fetch(`${AW_BASE}${path}`);
  if (!res.ok) throw new Error(`AW ${path} → ${res.status}`);
  return res.json();
}

function todayISO() {
  // Returns today's date range in ISO8601 (local midnight → now)
  const now  = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const end   = now.toISOString();
  return { start, end };
}

async function fetchEvents(bucketId, start, end) {
  try {
    const url = `/buckets/${encodeURIComponent(bucketId)}/events?start=${start}&end=${end}&limit=10000`;
    return await awFetch(url);
  } catch {
    return [];
  }
}

// ─── Main sync ────────────────────────────────────────────────────────────────

async function sync() {
  try {
    // 1. Discover buckets
    const buckets = await awFetch('/buckets');
    const bucketIds = Object.keys(buckets);

    const windowBucketId = bucketIds.find(id => id.startsWith('aw-watcher-window'));
    const afkBucketId    = bucketIds.find(id => id.startsWith('aw-watcher-afk'));
    const webBucketId    = bucketIds.find(id => id.includes('web') || id.startsWith('aw-watcher-web'));

    if (!windowBucketId) {
      console.warn('[aw-sync] No window watcher bucket found. Is ActivityWatch running?');
      return;
    }

    // 2. Fetch today's events
    const { start, end } = todayISO();
    const [windowEvents, afkEvents, webEvents] = await Promise.all([
      fetchEvents(windowBucketId, start, end),
      afkBucketId ? fetchEvents(afkBucketId, start, end) : [],
      webBucketId ? fetchEvents(webBucketId, start, end) : [],
    ]);

    // 3. Build per-app time breakdown (in minutes, rounded)
    const appMinutes = {};
    for (const ev of windowEvents) {
      const app     = ev.data?.app || ev.data?.title || 'Unknown';
      const minutes = (ev.duration || 0) / 60;
      appMinutes[app] = (appMinutes[app] || 0) + minutes;
    }

    // Add website time under the browser app name
    for (const ev of webEvents) {
      const site    = ev.data?.url ? new URL(ev.data.url).hostname.replace('www.', '') : 'browser';
      const minutes = (ev.duration || 0) / 60;
      appMinutes[`🌐 ${site}`] = (appMinutes[`🌐 ${site}`] || 0) + minutes;
    }

    // 4. Calculate AFK time
    let totalAfkMinutes = 0;
    let isAfk = false;
    for (const ev of afkEvents) {
      if (ev.data?.status === 'afk') {
        totalAfkMinutes += (ev.duration || 0) / 60;
      }
    }
    // Last AFK event tells us current status
    const lastAfk = afkEvents[afkEvents.length - 1];
    if (lastAfk && lastAfk.data?.status === 'afk') isAfk = true;

    // 5. Total active = sum of window time minus AFK time
    const rawTotal = Object.values(appMinutes).reduce((s, v) => s + v, 0);
    const totalActiveMinutes = Math.max(0, Math.round(rawTotal - totalAfkMinutes));

    // 6. Current app / window title (most recent window event)
    const lastWindow = windowEvents[windowEvents.length - 1];
    const currentApp   = lastWindow?.data?.app   || '';
    const currentTitle = lastWindow?.data?.title || '';

    // 7. App breakdown — top 15 by time, rounded to 1 decimal minute
    const appBreakdown = Object.entries(appMinutes)
      .map(([app, minutes]) => ({ app, minutes: Math.round(minutes * 10) / 10 }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 15);

    // 8. POST to backend
    const payload = {
      currentApp,
      currentTitle,
      isAfk,
      totalActiveMinutes,
      totalAfkMinutes: Math.round(totalAfkMinutes),
      appBreakdown,
    };

    const res = await fetch(`${BACKEND}/api/activity/aw-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[aw-sync] Backend error ${res.status}:`, err);
      return;
    }

    const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    console.log(`[aw-sync] ✓ Synced at ${now} — ${currentApp || 'idle'} — active ${totalActiveMinutes}m, afk ${Math.round(totalAfkMinutes)}m`);

  } catch (err) {
    console.error('[aw-sync] Error:', err.message);
  }
}

// ─── Start ────────────────────────────────────────────────────────────────────

if (TOKEN === 'PASTE_YOUR_TOKEN_HERE') {
  console.error(`
  ╔══════════════════════════════════════════════════════╗
  ║  ERROR: No token set.                                ║
  ║                                                      ║
  ║  1. Log in to EduTechExOS in your browser            ║
  ║  2. Press F12 → Application → Local Storage          ║
  ║  3. Click the EduTechExOS entry                      ║
  ║  4. Find "edutechex_token" → copy the "token" value  ║
  ║  5. Paste it in aw-sync.js where it says             ║
  ║     PASTE_YOUR_TOKEN_HERE                            ║
  ╚══════════════════════════════════════════════════════╝
  `);
  process.exit(1);
}

console.log(`[aw-sync] Starting — syncing to ${BACKEND} every ${INTERVAL / 1000}s`);
sync(); // run immediately on start
setInterval(sync, INTERVAL);
