const crypto = require('crypto');
const { decryptField } = require('../services/encryptionService');

const VALID_ACCOUNTS = [
  { email: 'admin@edutechex.in', password: process.env.SYS_PASS_ADMIN || '', name: 'Admin', role: 'Admin' },
];

const DEFAULT_WORKSPACE_CHANNELS = [
  { _id: 'general',          name: 'general',          description: 'Team-wide announcements and updates',              isDefault: true, order: 0 },
  { _id: 'skillnaav',        name: 'skillnaav',        description: 'Career navigation & skill gap analysis product',   isDefault: true, order: 1 },
  { _id: 'edutechexassessa', name: 'edutechexassessa', description: 'Assessment platform & adaptive question engine',   isDefault: true, order: 2 },
  { _id: 'edutechex',        name: 'edutechex',        description: 'Core platform — Cambridge, IB, teacher training', isDefault: true, order: 3 },
];

// Allow any edutechexos*.vercel.app URL (covers renamed/org-moved deployments)
// plus any extra origins listed in EXTRA_ALLOWED_ORIGINS env var (comma-separated)
const ALLOWED_ORIGINS = [
  'https://edutechexos.vercel.app',
  /^https:\/\/edutechexos[a-z0-9-]*\.vercel\.app$/,
  /^https:\/\/edutechex[a-z0-9-]*\.vercel\.app$/,
  /^http:\/\/localhost(:\d+)?$/,
  ...(process.env.EXTRA_ALLOWED_ORIGINS
    ? process.env.EXTRA_ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : []),
];

const revokedEmails = new Set();

function getUserEmail(req) {
  if (req.user && req.user.email) return req.user.email.toLowerCase();
  return null;
}

function formatMessage(msg, requestingUser) {
  const { _id, __v, ...rest } = msg;
  if (requestingUser && (rest.deletedForUsers || []).includes(requestingUser)) return null;
  if (rest.deletedForEveryone) {
    return {
      id: _id.toString(),
      channelId: rest.channelId,
      sender: rest.sender,
      initials: rest.initials,
      color: rest.color,
      timestamp: rest.timestamp instanceof Date ? rest.timestamp.toISOString() : rest.timestamp,
      parentId: rest.parentId,
      isDeleted: true,
      text: '',
    };
  }
  return {
    ...rest,
    id: _id.toString(),
    text: decryptField ? decryptField(rest.text) : rest.text,
    timestamp: rest.timestamp instanceof Date ? rest.timestamp.toISOString() : rest.timestamp,
    ...(rest.editedAt ? { editedAt: rest.editedAt instanceof Date ? rest.editedAt.toISOString() : rest.editedAt } : {}),
  };
}

const colors = ['#2d6a4f', '#52b788', '#7c3aed', '#a78bfa', '#1b4332', '#c4b5fd'];
function getDeterministicColor(email) {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Derive up-to-2-char initials from a display name (server-side fallback so the
// API never depends on the client sending an `initials`/`assigneeInitials` field).
function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '??';
  return parts.map((p) => p[0]).join('').toUpperCase().slice(0, 2);
}

// Map DB layer errors to clean HTTP responses. Mongoose ValidationError/CastError
// are the client's fault → 400 with a readable message (never leak raw schema/
// internal error text). Everything else → 500 with a generic message.
function respondDbError(res, err, fallback = 'Something went wrong. Please try again.') {
  if (err && err.name === 'ValidationError') {
    // Build a clean, field-level message WITHOUT leaking mongoose's raw
    // "Path `x` is required." internal phrasing.
    const msg = Object.values(err.errors || {})
      .map((e) => {
        if (e.kind === 'required') return `${e.path} is required.`;
        if (e.kind === 'enum')     return `${e.path} has an invalid value.`;
        return `${e.path} is invalid.`;
      })
      .join(' ') || 'Invalid request data.';
    return res.status(400).json({ success: false, error: msg });
  }
  if (err && err.name === 'CastError') {
    return res.status(400).json({ success: false, error: 'Invalid value for one or more fields.' });
  }
  console.error('[server error]', err);
  return res.status(500).json({ success: false, error: fallback });
}

// Single source of truth for the user-settings whitelist (used by
// settingsController.saveSettings to block mass-assignment). Keep this in sync
// with the UserSettings schema — do NOT edit a copy elsewhere.
const SETTINGS_FIELDS = [
  'displayName', 'avatarEmoji', 'status', 'meetLink',
  'emailNotifications', 'desktopNotifications', 'soundNotifications',
  'emailOnMentions', 'emailOnMeetings', 'emailOnLeave', 'emailOnDigest', 'emailOnDeadlines',
  'compactChat', 'fontSize', 'enterToSend', 'darkMode',
  'meetLinkThuPM', 'meetLinkFriday',
];

const PAGE_SIZE = 50;

module.exports = {
  VALID_ACCOUNTS,
  DEFAULT_WORKSPACE_CHANNELS,
  ALLOWED_ORIGINS,
  revokedEmails,
  getUserEmail,
  formatMessage,
  getDeterministicColor,
  getInitials,
  respondDbError,
  SETTINGS_FIELDS,
  PAGE_SIZE,
};
