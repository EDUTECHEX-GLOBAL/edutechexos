// ── DM participant authorization ──────────────────────────────────────────
// Direct-message channels use the id form `dm-<memberId>-<memberId>`, where each
// memberId is `member-admin` or `member-<24-hex AccessRequest _id>` (the same
// ids returned by GET /api/members). These helpers answer the one question the
// rest of the app kept forgetting to ask: "is this user actually one of the two
// people in this DM?" — used to gate DM reads (REST), search, and live sockets.

const { VALID_ACCOUNTS } = require('../utils/helpers');
const AccessRequest = require('../models/AccessRequest');

const DM_RE = /^dm-(member-(?:admin|[a-f0-9]{24}))-(member-(?:admin|[a-f0-9]{24}))$/;

function isDmChannel(channelId) {
  return typeof channelId === 'string' && channelId.startsWith('dm-');
}

// Returns [memberIdA, memberIdB] for a well-formed dm channel id, else null.
function parseDmParticipants(channelId) {
  const m = DM_RE.exec(channelId || '');
  return m ? [m[1], m[2]] : null;
}

// Maps a user's email to the `member-<id>` identity embedded in DM channel ids.
async function resolveMemberId(email) {
  if (!email) return null;
  const e = String(email).toLowerCase();
  // The only hardcoded account is surfaced as `member-admin` by GET /api/members.
  if (VALID_ACCOUNTS.some((a) => a.email === e)) return 'member-admin';
  const doc = await AccessRequest.findOne({ email: e }).select('_id').lean();
  return doc ? `member-${doc._id.toString()}` : null;
}

// True only if `email` is one of the two participants of the given dm channel.
async function isDmParticipant(channelId, email) {
  const participants = parseDmParticipants(channelId);
  if (!participants) return false;
  const myId = await resolveMemberId(email);
  return !!myId && participants.includes(myId);
}

module.exports = { isDmChannel, parseDmParticipants, resolveMemberId, isDmParticipant };
