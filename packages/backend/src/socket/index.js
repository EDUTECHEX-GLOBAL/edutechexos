const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { ALLOWED_ORIGINS, revokedEmails } = require('../utils/helpers');
const UserSettings = require('../models/UserSettings');

const JWT_SECRET = process.env.JWT_SECRET;

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

    socket.on('join_channel', (channelId) => {
      if (!channelId) return;
      socket.join(String(channelId));
    });

    socket.on('leave_channel', (channelId) => {
      if (!channelId) return;
      socket.leave(String(channelId));
    });

    socket.on('meeting_started', ({ link, channelName, starter, starterInitials, starterColor }) => {
      if (!link || !starter) return;
      io.emit('meeting_started', { link, channelName, starter, starterInitials, starterColor });
    });

    // Relay status/name change so every connected client updates in real-time.
    // The email is taken from the authenticated socket — never the payload — so
    // a user cannot change another user's status, name, or persisted settings.
    socket.on('user_status_update', ({ status, name }) => {
      if (!userEmail) return;
      socket.broadcast.emit('user_status_update', { email: userEmail, status, name });
      // Persist to MongoDB so status survives page reload
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
      socket.broadcast.emit('leave_status_update', { email, onLeave });
    });

    // Relay availability toggle so everyone sees availability status in real-time.
    // Identity comes from the authenticated socket, not the client payload.
    socket.on('user_availability', ({ isAvailable }) => {
      if (!userEmail) return;
      socket.broadcast.emit('user_availability', { email: userEmail, isAvailable });
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
      // Broadcast offline status so all clients immediately remove the online dot
      if (userEmail) {
        socket.broadcast.emit('user_status_update', { email: userEmail, status: 'offline' });
      }
    });
  });

  return io;
}

module.exports = { createSocketServer };
