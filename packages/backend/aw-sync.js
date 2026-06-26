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

// IST offset in ms
const IST_OFFSET = 5.5 * 60 * 60 * 1000;

// ── Windows auto-startup helpers ──────────────────────────────────────────────
function getStartupVbsPath() {
  const startupDir = path.join(
    os.homedir(),
    'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup'
  );
  return path.join(startupDir, 'edutechexos-agent.vbs');
}

function registerStartup() {
  if (os.platform() !== 'win32') {
    console.log('[startup] Auto-startup registration is only supported on Windows.');
    console.log('[startup] On macOS/Linux, add a cron job:');
    console.log(`           @reboot node "${process.argv[1]}" --email ${EMAIL} --password "${PASSWORD}"`);
    return;
  }
  const nodePath   = process.execPath;
  const scriptPath = path.resolve(process.argv[1]);
  const vbsPath    = getStartupVbsPath();

  // VBScript launches Node hidden (no console window flashing on login)
  const vbsContent = [
    'Set WshShell = CreateObject("WScript.Shell")',
    `WshShell.Run """${nodePath}"" ""${scriptPath}"" --email ""${EMAIL}"" --password ""${PASSWORD}"" --api ""${API_BASE}"" --interval ${INTERVAL}", 0, False`,
  ].join('\r\n');

  try {
    fs.writeFileSync(vbsPath, vbsContent, 'utf8');
    console.log(`[startup] ✅ Registered! The agent will start silently every time Windows boots.`);
    console.log(`[startup]    Startup file: ${vbsPath}`);
    console.log(`[startup] Starting agent now…`);
  } catch (err) {
    console.error(`[startup] ❌ Failed to write startup file: ${err.message}`);
    console.error(`[startup]    Try running as Administrator.`);
  }
}

function removeStartup() {
  if (os.platform() !== 'win32') {
    console.log('[startup] Not on Windows — nothing to remove.');
    return;
  }
  // Remove both .vbs and old .bat if present
  [getStartupVbsPath(), getStartupVbsPath().replace('.vbs', '.bat')].forEach((p) => {
    try {
      if (fs.existsSync(p)) { fs.unlinkSync(p); console.log(`[startup] ✅ Removed: ${p}`); }
    } catch (err) {
      console.error(`[startup] ❌ Failed to remove ${p}: ${err.message}`);
    }
  });
}

if (hasFlag('--remove')) { removeStartup(); process.exit(0); }

if (!EMAIL || !PASSWORD) {
  console.error('');
  console.error('  EduTechExOS Desktop Activity Agent');
  console.error('  ─────────────────────────────────');
  console.error('  Usage:');
  console.error('    node aw-sync.js --email you@edutechex.in --password yourpassword');
  console.error('');
  console.error('  First-time setup (auto-starts silently on every Windows boot):');
  console.error('    node aw-sync.js --email you@edutechex.in --password yourpassword --startup');
  console.error('');
  process.exit(1);
}

