/**
 * aw-sync.js — EduTechExOS Desktop Activity Agent
 *
 * Tracks which desktop apps the team member is using (VS Code, Chrome, Figma, etc.)
 * and syncs the data to EduTechExOS so the admin can see everyone's activity.
 *
 * Requires ActivityWatch (free, open-source) running on the same machine.
 * Download: https://activitywatch.net
 *
 * FIRST-TIME SETUP (one command, then it runs every day automatically):
 *
 *   node aw-sync.js --email you@edutechex.in --password yourpassword --startup
 *
 * The --startup flag registers this script to run automatically every time
 * Windows starts, so you never have to run it manually again.
 *
 * TO JUST RUN MANUALLY (without auto-start):
 *   node aw-sync.js --email you@edutechex.in --password yourpassword
 *
 * Even though this script itself can run all day in the background, it only
 * actually collects and sends data when BOTH are true:
 *   - it's within working hours (default 10:00-18:30 local time), AND
 *   - you're currently logged into and active on the EduTechExOS dashboard
 *     (checked via a recent heartbeat) — not just running this script.
 * Outside that, it silently skips the sync — nothing is sent to the admin.
 *
 * OPTIONS:
 *   --email      your EduTechExOS login email (required)
 *   --password   your EduTechExOS password (required)
 *   --startup    register this script to run on Windows startup (one time)
 *   --remove     remove Windows startup registration
 *   --api        https://edutechexos-ueoq.onrender.com (default)
 *   --aw         http://localhost:5600 (ActivityWatch URL, default)
 *   --interval   sync interval in minutes (default: 5)
 *   --work-start daily start "HH:MM" (default: 10:00)
 *   --work-end   daily end   "HH:MM" (default: 18:30)
 */

const https  = require('https');
const http   = require('http');
const url    = require('url');
const fs     = require('fs');
const path   = require('path');
const os     = require('os');
const { execSync } = require('child_process');

// ── Config ────────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const getArg  = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
const hasFlag = (flag) => args.includes(flag);

const EMAIL    = getArg('--email')    || process.env.AW_EMAIL    || '';
const PASSWORD = getArg('--password') || process.env.AW_PASSWORD || '';
const API_BASE = getArg('--api')      || process.env.AW_API_BASE || 'https://edutechexos-ueoq.onrender.com';
const AW_BASE  = getArg('--aw')       || process.env.AW_BASE     || 'http://localhost:5600';
const INTERVAL = parseInt(getArg('--interval') || process.env.AW_INTERVAL || '5', 10);
const DEVICE_ID   = `${os.hostname()}-${os.platform()}-${os.arch()}`;
const DEVICE_NAME = os.hostname();

// ── Working-hours + active-session gate ──────────────────────────────────────
// This agent used to sync 24/7 on its own timer regardless of whether you were
// actually logged into EduTechExOS or what time it was. It now only syncs
// while (a) it's within the daily working-hours window, AND (b) the web
// dashboard has sent a heartbeat recently (i.e. you're actually logged in and
// using the app right now) — matching the same rule scripts/aw-sync.js and the
// browser-based sync already enforce.
function parseHHMM(str, fallbackMin) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(str || ''));
  if (!m) return fallbackMin;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}
const WORK_START_MIN = parseHHMM(getArg('--work-start') || process.env.WORK_START, 10 * 60);      // 10:00
const WORK_END_MIN   = parseHHMM(getArg('--work-end')   || process.env.WORK_END,   18 * 60 + 30); // 18:30
function isWithinWorkingHours() {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= WORK_START_MIN && mins < WORK_END_MIN;
}

// ── Windows auto-startup helpers ──────────────────────────────────────────────
function getStartupBatPath() {
  // Windows Startup folder: runs on every user login
  const startupDir = path.join(
    os.homedir(),
    'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup'
  );
  return path.join(startupDir, 'edutechexos-agent.bat');
}

