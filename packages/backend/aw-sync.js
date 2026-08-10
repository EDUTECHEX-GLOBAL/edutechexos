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
 *   --api        https://edutechexos-ueoq.onrender.com (default)
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
const INTERVAL = parseInt(getArg('--interval') || process.env.AW_INTERVAL || '1', 10);
const DEVICE_ID   = `${os.hostname()}-${os.platform()}-${os.arch()}`;
const DEVICE_NAME = os.hostname();

// IST offset in ms
const IST_OFFSET = 5.5 * 60 * 60 * 1000;

// ── Working-hours window (10:00–18:30 local by default) ──────────────────────
// Only activity INSIDE this window is counted or shown. Overridable per run.
function parseHHMM(str, fallback) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(str || ''));
  return m ? (parseInt(m[1], 10) * 60 + parseInt(m[2], 10)) : fallback;
}
const WORK_START_MIN = parseHHMM(getArg('--work-start') || process.env.WORK_START, 10 * 60);      // 10:00
const WORK_END_MIN   = parseHHMM(getArg('--work-end')   || process.env.WORK_END,   18 * 60 + 30); // 18:30
function isWithinWorkingHours() {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= WORK_START_MIN && mins < WORK_END_MIN;
}
// [openMs, closeMs] for the work window on a given local calendar date.
function workWindow(forDate) {
  const open  = new Date(forDate.getFullYear(), forDate.getMonth(), forDate.getDate(), 0, WORK_START_MIN, 0, 0);
  const close = new Date(forDate.getFullYear(), forDate.getMonth(), forDate.getDate(), 0, WORK_END_MIN,   0, 0);
  return [open.getTime(), close.getTime()];
}

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
    console.log(`[startup] Registered! The agent will start silently every time Windows boots.`);
    console.log(`[startup]    Startup file: ${vbsPath}`);
    console.log(`[startup] Starting agent now…`);
  } catch (err) {
    console.error(`[startup] Failed to write startup file: ${err.message}`);
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
      if (fs.existsSync(p)) { fs.unlinkSync(p); console.log(`[startup] Removed: ${p}`); }
    } catch (err) {
      console.error(`[startup] Failed to remove ${p}: ${err.message}`);
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
let syncCount = 0;

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
      // 429 = rate-limited. Wait 2 minutes then retry (don't give up immediately).
      if (res.status === 429) {
        console.warn(`[auth] Rate-limited by server (429) — waiting 2 minutes before retry (attempt ${attempt}/15)…`);
        await sleep(2 * 60 * 1000);
        continue;
      }
      // 401 = wrong credentials. No point retrying.
      if (res.status === 401) {
        console.error('[auth] Login failed: wrong email or password. Check your credentials and restart.');
        return false;
      }
      console.error('[auth] Login failed:', res.body?.error || res.status);
      return false;
    } catch (err) {
      const wait = Math.min(attempt * 5, 30);
      const detail = err.code || err.message || err.errors?.[0]?.code || String(err) || 'connection failed';
      console.warn(`[auth] Cannot reach ${API_BASE} (attempt ${attempt}/15): ${detail} — is the backend running? Retrying in ${wait}s…`);
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
      // High limit so a full active day is never truncated. The old 2000 cap
      // made the counted total plateau (~30-40 min for a busy user) because
      // ActivityWatch returns only the most-recent N events, dropping earlier
      // time. A day of window events stays well under this.
      `/api/0/buckets/${encodeURIComponent(bucketId)}/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&limit=100000`
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

// Split one AW event across the minute boundaries it spans, invoking
// cb(minuteStartMs, secondsInThatMinute). This is what lets us answer
// "in minute X, what was this person actually doing?".
function perMinute(ev, gateMs, cb) {
  const start = Date.parse(ev.timestamp);
  if (!Number.isFinite(start)) return;
  const end = start + (ev.duration || 0) * 1000;
  let cur = Math.max(start, gateMs);
  if (!(end > cur)) return;
  while (cur < end) {
    const mStart = Math.floor(cur / 60000) * 60000;
    const segEnd = Math.min(end, mStart + 60000);
    cb(mStart, (segEnd - cur) / 1000);
    cur = segEnd;
  }
}

const MAX_ITEMS = 300; // cap list sizes so payloads stay sane

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

  // Full-day query range (we clamp to the working-hours window below).
  const startOfDay = new Date(forDate.getFullYear(), forDate.getMonth(), forDate.getDate()).toISOString();
  const endOfDay   = new Date(forDate.getFullYear(), forDate.getMonth(), forDate.getDate() + 1).toISOString();

  const dateStr = new Date(forDate.getTime() + IST_OFFSET).toISOString().slice(0, 10);
  const loginMs = await getSessionStart(dateStr);
  if (!loginMs) return null; // never opened EduTechExOS that day -> count nothing

  // ── Working-hours window: 10:00–18:30, and never before login ────────────────
  const [winOpen, winClose] = workWindow(forDate);
  const winStart = Math.max(winOpen, loginMs);
  const winEnd   = isToday ? Math.min(winClose, Date.now()) : winClose;

  // Current app/tab ("now") — only meaningful for today.
  let currentApp = '', currentTitle = '';
  if (isToday) {
    const cw = await getCurrentWindow(windowBucket);
    currentApp   = cw?.data?.app   || cw?.data?.title || '';
    currentTitle = cw?.data?.title || '';
  }
  let currentUrl = '', currentPageTitle = '';
  for (const wb of webBuckets) {
    if (!isToday) break;
    const latest = await getCurrentWindow(wb);
    if (latest?.data?.url && !latest.data.incognito) {
      currentUrl = latest.data.url; currentPageTitle = latest.data.title || ''; break;
    }
  }

  // Before 10:00 (or window otherwise empty) -> nothing counted yet.
  if (winEnd <= winStart) {
    return {
      dateStr, currentApp, currentTitle, currentUrl, currentPageTitle,
      isAfk: false, totalActiveSeconds: 0, totalAfkSeconds: 0,
      totalActiveMinutes: 0, totalAfkMinutes: 0,
      appBreakdown: [], webBreakdown: [], recentApps: [], timeline: [],
    };
  }

  // minuteStartMs -> what happened that minute
  const minutes = new Map();
  const slot = (m) => {
    if (!minutes.has(m)) minutes.set(m, { apps: {}, titles: {}, tabs: {}, active: 0, afk: 0 });
    return minutes.get(m);
  };
  const clampedPerMinute = (evStart, evEnd, cb) => {
    let cur = Math.max(evStart, winStart);
    const end = Math.min(evEnd, winEnd);
    while (cur < end) {
      const mStart = Math.floor(cur / 60000) * 60000;
      const segEnd = Math.min(end, mStart + 60000);
      cb(mStart, cur, segEnd, (segEnd - cur) / 1000);
      cur = segEnd;
    }
  };

  // ── Away-from-keyboard FIRST, so we can subtract idle time from everything ───
  const afkIntervals = [];
  let isAfk = false;
  let totalAfkSec = 0;
  if (afkBucket) {
    const afkEvents = await queryEvents(afkBucket, startOfDay, endOfDay);
    if (isToday && afkEvents[0]) isAfk = afkEvents[0]?.data?.status === 'afk';
    for (const ev of afkEvents) {
      if (ev.data?.status !== 'afk') continue;
      const evStart = Date.parse(ev.timestamp);
      if (!Number.isFinite(evStart)) continue;
      const evEnd = evStart + (ev.duration || 0) * 1000;
      const s = Math.max(evStart, winStart), e = Math.min(evEnd, winEnd);
      if (!(e > s)) continue;
      afkIntervals.push([s, e]);
      totalAfkSec += (e - s) / 1000;
      clampedPerMinute(evStart, evEnd, (m, _a, _b, sec) => { slot(m).afk += sec; });
    }
  }
  const afkOverlapSec = (a, b) => {
    let ov = 0;
    for (const [s, e] of afkIntervals) {
      const lo = Math.max(a, s), hi = Math.min(b, e);
      if (hi > lo) ov += (hi - lo);
    }
    return ov / 1000;
  };

  // ── Desktop apps — ACTIVE time only (idle removed) ──────────────────────────
  const windowEvents = await queryEvents(windowBucket, startOfDay, endOfDay);
  const appSeconds = {}, appLastSeen = {}, appFirstSeen = {};
  let totalActiveSec = 0;

  for (const ev of windowEvents) {
    const evStart = Date.parse(ev.timestamp);
    if (!Number.isFinite(evStart)) continue;
    const evEnd = evStart + (ev.duration || 0) * 1000;
    const cs = Math.max(evStart, winStart), ce = Math.min(evEnd, winEnd);
    if (!(ce > cs)) continue;
    const app   = ev.data?.app || ev.data?.title || 'Unknown';
    const title = (ev.data?.title || '').trim();
    if (!appFirstSeen[app] || cs < appFirstSeen[app]) appFirstSeen[app] = cs;
    if (!appLastSeen[app]  || ce > appLastSeen[app])  appLastSeen[app]  = ce;
    clampedPerMinute(evStart, evEnd, (m, segStart, segEnd) => {
      const active = Math.max(0, (segEnd - segStart) / 1000 - afkOverlapSec(segStart, segEnd));
      if (active <= 0) return; // fully idle in this slice -> don't count
      const sl = slot(m);
      sl.apps[app] = (sl.apps[app] || 0) + active;
      if (title) sl.titles[title] = (sl.titles[title] || 0) + active;
      sl.active += active;
      appSeconds[app] = (appSeconds[app] || 0) + active;
      totalActiveSec += active;
    });
  }

  const appBreakdown = Object.entries(appSeconds)
    .map(([app, secs]) => ({
      app, seconds: Math.round(secs), minutes: Math.round(secs / 60),
      firstSeen: appFirstSeen[app] ? new Date(appFirstSeen[app]).toISOString() : null,
      lastSeen:  appLastSeen[app]  ? new Date(appLastSeen[app]).toISOString()  : null,
    }))
    .filter(({ seconds }) => seconds >= 1)
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, MAX_ITEMS);

  const recentApps = Object.entries(appLastSeen)
    .sort((a, b) => b[1] - a[1]).slice(0, 30)
    .map(([app, ts]) => ({ app, lastSeen: new Date(ts).toISOString(), seconds: Math.round(appSeconds[app] || 0) }));

  // ── Browser tabs — ACTIVE time only (idle removed) ──────────────────────────
  const tabStats = {}; // tab title -> { secs, domain, last }
  for (const wb of webBuckets) {
    const webEvents = await queryEvents(wb, startOfDay, endOfDay);
    for (const ev of webEvents) {
      const evStart = Date.parse(ev.timestamp);
      if (!Number.isFinite(evStart)) continue;
      const evEnd = evStart + (ev.duration || 0) * 1000;
      if (Math.min(evEnd, winEnd) <= Math.max(evStart, winStart)) continue;
      const d = ev.data;
      if (!d?.url || d.incognito) continue;
      let domain = 'unknown';
      try { domain = new URL(d.url).hostname.replace(/^www\./, ''); } catch { continue; }
      const title = (d.title || '').trim() || domain;
      if (!tabStats[title]) tabStats[title] = { secs: 0, domain, last: 0 };
      tabStats[title].last = Math.max(tabStats[title].last, Math.min(evEnd, winEnd));
      clampedPerMinute(evStart, evEnd, (m, segStart, segEnd) => {
        const active = Math.max(0, (segEnd - segStart) / 1000 - afkOverlapSec(segStart, segEnd));
        if (active <= 0) return;
        tabStats[title].secs += active;
        const sl = slot(m); sl.tabs[title] = (sl.tabs[title] || 0) + active;
      });
    }
  }

  const webBreakdown = Object.entries(tabStats)
    .map(([title, v]) => ({ domain: v.domain, title, seconds: Math.round(v.secs), minutes: Math.round(v.secs / 60), lastSeen: v.last ? new Date(v.last).toISOString() : null }))
    .filter(({ seconds }) => seconds >= 1)
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, MAX_ITEMS);

  // ── Minute-by-minute timeline ──────────────────────────────────────────────
  const topKey = (obj) => { let best = '', bestV = -1; for (const [k, v] of Object.entries(obj)) if (v > bestV) { best = k; bestV = v; } return best; };
  const timeline = [...minutes.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([mStart, v]) => ({
      m:          new Date(mStart + IST_OFFSET).toISOString().slice(11, 16), // HH:MM IST
      app:        topKey(v.apps),
      title:      topKey(v.titles),
      tab:        topKey(v.tabs),
      seconds:    Math.round(v.active),
      afkSeconds: Math.round(v.afk),
    }))
    .slice(-1440);

  return {
    dateStr,
    currentApp, currentTitle,
    currentUrl, currentPageTitle,
    isAfk,
    totalActiveSeconds: Math.round(totalActiveSec),
    totalAfkSeconds:    Math.round(totalAfkSec),
    totalActiveMinutes: Math.round(totalActiveSec / 60),
    totalAfkMinutes:    Math.round(totalAfkSec / 60),
    appBreakdown,
    webBreakdown,
    recentApps,
    timeline,
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
    // Only sync during working hours (10:00–18:30). Outside it, nothing is sent.
    if (!isWithinWorkingHours()) { syncCount += 1; return; }
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

    // Backfill yesterday occasionally (not every minute) so admin sees the
    // previous day's full data without re-querying it on every cycle.
    if (syncCount % 10 === 0) {
      const ySummary = await buildSummary(yesterday);
      if (ySummary && (ySummary.totalActiveSeconds || 0) > 0) {
        const ok = await pushSummary(ySummary);
        if (ok) console.log(`[sync] backfilled yesterday (${ySummary.dateStr}) — active: ${ySummary.totalActiveMinutes}m`);
      }
    }
    syncCount += 1;
  } catch (err) {
    console.error('[sync] Error:', err.message);
  }
}

// ── Fast "current activity" ping (every 15s) ──────────────────────────────────
// Sends only the active app/tab so the admin's live view tracks app/tab switches
// in near-real-time, without the cost of a full daily-breakdown sync.
async function pushCurrent() {
  if (!authToken) return;
  if (!isWithinWorkingHours()) return; // live app/tab only shown during work hours
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

  const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  console.log(`[agent] Started. Counting only ${hhmm(WORK_START_MIN)}–${hhmm(WORK_END_MIN)}; idle time excluded. Full sync every ${INTERVAL} min; live ping every 5s.`);
  console.log(`[agent] Admin can see your activity in EduTechExOS.`);
  console.log(`[agent] Press Ctrl+C to stop.`);

  await sync(); // immediate first sync + yesterday backfill
  setInterval(sync, INTERVAL * 60 * 1000);

  await pushCurrent(); // immediate live ping
  setInterval(pushCurrent, 5 * 1000);

  // Keep-alive log once a minute — if these lines STOP in your console, the
  // agent process itself died (machine sleep / window closed), not the sync.
  setInterval(() => {
    console.log(`[alive] ${new Date().toLocaleTimeString()} — agent running (sync #${syncCount})`);
  }, 60 * 1000);
})();