if (hasFlag('--startup')) {
  registerStartup();
  // Fall through — start the agent now too
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
      timeout:  20000,
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
  for (let attempt = 1; attempt <= 15; attempt++) {
    if (attempt === 1) console.log(`[auth] Logging in as ${EMAIL}…`);
    try {
      const res = await request(API_BASE, '/api/auth/login', 'POST', { email: EMAIL, password: PASSWORD });
      if (res.status === 200 && res.body?.token) {
        authToken = res.body.token;
        console.log('[auth] Login successful.');
        return true;
      }
      if (res.status === 503 || res.status === 502) {
        const wait = Math.min(attempt * 5, 30);
        console.warn(`[auth] Server waking up (attempt ${attempt}/15) — waiting ${wait}s…`);
        await sleep(wait * 1000);
        continue;
      }
      console.error('[auth] Login failed:', res.body?.error || res.status);
      return false;
    } catch (err) {
      const wait = Math.min(attempt * 5, 30);
      console.warn(`[auth] Network error (attempt ${attempt}/15): ${err.message} — waiting ${wait}s…`);
      await sleep(wait * 1000);
    }
  }
  console.error('[auth] Could not reach server after 15 attempts.');
  return false;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ── ActivityWatch queries ─────────────────────────────────────────────────────
async function getAWBuckets() {
  try {
    const res = await request(AW_BASE, '/api/0/buckets/');
    return res.status === 200 ? res.body : {};
  } catch { return {}; }
}

async function queryEvents(bucketId, start, end) {
  try {
    const res = await request(
      AW_BASE,
      `/api/0/buckets/${encodeURIComponent(bucketId)}/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&limit=2000`
    );
    return res.status === 200 && Array.isArray(res.body) ? res.body : [];
  } catch { return []; }
}

async function getCurrentWindow(bucketId) {
  try {
    const res = await request(AW_BASE, `/api/0/buckets/${encodeURIComponent(bucketId)}/events?limit=1`);
    return res.status === 200 && Array.isArray(res.body) && res.body.length > 0 ? res.body[0] : null;
  } catch { return null; }
}

// ── Build summary for a specific date ────────────────────────────────────────
async function buildSummary(forDate) {
  const buckets = await getAWBuckets();
  const keys    = Object.keys(buckets);

  const windowBucket = keys.find((k) => buckets[k].type === 'currentwindow' || k.includes('aw-watcher-window'));
  const afkBucket    = keys.find((k) => buckets[k].type === 'afkstatus'     || k.includes('aw-watcher-afk'));
  const webBuckets   = keys.filter((k) => k.includes('aw-watcher-web') || buckets[k].type === 'web.tab.current');

  if (!windowBucket) {
    console.warn('[aw] No window-watcher bucket found. Is ActivityWatch running?');
    return null;
  }

  const isToday = forDate.toDateString() === new Date().toDateString();

  // Full day window for the requested date
  const startOfDay = new Date(forDate.getFullYear(), forDate.getMonth(), forDate.getDate()).toISOString();
  const endOfDay   = new Date(forDate.getFullYear(), forDate.getMonth(), forDate.getDate() + 1).toISOString();

  // Current window only makes sense for today
  let currentApp   = '';
  let currentTitle = '';
  if (isToday) {
    const currentEvent = await getCurrentWindow(windowBucket);
    currentApp   = currentEvent?.data?.app   || currentEvent?.data?.title || '';
    currentTitle = currentEvent?.data?.title  || '';
  }

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
    if (isToday && afkEvents[0]) isAfk = afkEvents[0]?.data?.status === 'afk';
    for (const ev of afkEvents) {
      if (ev.data?.status === 'afk') totalAfkSec += (ev.duration || 0);
    }
  }

  let currentUrl       = '';
  let currentPageTitle = '';
  const domainSecs     = {};
  for (const wb of webBuckets) {
    if (isToday) {
      const latest = await getCurrentWindow(wb);
      if (latest?.data?.url && !latest.data.incognito) {
        currentUrl       = latest.data.url;
        currentPageTitle = latest.data.title || '';
      }
    }
    const webEvents = await queryEvents(wb, startOfDay, endOfDay);
    for (const ev of webEvents) {
      const dur = ev.duration || 0;
      const d   = ev.data;
      if (!d?.url || d.incognito) continue;
      try {
        const domain = new URL(d.url).hostname.replace(/^www\./, '');
        if (!domainSecs[domain]) domainSecs[domain] = { minutes: 0, title: d.title || domain };
        domainSecs[domain].minutes += dur / 60;
      } catch { /* invalid URL */ }
    }
  }

  const webBreakdown = Object.entries(domainSecs)
    .map(([domain, v]) => ({ domain, minutes: Math.round(v.minutes), title: v.title }))
    .filter(({ minutes }) => minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 20);

  // dateStr in IST so backend stores under the correct local date
  const dateStr = new Date(forDate.getTime() + IST_OFFSET).toISOString().slice(0, 10);

  return {
    dateStr,
    currentApp, currentTitle,
    currentUrl, currentPageTitle,
    isAfk,
    totalActiveMinutes: Math.round(totalActiveSec / 60),
    totalAfkMinutes:    Math.round(totalAfkSec / 60),
    appBreakdown,
    webBreakdown,
  };
}

// ── Push a summary to backend ─────────────────────────────────────────────────
async function pushSummary(summary) {
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
    if (ok) await pushSummary(summary);
    return;
  }
  if (res.status === 403) {
    console.error(`[sync] Device blocked: ${res.body?.error}`);
    console.error('[sync] Ask your admin to reset the device lock, then restart this agent.');
    process.exit(1);
  }
  return res.body?.success === true;
}

// ── Main sync (today + yesterday backfill) ────────────────────────────────────
async function sync() {
  try {
    const today     = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    // Always sync today
    const todaySummary = await buildSummary(today);
    if (todaySummary) {
      const ok = await pushSummary(todaySummary);
      if (ok) {
        const ts     = new Date().toLocaleTimeString();
        const topApp = todaySummary.appBreakdown[0];
        console.log(`[${ts}] synced today (${todaySummary.dateStr}) — top: ${topApp ? `${topApp.app} (${topApp.minutes}m)` : '(none)'} | active: ${todaySummary.totalActiveMinutes}m | afk: ${todaySummary.isAfk ? 'yes' : 'no'}`);
      }
    }

    // Backfill yesterday so admin always sees the previous day's full data
    const ySummary = await buildSummary(yesterday);
    if (ySummary && ySummary.totalActiveMinutes > 0) {
      const ok = await pushSummary(ySummary);
      if (ok) {
        console.log(`[sync] backfilled yesterday (${ySummary.dateStr}) — active: ${ySummary.totalActiveMinutes}m`);
      }
    }
  } catch (err) {
    console.error('[sync] Error:', err.message);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  const ok = await login();
  if (!ok) process.exit(1);

  console.log(`[agent] Started. Syncing every ${INTERVAL} minute(s).`);
  console.log(`[agent] Admin can see your activity in EduTechExOS.`);
  console.log(`[agent] Press Ctrl+C to stop.`);

  await sync(); // immediate first sync + yesterday backfill
  setInterval(sync, INTERVAL * 60 * 1000);
})();
