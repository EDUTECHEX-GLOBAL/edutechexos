const request = require('supertest');
const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const {
  createTestApp,
  teardownTestApp,
  clearDatabase,
  adminToken,
  memberToken,
  pendingToken,
  generateToken,
} = require('./setupTestApp');

// Models (imported after env vars are set in setupTestApp)
const AccessRequest = require('../src/models/AccessRequest');
const Message = require('../src/models/Message');
const KanbanTask = require('../src/models/KanbanTask');
const WorkspaceChannel = require('../src/models/WorkspaceChannel');
const Bookmark = require('../src/models/Bookmark');
const Notification = require('../src/models/Notification');
const Leave = require('../src/models/Leave');
const ResetCode = require('../src/models/ResetCode');
const WikiPage = require('../src/models/WikiPage');
const AuditLog = require('../src/models/AuditLog');
const { encryptField, decryptField } = require('../src/services/encryptionService');

let app, io;

beforeAll(async () => {
  const result = await createTestApp();
  app = result.app;
  io = result.io;
});

afterAll(async () => {
  await teardownTestApp();
});

afterEach(async () => {
  await clearDatabase();
  io.emit.mockClear();
  io.to.mockClear();
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════════════

describe('Health Check', () => {
  test('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. AUTHENTICATION
// ═══════════════════════════════════════════════════════════════════════════

describe('Auth — Login', () => {
  test('system account login succeeds with correct password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@edutechex.in', password: 'AdminPass123' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('admin@edutechex.in');
    expect(res.body.user.role).toBe('Admin');
    expect(res.body.user.password).toBeUndefined();
  });

  test('system account login fails with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@edutechex.in', password: 'WrongPassword' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('login with missing fields returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@edutechex.in' });
    expect(res.status).toBe(400);
  });

  test('login with approved AccessRequest user succeeds', async () => {
    const hashedPw = await bcrypt.hash('UserPass123', 10);
    await AccessRequest.create({
      name: 'DB User', email: 'dbuser@example.com',
      password: hashedPw, role: 'Member', status: 'approved',
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dbuser@example.com', password: 'UserPass123' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.status).toBe('approved');
  });

  test('login with pending AccessRequest returns pending status', async () => {
    const hashedPw = await bcrypt.hash('PendPass123', 10);
    await AccessRequest.create({
      name: 'Pending', email: 'pend@example.com',
      password: hashedPw, role: 'Member', status: 'pending',
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'pend@example.com', password: 'PendPass123' });
    expect(res.status).toBe(200);
    expect(res.body.user.status).toBe('pending');
  });

  test('login with rejected AccessRequest returns 401', async () => {
    const hashedPw = await bcrypt.hash('RejPass123', 10);
    await AccessRequest.create({
      name: 'Rejected', email: 'rej@example.com',
      password: hashedPw, role: 'Member', status: 'rejected',
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rej@example.com', password: 'RejPass123' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('rejected');
  });

  test('login with plaintext password auto-hashes it', async () => {
    await AccessRequest.create({
      name: 'Plain', email: 'plain@example.com',
      password: 'PlainPass123', role: 'Member', status: 'approved',
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'plain@example.com', password: 'PlainPass123' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Wait for async hash
    await new Promise(r => setTimeout(r, 500));
    const updated = await AccessRequest.findOne({ email: 'plain@example.com' }).lean();
    expect(updated.password).not.toBe('PlainPass123');
    expect(updated.password.startsWith('$2')).toBe(true);
  });

  test('login with unknown email returns 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever' });
    expect(res.status).toBe(401);
  });
});

describe('Auth — Forgot/Reset Password', () => {
  test('forgot-password for system account is rejected', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'admin@edutechex.in' });
    expect(res.status).toBe(400);
  });

  test('forgot-password for unknown email returns generic success', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'unknown@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('forgot-password creates reset code for valid user', async () => {
    await AccessRequest.create({
      name: 'User', email: 'user@example.com',
      password: 'pw', role: 'Member', status: 'approved',
    });

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'user@example.com' });
    expect(res.status).toBe(200);

    const codes = await ResetCode.find({ email: 'user@example.com' }).lean();
    expect(codes.length).toBe(1);
    expect(codes[0].code).toMatch(/^\d{6}$/);
  });

  test('reset-password with valid code works', async () => {
    const hashedPw = await bcrypt.hash('OldPass123', 10);
    await AccessRequest.create({
      name: 'User', email: 'user@example.com',
      password: hashedPw, role: 'Member', status: 'approved',
    });

    const code = '123456';
    await ResetCode.create({
      email: 'user@example.com', code,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: 'user@example.com', code, newPassword: 'NewPass123' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify password was updated
    const user = await AccessRequest.findOne({ email: 'user@example.com' }).lean();
    const matches = await bcrypt.compare('NewPass123', user.password);
    expect(matches).toBe(true);
  });

  test('reset-password with expired code fails', async () => {
    await AccessRequest.create({
      name: 'User', email: 'user@example.com',
      password: 'pw', role: 'Member', status: 'approved',
    });

    await ResetCode.create({
      email: 'user@example.com', code: '654321',
      expiresAt: new Date(Date.now() - 1000), // expired
    });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: 'user@example.com', code: '654321', newPassword: 'NewPass123' });
    expect(res.status).toBe(400);
  });

  test('reset-password with short password fails', async () => {
    await AccessRequest.create({
      name: 'User', email: 'user@example.com',
      password: 'pw', role: 'Member', status: 'approved',
    });

    await ResetCode.create({
      email: 'user@example.com', code: '111111',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: 'user@example.com', code: '111111', newPassword: '123' });
    expect(res.status).toBe(400);
  });
});

