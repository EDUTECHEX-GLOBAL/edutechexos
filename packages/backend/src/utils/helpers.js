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

const ALLOWED_ORIGINS = [
  'https://edutechexos.vercel.app',
  /\.vercel\.app$/,
  /^http:\/\/localhost(:\d+)?$/,
];

const revokedEmails = new Set();

function getUserEmail(req) {
  if (req.user && req.user.email) return req.user.email.toLowerCase();
  if (req.query.userEmail) return String(req.query.userEmail).toLowerCase();
  if (req.body && req.body.userEmail) return String(req.body.userEmail).toLowerCase();
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

const SETTINGS_FIELDS = [
  'displayName', 'avatarEmoji', 'status', 'meetLink',
  'emailNotifications', 'desktopNotifications', 'soundNotifications',
  'compactChat', 'fontSize', 'enterToSend', 'darkMode',
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
  SETTINGS_FIELDS,
  PAGE_SIZE,
};
