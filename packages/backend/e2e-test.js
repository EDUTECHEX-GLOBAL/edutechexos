// ── EduTechExOS Backend End-to-End Test Suite ──────────────────────────────
const BASE = 'http://localhost:10002';
const axios = require('axios');

let PASS = 0, FAIL = 0;
const results = [];
const api = axios.create({ baseURL: BASE, validateStatus: () => true, timeout: 10000 });

let adminToken, memberToken, testEmail, testAccessReqId, testMsgId, testKanbanId, testWikiId;
let testLeaveId, testMediaId, testChannelId, testWebhookId;

function assert(desc, cond, detail) {
  if (cond) { PASS++; results.push({ desc, status: 'PASS' }); console.log(`  ✓ ${desc}`); }
  else { FAIL++; results.push({ desc, status: 'FAIL', detail }); console.log(`  ✗ ${desc}\n    ${detail || ''}`); }
}

async function req(method, path, opts = {}) {
  const h = opts.headers || {};
  if (opts.token) h.Authorization = `Bearer ${opts.token}`;
  try { return await api({ method, url: path, data: opts.data, params: opts.params, headers: h }); }
  catch (e) { return { status: 0, data: { error: e.message } }; }
}

async function main() {
console.log('\n══════════════════════════════════════════════════════════');
console.log(' EduTechExOS Backend E2E Tests');
console.log('══════════════════════════════════════════════════════════\n');

// ═══════ 1. Health ═══════
console.log('── 1. Health & Connectivity ──');
{
  const r = await req('GET', '/health');
  assert('GET /health → 200', r.status === 200, `${r.status}`);
  assert('/health body status=ok', r.data?.status === 'ok', JSON.stringify(r.data));
}

// ═══════ 2. Auth & Access ═══════
console.log('\n── 2. Authentication & Access ──');
{
  // Admin login
  const r1 = await req('POST', '/api/auth/login', { data: { email: 'admin@edutechex.in', password: 'Admin@2026' } });
  assert('Admin login 200', r1.status === 200, `${r1.status}`);
  adminToken = r1.data?.token;
  assert('Admin token returned', !!adminToken, adminToken ? 'yes' : 'no');

  // Wrong password → 401
  const r2 = await req('POST', '/api/auth/login', { data: { email: 'admin@edutechex.in', password: 'wrong' } });
  assert('Wrong password → 401', r2.status === 401, `${r2.status}`);

  // Missing fields → 400
  const r3 = await req('POST', '/api/auth/login', { data: {} });
  assert('Missing fields → 400', r3.status === 400, `${r3.status}`);

  // Signup
  const ts = Date.now();
  testEmail = `testuser${ts}@example.com`;
  const r4 = await req('POST', '/api/access-requests', { data: { name: 'Test User', email: testEmail, role: 'Member' } });
  assert('Access request created', r4.data?.success === true, JSON.stringify(r4.data));
  testAccessReqId = r4.data?.request?.id;
  if (r4.data?.request) assert('Status is pending', r4.data.request.status === 'pending', r4.data.request.status);

  // Admin approve
  if (testAccessReqId) {
    const r5 = await req('PATCH', `/api/access-requests/${testAccessReqId}`, { token: adminToken, data: { status: 'approved' } });
    assert('Approve → success', r5.data?.success === true, JSON.stringify(r5.data));
  }

  // Set password
  const pw = 'TestPass123!';
  const r6 = await req('POST', '/api/admin/set-password', { token: adminToken, data: { email: testEmail, password: pw, name: 'Test User', role: 'Member', status: 'approved' } });
  assert('Admin set-password ok', r6.data?.success === true, JSON.stringify(r6.data));

  // Login as test user
  const r7 = await req('POST', '/api/auth/login', { data: { email: testEmail, password: pw } });
  assert('Test user login 200', r7.status === 200, `${r7.status}`);
  memberToken = r7.data?.token;
  assert('Test user token returned', !!memberToken, memberToken ? 'yes' : 'no');

  // Unauthenticated → 401
  const r8 = await req('GET', '/api/members');
  assert('No token → 401', r8.status === 401, `${r8.status}`);

  // Forgot password
  const r9 = await req('POST', '/api/auth/forgot-password', { data: { email: testEmail } });
  assert('Forgot password → success', r9.data?.success === true, JSON.stringify(r9.data));
}

// ═══════ 3. Members ═══════
console.log('\n── 3. Members ──');
{
  const r = await req('GET', '/api/members', { token: memberToken });
  assert('GET /api/members returns array', Array.isArray(r.data?.members), typeof r.data?.members);
  if (r.data?.members) {
    assert('Test user in list', r.data.members.some(m => m.email === testEmail), testEmail);
    assert('Admin in list', r.data.members.some(m => m.email === 'admin@edutechex.in'), 'admin@edutechex.in');
    assert('Members list has entries', r.data.members.length >= 5, String(r.data.members.length));
  }

  // Promote test user to admin
  const reqs = await req('GET', '/api/access-requests', { token: adminToken });
  const tUser = reqs.data?.requests?.find(r => r.email === testEmail);
  if (tUser?._id) {
    const pr = await req('POST', `/api/members/${tUser._id}/promote-admin`, { token: adminToken });
    assert('Promote to admin', pr.data?.success === true, JSON.stringify(pr.data));
  }
}

// ═══════ 4. Messaging ═══════
console.log('\n── 4. Messaging ──');
{
  const ch = await req('GET', '/api/channels', { token: memberToken });
  assert('Channels returned', Array.isArray(ch.data?.channels), typeof ch.data?.channels);
  assert('general channel exists', ch.data?.channels?.some(c => c.id === 'general'), true);

  const mp = { channelId: 'general', text: 'E2E test message', sender: 'Test User', senderEmail: testEmail, initials: 'TU', color: '#4f46e5', timestamp: new Date().toISOString() };
  const sm = await req('POST', '/api/messages', { token: memberToken, data: mp });
  assert('POST message → success', sm.data?.success === true, JSON.stringify(sm.data));
  testMsgId = sm.data?.message?.id;
  assert('Message has id', !!testMsgId, testMsgId || '');

  const gm = await req('GET', '/api/messages', { token: memberToken, params: { channelId: 'general', limit: 10 } });
  assert('GET messages → array', Array.isArray(gm.data?.messages), typeof gm.data?.messages);
  if (gm.data?.messages) assert('Text is decrypted', gm.data.messages.some(m => m.text && !m.text.startsWith('enc:')), 'checked');

  if (testMsgId) {
    const em = await req('PATCH', `/api/messages/${testMsgId}`, { token: memberToken, data: { text: 'Edited msg' } });
    assert('PATCH message → success', em.data?.success === true, JSON.stringify(em.data));
    const dm = await req('DELETE', `/api/messages/${testMsgId}`, { token: memberToken, params: { scope: 'for-everyone' } });
    assert('DELETE message (soft) → success', dm.data?.success === true, JSON.stringify(dm.data));
  }

  // Search
  const sr = await req('GET', '/api/search', { token: memberToken, params: { q: 'E2E', limit: 10 } });
  assert('Search returns results', sr.data?.success === true, JSON.stringify(sr.data));
  const sr2 = await req('GET', '/api/search', { token: memberToken, params: { q: '' } });
  assert('Empty search → 0 results', sr2.data?.total === 0, String(sr2.data?.total));

  // OG preview
  const og = await req('GET', '/api/og', { token: memberToken, params: { url: 'https://example.com' } });
  assert('OG preview → success', og.data?.success === true, JSON.stringify(og.data));
  const og2 = await req('GET', '/api/og', { token: memberToken, params: { url: '' } });
  assert('OG empty URL → 400', og2.status === 400, `${og2.status}`);
}

// ═══════ 5. Kanban ═══════
console.log('\n── 5. Kanban ──');
{
  const td = { text: 'E2E Task', assignee: 'Test User', assigneeEmail: testEmail, assigneeInitials: 'TU', sourceChannel: 'general', status: 'todo' };
  const ct = await req('POST', '/api/kanban', { token: memberToken, data: td });
  assert('POST kanban → success', ct.data?.success === true, JSON.stringify(ct.data));
  testKanbanId = ct.data?.task?.id;
  const gt = await req('GET', '/api/kanban', { token: memberToken });
  assert('GET kanban → array', Array.isArray(gt.data?.tasks), typeof gt.data?.tasks);
  if (testKanbanId) {
    const ut = await req('PATCH', `/api/kanban/${testKanbanId}`, { token: memberToken, data: { status: 'inprogress' } });
    assert('PATCH kanban → success', ut.data?.success === true, JSON.stringify(ut.data));
    const dt = await req('DELETE', `/api/kanban/${testKanbanId}`, { token: memberToken });
    assert('DELETE kanban → success', dt.data?.success === true, JSON.stringify(dt.data));
  }
}

// ═══════ 6. Wiki ═══════
console.log('\n── 6. Wiki ──');
{
  const wd = { id: `e2e-${Date.now()}`, channelId: 'general', title: 'E2E Wiki', content: '<p>Test</p>', isPrivate: false };
  const cw = await req('POST', '/api/wikipages', { token: memberToken, data: wd });
  assert('POST wiki → success', cw.data?.success === true, JSON.stringify(cw.data));
  testWikiId = cw.data?.page?.id || wd.id;
  const gw = await req('GET', '/api/wikipages', { token: memberToken });
  assert('GET wiki → array', Array.isArray(gw.data?.pages), typeof gw.data?.pages);
  if (testWikiId) {
    const dw = await req('DELETE', `/api/wikipages/${testWikiId}`, { token: memberToken });
    assert('DELETE wiki → success', dw.data?.success === true, JSON.stringify(dw.data));
  }
}

// ═══════ 7. Bookmarks ═══════
console.log('\n── 7. Bookmarks ──');
{
  const bkd = { messageId: testMsgId || 'dummy', channelId: 'general', text: 'test', sender: 'TU', timestamp: new Date().toISOString(), userEmail: testEmail };
  const tb = await req('POST', '/api/bookmarks/toggle', { token: memberToken, data: bkd });
  assert('Toggle ON', tb.data?.bookmarked === true, JSON.stringify(tb.data));
  const tb2 = await req('POST', '/api/bookmarks/toggle', { token: memberToken, data: bkd });
  assert('Toggle OFF', tb2.data?.bookmarked === false, JSON.stringify(tb2.data));
  const gb = await req('GET', '/api/bookmarks', { token: memberToken, params: { userEmail: testEmail } });
  assert('GET bookmarks → array', Array.isArray(gb.data?.bookmarks), typeof gb.data?.bookmarks);
  if (gb.data?.bookmarks?.length) {
    const db = await req('DELETE', `/api/bookmarks/${gb.data.bookmarks[0].id}`, { token: memberToken, params: { userEmail: testEmail } });
    assert('DELETE bookmark → success', db.data?.success === true, JSON.stringify(db.data));
  }
}

// ═══════ 8. Notifications ═══════
console.log('\n── 8. Notifications ──');
{
  const nd = { type: 'mention', actor: 'Test User', actorInitials: 'TU', actorColor: '#4f46e5', message: 'E2E test', channel: 'general', timestamp: new Date().toISOString(), recipientEmails: [testEmail] };
  const cn = await req('POST', '/api/notifications', { token: memberToken, data: nd });
  assert('POST notification → success', cn.data?.success === true, JSON.stringify(cn.data));
  const gn = await req('GET', '/api/notifications', { token: memberToken, params: { email: testEmail } });
  assert('GET notifications → array', Array.isArray(gn.data?.notifications), typeof gn.data?.notifications);
}

// ═══════ 9. Leaves ═══════
console.log('\n── 9. Leaves ──');
{
  const ld = { type: 'planned', leaveCategory: 'vacation', startDate: '2026-07-15', endDate: '2026-07-17', duration: 'full', reason: 'E2E test' };
  const cl = await req('POST', '/api/leaves', { token: memberToken, data: ld });
  assert('POST leave → success', cl.data?.success === true, JSON.stringify(cl.data));
  testLeaveId = cl.data?.leave?.id;
  const gl = await req('GET', '/api/leaves', { token: memberToken });
  assert('GET leaves → array', Array.isArray(gl.data?.leaves), typeof gl.data?.leaves);
  if (testLeaveId) {
    const rl = await req('PATCH', `/api/leaves/${testLeaveId}`, { token: adminToken, data: { status: 'approved' } });
    assert('Admin approve leave → success', rl.data?.success === true, JSON.stringify(rl.data));
  }
}

// ═══════ 10. Activity ═══════
console.log('\n── 10. Activity ──');
{
  const hb = await req('POST', '/api/activity/heartbeat', { token: memberToken, data: { currentActivity: 'Testing', currentPanel: 'admin' } });
  assert('Heartbeat → success', hb.data?.success === true, JSON.stringify(hb.data));
  const lm = await req('POST', '/api/activity/message', { token: memberToken });
  assert('Log message → success', lm.data?.success === true, JSON.stringify(lm.data));
  const al = await req('GET', '/api/activity/live', { token: adminToken });
  assert('GET live (admin) → success', al.data?.success === true, JSON.stringify(al.data));
  const as = await req('GET', '/api/activity/stats', { token: adminToken });
  assert('GET stats (admin) → success', as.data?.success === true, JSON.stringify(as.data));
}

// ═══════ 11. Meetings ═══════
console.log('\n── 11. Meetings ──');
{
  const ma = await req('POST', '/api/meeting-access', { token: memberToken, data: { messageId: 'e2e-msg-1', channelId: 'general', allowedEmails: [testEmail] } });
  assert('POST /api/meeting-access → success', ma.data?.success === true, JSON.stringify(ma.data));
  const gma = await req('GET', '/api/meeting-access/e2e-msg-1', { token: memberToken });
  assert('GET /api/meeting-access/:id → success', gma.data?.success === true, JSON.stringify(gma.data));
  const mr = await req('POST', '/api/meeting-requests', { token: memberToken, data: { date: '2026-07-20', time: '15:00', purpose: 'E2E test' } });
  assert('POST /api/meeting-requests → success', mr.data?.success === true, JSON.stringify(mr.data));
  const gmr = await req('GET', '/api/meeting-requests', { token: memberToken });
  assert('GET /api/meeting-requests → array', Array.isArray(gmr.data?.requests), typeof gmr.data?.requests);
}

// ═══════ 12. Media ═══════
console.log('\n── 12. Media ──');
{
  const md = { channelId: 'general', kind: 'audio', url: 'https://example.com/test.webm', mimeType: 'audio/webm', sizeBytes: 1234 };
  const cm = await req('POST', '/api/media', { token: memberToken, data: md });
  assert('POST /api/media → success', cm.data?.success === true, JSON.stringify(cm.data));
  testMediaId = cm.data?.mediaId;
  if (testMediaId) {
    const gm = await req('GET', `/api/media/${testMediaId}`, { token: memberToken });
    assert('GET /api/media/:id → success', gm.data?.success === true, JSON.stringify(gm.data));
  }
}

// ═══════ 13. Admin ═══════
console.log('\n── 13. Admin ──');
{
  const al = await req('GET', '/api/admin/audit-log', { token: adminToken });
  assert('GET audit-log → array', Array.isArray(al.data?.logs), typeof al.data?.logs);

  const ie = `invite-${Date.now()}@example.com`;
  const inv = await req('POST', '/api/admin/invite', { token: adminToken, data: { email: ie, name: 'Invited', role: 'Member' } });
  assert('POST invite → success', inv.data?.success === true, JSON.stringify(inv.data));

  // Create pending request (before rate limit might hit)
  const pe = `pending-${Date.now()}@example.com`;
  const pa = await req('POST', '/api/access-requests', { data: { name: 'Pending U', email: pe, role: 'Member' } });
  assert('Create pending request', pa.data?.success === true, JSON.stringify(pa.data));
  if (pa.data?.request?.id) {
    const gp = await req('POST', '/api/admin/generate-password', { token: adminToken, data: { requestId: pa.data.request.id } });
    assert('Generate password → success', gp.data?.success === true, JSON.stringify(gp.data));
    assert('Password returned', !!gp.data?.generatedPassword, String(!!gp.data?.generatedPassword));
  }
}

// ═══════ 14. Webhooks ═══════
console.log('\n── 14. Webhooks ──');
{
  const wh = await req('POST', '/api/webhooks', { token: memberToken, data: { name: 'E2E Webhook', channelId: 'general', type: 'generic' } });
  assert('POST webhook → success', wh.data?.success === true, JSON.stringify(wh.data));
  testWebhookId = wh.data?.webhook?.id;
  const whToken = wh.data?.webhook?.token;
  const gw = await req('GET', '/api/webhooks', { token: memberToken });
  assert('GET webhooks → array', Array.isArray(gw.data?.webhooks), typeof gw.data?.webhooks);
  if (whToken) {
    const gr = await req('POST', `/webhook/incoming/${whToken}`, { data: { text: 'Test', title: 'Test' } });
    assert('Generic webhook receiver 200', gr.status === 200, `${gr.status}`);
  }
  if (testWebhookId) {
    const uw = await req('PATCH', `/api/webhooks/${testWebhookId}`, { token: memberToken, data: { active: false } });
    assert('PATCH webhook → success', uw.data?.success === true, JSON.stringify(uw.data));
    const dw = await req('DELETE', `/api/webhooks/${testWebhookId}`, { token: memberToken });
    assert('DELETE webhook → success', dw.data?.success === true, JSON.stringify(dw.data));
  }
}

// ═══════ 15. Channels CRUD ═══════
console.log('\n── 15. Channels ──');
{
  const cc = await req('POST', '/api/channels', { token: adminToken, data: { name: `e2e-${Date.now()}`, description: 'E2E test' } });
  assert('POST channel (admin) → success', cc.data?.success === true, JSON.stringify(cc.data));
  testChannelId = cc.data?.channel?.id;
  if (testChannelId) {
    const uc = await req('PATCH', `/api/channels/${testChannelId}`, { token: adminToken, data: { description: 'Updated' } });
    assert('PATCH channel → success', uc.data?.success === true, JSON.stringify(uc.data));
    const dc = await req('DELETE', `/api/channels/${testChannelId}`, { token: adminToken });
    assert('DELETE channel → success', dc.data?.success === true, JSON.stringify(dc.data));
  }
}

// ═══════ 16. CORS ═══════
console.log('\n── 16. CORS ──');
try {
  const co = await axios.options(`${BASE}/api/health`, {
    headers: { Origin: 'http://localhost:3000', 'Access-Control-Request-Method': 'GET' },
    validateStatus: () => true
  });
  assert('CORS headers present', !!co.headers['access-control-allow-origin'], co.headers['access-control-allow-origin'] || 'missing');
} catch(e) { assert('CORS preflight', false, e.message); }

// ═══════ 17. Rate Limiting (LAST — exhausts auth limiter) ═══════
console.log('\n── 17. Rate Limiting ──');
{
  let limited = false;
  for (let i = 0; i < 15; i++) {
    const r = await req('POST', '/api/auth/login', { data: { email: 'rl@test.com', password: 'x' } });
    if (r.status === 429) { limited = true; break; }
  }
  assert('Auth rate limiter triggers after 10 attempts', limited, String(limited));
}

// ═══════ 18. DB Encryption Check ═══════
console.log('\n── 18. Encryption Check ──');
try {
  const mongoose = require('mongoose');
  await mongoose.connect('mongodb+srv://edutechexos121_db_user:Edutechexos_12@cluster0.fh6t6wn.mongodb.net/edutechexos?appName=Cluster0', { serverSelectionTimeoutMS: 5000 });
  const msg = await mongoose.connection.collection('messages').findOne({ senderEmail: testEmail });
  if (msg?.text) {
    assert('Message encrypted in DB', msg.text.startsWith('enc:'), msg.text.slice(0, 20));
  } else assert('Message found for encryption check', false, 'no msg found');
  await mongoose.disconnect();
} catch (e) { console.log(`  [note] DB encryption check skipped (${e.message})`); }

// ═══════ REPORT ═══════
const total = PASS + FAIL;
const rate = total ? ((PASS / total) * 100).toFixed(1) : '0.0';
console.log('\n══════════════════════════════════════════════════════════');
console.log(' TEST RESULTS SUMMARY');
console.log('══════════════════════════════════════════════════════════');
console.log(`  Total:  ${total}`);
console.log(`  Passed: ${PASS}`);
console.log(`  Failed: ${FAIL}`);
console.log(`  Rate:   ${rate}%`);
console.log('');
if (FAIL > 0) {
  console.log('── Failed ──');
  results.filter(r => r.status === 'FAIL').forEach(r => console.log(`  ✗ ${r.desc}\n    ${r.detail}`));
  console.log('\n⚠ Issues found.');
} else console.log('✅ All systems operational.');
console.log('══════════════════════════════════════════════════════════\n');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