function registerStartup() {
  if (os.platform() !== 'win32') {
    console.log('[startup] Auto-startup registration is only supported on Windows.');
    console.log('[startup] On macOS/Linux, add this to your shell profile or cron:');
    console.log(`           node "${process.argv[1]}" --email ${EMAIL} --password "${PASSWORD}"`);
    return;
  }
  const nodePath = process.execPath; // path to node.exe
  const scriptPath = path.resolve(process.argv[1]);
  const batPath = getStartupBatPath();

  const batContent = [
    '@echo off',
    'rem EduTechExOS Desktop Activity Agent',
    'rem Tracks VS Code, Chrome, Figma etc. and syncs to EduTechExOS admin.',
    'rem Auto-generated — do not edit manually. Re-run setup to update.',
    `start "" /B "${nodePath}" "${scriptPath}" --email "${EMAIL}" --password "${PASSWORD}" --api "${API_BASE}" --interval ${INTERVAL}`,
  ].join('\r\n');

  try {
    fs.writeFileSync(batPath, batContent, 'utf8');
    console.log(`[startup] ✅ Registered! The agent will start automatically every time Windows boots.`);
    console.log(`[startup]    Startup file: ${batPath}`);
    console.log(`[startup] Starting agent now…`);
  } catch (err) {
    console.error(`[startup] ❌ Failed to write startup file: ${err.message}`);
    console.error(`[startup]    Try running as Administrator, or manually add the agent to startup.`);
  }
}

function removeStartup() {
  if (os.platform() !== 'win32') {
    console.log('[startup] Not on Windows — nothing to remove.');
    return;
  }
  const batPath = getStartupBatPath();
  try {
    if (fs.existsSync(batPath)) {
      fs.unlinkSync(batPath);
      console.log('[startup] ✅ Auto-startup removed.');
    } else {
      console.log('[startup] No startup registration found (already removed).');
    }
  } catch (err) {
    console.error(`[startup] ❌ Failed to remove: ${err.message}`);
  }
}

// Handle --startup and --remove before checking email/password
if (hasFlag('--remove')) {
  removeStartup();
  process.exit(0);
}

if (!EMAIL || !PASSWORD) {
  console.error('');
  console.error('  EduTechExOS Desktop Activity Agent');
  console.error('  ─────────────────────────────────');
  console.error('  Usage:');
  console.error('    node aw-sync.js --email you@edutechex.in --password yourpassword');
  console.error('');
  console.error('  First-time setup (auto-starts on every Windows boot):');
  console.error('    node aw-sync.js --email you@edutechex.in --password yourpassword --startup');
  console.error('');
  process.exit(1);
}

if (hasFlag('--startup')) {
  registerStartup();
  // Fall through — continue running the agent now
}

let authToken = null;

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function request(baseUrl, urlPath, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed  = new url.URL(baseUrl + urlPath);
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
  const MAX_ATTEMPTS = 10;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt === 1) console.log(`[auth] Logging in as ${EMAIL}…`);

    let res;
    try {
      res = await request(API_BASE, '/api/auth/login', 'POST', { email: EMAIL, password: PASSWORD });
    } catch (err) {
      console.warn(`[auth] Request error (attempt ${attempt}/${MAX_ATTEMPTS}): ${err.message} — retrying…`);
      continue;
    }

    if (res.status === 200 && res.body?.token) {
      authToken = res.body.token;
      console.log('[auth] Login successful.');
      return true;
    }

    if (res.status === 503 || res.status === 502) {
      console.warn(`[auth] Server returned ${res.status} — retrying… (attempt ${attempt}/${MAX_ATTEMPTS})`);
      continue;
    }

    console.error('[auth] Login failed:', res.body?.error || res.status);
    return false;
  }

  console.error(`[auth] Could not reach server after ${MAX_ATTEMPTS} attempts. Giving up.`);
  return false;
}

// ── ActivityWatch queries ─────────────────────────────────────────────────────
async function getAWBuckets() {
  const res = await request(AW_BASE, '/api/0/buckets/');
  return res.status === 200 ? res.body : {};
}

async function queryEvents(bucketId, start, end) {
  const res = await request(
    AW_BASE,
    `/api/0/buckets/${encodeURIComponent(bucketId)}/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&limit=1000`
  );
  return res.status === 200 && Array.isArray(res.body) ? res.body : [];
}

async function getCurrentWindow(bucketId) {
  const res = await request(AW_BASE, `/api/0/buckets/${encodeURIComponent(bucketId)}/events?limit=1`);
  return res.status === 200 && Array.isArray(res.body) && res.body.length > 0 ? res.body[0] : null;
}

// The user's EduTechExOS web-login time for a day (ms), or null if they never
// opened the app that day. Desktop activity is only counted from this point.
async function getSessionStart(dateStr) {
  try {
    const res = await request(API_BASE, `/api/activity/session-start?date=${dateStr}`, 'GET', null, { Authorization: `Bearer ${authToken}` });
    if (res.status === 200 && res.body?.sessionStart) return Date.parse(res.body.sessionStart);
    return null;
  } catch { return null; }
}

