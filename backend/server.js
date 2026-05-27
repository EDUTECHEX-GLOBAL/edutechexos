const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const httpServer = http.createServer(app);

// Allow requests from the Vercel frontend and local dev
const ALLOWED_ORIGINS = [
  'https://edutechexos.vercel.app',
  'https://edutechexos-git-main.vercel.app',
  /\.vercel\.app$/,           // any Vercel preview deploy
  'http://localhost:3000',
  'http://localhost:10006',
];

// Socket.IO server — same CORS rules as Express
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
  // Client joins a channel room so it only receives messages for that channel
  socket.on('join_channel', (channelId) => {
    socket.join(channelId);
  });

  socket.on('leave_channel', (channelId) => {
    socket.leave(channelId);
  });

  socket.on('disconnect', () => {
    // rooms are automatically cleaned up on disconnect
  });
});

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, Render health-check)
      if (!origin) return callback(null, true);
      const allowed = ALLOWED_ORIGINS.some((o) =>
        typeof o === 'string' ? o === origin : o.test(origin)
      );
      if (allowed) return callback(null, true);
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error(`CORS policy: origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);
app.use(express.json());

// --- 1. MongoDB Connection ---
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.warn('WARNING: MONGODB_URI environment variable is missing. DB routes will fail.');
}

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Successfully connected to MongoDB Atlas'))
  .catch((err) => {
    console.error('Failed to connect to MongoDB Atlas (non-fatal):', err);
    // Continue without exiting; DB-dependent routes may fail gracefully
  });

// --- 2. Schemas & Models ---
const MessageSchema = new mongoose.Schema(
  {
    clientId:    { type: String },
    channelId:   { type: String, required: true, index: true },
    sender:      { type: String, required: true },
    initials:    { type: String, required: true },
    color:       { type: String, required: true },
    text:        { type: String, required: true },
    timestamp:   { type: Date, default: Date.now },
    // ── optional message payload fields ──────────────────────────────
    audioUrl:    { type: String },
    videoUrl:    { type: String },
    files:       [{ name: String, url: String, type: String }],
    editedAt:    { type: Date },
    parentId:    { type: String },
    reactions:   { type: mongoose.Schema.Types.Mixed, default: {} },
    poll:        { type: mongoose.Schema.Types.Mixed },
    linkPreview: { type: mongoose.Schema.Types.Mixed },
  },
  // strict: false → any extra fields the client sends are stored as-is
  // so future message types never get silently dropped
  { strict: false }
);
const Message = mongoose.model('Message', MessageSchema);

const KanbanTaskSchema = new mongoose.Schema(
  {
    text:             { type: String, required: true },
    assignee:         { type: String, required: true },
    assigneeInitials: { type: String, required: true },
    sourceChannel:    { type: String, required: true },
    status:           { type: String, enum: ['todo', 'inprogress', 'done'], default: 'todo' },
    createdAt:        { type: Date, default: Date.now },
  },
  { strict: false }
);
const KanbanTask = mongoose.model('KanbanTask', KanbanTaskSchema);

const WikiPageSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  channelId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
}, {
  timestamps: true
});
const WikiPage = mongoose.model('WikiPage', WikiPageSchema);

const NotificationSchema = new mongoose.Schema({
  type: { type: String, default: 'mention' },
  actor: { type: String, required: true },
  actorInitials: { type: String, default: '' },
  actorColor: { type: String, default: '#4f46e5' },
  message: { type: String, required: true },
  channel: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  recipientEmails: [{ type: String }],
});
const Notification = mongoose.model('Notification', NotificationSchema);

// --- 3. API Endpoints ---

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// GET Messages (grouped by channel)
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await Message.find({}).lean();
    const grouped = {};
    for (const msg of messages) {
      const channelId = msg.channelId;
      if (!grouped[channelId]) grouped[channelId] = [];
      const { _id, __v, ...rest } = msg;
      grouped[channelId].push({
        ...rest,
        id: _id.toString(),
        // always return date fields as ISO strings
        timestamp: rest.timestamp instanceof Date ? rest.timestamp.toISOString() : rest.timestamp,
        ...(rest.editedAt ? { editedAt: rest.editedAt instanceof Date ? rest.editedAt.toISOString() : rest.editedAt } : {}),
      });
    }
    res.json({ success: true, messages: grouped });
  } catch (err) {
    console.error('[GET /api/messages] Error:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST Message
app.post('/api/messages', async (req, res) => {
  try {
    const { id, ...messageData } = req.body;
    const newMessage = new Message({
      ...messageData,
      clientId: id,
    });
    const savedMsg = await newMessage.save();
    const { _id, __v, ...rest } = savedMsg.toObject();
    const payload = {
      ...rest,
      id: _id.toString(),
      timestamp: rest.timestamp instanceof Date ? rest.timestamp.toISOString() : rest.timestamp,
      ...(rest.editedAt ? { editedAt: rest.editedAt instanceof Date ? rest.editedAt.toISOString() : rest.editedAt } : {}),
    };

    // Broadcast to all clients subscribed to this channel room (including sender)
    io.to(payload.channelId).emit('new_message', { channelId: payload.channelId, message: payload });

    res.json({ success: true, message: payload });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE Message
app.delete('/api/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Message.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PATCH Message — partial update: text edit, reactions, poll votes
app.patch('/api/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body; // { text, editedAt } | { reactions } | { poll }

    const updated = await Message.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    const { _id, __v, ...rest } = updated;
    const payload = {
      ...rest,
      id: _id.toString(),
      timestamp: rest.timestamp instanceof Date ? rest.timestamp.toISOString() : rest.timestamp,
      ...(rest.editedAt ? { editedAt: rest.editedAt instanceof Date ? rest.editedAt.toISOString() : rest.editedAt } : {}),
    };

    // Real-time broadcast so other clients see the change immediately
    io.to(payload.channelId).emit('message_updated', { channelId: payload.channelId, message: payload });

    res.json({ success: true, message: payload });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET Kanban Tasks
app.get('/api/kanban', async (req, res) => {
  try {
    const tasks = await KanbanTask.find({}).sort({ createdAt: 1 }).lean();
    const formatted = tasks.map(({ _id, __v, ...rest }) => ({
      ...rest,
      id: _id.toString(),
      createdAt: rest.createdAt instanceof Date ? rest.createdAt.toISOString() : rest.createdAt,
    }));
    res.json({ success: true, tasks: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST Kanban Task
app.post('/api/kanban', async (req, res) => {
  try {
    const task = new KanbanTask(req.body);
    const saved = await task.save();
    const { _id, __v, ...rest } = saved.toObject();
    res.json({
      success: true,
      task: {
        ...rest,
        id: _id.toString(),
        createdAt: rest.createdAt instanceof Date ? rest.createdAt.toISOString() : rest.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PATCH Kanban Task (update status or other fields)
app.patch('/api/kanban/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await KanbanTask.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ success: false, error: 'Task not found' });
    const { _id, __v, ...rest } = updated;
    res.json({
      success: true,
      task: {
        ...rest,
        id: _id.toString(),
        createdAt: rest.createdAt instanceof Date ? rest.createdAt.toISOString() : rest.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE Kanban Task
app.delete('/api/kanban/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await KanbanTask.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET Wiki Pages
app.get('/api/wikipages', async (req, res) => {
  try {
    const pages = await WikiPage.find({}).sort({ updatedAt: -1 }).lean();
    const formatted = pages.map((p) => {
      return {
        id: p._id,
        channelId: p.channelId,
        title: p.title,
        content: p.content,
        createdAt: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: p.updatedAt ? p.updatedAt.toISOString() : new Date().toISOString(),
      };
    });
    res.json({ success: true, pages: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST/UPSERT Wiki Page
app.post('/api/wikipages', async (req, res) => {
  try {
    const { id, channelId, title, content } = req.body;
    const updated = await WikiPage.findOneAndUpdate(
      { _id: id },
      { 
        channelId, 
        title, 
        content,
        updatedAt: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    
    const { _id, ...rest } = updated;
    res.json({
      success: true,
      page: {
        ...rest,
        id: _id,
        createdAt: updated.createdAt ? updated.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: updated.updatedAt ? updated.updatedAt.toISOString() : new Date().toISOString(),
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE Wiki Page
app.delete('/api/wikipages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await WikiPage.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET Notifications (for a specific recipient email)
app.get('/api/notifications', async (req, res) => {
  try {
    const { email } = req.query;
    const query = email
      ? { $or: [{ recipientEmails: { $size: 0 } }, { recipientEmails: email.toLowerCase() }] }
      : {};
    const notifs = await Notification.find(query).sort({ timestamp: -1 }).limit(60).lean();
    const formatted = notifs.map(({ _id, __v, ...rest }) => ({
      ...rest,
      id: _id.toString(),
      timestamp: rest.timestamp instanceof Date ? rest.timestamp.toISOString() : rest.timestamp,
    }));
    res.json({ success: true, notifications: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST Notification
app.post('/api/notifications', async (req, res) => {
  try {
    // Normalise recipientEmails to lowercase so the GET query matches correctly
    const body = {
      ...req.body,
      recipientEmails: (req.body.recipientEmails ?? []).map((e) => String(e).toLowerCase()),
    };
    const notif = new Notification(body);
    const saved = await notif.save();
    const { _id, __v, ...rest } = saved.toObject();
    res.json({
      success: true,
      notification: {
        ...rest,
        id: _id.toString(),
        timestamp: rest.timestamp instanceof Date ? rest.timestamp.toISOString() : rest.timestamp,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Start Server
const PORT = process.env.PORT || 10002;
httpServer.listen(PORT, () => {
  console.log(`Backend Server running on port ${PORT}`);
});

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Waiting 3 seconds before retry...`);
    setTimeout(() => {
      httpServer.close();
      httpServer.listen(PORT);
    }, 3000);
  } else {
    throw err;
  }
});
