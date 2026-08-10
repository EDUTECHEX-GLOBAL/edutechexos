/**
 * adjust-test-hours.js
 * 
 * Quick admin script to manually set active/afk hours for ANY user on ANY date.
 * Useful for testing without waiting for AW-sync.
 *
 * Usage:
 *   node adjust-test-hours.js
 *
 * Edit the CONFIG section below before running.
 */

const https = require('https');
const http  = require('http');
const url   = require('url');

// ── CONFIG ──────────────────────────────────────────────────────────────────
const API_BASE = 'http://localhost:10002';    // local dev backend

// Admin credentials
const ADMIN_EMAIL    = 'admin@edutechex.in';  // ← change to your admin email
const ADMIN_PASSWORD = 'Admin@2026';          // ← change to your admin password

// Which user + date to adjust
const TARGET_EMAIL = 'jmsmohan.07@gmail.com';  // testing acc
const TARGET_DATE  = '2026-07-30';             // today (YYYY-MM-DD)

// What values to set (comment out lines you don't want to change)
const ADJUSTMENTS = {
  // in-app TIME column (ActivitySession)
  totalMinutes: 205,      // 3h 25m → 205 min  |  2h 45m → 165 min

  // Desktop active/away bar (AWActivity)
  activeMinutes: 205,     // shown as "Xh Ym active"
  afkMinutes:    165,     // shown as "Zh Wm away"  ← change 3h 45m (225) to 2h 45m (165)
};
// ────────────────────────────────────────────────────────────────────────────

function request(baseUrl, urlPath, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed  = new url.URL(baseUrl + urlPath);
    const isHttps = parsed.protocol === 'https:';
    const lib     = isHttps ? https : http;
    const opts = {
      hostname: parsed.hostname,
      port:     parsed.port || (isHttps ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method,
      headers:  { 'Content-Type': 'application/json', ...headers },
      timeout:  15000,
    };
    if (body) opts.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    const req = lib.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log(`\n🔐 Logging in as ${ADMIN_EMAIL}…`);
  const loginRes = await request(API_BASE, '/api/auth/login', 'POST', {
    email: ADMIN_EMAIL, password: ADMIN_PASSWORD, mode: 'admin',
  });
  if (loginRes.status !== 200 || !loginRes.body?.token) {
    console.error('❌ Login failed:', loginRes.body?.error || loginRes.status);
    process.exit(1);
  }
  const token = loginRes.body.token;
  console.log('✅ Logged in.');

  console.log(`\n⚙️  Adjusting hours for ${TARGET_EMAIL} on ${TARGET_DATE}…`);
  const adjustRes = await request(
    API_BASE,
    '/api/activity/adjust-hours',
    'POST',
    { email: TARGET_EMAIL, date: TARGET_DATE, ...ADJUSTMENTS },
    { Authorization: `Bearer ${token}` }
  );

  if (adjustRes.status === 200 && adjustRes.body?.success) {
    const s  = adjustRes.body.session;
    const aw = adjustRes.body.awActivity;
    console.log('✅ Done!\n');
    if (s)  console.log(`   ActivitySession  → totalMinutes: ${s.totalMinutes} (${Math.floor(s.totalMinutes/60)}h ${s.totalMinutes%60}m in-app)`);
    if (aw) console.log(`   AWActivity       → active: ${aw.totalActiveMinutes}m  |  afk: ${aw.totalAfkMinutes}m`);
    console.log('\n🔄 Refresh the admin dashboard to see the updated values.');
  } else {
    console.error('❌ Adjustment failed:', adjustRes.body?.error || adjustRes.status);
  }
}

main().catch((err) => { console.error('Fatal:', err.message); process.exit(1); });