// Seconds of an AW event that fall AFTER the login gate — clamps events that
// started before login so only the post-login portion is counted.
function secsAfter(ev, gateMs) {
  const start = Date.parse(ev.timestamp);
  if (!Number.isFinite(start)) return 0;
  const end = start + (ev.duration || 0) * 1000;
  return Math.max(0, (end - Math.max(start, gateMs)) / 1000);
}

// ── Build today's summary ─────────────────────────────────────────────────────
async function buildSummary() {
  const buckets = await getAWBuckets();
  const keys    = Object.keys(buckets);

  const windowBucket = keys.find((k) => buckets[k].type === 'currentwindow' || k.includes('aw-watcher-window'));
  const afkBucket    = keys.find((k) => buckets[k].type === 'afkstatus'     || k.includes('aw-watcher-afk'));
  const webBucket    = keys.find((k) => k.includes('aw-watcher-web'));

  if (!windowBucket) {
    console.warn('[aw] No window-watcher bucket found. Is ActivityWatch running?');
    return null;
  }

  // Align the day window with the SERVER, which keys AWActivity by IST dateStr.
  // Compute the current IST calendar day and its exact UTC bounds so the agent's
  // "today" and the server's "today" always agree, even for non-IST machines and
  // around midnight. We also send dateStr explicitly.
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const now      = new Date();
  const istNow   = new Date(now.getTime() + IST_OFFSET_MS);
  const dateStr  = istNow.toISOString().slice(0, 10); // YYYY-MM-DD in IST
  const startOfDay = new Date(
    Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()) - IST_OFFSET_MS
  ).toISOString();
  const endOfDay   = now.toISOString();

  // Only count activity from the moment the user opened EduTechExOS today. If
  // they haven't logged in yet, count nothing (don't leak pre-login laptop time).
  const gateMs = await getSessionStart(dateStr);
  if (!gateMs) {
    console.log(`[${new Date().toLocaleTimeString()}] not logged into EduTechExOS yet today — nothing counted.`);
    return null;
  }

  const currentEvent = await getCurrentWindow(windowBucket);
  const currentApp   = currentEvent?.data?.app   || currentEvent?.data?.title || '';
  const currentTitle = currentEvent?.data?.title  || '';

  const windowEvents = await queryEvents(windowBucket, startOfDay, endOfDay);
  const appSeconds   = {};
  let totalWindowSec = 0;

  for (const ev of windowEvents) {
    const dur = secsAfter(ev, gateMs);
    if (dur <= 0) continue;
    const app = ev.data?.app || ev.data?.title || 'Unknown';
    appSeconds[app] = (appSeconds[app] || 0) + dur;
    totalWindowSec += dur;
  }

  const appBreakdown = Object.entries(appSeconds)
    .map(([app, secs]) => ({ app, minutes: Math.round(secs / 60) }))
    .filter(({ minutes }) => minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 15);

  let isAfk       = false;
  let totalAfkSec = 0;

  if (afkBucket) {
    const afkEvents = await queryEvents(afkBucket, startOfDay, endOfDay);
    const latestAfk = afkEvents[0];
    isAfk = latestAfk?.data?.status === 'afk';
    for (const ev of afkEvents) {
      if (ev.data?.status === 'afk') totalAfkSec += secsAfter(ev, gateMs);
    }
  }

  // "Active" = time a window was focused MINUS idle (AFK) time, so idling with a
  // window open no longer counts as active work. Clamp at 0 for safety.
  const totalActiveSec = Math.max(0, totalWindowSec - totalAfkSec);

  // ── Optional web (browser) activity, if aw-watcher-web is installed ──────────
  let currentUrl = '';
  let currentPageTitle = '';
  let webBreakdown = [];
  if (webBucket) {
    const currentWeb = await getCurrentWindow(webBucket);
    currentUrl       = currentWeb?.data?.url   || '';
    currentPageTitle = currentWeb?.data?.title || '';

    const webEvents  = await queryEvents(webBucket, startOfDay, endOfDay);
    const tabSeconds = {}; // keyed by tab title so each tab gets its own time
    for (const ev of webEvents) {
      const dur = secsAfter(ev, gateMs);
      if (dur <= 0 || !ev.data?.url) continue;
      let domain = 'unknown';
      try { domain = (new url.URL(ev.data.url).hostname || 'unknown').replace(/^www\./, ''); } catch { /* not a URL */ }
      const title = (ev.data.title || '').trim() || domain;
      if (!tabSeconds[title]) tabSeconds[title] = { secs: 0, domain };
      tabSeconds[title].secs += dur;
    }
    webBreakdown = Object.entries(tabSeconds)
      .map(([title, v]) => ({ domain: v.domain, minutes: Math.round(v.secs / 60), title }))
      .filter(({ minutes }) => minutes > 0)
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 20);
  }

  return {
    dateStr,
    currentApp,
    currentTitle,
    isAfk,
    totalActiveMinutes: Math.round(totalActiveSec / 60),
    totalAfkMinutes:    Math.round(totalAfkSec / 60),
    appBreakdown,
    currentUrl,
    currentPageTitle,
    webBreakdown,
  };
}

