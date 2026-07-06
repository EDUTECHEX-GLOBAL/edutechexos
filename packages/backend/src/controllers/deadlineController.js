const Deadline = require('../models/Deadline');

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const istDateStr = (ms) => new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);

// POST /api/deadlines/sync
// The frontend detects deadlines from chat (per-user) and pushes them here so a
// cron can email reminders. Body: { deadlines: [{ externalId, task, channel, snippet, dateMs }] }
async function syncDeadlines(req, res) {
  try {
    const email = req.user?.email?.toLowerCase();
    if (!email) return res.status(401).json({ success: false, error: 'Unauthorized.' });

    const list = Array.isArray(req.body?.deadlines) ? req.body.deadlines.slice(0, 200) : [];
    const now = Date.now();
    let upserts = 0;

    for (const d of list) {
      const dateMs = Number(d?.dateMs);
      const externalId = String(d?.externalId || '').slice(0, 200);
      // Only store dated, not-long-past deadlines (nothing to remind otherwise).
      if (!externalId || !Number.isFinite(dateMs) || dateMs < now - 2 * 86400000) continue;
      await Deadline.updateOne(
        { email, externalId },
        {
          $set: {
            task:       String(d?.task || '').slice(0, 300),
            channel:    String(d?.channel || '').slice(0, 120),
            snippet:    String(d?.snippet || '').slice(0, 500),
            dateMs,
            dueDateStr: istDateStr(dateMs),
          },
        },
        { upsert: true }
      );
      upserts += 1;
    }

    // Bound growth: drop this user's deadlines that are well in the past.
    await Deadline.deleteMany({ email, dateMs: { $lt: now - 3 * 86400000 } });

    res.json({ success: true, count: upserts });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

module.exports = { syncDeadlines };
