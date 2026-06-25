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
 * OPTIONS:
 *   --email      your EduTechExOS login email (required)
 *   --password   your EduTechExOS password (required)
 *   --startup    register this script to run on Windows startup (one time)
 *   --remove     remove Windows startup registration
 *   --api        https://edutechexos-backend.onrender.com (default)
 *   --aw         http://localhost:5600 (ActivityWatch URL, default)
 *   --interval   sync interval in minutes (default: 5)
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

// ── Build today's summary ─────────────────────────────────────────────────────
async function buildSummary() {
  const buckets = await getAWBuckets();
  const keys    = Object.keys(buckets);

  const windowBucket = keys.find((k) => buckets[k].type === 'currentwindow' || k.includes('aw-watcher-window'));
  const afkBucket    = keys.find((k) => buckets[k].type === 'afkstatus'     || k.includes('aw-watcher-afk'));

  if (!windowBucket) {
    console.warn('[aw] No window-watcher bucket found. Is ActivityWatch running?');
    return null;
  }

  const now        = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay   = now.toISOString();

  const currentEvent = await getCurrentWindow(windowBucket);
  const currentApp   = currentEvent?.data?.app   || currentEvent?.data?.title || '';
  const currentTitle = currentEvent?.data?.title  || '';

  const windowEvents = await queryEvents(windowBucket, startOfDay, endOfDay);
  const appSeconds   = {};
  let totalActiveSec = 0;

  for (const ev of windowEvents) {
    const dur = ev.duration || 0;
    const app = ev.data?.app || ev.data?.title || 'Unknown';
    appSeconds[app] = (appSeconds[app] || 0) + dur;
    totalActiveSec += dur;
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
      if (ev.data?.status === 'afk') totalAfkSec += (ev.duration || 0);
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

// ── Sync ──────────────────────────────────────────────────────────────────────
async function sync() {
  try {
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

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  const ok = await login();
  if (!ok) process.exit(1);

  console.log(`[agent] Started. Syncing every ${INTERVAL} minute(s). Admin can see your activity in EduTechExOS.`);
  console.log(`[agent] Press Ctrl+C to stop.`);

  await sync();
  setInterval(sync, INTERVAL * 60 * 1000);
})();
