const { ActivitySession, AWActivity, LoginEvent, AccessRequest } = require('../models/index');

async function heartbeat(req, res) {
  try {
    const email = req.user?.email?.toLowerCase();
    const name  = req.user?.name ?? '';
    if (!email) return res.status(401).json({ success: false });
    const { currentActivity = '', currentPanel = '' } = req.body || {};
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    const dateStr = istDate.toISOString().slice(0, 10);
    const session = await ActivitySession.findOneAndUpdate(
      { email, dateStr },
      { $setOnInsert: { email, name, dateStr, totalMinutes: 0, messageCount: 0, taskCount: 0 } },
      { upsert: true, new: true }
    );
    let minutesToAdd = 1;
    if (session.lastHeartbeat) {
      const gapMin = (now - new Date(session.lastHeartbeat)) / 60000;
      minutesToAdd = Math.min(Math.round(gapMin), 5);
    }
    await ActivitySession.updateOne(
      { email, dateStr },
      {
        $set:  { lastHeartbeat: now, name, currentActivity, currentPanel },
        $inc:  { totalMinutes: minutesToAdd },
      }
    );
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
    const istOffset   = 5.5 * 60 * 60 * 1000;
    const todayStr    = new Date(Date.now() + istOffset).toISOString().slice(0, 10);
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
      todayMinutes:    s.totalMinutes    || 0,
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
    const istOffset = 5.5 * 60 * 60 * 1000;
    const todayStr  = new Date(Date.now() + istOffset).toISOString().slice(0, 10);
    const dateStr   = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date) ? req.query.date : todayStr;
    const sessions = await ActivitySession.find({ dateStr }).sort({ totalMinutes: -1 }).lean();
    const rows = sessions.map((s) => ({
      email:           s.email,
      name:            s.name,
      totalMinutes:    s.totalMinutes    || 0,
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
      appBreakdown,
      currentUrl, currentPageTitle, webBreakdown,
    } = req.body;
    const istOffset = 5.5 * 60 * 60 * 1000;
    const dateStr = new Date(Date.now() + istOffset).toISOString().slice(0, 10);
    await AWActivity.findOneAndUpdate(
      { email, dateStr },
      {
        $set: {
          name,
          currentApp:       currentApp       || '',
          currentTitle:     currentTitle     || '',
          isAfk:            isAfk            ?? false,
          totalActiveMinutes: totalActiveMinutes || 0,
          totalAfkMinutes:  totalAfkMinutes  || 0,
          appBreakdown:     Array.isArray(appBreakdown)  ? appBreakdown.slice(0, 15)  : [],
          currentUrl:       currentUrl       || '',
          currentPageTitle: currentPageTitle || '',
          webBreakdown:     Array.isArray(webBreakdown)  ? webBreakdown.slice(0, 20)  : [],
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

async function getAw(req, res) {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Admin only.' });
    }
    const istOffset = 5.5 * 60 * 60 * 1000;
    const todayIST = new Date(Date.now() + istOffset).toISOString().slice(0, 10);
    const dateStr = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date) ? req.query.date : todayIST;
    const records = await AWActivity.find({ dateStr }).lean();
    res.json({ success: true, records, dateStr });
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
      if (!attendance) {
        if (approvedLeaveEmails.has(e.email.toLowerCase())) {
          attendance = 'absent';
        } else if (e.logoutAt) {
          const hrs = (new Date(e.logoutAt) - new Date(e.loginAt)) / (1000 * 60 * 60);
          attendance = hrs >= 8 ? 'full' : 'half';
        } else {
          attendance = null;
        }
      }
      if (!attendance && approvedLeaveEmails.has(e.email.toLowerCase())) {
        attendance = 'absent';
      }
      return {
        email: e.email,
        name: e.name,
        loginAt: e.loginAt,
        logoutAt: e.logoutAt ?? null,
        hoursWorked: e.hoursWorked ?? null,
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
    res.json({ success: true, loggedInEmails, dateStr });
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

// aw-sync.js calls this before each sync to decide whether the user is logged in.
// Returns { active: true } only if the dashboard has sent a heartbeat in the last 3 min.
async function isSessionActive(req, res) {
  try {
    if (!req.user) return res.status(401).json({ success: false });
    const email = req.user.email.toLowerCase();
    const threeMinAgo = new Date(Date.now() - 3 * 60 * 1000);
    const istOffset = 5.5 * 60 * 60 * 1000;
    const dateStr = new Date(Date.now() + istOffset).toISOString().slice(0, 10);
    const session = await ActivitySession.findOne(
      { email, dateStr, lastHeartbeat: { $gte: threeMinAgo } },
      { lastHeartbeat: 1 }
    ).lean();
    res.json({ success: true, active: !!session });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

module.exports = { heartbeat, getLive, getHistory, getStats, awSync, getAw, getAWStatus, isSessionActive, logMessage, getAttendance, getLoginHistory, getMyAttendance, getLoginStatus };
