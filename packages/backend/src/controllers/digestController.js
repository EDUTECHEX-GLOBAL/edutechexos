const { sendDigestEmails } = require('../services/digestService');

async function sendDigest(req, res) {
  const isAdmin = req.user && req.user.role === 'Admin';
  const cronSecret = process.env.CRON_SECRET;
  const hasCronKey = cronSecret && req.headers['x-cron-secret'] === cronSecret;
  if (!isAdmin && !hasCronKey) {
    return res.status(403).json({ success: false, error: 'Admin access or cron secret required.' });
  }
  try {
    const since = req.body.since ? new Date(req.body.since) : undefined;
    const result = await sendDigestEmails(since);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[digest]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
}

module.exports = { sendDigest };
