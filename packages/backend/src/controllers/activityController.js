const { ActivitySession, AWActivity, LoginEvent, AccessRequest, UserSettings } = require('../models/index');

// ── Work-hours window (IST): 10:00–18:30 — all activity metrics must stay inside this span ──
const IST_OFFSET_MS   = 5.5 * 60 * 60 * 1000;
const WORK_START_MIN  = 10 * 60;       // 10:00
const WORK_END_MIN    = 18 * 60 + 30;  // 18:30
const MAX_WORK_MIN    = WORK_END_MIN - WORK_START_MIN; // 510
const MAX_WORK_SEC    = MAX_WORK_MIN * 60;             // 30600

function istDateStr(now = new Date()) {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function istMinutesOfDay(now = new Date()) {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  return ist.getUTCHours() * 60 + ist.getUTCMinutes();
}

function isWithinWorkHoursIST(now = new Date()) {
  const m = istMinutesOfDay(now);
  return m >= WORK_START_MIN && m < WORK_END_MIN;
}

function isMinInWorkWindow(mStr) {
  const p = /^(\d{1,2}):(\d{2})$/.exec(String(mStr || ''));
  if (!p) return false;
  const mins = parseInt(p[1], 10) * 60 + parseInt(p[2], 10);
  return mins >= WORK_START_MIN && mins < WORK_END_MIN;
}

function clampWorkMinutes(n) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(MAX_WORK_MIN, Math.max(0, Math.round(v))) : 0;
}

function clampWorkSeconds(n) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(MAX_WORK_SEC, Math.max(0, Math.round(v))) : 0;
}

function itemWorkSeconds(seconds, minutes) {
  const s = clampWorkSeconds(seconds);
  if (s > 0) return s;
  return clampWorkSeconds((Number(minutes) || 0) * 60);
}

