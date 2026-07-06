const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const googleCalendarService = require('../services/googleCalendarService');

// Short-lived state token so Google's redirect back to our server (a plain
// browser GET with no Authorization header) can still tell us which logged-in
// user initiated the connection.
function signState(email) {
  return jwt.sign({ email, purpose: 'gcal-connect' }, JWT_SECRET, { expiresIn: '10m' });
}
function verifyState(state) {
  const decoded = jwt.verify(state, JWT_SECRET);
  if (decoded.purpose !== 'gcal-connect' || !decoded.email) throw new Error('Invalid state');
  return decoded.email;
}

async function getAuthUrl(req, res) {
  if (!googleCalendarService.isConfigured()) {
    return res.status(503).json({ success: false, error: 'Google Calendar is not configured on this server yet.' });
  }
  const state = signState(req.user.email);
  res.json({ success: true, url: googleCalendarService.getAuthUrl(state) });
}

async function oauthCallback(req, res) {
  const appUrl = process.env.APP_URL || 'https://edutechexos.vercel.app';
  const redirectBase = `${appUrl}/dashboard`;
  try {
    const { code, state, error } = req.query;
    if (error) return res.redirect(`${redirectBase}?gcal=denied`);
    if (!code || !state) return res.redirect(`${redirectBase}?gcal=error`);

    const email = verifyState(state);
    await googleCalendarService.connect(email, code);
    res.redirect(`${redirectBase}?gcal=connected`);
  } catch (err) {
    console.error('[google-calendar] oauth callback failed:', err);
    res.redirect(`${redirectBase}?gcal=error`);
  }
}

async function getStatus(req, res) {
  try {
    const status = await googleCalendarService.getStatus(req.user.email);
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function disconnect(req, res) {
  try {
    await googleCalendarService.disconnect(req.user.email);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function syncEvent(req, res) {
  try {
    const { externalId, title, description, startAt, endAt, location } = req.body;
    if (!externalId || !title) {
      return res.status(400).json({ success: false, error: 'externalId and title are required.' });
    }
    const result = await googleCalendarService.upsertEvent(req.user.email, {
      externalId, title, description, startAt, endAt, location,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

module.exports = { getAuthUrl, oauthCallback, getStatus, disconnect, syncEvent };