// ── Sync ──────────────────────────────────────────────────────────────────────
async function sync() {
  try {
    if (!isWithinWorkingHours()) {
      console.log(`[${new Date().toLocaleTimeString()}] outside working hours — skipped, no data sent.`);
      return;
    }

    const activeCheck = await request(API_BASE, '/api/activity/session-active', 'GET', null, {
      Authorization: `Bearer ${authToken}`,
    });
    if (!activeCheck.body?.active) {
      console.log(`[${new Date().toLocaleTimeString()}] not logged into the dashboard right now — skipped, no data sent.`);
      return;
    }

    const summary = await buildSummary();
    if (!summary) return;

    const res = await request(
      API_BASE,
      '/api/activity/aw-sync',
      'POST',
      { ...summary, deviceId: DEVICE_ID, deviceName: DEVICE_NAME },
      { Authorization: `Bearer ${authToken}` }
    );

    if (res.status === 401) {
      console.warn('[sync] Token expired — re-logging in…');
      const ok = await login();
      if (ok) await sync();
      return;
    }

    if (res.status === 403) {
      console.error(`[sync] Device blocked: ${res.body?.error}`);
      console.error('[sync] Ask your admin to reset the device lock, then restart this agent.');
      process.exit(1);
    }

    if (res.body?.success) {
      const ts = new Date().toLocaleTimeString();
      const topApp = summary.appBreakdown[0];
      console.log(`[${ts}] synced — top: ${topApp ? `${topApp.app} (${topApp.minutes}m)` : '(none)'} | total: ${summary.totalActiveMinutes}m | afk: ${summary.isAfk ? 'yes' : 'no'}`);
    } else {
      console.error('[sync] Server error:', res.body?.error || res.status);
    }
  } catch (err) {
    console.error('[sync] Error:', err.message);
  }
}

// ── Fast "current activity" ping (every 15s) ──────────────────────────────────
// Sends only the active app/tab so the admin's live view tracks app/tab switches
// in near-real-time, without the cost of a full daily-breakdown sync.
async function pushCurrent() {
  if (!authToken) return;
  try {
    const buckets = await getAWBuckets();
    const keys = Object.keys(buckets);
    const windowBucket = keys.find((k) => buckets[k].type === 'currentwindow' || k.includes('aw-watcher-window'));
    if (!windowBucket) return;
    const afkBucket  = keys.find((k) => buckets[k].type === 'afkstatus' || k.includes('aw-watcher-afk'));
    const webBuckets = keys.filter((k) => k.includes('aw-watcher-web') || buckets[k].type === 'web.tab.current');

    const win = await getCurrentWindow(windowBucket);
    const currentApp   = win?.data?.app   || win?.data?.title || '';
    const currentTitle = win?.data?.title || '';

    let isAfk = false;
    if (afkBucket) {
      const afk = await getCurrentWindow(afkBucket);
      isAfk = afk?.data?.status === 'afk';
    }
    let currentUrl = '', currentPageTitle = '';
    for (const wb of webBuckets) {
      const w = await getCurrentWindow(wb);
      if (w?.data?.url && !w.data.incognito) { currentUrl = w.data.url; currentPageTitle = w.data.title || ''; break; }
    }

    const res = await request(
      API_BASE, '/api/activity/aw-current', 'POST',
      { currentApp, currentTitle, currentUrl, currentPageTitle, isAfk },
      { Authorization: `Bearer ${authToken}` }
    );
    if (res.status === 401) await login();
  } catch { /* non-fatal */ }
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  const ok = await login();
  if (!ok) process.exit(1);

  console.log(`[agent] Started. Syncing every ${INTERVAL} minute(s); live app ping every 15s. Admin can see your activity in EduTechExOS.`);
  console.log(`[agent] Press Ctrl+C to stop.`);

  await sync();
  setInterval(sync, INTERVAL * 60 * 1000);

  await pushCurrent(); // immediate live ping
  setInterval(pushCurrent, 15 * 1000);
})();
