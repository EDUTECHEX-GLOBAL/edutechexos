const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { ALLOWED_ORIGINS, revokedEmails } = require('../utils/helpers');
const UserSettings = require('../models/UserSettings');
const { isDmChannel, isDmParticipant } = require('../services/dmAccessService');

const JWT_SECRET = process.env.JWT_SECRET;

// In-memory "who's currently in which meeting" presence, keyed by messageId.
// Best-effort only — we can't see inside the actual Google Meet tab, this just
// tracks "clicked Join and hasn't left/returned to the dashboard yet."
// Not persisted; resets on server restart, which is fine for a live indicator.
const meetingPresence = new Map(); // messageId -> Set<email>

// Authoritative live-presence registry: email -> number of open socket connections
// for that user (a user may have several tabs/devices). A user is "online" iff
// their count > 0. This is rebuilt from scratch on every server start, so it can
// never show a stale "online" for someone who is actually gone (unlike a persisted
// flag or a "logged in today" record).
const onlineUsers = new Map();

function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowed = ALLOWED_ORIGINS.some((o) =>
          typeof o === 'string' ? o === origin : o.test(origin)
        );
        if (allowed) return callback(null, true);
        callback(new Error(`CORS policy: origin ${origin} not allowed`));
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    // Allow large message payloads (e.g. base64 file/image/voice fallbacks when
    // cloud storage is unavailable). The default is 1 MB, which silently drops
    // file messages so other users never receive them. Kept in line with the
    // 20 MB express.json limit used by the REST API.
    maxHttpBufferSize: 25 * 1024 * 1024,
  });

  // ── Mandatory authentication ─────────────────────────────────────────────
  // Every socket connection MUST present a valid JWT (same token used for the
  // REST API). Without this, anyone could connect and join_channel to receive
  // live plaintext messages — bypassing the at-rest encryption entirely.
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer /, '') ||
        '';
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, JWT_SECRET);
      if (revokedEmails.has(decoded.email?.toLowerCase())) {
        return next(new Error('Account removed'));
      }
      socket.user = decoded;
      next();
    } catch (_) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const userEmail = socket.user?.email?.toLowerCase() || '';

    // ── Live presence: mark online on the FIRST socket this user opens ────────
    if (userEmail) {
      const prev = onlineUsers.get(userEmail) || 0;
      onlineUsers.set(userEmail, prev + 1);
      if (prev === 0) {
        // 0 → 1: genuinely came online. Tell everyone and persist for initial paint.
        io.emit('user_status_update', { email: userEmail, status: 'online' });
        UserSettings.findOneAndUpdate(
          { email: userEmail },
          { $set: { status: 'online' } },
          { upsert: true, new: false }
        ).lean().catch(() => {});
      }
    }

    socket.on('join_channel', async (channelId) => {
      if (!channelId) return;
      const id = String(channelId);
      // A DM room may only be joined by its two participants — otherwise a user
      // could subscribe to a stranger's `dm-<a>-<b>` room and receive their live
      // messages, bypassing the join_dm ownership check below.
      if (isDmChannel(id) && !(await isDmParticipant(id, userEmail))) return;
      socket.join(id);
    });

    socket.on('leave_channel', (channelId) => {
      if (!channelId) return;
      socket.leave(String(channelId));
    });

    socket.on('meeting_started', ({ link, channelName, starter, starterInitials, starterColor }) => {
      if (!link || !starter) return;
      io.emit('meeting_started', { link, channelName, starter, starterInitials, starterColor });
    });

    // ── Live "in meeting" presence — best-effort, see comment above ────────
    const joinedMeetingIds = new Set(); // meetingIds this socket has joined, for disconnect cleanup
    socket.on('meeting_room_join', (meetingId) => {
      if (!meetingId || !userEmail) return;
      if (!meetingPresence.has(meetingId)) meetingPresence.set(meetingId, new Set());
      meetingPresence.get(meetingId).add(userEmail);
      joinedMeetingIds.add(meetingId);
      io.emit('meeting_room_count', { meetingId, count: meetingPresence.get(meetingId).size });
    });
    socket.on('meeting_room_leave', (meetingId) => {
      if (!meetingId || !userEmail) return;
      meetingPresence.get(meetingId)?.delete(userEmail);
      joinedMeetingIds.delete(meetingId);
      io.emit('meeting_room_count', { meetingId, count: meetingPresence.get(meetingId)?.size || 0 });
    });

    // Relay status/name change so every connected client updates in real-time.
    // The email is taken from the authenticated socket — never the payload — so
    // a user cannot change another user's status, name, or persisted settings.
    // Uses io.emit (not socket.broadcast.emit) so the sender's OWN other open
    // tabs/windows also stay in sync, not just other users.
    socket.on('user_status_update', ({ status, name }) => {
      if (!userEmail) return;
      io.emit('user_status_update', { email: userEmail, status, name });
      // Persist to MongoDB so status survives page reload / GET /api/members
      const updateFields = { status };
      if (name) updateFields.displayName = name;
      UserSettings.findOneAndUpdate(
        { email: userEmail },
        { $set: updateFields },
        { upsert: true, new: false }
      ).lean().catch(() => {});
    });

    // Relay leave status so all users see the leave badge instantly
    socket.on('leave_status_update', ({ email, onLeave }) => {
      if (!email) return;
      io.emit('leave_status_update', { email, onLeave });
    });

    // Relay availability toggle so everyone sees availability status in real-time.
    // Identity comes from the authenticated socket, not the client payload.
    socket.on('user_availability', ({ isAvailable }) => {
      if (!userEmail) return;
      io.emit('user_availability', { email: userEmail, isAvailable });
      UserSettings.findOneAndUpdate(
        { email: userEmail },
        { $set: { available: !!isAvailable } },
        { upsert: true, new: false }
      ).lean().catch(() => {});
    });

    socket.on('typing_start', ({ channelId, userName }) => {
      if (!channelId || !userName) return;
      socket.to(channelId).emit('user_typing', { channelId, userName });
    });

    socket.on('typing_stop', ({ channelId, userName }) => {
      if (!channelId || !userName) return;
      socket.to(channelId).emit('user_stopped_typing', { channelId, userName });
    });

    // ── Direct messages: a socket may only join its OWN dm rooms ────────────
    const ownsDm = (myEmail) => myEmail && myEmail.toLowerCase() === userEmail;

    socket.on('join_dm', ({ myEmail, partnerEmail }) => {
      if (!myEmail || !partnerEmail || !ownsDm(myEmail)) return;
      const room = 'dm:' + [myEmail.toLowerCase(), partnerEmail.toLowerCase()].sort().join('::');
      socket.join(room);
    });

    socket.on('leave_dm', ({ myEmail, partnerEmail }) => {
      if (!myEmail || !partnerEmail || !ownsDm(myEmail)) return;
      const room = 'dm:' + [myEmail.toLowerCase(), partnerEmail.toLowerCase()].sort().join('::');
      socket.leave(room);
    });

    socket.on('dm_typing_start', ({ myEmail, partnerEmail }) => {
      if (!myEmail || !partnerEmail || !ownsDm(myEmail)) return;
      const room = 'dm:' + [myEmail.toLowerCase(), partnerEmail.toLowerCase()].sort().join('::');
      socket.to(room).emit('dm_user_typing', { fromEmail: myEmail });
    });

    socket.on('dm_typing_stop', ({ myEmail, partnerEmail }) => {
      if (!myEmail || !partnerEmail || !ownsDm(myEmail)) return;
      const room = 'dm:' + [myEmail.toLowerCase(), partnerEmail.toLowerCase()].sort().join('::');
      socket.to(room).emit('dm_user_stopped_typing', { fromEmail: myEmail });
    });

    socket.on('disconnect', () => {
      // Mark offline ONLY when the user's last remaining socket closes — otherwise
      // closing one of several tabs would wrongly show the user offline. Persist +
      // broadcast so every client immediately removes the online dot.
      if (userEmail) {
        const remaining = (onlineUsers.get(userEmail) || 1) - 1;
        if (remaining <= 0) {
          onlineUsers.delete(userEmail);
          io.emit('user_status_update', { email: userEmail, status: 'offline' });
          UserSettings.findOneAndUpdate(
            { email: userEmail },
            { $set: { status: 'offline' } },
            { upsert: true, new: false }
          ).lean().catch(() => {});
        } else {
          onlineUsers.set(userEmail, remaining);
        }
      }
      // Clean up any meeting-room presence this socket held.
      for (const meetingId of joinedMeetingIds) {
        meetingPresence.get(meetingId)?.delete(userEmail);
        io.emit('meeting_room_count', { meetingId, count: meetingPresence.get(meetingId)?.size || 0 });
      }
    });
  });

  // Authoritative list of currently-connected users, for the REST /login-status
  // endpoint (so a page load gets true presence, not "logged in today").
  io.getOnlineEmails = () => [...onlineUsers.keys()];

  return io;
}

module.exports = { createSocketServer };