async function heartbeat(req, res) {
  try {
    const email = req.user?.email?.toLowerCase();
    const name  = req.user?.name ?? '';
    if (!email) return res.status(401).json({ success: false });
    const { currentActivity = '', currentPanel = '' } = req.body || {};
    const now = new Date();
    const dateStr = istDateStr(now);
    const session = await ActivitySession.findOneAndUpdate(
      { email, dateStr },
      { $setOnInsert: { email, name, dateStr, totalMinutes: 0, messageCount: 0, taskCount: 0, sessionStart: now } },
      { upsert: true, new: true }
    );
    // Backfill sessionStart for rows that predate this field (or were created
    // before the login-gate existed), so the agent's gate works right away.
    if (!session.sessionStart) {
      await ActivitySession.updateOne({ email, dateStr }, { $set: { sessionStart: now } });
    }
    const update = { $set: { lastHeartbeat: now, name, currentActivity, currentPanel } };
    // Only accumulate session minutes during the official work window (10:00–18:30 IST).
    if (isWithinWorkHoursIST(now)) {
      let minutesToAdd = 1;
      const lastBeat = session.lastHeartbeat || session.createdAt;
      if (lastBeat) {
        const gapMin = (now - new Date(lastBeat)) / 60000;
        minutesToAdd = Math.min(Math.max(0, Math.round(gapMin)), 5);
      }
      update.$inc = { totalMinutes: minutesToAdd };
    }
    await ActivitySession.updateOne({ email, dateStr }, update);
    const io = req.app.get('io');
    if (io) io.emit('user_activity_update', {
      email, name, currentActivity, currentPanel,
      lastSeen: now.toISOString(),
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function getLive(req, res) {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Admin only.' });
    }
    const threeMinAgo = new Date(Date.now() - 3 * 60 * 1000);
    const todayStr = istDateStr();
    const active = await ActivitySession.find({
      dateStr: todayStr,
      lastHeartbeat: { $gte: threeMinAgo },
    }).lean();
    const live = active.map((s) => ({
      email:           s.email,
      name:            s.name,
      currentActivity: s.currentActivity || 'Active',
      currentPanel:    s.currentPanel    || 'dashboard',
      lastSeen:        s.lastHeartbeat,
      todayMinutes:    clampWorkMinutes(s.totalMinutes),
    }));
    res.json({ success: true, live });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function getHistory(req, res) {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Admin only.' });
    }
    const todayStr  = istDateStr();
    const dateStr   = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date) ? req.query.date : todayStr;
    const sessions = await ActivitySession.find({ dateStr }).sort({ totalMinutes: -1 }).lean();
    const rows = sessions.map((s) => ({
      email:           s.email,
      name:            s.name,
      totalMinutes:    clampWorkMinutes(s.totalMinutes),
      messageCount:    s.messageCount    || 0,
      taskCount:       s.taskCount       || 0,
      lastSeen:        s.lastHeartbeat,
      currentActivity: s.currentActivity || '',
      currentPanel:    s.currentPanel    || '',
    }));
    res.json({ success: true, sessions: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function getStats(req, res) {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Admin only.' });
    }
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const istOffset = 5.5 * 60 * 60 * 1000;
    const cutoffStr = new Date(sevenDaysAgo.getTime() + istOffset).toISOString().slice(0, 10);
    const sessions = await ActivitySession.find({ dateStr: { $gte: cutoffStr } }).lean();
    const statsMap = {};
    sessions.forEach((s) => {
      if (!statsMap[s.email]) {
        statsMap[s.email] = {
          email: s.email, name: s.name, totalMinutes: 0, activeDays: 0,
          lastSeen: null, messageCount: 0, taskCount: 0,
        };
      }
      const u = statsMap[s.email];
      u.totalMinutes += s.totalMinutes || 0;
      u.messageCount += s.messageCount || 0;
      u.taskCount    += s.taskCount    || 0;
      u.activeDays   += 1;
      if (!u.lastSeen || (s.lastHeartbeat && new Date(s.lastHeartbeat) > new Date(u.lastSeen))) {
        u.lastSeen = s.lastHeartbeat;
      }
    });
    const allRequests = await AccessRequest.find({ status: 'approved' }).lean();
    allRequests.forEach((r) => {
      const e = r.email.toLowerCase();
      if (!statsMap[e]) {
        statsMap[e] = { email: e, name: r.name, totalMinutes: 0, activeDays: 0, lastSeen: null, messageCount: 0, taskCount: 0 };
      }
    });
    res.json({ success: true, stats: Object.values(statsMap) });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function awSync(req, res) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    const email = req.user.email.toLowerCase();
    const name  = req.user.name || '';
    const {
      currentApp, currentTitle, isAfk,
      totalActiveMinutes, totalAfkMinutes,
      totalActiveSeconds, totalAfkSeconds,
      appBreakdown, recentApps, timeline,
      currentUrl, currentPageTitle, webBreakdown,
      deviceId, deviceName,
      dateStr: payloadDateStr,
    } = req.body;

    // ── One-device-per-user enforcement ──────────────────────────────────────
    if (deviceId) {
      const settings = await UserSettings.findOneAndUpdate(
        { email },
        { $setOnInsert: { email } },
        { upsert: true, new: true }
      );
      if (!settings.awDeviceId) {
        // First time — register this device
        await UserSettings.updateOne({ email }, { awDeviceId: deviceId, awDeviceName: deviceName || deviceId });
      } else if (settings.awDeviceId !== deviceId) {
        return res.status(403).json({
          success: false,
          error: `Agent already registered on another device (${settings.awDeviceName || settings.awDeviceId}). Ask your admin to reset the device lock.`,
        });
      }
    }
    // ─────────────────────────────────────────────────────────────────────────
    // Use client-supplied dateStr (for historical backfill) or fall back to today in IST
    const dateStr = /^\d{4}-\d{2}-\d{2}$/.test(payloadDateStr)
      ? payloadDateStr
      : istDateStr();

    // Never store today's AW data outside the work window.
    if (dateStr === istDateStr() && !isWithinWorkHoursIST()) {
      return res.json({ success: true, skipped: true });
    }

    const clampMin = clampWorkMinutes;
    const clampSec = clampWorkSeconds;
    const itemSec  = itemWorkSeconds;
    const str = (s, max) => String(s ?? '').slice(0, max);
    // Keep EVERY app/tab (capped generously for safety, not trimmed to a top-N).
    const iso = (v) => (typeof v === 'string' && v.length <= 40 ? v : null);
    const safeApps = Array.isArray(appBreakdown)
      ? appBreakdown.slice(0, 300).map((a) => ({
          app: str(a?.app, 200),
          minutes: clampMin(a?.minutes),
          seconds: itemSec(a?.seconds, a?.minutes),
          firstSeen: iso(a?.firstSeen), lastSeen: iso(a?.lastSeen),
        }))
      : [];
    const safeWeb = Array.isArray(webBreakdown)
      ? webBreakdown.slice(0, 300).map((w) => ({
          domain: str(w?.domain, 200),
          minutes: clampMin(w?.minutes),
          seconds: itemSec(w?.seconds, w?.minutes),
          title: str(w?.title, 300), lastSeen: iso(w?.lastSeen),
        }))
      : [];
    const safeRecent = Array.isArray(recentApps)
      ? recentApps.slice(0, 30).map((r) => ({
          app: str(r?.app, 200),
          seconds: itemSec(r?.seconds, r?.minutes),
          lastSeen: iso(r?.lastSeen),
        }))
      : [];
    // Minute-by-minute timeline — only keep entries within the work window.
    const safeTimeline = Array.isArray(timeline)
      ? timeline
          .slice(-1440)
          .filter((t) => isMinInWorkWindow(t?.m))
          .map((t) => ({
            m: str(t?.m, 5), app: str(t?.app, 200), title: str(t?.title, 300),
            tab: str(t?.tab, 300), seconds: Math.min(60, clampSec(t?.seconds)),
            afkSeconds: Math.min(60, clampSec(t?.afkSeconds)),
          }))
      : [];
    const safeAppsFiltered = safeApps.filter((a) => itemSec(a.seconds, a.minutes) > 0);
    const safeWebFiltered  = safeWeb.filter((w) => itemSec(w.seconds, w.minutes) > 0);

    await AWActivity.findOneAndUpdate(
      { email, dateStr },
      {
        $set: {
          name,
          currentApp:       str(currentApp, 200),
          currentTitle:     str(currentTitle, 300),
          isAfk:            !!isAfk,
          totalActiveMinutes: clampMin(totalActiveMinutes),
          totalAfkMinutes:  clampMin(totalAfkMinutes),
          totalActiveSeconds: itemSec(totalActiveSeconds, totalActiveMinutes),
          totalAfkSeconds:  itemSec(totalAfkSeconds, totalAfkMinutes),
          appBreakdown:     safeAppsFiltered,
          recentApps:       safeRecent,
          timeline:         safeTimeline,
          currentUrl:       str(currentUrl, 500),
          currentPageTitle: str(currentPageTitle, 300),
          webBreakdown:     safeWebFiltered,
          lastSync: new Date(),
        },
      },
      { upsert: true, new: true }
    );
    const io = req.app.get('io');
    if (io) io.emit('aw_sync', {
      email,
      currentApp:  currentApp  || '',
      currentUrl:  currentUrl  || '',
      isAfk:       isAfk       ?? false,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

// Lightweight, high-frequency "what am I doing right now" ping. Updates only the
// current app/tab + freshness, without recomputing the daily breakdown — so the
// agent can call it every ~15s to keep the admin's live view current, cheaply.
async function awCurrent(req, res) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    if (!isWithinWorkHoursIST()) {
      return res.json({ success: true, skipped: true });
    }
    const email = req.user.email.toLowerCase();
    const name  = req.user.name || '';
    const { currentApp, currentTitle, currentUrl, currentPageTitle, isAfk } = req.body || {};

    const dateStr = istDateStr();
    const str = (s, max) => String(s ?? '').slice(0, max);

    await AWActivity.findOneAndUpdate(
      { email, dateStr },
      {
        $set: {
          name,
          currentApp:       str(currentApp, 200),
          currentTitle:     str(currentTitle, 300),
          currentUrl:       str(currentUrl, 500),
          currentPageTitle: str(currentPageTitle, 300),
          isAfk:            !!isAfk,
          lastSync:         new Date(),
        },
      },
      { upsert: true }
    );

    const io = req.app.get('io');
    if (io) io.emit('aw_current', {
      email,
      currentApp:   str(currentApp, 200),
      currentTitle: str(currentTitle, 300),
      currentUrl:   str(currentUrl, 500),
      isAfk:        !!isAfk,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

// When did this user open the EduTechExOS web app on a given day? The agent uses
// this to only count desktop activity from login onward (not from laptop boot).
async function getSessionStart(req, res) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    const email = req.user.email.toLowerCase();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const todayIST = new Date(Date.now() + istOffset).toISOString().slice(0, 10);
    const dateStr = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date) ? req.query.date : todayIST;
    const session = await ActivitySession.findOne({ email, dateStr }).lean();
    const sessionStart = session?.sessionStart ? new Date(session.sessionStart).toISOString() : null;
    res.json({ success: true, sessionStart });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function getAw(req, res) {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Admin only.' });
    }
    const todayIST = istDateStr();
    const dateStr = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date) ? req.query.date : todayIST;
    const records = await AWActivity.find({ dateStr }).lean();
    const hideLive  = dateStr === todayIST && !isWithinWorkHoursIST();

    const safeRecords = records.map((r) => ({
      ...r,
      currentApp:       hideLive ? '' : (r.currentApp || ''),
      currentTitle:     hideLive ? '' : (r.currentTitle || ''),
      currentUrl:       hideLive ? '' : (r.currentUrl || ''),
      currentPageTitle: hideLive ? '' : (r.currentPageTitle || ''),
      isAfk:            hideLive ? false : !!r.isAfk,
      totalActiveMinutes:  clampWorkMinutes(r.totalActiveMinutes),
      totalAfkMinutes:     clampWorkMinutes(r.totalAfkMinutes),
      totalActiveSeconds:  itemWorkSeconds(r.totalActiveSeconds, r.totalActiveMinutes),
      totalAfkSeconds:     itemWorkSeconds(r.totalAfkSeconds, r.totalAfkMinutes),
      appBreakdown: (r.appBreakdown || [])
        .map((a) => ({
          ...a,
          minutes: clampWorkMinutes(a.minutes),
          seconds: itemWorkSeconds(a.seconds, a.minutes),
        }))
        .filter((a) => itemWorkSeconds(a.seconds, a.minutes) > 0),
      webBreakdown: (r.webBreakdown || [])
        .map((w) => ({
          ...w,
          minutes: clampWorkMinutes(w.minutes),
          seconds: itemWorkSeconds(w.seconds, w.minutes),
        }))
        .filter((w) => itemWorkSeconds(w.seconds, w.minutes) > 0),
      recentApps: (r.recentApps || []).filter((ra) => itemWorkSeconds(ra.seconds, ra.minutes) > 0),
      timeline: (r.timeline || []).filter((t) => isMinInWorkWindow(t?.m)),
    }));

    res.json({ success: true, records: safeRecords, dateStr });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function logMessage(req, res) {
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
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function getLoginHistory(req, res) {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Admin only.' });
    }
    const events = await LoginEvent.find({}).sort({ loginAt: -1 }).lean();

    const history = {};
    const attendance = {};
    for (const e of events) {
      const email = e.email;
      if (!history[email]) history[email] = [];
      if (!history[email].includes(e.dateStr)) history[email].push(e.dateStr);
      if (!attendance[email]) attendance[email] = {};
      if (e.attendance) attendance[email][e.dateStr] = e.attendance;
    }

    res.json({ success: true, history, attendance });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function getAttendance(req, res) {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Admin only.' });
    }
    const { date } = req.query;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, error: 'date query param required (YYYY-MM-DD).' });
    }

    const Leave = require('../models/Leave');
    const [events, leaves] = await Promise.all([
      LoginEvent.find({ dateStr: date }).lean(),
      Leave.find({ status: 'approved', startDate: { $lte: date } }).lean(),
    ]);

    const approvedLeaveEmails = new Set(
      leaves
        .filter(l => !l.endDate || l.endDate >= date)
        .map(l => l.email.toLowerCase())
    );

    const records = events.map(e => {
      let attendance = e.attendance;
      const prevHours = e.hoursWorked || 0;
      const currentStart = e.lastLoginAt || e.loginAt;
      const currentSegment = (!e.logoutAt && currentStart)
        ? Math.max(0, (new Date() - new Date(currentStart)) / (1000 * 60 * 60))
        : 0;
      const computedHours = Math.round((prevHours + currentSegment) * 100) / 100;

      if (!attendance) {
        if (approvedLeaveEmails.has(e.email.toLowerCase())) {
          attendance = 'absent';
        } else {
          attendance = computedHours >= 8 ? 'full' : 'half';
        }
      }
      if (!attendance && approvedLeaveEmails.has(e.email.toLowerCase())) {
        attendance = 'absent';
      }
      return {
        email: e.email,
        name: e.name,
        loginAt: e.loginAt,
        lastLoginAt: e.lastLoginAt || e.loginAt,
        logoutAt: e.logoutAt ?? null,
        hoursWorked: computedHours > 0 ? computedHours : (e.hoursWorked ?? null),
        attendance,
      };
    });

    res.json({ success: true, date, records });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function getMyAttendance(req, res) {
  try {
    const email = req.user?.email?.toLowerCase();
    if (!email) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    const events = await LoginEvent.find({ email }).sort({ loginAt: -1 }).lean();
    const dates = [...new Set(events.map(e => e.dateStr).filter(Boolean))];
    res.json({ success: true, dates });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

// Returns the list of emails that have logged in TODAY (IST). Drives the
// green/red presence dots in the sidebar. Kept consistent with the dateStr
// computed in authController on login (en-CA + Asia/Kolkata → YYYY-MM-DD).
async function getLoginStatus(req, res) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const events = await LoginEvent.find({ dateStr }).select('email').lean();
    const loggedInEmails = [...new Set(events.map(e => e.email.toLowerCase()).filter(Boolean))];
    // Live presence (currently-connected sockets) — distinct from "logged in today".
    const io = req.app.get('io');
    const onlineEmails = typeof io?.getOnlineEmails === 'function' ? io.getOnlineEmails() : [];
    res.json({ success: true, loggedInEmails, onlineEmails, dateStr });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function getAWStatus(req, res) {
  try {
    if (!req.user) return res.status(401).json({ success: false });
    const email = req.user.email.toLowerCase();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const istOffset = 5.5 * 60 * 60 * 1000;
    const dateStr = new Date(Date.now() + istOffset).toISOString().slice(0, 10);
    const recent = await AWActivity.findOne(
      { email, dateStr, lastSync: { $gte: tenMinutesAgo } },
      { lastSync: 1 }
    ).lean();
    res.json({ success: true, connected: !!recent, lastSync: recent?.lastSync ?? null });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

// aw-sync.js calls this before each sync to decide whether to send data.
// Login-triggered / full-window model: returns { active: true } if the user has
// opened the dashboard at any point TODAY (an ActivitySession exists) — even if
// the browser is now closed. ActivitySession is created only by the dashboard
// heartbeat (never by the agent's own login), so this means "the user logged into
// the app today". The agent still enforces the 10:00–18:30 work window itself, so
// a single morning login keeps tracking running all day.
async function isSessionActive(req, res) {
  try {
    if (!req.user) return res.status(401).json({ success: false });
    const email = req.user.email.toLowerCase();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const dateStr = new Date(Date.now() + istOffset).toISOString().slice(0, 10);
    const session = await ActivitySession.findOne({ email, dateStr }, { _id: 1 }).lean();
    res.json({ success: true, active: !!session });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function resetAwDevice(req, res) {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Admin only.' });
    }
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'email required.' });
    await UserSettings.updateOne(
      { email: email.toLowerCase() },
      { awDeviceId: '', awDeviceName: '' },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

// Week-over-week team activity trend, most recent `weeks` 7-day buckets
// (bucket 0 = the 7 days ending today). Used by the admin trend chart.
async function getTrend(req, res) {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Admin only.' });
    }
    const weeks = Math.min(Math.max(parseInt(req.query.weeks, 10) || 4, 1), 12);
    const msPerDay = 86400000;
    const istOffset = 5.5 * 60 * 60 * 1000;
    const todayIST = new Date(Date.now() + istOffset);
    const cutoffStr = new Date(todayIST.getTime() - weeks * 7 * msPerDay).toISOString().slice(0, 10);

    const sessions = await ActivitySession.find({ dateStr: { $gte: cutoffStr } }).lean();

    const weekIndexForDate = (dateStr) => {
      const d = new Date(`${dateStr}T00:00:00Z`);
      const diffDays = Math.floor((todayIST.getTime() - d.getTime()) / msPerDay);
      return Math.floor(diffDays / 7);
    };

    const buckets = Array.from({ length: weeks }, (_, i) => {
      const endDate = new Date(todayIST.getTime() - i * 7 * msPerDay);
      const startDate = new Date(endDate.getTime() - 6 * msPerDay);
      return {
        label: i === 0 ? 'This week' : i === 1 ? 'Last week' : `${i} weeks ago`,
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
        totalMinutes: 0,
        activeUsers: new Set(),
        byUser: {},
      };
    });

    sessions.forEach((s) => {
      const idx = weekIndexForDate(s.dateStr);
      if (idx < 0 || idx >= weeks) return;
      const bucket = buckets[idx];
      bucket.totalMinutes += s.totalMinutes || 0;
      bucket.activeUsers.add(s.email);
      if (!bucket.byUser[s.email]) {
        bucket.byUser[s.email] = { email: s.email, name: s.name, totalMinutes: 0, messageCount: 0, taskCount: 0 };
      }
      bucket.byUser[s.email].totalMinutes += s.totalMinutes || 0;
      bucket.byUser[s.email].messageCount += s.messageCount || 0;
      bucket.byUser[s.email].taskCount += s.taskCount || 0;
    });

    const result = buckets
      .slice()
      .reverse()
      .map((b) => ({
        label: b.label,
        startDate: b.startDate,
        endDate: b.endDate,
        totalMinutes: b.totalMinutes,
        activeUserCount: b.activeUsers.size,
        byUser: Object.values(b.byUser).sort((a, c) => c.totalMinutes - a.totalMinutes),
      }));

    res.json({ success: true, weeks: result });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}


module.exports = { heartbeat, getLive, getHistory, getStats, awSync, awCurrent, getAw, getAWStatus, isSessionActive, getSessionStart, logMessage, getAttendance, getLoginHistory, getMyAttendance, getLoginStatus, resetAwDevice, getTrend };

