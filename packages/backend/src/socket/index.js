const { Server } = require('socket.io');
const { ALLOWED_ORIGINS } = require('../utils/helpers');

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
  });

  io.on('connection', (socket) => {
    socket.on('join_channel', (channelId) => {
      socket.join(channelId);
    });

    socket.on('leave_channel', (channelId) => {
      socket.leave(channelId);
    });

    socket.on('typing_start', ({ channelId, userName }) => {
      if (!channelId || !userName) return;
      socket.to(channelId).emit('user_typing', { channelId, userName });
    });

    socket.on('typing_stop', ({ channelId, userName }) => {
      if (!channelId || !userName) return;
      socket.to(channelId).emit('user_stopped_typing', { channelId, userName });
    });

    socket.on('join_dm', ({ myEmail, partnerEmail }) => {
      if (!myEmail || !partnerEmail) return;
      const room = 'dm:' + [myEmail.toLowerCase(), partnerEmail.toLowerCase()].sort().join('::');
      socket.join(room);
    });

    socket.on('leave_dm', ({ myEmail, partnerEmail }) => {
      if (!myEmail || !partnerEmail) return;
      const room = 'dm:' + [myEmail.toLowerCase(), partnerEmail.toLowerCase()].sort().join('::');
      socket.leave(room);
    });

    socket.on('dm_typing_start', ({ myEmail, partnerEmail }) => {
      if (!myEmail || !partnerEmail) return;
      const room = 'dm:' + [myEmail.toLowerCase(), partnerEmail.toLowerCase()].sort().join('::');
      socket.to(room).emit('dm_user_typing', { fromEmail: myEmail });
    });

    socket.on('dm_typing_stop', ({ myEmail, partnerEmail }) => {
      if (!myEmail || !partnerEmail) return;
      const room = 'dm:' + [myEmail.toLowerCase(), partnerEmail.toLowerCase()].sort().join('::');
      socket.to(room).emit('dm_user_stopped_typing', { fromEmail: myEmail });
    });

    socket.on('disconnect', () => {
    });
  });

  return io;
}

module.exports = { createSocketServer };