describe('Auth — Change Password', () => {
  test('change-password for system account is rejected', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .send({
        email: 'admin@edutechex.in',
        currentPassword: 'AdminPass123',
        newPassword: 'NewAdminPass123',
      });
    expect(res.status).toBe(400);
  });

  test('change-password succeeds with correct current password', async () => {
    const hashedPw = await bcrypt.hash('CurrentPw1', 10);
    await AccessRequest.create({
      name: 'User', email: 'chg@example.com',
      password: hashedPw, role: 'Member', status: 'approved',
    });

    const res = await request(app)
      .post('/api/auth/change-password')
      .send({ email: 'chg@example.com', currentPassword: 'CurrentPw1', newPassword: 'NewPassword1' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('change-password fails with wrong current password', async () => {
    const hashedPw = await bcrypt.hash('Correct1', 10);
    await AccessRequest.create({
      name: 'User', email: 'chg2@example.com',
      password: hashedPw, role: 'Member', status: 'approved',
    });

    const res = await request(app)
      .post('/api/auth/change-password')
      .send({ email: 'chg2@example.com', currentPassword: 'Wrong1', newPassword: 'NewPassword1' });
    expect(res.status).toBe(401);
  });

  test('change-password rejects short new password', async () => {
    const hashedPw = await bcrypt.hash('Correct1', 10);
    await AccessRequest.create({
      name: 'User', email: 'chg3@example.com',
      password: hashedPw, role: 'Member', status: 'approved',
    });

    const res = await request(app)
      .post('/api/auth/change-password')
      .send({ email: 'chg3@example.com', currentPassword: 'Correct1', newPassword: 'short' });
    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. AUTH MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

describe('Auth Middleware', () => {
  test('requireAuth blocks unauthenticated requests', async () => {
    const res = await request(app).get('/api/messages');
    expect(res.status).toBe(401);
  });

  test('requireAuth blocks pending users', async () => {
    const token = pendingToken();
    const res = await request(app)
      .get('/api/messages')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('valid token passes auth', async () => {
    const token = memberToken();
    const res = await request(app)
      .get('/api/messages')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  test('invalid token is ignored (authMiddleware is optional)', async () => {
    const res = await request(app)
      .get('/api/channels')
      .set('Authorization', 'Bearer invalid.token.here');
    // authMiddleware is optional for channels, so it should still proceed
    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. ENCRYPTION SERVICE
// ═══════════════════════════════════════════════════════════════════════════

describe('Encryption Service', () => {
  test('encryptField produces enc: prefixed string', () => {
    const encrypted = encryptField('Hello World');
    expect(encrypted.startsWith('enc:')).toBe(true);
    const parts = encrypted.split(':');
    expect(parts.length).toBe(4);
  });

  test('decryptField reverses encryptField', () => {
    const original = 'Secret message with special chars: é, ñ, 中文';
    const encrypted = encryptField(original);
    const decrypted = decryptField(encrypted);
    expect(decrypted).toBe(original);
  });

  test('decryptField returns plaintext for non-encrypted values', () => {
    expect(decryptField('Hello')).toBe('Hello');
    expect(decryptField('')).toBe('');
    expect(decryptField(null)).toBe(null);
  });

  test('each encryption produces different ciphertext (random IV)', () => {
    const text = 'Same text';
    const enc1 = encryptField(text);
    const enc2 = encryptField(text);
    expect(enc1).not.toBe(enc2);
    expect(decryptField(enc1)).toBe(text);
    expect(decryptField(enc2)).toBe(text);
  });

  test('tampering with ciphertext returns original (graceful failure)', () => {
    const encrypted = encryptField('Test');
    const tampered = encrypted.slice(0, -2) + 'ff';
    const result = decryptField(tampered);
    expect(result).toBe(tampered);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. MESSAGES (CRUD + Encryption)
// ═══════════════════════════════════════════════════════════════════════════

describe('Messages', () => {
  const token = () => memberToken('user@example.com', 'Test User');

  test('POST /api/messages creates a message with encrypted text', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        channelId: 'general',
        sender: 'Test User',
        initials: 'TU',
        color: '#4f46e5',
        text: 'Hello, World!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message.id).toBeDefined();
    expect(res.body.message.channelId).toBe('general');

    // Verify DB stores encrypted text
    const dbMsg = await Message.findById(res.body.message.id).lean();
    expect(dbMsg.text.startsWith('enc:')).toBe(true);

    // Socket should emit plaintext
    expect(io.to).toHaveBeenCalledWith('general');
    expect(io.emit).toHaveBeenCalledWith('new_message', expect.objectContaining({
      channelId: 'general',
    }));
  });

  test('GET /api/messages returns decrypted messages for a channel', async () => {
    // Create a message directly with encrypted text
    const msg = await Message.create({
      channelId: 'general', sender: 'Test', initials: 'T',
      color: '#000', text: encryptField('Encrypted text'),
    });

    const res = await request(app)
      .get('/api/messages?channelId=general')
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(200);
    expect(res.body.messages.length).toBe(1);
    expect(res.body.messages[0].text).toBe('Encrypted text');
  });

  test('GET /api/messages supports pagination', async () => {
    // Create 3 messages
    for (let i = 0; i < 3; i++) {
      await Message.create({
        channelId: 'general', sender: 'User', initials: 'U',
        color: '#000', text: encryptField(`Msg ${i}`),
        timestamp: new Date(Date.now() - (3 - i) * 1000),
      });
    }

    const res = await request(app)
      .get('/api/messages?channelId=general&limit=2')
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(200);
    expect(res.body.messages.length).toBe(2);
    expect(res.body.hasMore).toBe(true);
  });

  test('DELETE /api/messages/:id hard delete', async () => {
    const msg = await Message.create({
      channelId: 'general', sender: 'User', initials: 'U',
      color: '#000', text: 'will delete',
    });

    const res = await request(app)
      .delete(`/api/messages/${msg._id}?hard=true`)
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe('permanent');
    const deleted = await Message.findById(msg._id);
    expect(deleted).toBeNull();
  });

  test('DELETE /api/messages/:id soft delete for-me', async () => {
    const msg = await Message.create({
      channelId: 'general', sender: 'User', initials: 'U',
      color: '#000', text: 'soft del',
    });

    const res = await request(app)
      .delete(`/api/messages/${msg._id}?scope=me&userEmail=user@example.com`)
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe('for-me');
  });

  test('DELETE /api/messages/:id soft delete for-everyone', async () => {
    const msg = await Message.create({
      channelId: 'general', sender: 'User', initials: 'U',
      color: '#000', text: 'everyone del',
    });

    const res = await request(app)
      .delete(`/api/messages/${msg._id}?userEmail=user@example.com`)
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe('for-everyone');

    const updated = await Message.findById(msg._id).lean();
    expect(updated.deletedForEveryone).toBe(true);
  });

  test('PATCH /api/messages/:id edits text and re-encrypts', async () => {
    const msg = await Message.create({
      channelId: 'general', sender: 'User', initials: 'U',
      color: '#000', text: encryptField('Original'),
    });

    const res = await request(app)
      .patch(`/api/messages/${msg._id}`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ text: 'Edited text', editedAt: new Date().toISOString() });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const dbMsg = await Message.findById(msg._id).lean();
    expect(dbMsg.text.startsWith('enc:')).toBe(true);
    expect(decryptField(dbMsg.text)).toBe('Edited text');
  });

  test('PATCH /api/messages/:id updates reactions', async () => {
    const msg = await Message.create({
      channelId: 'general', sender: 'User', initials: 'U',
      color: '#000', text: 'msg',
    });

    const reactions = { '👍': ['user@example.com'] };
    const res = await request(app)
      .patch(`/api/messages/${msg._id}`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ reactions });

    expect(res.status).toBe(200);
    const dbMsg = await Message.findById(msg._id).lean();
    expect(dbMsg.reactions['👍']).toEqual(['user@example.com']);
  });

  test('PATCH /api/messages/:id on non-existent returns 404', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .patch(`/api/messages/${fakeId}`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ text: 'nope' });
    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. CHANNELS
// ═══════════════════════════════════════════════════════════════════════════

describe('Channels', () => {
  test('GET /api/channels auto-creates defaults if empty', async () => {
    const res = await request(app)
      .get('/api/channels')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.channels.length).toBeGreaterThanOrEqual(4);
    const names = res.body.channels.map(c => c.name);
    expect(names).toContain('general');
    expect(names).toContain('skillnaav');
  });

  test('POST /api/channels creates new channel (admin only)', async () => {
    const res = await request(app)
      .post('/api/channels')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'Test Channel', description: 'A test channel' });

    expect(res.status).toBe(200);
    expect(res.body.channel.id).toBe('test-channel');
    expect(io.emit).toHaveBeenCalledWith('channel_created', expect.any(Object));
  });

  test('POST /api/channels rejects non-admin', async () => {
    const res = await request(app)
      .post('/api/channels')
      .set('Authorization', `Bearer ${memberToken()}`)
      .send({ name: 'Forbidden' });
    expect(res.status).toBe(403);
  });

  test('POST /api/channels rejects duplicate name', async () => {
    await WorkspaceChannel.create({ _id: 'dup', name: 'dup', description: '' });

    const res = await request(app)
      .post('/api/channels')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'Dup' });
    expect(res.status).toBe(409);
  });

  test('PATCH /api/channels/:id updates channel (admin only)', async () => {
    await WorkspaceChannel.create({ _id: 'ch1', name: 'ch1', description: 'old' });

    const res = await request(app)
      .patch('/api/channels/ch1')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ description: 'updated desc' });

    expect(res.status).toBe(200);
    expect(res.body.channel.description).toBe('updated desc');
  });

  test('DELETE /api/channels/:id deletes non-default channel', async () => {
    await WorkspaceChannel.create({ _id: 'temp', name: 'temp', description: '', isDefault: false });

    const res = await request(app)
      .delete('/api/channels/temp')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(io.emit).toHaveBeenCalledWith('channel_deleted', { channelId: 'temp' });
  });

  test('DELETE /api/channels/:id rejects default channels', async () => {
    await WorkspaceChannel.create({ _id: 'perm', name: 'perm', description: '', isDefault: true });

    const res = await request(app)
      .delete('/api/channels/perm')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. KANBAN TASKS
// ═══════════════════════════════════════════════════════════════════════════

describe('Kanban Tasks', () => {
  const token = () => memberToken('worker@example.com', 'Worker');

  test('POST /api/kanban creates a task', async () => {
    const res = await request(app)
      .post('/api/kanban')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        text: 'Fix login bug',
        assignee: 'Worker',
        assigneeInitials: 'W',
        sourceChannel: 'general',
      });

    expect(res.status).toBe(200);
    expect(res.body.task.text).toBe('Fix login bug');
    expect(res.body.task.status).toBe('todo');
    expect(res.body.task.assigneeEmail).toBe('worker@example.com');
  });

  test('GET /api/kanban returns tasks for requesting user', async () => {
    await KanbanTask.create({
      text: 'Task 1', assignee: 'Worker', assigneeEmail: 'worker@example.com',
      assigneeInitials: 'W', sourceChannel: 'general',
    });
    await KanbanTask.create({
      text: 'Task 2', assignee: 'Other', assigneeEmail: 'other@example.com',
      assigneeInitials: 'O', sourceChannel: 'general',
    });

    const res = await request(app)
      .get('/api/kanban')
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(200);
    expect(res.body.tasks.length).toBe(1);
    expect(res.body.tasks[0].text).toBe('Task 1');
  });

  test('PATCH /api/kanban/:id updates task status', async () => {
    const task = await KanbanTask.create({
      text: 'Move me', assignee: 'Worker', assigneeEmail: 'worker@example.com',
      assigneeInitials: 'W', sourceChannel: 'general',
    });

    const res = await request(app)
      .patch(`/api/kanban/${task._id}`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'inprogress' });

    expect(res.status).toBe(200);
    expect(res.body.task.status).toBe('inprogress');
  });

  test('PATCH /api/kanban/:id updates priority and tags', async () => {
    const task = await KanbanTask.create({
      text: 'Tag me', assignee: 'Worker', assigneeEmail: 'worker@example.com',
      assigneeInitials: 'W', sourceChannel: 'general',
    });

    const res = await request(app)
      .patch(`/api/kanban/${task._id}`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ priority: 'high', tags: ['urgent', 'bug'] });

    expect(res.status).toBe(200);
    expect(res.body.task.priority).toBe('high');
    expect(res.body.task.tags).toEqual(['urgent', 'bug']);
  });

  test('DELETE /api/kanban/:id deletes task', async () => {
    const task = await KanbanTask.create({
      text: 'Delete me', assignee: 'Worker', assigneeEmail: 'worker@example.com',
      assigneeInitials: 'W', sourceChannel: 'general',
    });

    const res = await request(app)
      .delete(`/api/kanban/${task._id}`)
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(200);
    const deleted = await KanbanTask.findById(task._id);
    expect(deleted).toBeNull();
  });

  test('PATCH /api/kanban/:id for non-existent returns 404', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .patch(`/api/kanban/${fakeId}`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'done' });
    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. BOOKMARKS
// ═══════════════════════════════════════════════════════════════════════════

describe('Bookmarks', () => {
  const token = () => memberToken('reader@example.com', 'Reader');

  test('POST /api/bookmarks/toggle creates bookmark', async () => {
    const res = await request(app)
      .post('/api/bookmarks/toggle')
      .set('Authorization', `Bearer ${token()}`)
      .send({ messageId: 'msg-1', channelId: 'general', text: 'Hello', sender: 'User' });

    expect(res.status).toBe(200);
    expect(res.body.bookmarked).toBe(true);
  });

  test('POST /api/bookmarks/toggle removes existing bookmark', async () => {
    await Bookmark.create({
      userEmail: 'reader@example.com', messageId: 'msg-1',
      channelId: 'general', text: 'Hello', sender: 'User',
    });

    const res = await request(app)
      .post('/api/bookmarks/toggle')
      .set('Authorization', `Bearer ${token()}`)
      .send({ messageId: 'msg-1', channelId: 'general' });

    expect(res.status).toBe(200);
    expect(res.body.bookmarked).toBe(false);
  });

  test('GET /api/bookmarks returns user bookmarks', async () => {
    await Bookmark.create({
      userEmail: 'reader@example.com', messageId: 'msg-1',
      channelId: 'general', text: 'Hello', sender: 'User',
    });
    await Bookmark.create({
      userEmail: 'other@example.com', messageId: 'msg-2',
      channelId: 'general', text: 'Other', sender: 'Other',
    });

    const res = await request(app)
      .get('/api/bookmarks')
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(200);
    expect(res.body.bookmarks.length).toBe(1);
    expect(res.body.bookmarks[0].messageId).toBe('msg-1');
  });

  test('DELETE /api/bookmarks/:id removes bookmark', async () => {
    const bm = await Bookmark.create({
      userEmail: 'reader@example.com', messageId: 'msg-del',
      channelId: 'general', text: 'Del', sender: 'User',
    });

    const res = await request(app)
      .delete(`/api/bookmarks/${bm._id}`)
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(200);
  });

  test('DELETE /api/bookmarks/:id returns 404 for wrong user', async () => {
    const bm = await Bookmark.create({
      userEmail: 'other@example.com', messageId: 'msg-x',
      channelId: 'general', text: 'X', sender: 'Other',
    });

    const res = await request(app)
      .delete(`/api/bookmarks/${bm._id}`)
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

describe('Notifications', () => {
  const token = () => memberToken('notif@example.com', 'Notifier');

  test('POST /api/notifications creates notification', async () => {
    const res = await request(app)
      .post('/api/notifications')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        type: 'mention',
        actor: 'Someone',
        message: 'mentioned you',
        channel: 'general',
        recipientEmails: ['notif@example.com'],
      });

    expect(res.status).toBe(200);
    expect(res.body.notification.type).toBe('mention');
    expect(res.body.notification.recipientEmails).toEqual(['notif@example.com']);
  });

  test('GET /api/notifications returns notifications for user', async () => {
    await Notification.create({
      actor: 'A', message: 'msg1', channel: 'general',
      recipientEmails: ['notif@example.com'],
    });
    await Notification.create({
      actor: 'B', message: 'msg2', channel: 'general',
      recipientEmails: ['other@example.com'],
    });
    await Notification.create({
      actor: 'C', message: 'broadcast', channel: 'general',
      recipientEmails: [],
    });

    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(200);
    // Should get own + broadcast (empty recipientEmails)
    expect(res.body.notifications.length).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 10. LEAVES
// ═══════════════════════════════════════════════════════════════════════════

describe('Leaves', () => {
  test('POST /api/leaves creates leave request', async () => {
    const token = memberToken('emp@example.com', 'Employee');
    const res = await request(app)
      .post('/api/leaves')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'planned',
        leaveCategory: 'vacation',
        startDate: '2026-07-01',
        endDate: '2026-07-05',
        reason: 'Family trip',
      });

    expect(res.status).toBe(200);
    expect(res.body.leave.type).toBe('planned');
    expect(res.body.leave.status).toBe('pending');
    expect(io.emit).toHaveBeenCalledWith('leave_requested', expect.objectContaining({
      email: 'emp@example.com',
    }));
  });

  test('POST /api/leaves rejects missing fields', async () => {
    const token = memberToken('emp@example.com', 'Employee');
    const res = await request(app)
      .post('/api/leaves')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'instant' });
    expect(res.status).toBe(400);
  });

  test('PATCH /api/leaves/:id admin approves leave', async () => {
    const leave = await Leave.create({
      email: 'emp@example.com', name: 'Employee',
      type: 'instant', startDate: '2026-06-20', reason: 'Sick',
    });

    const res = await request(app)
      .patch(`/api/leaves/${leave._id}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'approved', adminNote: 'Get well soon' });

    expect(res.status).toBe(200);
    expect(res.body.leave.status).toBe('approved');
    expect(res.body.leave.adminNote).toBe('Get well soon');

    // Verify audit log
    const audit = await AuditLog.findOne({ action: 'leave.approved' }).lean();
    expect(audit).toBeDefined();
    expect(audit.target).toBe('emp@example.com');
  });

  test('PATCH /api/leaves/:id non-admin is rejected', async () => {
    const leave = await Leave.create({
      email: 'emp@example.com', name: 'Employee',
      type: 'instant', startDate: '2026-06-20', reason: 'Sick',
    });

    const res = await request(app)
      .patch(`/api/leaves/${leave._id}`)
      .set('Authorization', `Bearer ${memberToken()}`)
      .send({ status: 'approved' });

    expect(res.status).toBe(403);
  });

  test('GET /api/leaves admin sees all, member sees own', async () => {
    await Leave.create({
      email: 'emp1@example.com', name: 'Emp1',
      type: 'instant', startDate: '2026-06-20', reason: 'Sick',
    });
    await Leave.create({
      email: 'emp2@example.com', name: 'Emp2',
      type: 'planned', startDate: '2026-07-01', reason: 'Travel',
    });

    // Admin sees all
    const adminRes = await request(app)
      .get('/api/leaves')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(adminRes.body.leaves.length).toBe(2);

    // Member sees only own
    const memberRes = await request(app)
      .get('/api/leaves')
      .set('Authorization', `Bearer ${memberToken('emp1@example.com', 'Emp1')}`);
    expect(memberRes.body.leaves.length).toBe(1);
    expect(memberRes.body.leaves[0].email).toBe('emp1@example.com');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 11. ACCESS REQUESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('Access Requests', () => {
  test('POST /api/access-requests submits new request', async () => {
    const res = await request(app)
      .post('/api/access-requests')
      .send({ name: 'New User', email: 'new@example.com', role: 'Member' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.request.email).toBe('new@example.com');
    expect(res.body.request.status).toBe('pending');
  });

  test('POST /api/access-requests rejects system account email', async () => {
    const res = await request(app)
      .post('/api/access-requests')
      .send({ name: 'Hacker', email: 'admin@edutechex.in', role: 'Admin' });

    expect(res.status).toBe(409);
  });

  test('POST /api/access-requests returns existing status if already submitted', async () => {
    await AccessRequest.create({
      name: 'Existing', email: 'exist@example.com',
      password: '', role: 'Member', status: 'pending',
    });

    const res = await request(app)
      .post('/api/access-requests')
      .send({ name: 'Existing', email: 'exist@example.com', role: 'Member' });

    expect(res.status).toBe(200);
    expect(res.body.exists).toBe(true);
    expect(res.body.status).toBe('pending');
  });

  test('GET /api/access-requests requires admin', async () => {
    const res = await request(app)
      .get('/api/access-requests')
      .set('Authorization', `Bearer ${memberToken()}`);
    expect(res.status).toBe(403);
  });

  test('GET /api/access-requests admin gets all requests (password stripped)', async () => {
    await AccessRequest.create({
      name: 'User1', email: 'u1@example.com',
      password: 'secret', role: 'Member', status: 'pending',
    });

    const res = await request(app)
      .get('/api/access-requests')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.requests.length).toBe(1);
    expect(res.body.requests[0].password).toBeUndefined();
  });

  test('PATCH /api/access-requests/:id admin approves request', async () => {
    const req = await AccessRequest.create({
      name: 'User2', email: 'u2@example.com',
      password: '', role: 'Member', status: 'pending',
    });

    const res = await request(app)
      .patch(`/api/access-requests/${req._id}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'approved', role: 'Developer', channelIds: ['general', 'skillnaav'] });

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('approved');
    expect(res.body.request.role).toBe('Developer');
    expect(res.body.request.channelIds).toEqual(['general', 'skillnaav']);

    // Socket events
    expect(io.emit).toHaveBeenCalledWith('member_updated', expect.objectContaining({ email: 'u2@example.com' }));
    expect(io.emit).toHaveBeenCalledWith('access_approved', { email: 'u2@example.com' });

    // Audit log
    const audit = await AuditLog.findOne({ action: 'member.approved' }).lean();
    expect(audit).toBeDefined();
  });

  test('PATCH /api/access-requests/:id admin rejects request', async () => {
    const req = await AccessRequest.create({
      name: 'User3', email: 'u3@example.com',
      password: '', role: 'Member', status: 'pending',
    });

    const res = await request(app)
      .patch(`/api/access-requests/${req._id}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'rejected' });

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('rejected');
    expect(io.emit).toHaveBeenCalledWith('access_rejected', { email: 'u3@example.com' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 12. INTERNAL EMAIL RELAY
// ═══════════════════════════════════════════════════════════════════════════

describe('Internal Email Relay', () => {
  test('POST /api/internal/send-email with valid key succeeds', async () => {
    const res = await request(app)
      .post('/api/internal/send-email')
      .set('x-internal-key', 'test-internal-secret')
      .send({
        to: [{ email: 'user@example.com' }],
        subject: 'Test Subject',
        htmlContent: '<p>Hello</p>',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/internal/send-email without key returns 403', async () => {
    const res = await request(app)
      .post('/api/internal/send-email')
      .send({
        to: [{ email: 'user@example.com' }],
        subject: 'Test',
        htmlContent: '<p>Hi</p>',
      });

    expect(res.status).toBe(403);
  });

  test('POST /api/internal/send-email with missing fields returns 400', async () => {
    const res = await request(app)
      .post('/api/internal/send-email')
      .set('x-internal-key', 'test-internal-secret')
      .send({ to: [{ email: 'user@example.com' }], subject: 'Test' });

    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 13. EMAIL SERVICE (preview mode)
// ═══════════════════════════════════════════════════════════════════════════

describe('Email Service', () => {
  const { sendBrevoEmail } = require('../src/services/emailService');

  test('sendBrevoEmail in preview mode returns ok', async () => {
    const result = await sendBrevoEmail({
      to: [{ email: 'user@test.com', name: 'Test' }],
      subject: 'Test Email',
      html: '<h1>Hello</h1>',
    });

    expect(result.ok).toBe(true);
  });

  test('sendBrevoEmail with BCC works in preview mode', async () => {
    const result = await sendBrevoEmail({
      to: [{ email: 'main@test.com' }],
      bcc: [{ email: 'bcc1@test.com' }, 'bcc2@test.com'],
      subject: 'BCC Test',
      html: '<p>BCC</p>',
    });

    expect(result.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 14. AUDIT LOGGING
// ═══════════════════════════════════════════════════════════════════════════

describe('Audit Logging', () => {
  test('admin actions create audit log entries', async () => {
    // Trigger audit via channel creation
    const res = await request(app)
      .post('/api/channels')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'audit-test', description: 'For audit' });

    expect(res.status).toBe(200);

    const logs = await AuditLog.find({}).lean();
    expect(logs.length).toBeGreaterThan(0);
    const channelLog = logs.find(l => l.action === 'channel.created');
    expect(channelLog).toBeDefined();
    expect(channelLog.adminEmail).toBe('admin@edutechex.in');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 15. SOCKET.IO EVENTS (via mock)
// ═══════════════════════════════════════════════════════════════════════════

describe('Socket.IO Events', () => {
  test('new message emits to channel room', async () => {
    const token = memberToken('socket@example.com', 'Socket User');
    await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({
        channelId: 'general', sender: 'Socket User',
        initials: 'SU', color: '#000', text: 'Hello socket',
      });

    expect(io.to).toHaveBeenCalledWith('general');
    expect(io.emit).toHaveBeenCalledWith('new_message', expect.objectContaining({
      channelId: 'general',
      message: expect.objectContaining({ text: 'Hello socket' }),
    }));
  });

  test('login emits login_status_updated', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@edutechex.in', password: 'AdminPass123' });

    expect(res.status).toBe(200);
    expect(io.emit).toHaveBeenCalledWith('login_status_updated', expect.objectContaining({
      email: 'admin@edutechex.in',
      loggedIn: true,
    }));
  });

  test('channel deletion emits channel_deleted', async () => {
    await WorkspaceChannel.create({ _id: 'temp2', name: 'temp2', description: '', isDefault: false });

    await request(app)
      .delete('/api/channels/temp2')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(io.emit).toHaveBeenCalledWith('channel_deleted', { channelId: 'temp2' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 16. EDGE CASES & SECURITY
// ═══════════════════════════════════════════════════════════════════════════

describe('Edge Cases & Security', () => {
  test('email normalization is case-insensitive', async () => {
    const hashedPw = await bcrypt.hash('TestPass1', 10);
    await AccessRequest.create({
      name: 'CaseUser', email: 'case@example.com',
      password: hashedPw, role: 'Member', status: 'approved',
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: '  CASE@EXAMPLE.COM  ', password: 'TestPass1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('expired JWT is rejected', async () => {
    const token = generateToken(
      { email: 'exp@example.com', name: 'Exp', role: 'Member', status: 'approved' },
      '0s',
    );
    // Wait a tick for the token to expire
    await new Promise(r => setTimeout(r, 100));

    const res = await request(app)
      .get('/api/messages')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
  });

  test('request with no body handles gracefully', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});
    expect(res.status).toBe(400);
  });

  test('unicode text is preserved through encryption', async () => {
    const token = memberToken();
    const unicodeText = '🎉 こんにちは عالم Héllo Wörld 🌍';

    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({
        channelId: 'general', sender: 'User', initials: 'U',
        color: '#000', text: unicodeText,
      });

    expect(res.status).toBe(200);

    // Read back and verify decryption
    const getRes = await request(app)
      .get('/api/messages?channelId=general')
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.body.messages[0].text).toBe(unicodeText);
  });

  test('very long message is encrypted and decrypted correctly', async () => {
    const longText = 'A'.repeat(10000);
    const encrypted = encryptField(longText);
    const decrypted = decryptField(encrypted);
    expect(decrypted).toBe(longText);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 17. WEBHOOK RECEIVER
// ═══════════════════════════════════════════════════════════════════════════

describe('Webhook Receivers', () => {
  const Webhook = require('../src/models/Webhook');

  test('generic webhook receiver creates message', async () => {
    const wh = await Webhook.create({
      name: 'Test Hook', channelId: 'general',
      type: 'generic', token: 'test-token-123', active: true,
    });

    const res = await request(app)
      .post('/webhook/incoming/test-token-123')
      .send({ text: 'Webhook message from Zapier' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify message was created
    const msgs = await Message.find({ channelId: 'general' }).lean();
    expect(msgs.length).toBe(1);
  });

  test('webhook with invalid token returns 404', async () => {
    const res = await request(app)
      .post('/webhook/incoming/invalid-token')
      .send({ text: 'Should fail' });

    expect(res.status).toBe(404);
  });
});
