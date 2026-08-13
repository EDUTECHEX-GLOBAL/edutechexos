// ── Google Calendar sync (OAuth2 + REST, no googleapis dependency) ─────────
// Lets a user connect their Google account once; after that we can create/
// update events directly on their calendar (meetings + detected deadlines)
// so they get Google's native phone notifications without manually clicking
// "Add to Calendar" every time.

const { GoogleCalendarToken, SyncedCalendarEvent } = require('../models/index');

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const GOOGLE_CALENDAR_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

const SCOPE = 'https://www.googleapis.com/auth/calendar.events openid email';

function isConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI);
}

function getAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

async function exchangeCodeForTokens(code) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || 'Token exchange failed');
  return data; // { access_token, refresh_token, expires_in, scope, ... }
}

async function refreshAccessToken(refreshToken) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || 'Token refresh failed');
  return data; // { access_token, expires_in, scope, ... }
}

async function fetchGoogleEmail(accessToken) {
  try {
    const res = await fetch(GOOGLE_USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) return '';
    const data = await res.json();
    return data.email || '';
  } catch {
    return '';
  }
}

async function connect(userEmail, code) {
  const tokens = await exchangeCodeForTokens(code);
  const googleEmail = await fetchGoogleEmail(tokens.access_token);
  const expiryDate = Date.now() + (tokens.expires_in || 3600) * 1000;

  await GoogleCalendarToken.findOneAndUpdate(
    { userEmail },
    {
      $set: {
        googleEmail,
        accessToken: tokens.access_token,
        expiryDate,
        scope: tokens.scope || '',
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
      },
    },
    { upsert: true, new: true }
  );
  return { googleEmail };
}

async function getStatus(userEmail) {
  const doc = await GoogleCalendarToken.findOne({ userEmail }).lean();
  if (!doc) return { connected: false };
  return { connected: true, googleEmail: doc.googleEmail };
}

async function disconnect(userEmail) {
  const doc = await GoogleCalendarToken.findOne({ userEmail }).lean();
  if (doc) {
    try {
      await fetch(`${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(doc.refreshToken)}`, { method: 'POST' });
    } catch (_) { /* best-effort revoke */ }
  }
  await GoogleCalendarToken.deleteOne({ userEmail });
  await SyncedCalendarEvent.deleteMany({ userEmail });
}

// Returns a valid access token for this user, refreshing it if expired.
// Returns null if the user hasn't connected Google Calendar.
async function getValidAccessToken(userEmail) {
  if (!isConfigured()) return null;
  const doc = await GoogleCalendarToken.findOne({ userEmail });
  if (!doc) return null;

  if (Date.now() < doc.expiryDate - 60000) return doc.accessToken;

  if (!doc.refreshToken) return null;

  try {
    const refreshed = await refreshAccessToken(doc.refreshToken);
    doc.accessToken = refreshed.access_token;
    doc.expiryDate = Date.now() + (refreshed.expires_in || 3600) * 1000;
    await doc.save();
    return doc.accessToken;
  } catch (err) {
    console.error(`[google-calendar] Failed to refresh token for ${userEmail}:`, err.message);
    return null;
  }
}

// Creates (or updates, if already synced once) a Google Calendar event for
// this user. `externalId` must be a stable id for the same meeting/deadline
// across calls so re-syncing updates instead of duplicating.
async function upsertEvent(userEmail, { externalId, title, description, startAt, endAt, location }) {
  const accessToken = await getValidAccessToken(userEmail);
  if (!accessToken) return { success: false, error: 'not_connected' };

  const start = startAt ? new Date(startAt) : new Date();
  const end = endAt ? new Date(endAt) : new Date(start.getTime() + 60 * 60 * 1000);

  const body = {
    summary: title,
    description: description || '',
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    ...(location ? { location } : {}),
    // Explicit reminders so the user gets a native phone notification even if
    // their calendar's DEFAULT reminders are turned off. 'popup' = the push
    // notification the Google Calendar mobile app shows.
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
        { method: 'popup', minutes: 10 },
      ],
    },
  };

  const existing = await SyncedCalendarEvent.findOne({ userEmail, externalId }).lean();

  const url = existing
    ? `${GOOGLE_CALENDAR_EVENTS_URL}/${existing.googleEventId}`
    : GOOGLE_CALENDAR_EVENTS_URL;
  const method = existing ? 'PATCH' : 'POST';

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Event may have been deleted on Google's side — retry once as a fresh create.
    if (existing && res.status === 404) {
      await SyncedCalendarEvent.deleteOne({ userEmail, externalId });
      return upsertEvent(userEmail, { externalId, title, description, startAt, endAt, location });
    }
    return { success: false, error: data.error?.message || 'Google Calendar API error' };
  }

  if (!existing) {
    await SyncedCalendarEvent.create({ userEmail, externalId, googleEventId: data.id });
  }
  return { success: true, eventId: data.id, htmlLink: data.htmlLink };
}

module.exports = {
  isConfigured,
  getAuthUrl,
  connect,
  getStatus,
  disconnect,
  upsertEvent,
};
