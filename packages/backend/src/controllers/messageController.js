const { getUserEmail, formatMessage, PAGE_SIZE, VALID_ACCOUNTS } = require('../utils/helpers');
const { encryptField, decryptField } = require('../services/encryptionService');
const { sendBrevoEmail } = require('../services/emailService');
const Message = require('../models/Message');
const WikiPage = require('../models/WikiPage');
const KanbanTask = require('../models/KanbanTask');
const { AccessRequest } = require('../models/index');
const Notification = require('../models/Notification');

async function processMentions(text, senderName, channelId, messageId, io, appUrl) {
  if (!text || !text.includes('@')) return;
  const mentions = [...text.matchAll(/@([A-Za-z][A-Za-z0-9 ._-]{1,40})/g)].map(m => m[1].trim().toLowerCase());
  if (mentions.length === 0) return;

  const dbUsers = await AccessRequest.find({ status: 'approved' }).lean().catch(() => []);
  const allUsers = [
    ...VALID_ACCOUNTS.map(a => ({ email: a.email, name: a.name })),
    ...dbUsers.map(u => ({ email: u.email, name: u.name })),
  ];

  for (const mention of mentions) {
    const matched = allUsers.find(u => u.name.toLowerCase() === mention || u.name.toLowerCase().startsWith(mention));
    if (!matched) continue;

    if (io) {
      io.emit('mention_notification', {
        recipientEmail: matched.email,
        senderName,
        channelId,
        messageId,
        preview: text.slice(0, 120),
      });
    }

    sendBrevoEmail({
      to: [{ email: matched.email, name: matched.name }],
      subject: `EduTechExOS — ${senderName} mentioned you`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#F8FAFC;border-radius:12px;">
          <div style="background:linear-gradient(135deg,#191E2F,#252D45);border-radius:10px;padding:20px;text-align:center;margin-bottom:20px;">
            <h1 style="color:#fff;margin:0;font-size:20px;">EduTechExOS</h1>
          </div>
          <h2 style="font-size:16px;color:#0F172A;margin:0 0 8px;">You were mentioned in #${channelId}</h2>
          <p style="color:#64748B;font-size:13px;margin:0 0 16px;"><strong>${senderName}</strong> mentioned you:</p>
          <div style="background:#fff;border-left:3px solid #0D9488;border-radius:6px;padding:12px 16px;margin-bottom:20px;">
            <p style="color:#0F172A;font-size:13px;margin:0;">${text.replace(/</g,'&lt;').replace(/>/g,'&gt;').slice(0,300)}</p>
          </div>
          <div style="text-align:center;">
            <a href="${appUrl || 'https://edutechexos.vercel.app'}/dashboard" style="display:inline-block;background:#0D9488;color:#fff;text-decoration:none;padding:11px 28px;border-radius:8px;font-size:13px;font-weight:700;">View in Dashboard →</a>
          </div>
        </div>`,
    }).catch(() => {});
  }
}

async function getMessages(req, res) {
  try {
    const requestingUser = getUserEmail(req);
    const { channelId, before, limit } = req.query;
    const pageSize = Math.min(parseInt(limit) || PAGE_SIZE, 100);

    if (channelId) {
      const filter = { channelId: String(channelId) };
      if (before) filter.timestamp = { $lt: new Date(before) };

      const msgs = await Message.find(filter)
        .sort({ timestamp: -1 })
        .limit(pageSize + 1)
        .lean();

      const hasMore = msgs.length > pageSize;
      const page = msgs.slice(0, pageSize).reverse();

      const formatted = page.map((m) => formatMessage(m, requestingUser)).filter(Boolean);
      return res.json({ success: true, messages: formatted, hasMore, channelId });
    }

    const allChannelIds = await Message.distinct('channelId');
    const grouped  = {};
    const hasMoreMap = {};

    for (const chId of allChannelIds) {
      const msgs = await Message.find({ channelId: chId })
        .sort({ timestamp: -1 })
        .limit(pageSize + 1)
        .lean();

      hasMoreMap[chId] = msgs.length > pageSize;
      const page = msgs.slice(0, pageSize).reverse();
      grouped[chId] = page.map((m) => formatMessage(m, requestingUser)).filter(Boolean);
    }

    res.json({ success: true, messages: grouped, hasMore: hasMoreMap });
  } catch (err) {
    console.error('[GET /api/messages] Error:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function postMessage(req, res) {
  try {
    const { id, ...messageData } = req.body;
    const userEmail = getUserEmail(req);
    if (userEmail && !messageData.senderEmail) {
      messageData.senderEmail = userEmail;
    }

    const preSaveText = messageData.text;

    if (messageData.text) messageData.text = encryptField(messageData.text);
    const newMessage = new Message({ ...messageData, clientId: id });
    const savedMsg = await newMessage.save();
    const { _id, __v, ...rest } = savedMsg.toObject();

    const base = {
      ...rest,
      id: _id.toString(),
      timestamp: rest.timestamp instanceof Date ? rest.timestamp.toISOString() : rest.timestamp,
      ...(rest.editedAt ? { editedAt: rest.editedAt instanceof Date ? rest.editedAt.toISOString() : rest.editedAt } : {}),
    };

    const socketPayload = { ...base, text: preSaveText };
    const io = req.app.get('io');
    if (io) io.to(base.channelId).emit('new_message', { channelId: base.channelId, message: socketPayload });

    if (preSaveText) {
      const senderName = messageData.sender || req.user?.name || 'Someone';
      const appUrl = process.env.APP_URL || 'https://edutechexos.vercel.app';
      processMentions(preSaveText, senderName, base.channelId, base.id, io, appUrl).catch(() => {});
    }

    res.json({ success: true, message: base });
  } catch (err) {
    console.error('[POST /api/messages] Error:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function deleteMessage(req, res) {
  try {
    const { id } = req.params;
    const { scope, hard } = req.query;
    const userEmail = req.user?.email?.toLowerCase() || 'unknown';

    if (hard === 'true') {
      if (req.user?.role !== 'Admin') {
        return res.status(403).json({ success: false, error: 'Only admins can permanently delete messages.' });
      }
      const msg = await Message.findByIdAndDelete(id).lean();
      if (msg) {
        const io = req.app.get('io');
        if (io) io.to(msg.channelId).emit('message_deleted', { channelId: msg.channelId, messageId: id });
      }
      return res.json({ success: true, deleted: 'permanent' });
    }

    if (scope === 'me') {
      await Message.findByIdAndUpdate(id, { $addToSet: { deletedForUsers: userEmail } });
      return res.json({ success: true, deleted: 'for-me' });
    }

    const updated = await Message.findByIdAndUpdate(
      id,
      { deletedAt: new Date(), deletedForEveryone: true, deletedBy: userEmail },
      { new: true }
    ).lean();

    if (updated) {
      const io = req.app.get('io');
      if (io) io.to(updated.channelId).emit('message_deleted', { channelId: updated.channelId, messageId: id });
    }

    res.json({ success: true, deleted: 'for-everyone' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function patchMessage(req, res) {
  try {
    const { id } = req.params;
    const { text, editedAt, reactions, poll } = req.body;
    const updates = {};
    const plainText = text;
    if (text     !== undefined) updates.text     = encryptField(text);
    if (editedAt !== undefined) updates.editedAt = editedAt;
    if (reactions !== undefined) updates.reactions = reactions;
    if (poll     !== undefined) updates.poll     = poll;

    const updated = await Message.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    const { _id, __v, ...rest } = updated;
    const base = {
      ...rest,
      id: _id.toString(),
      timestamp: rest.timestamp instanceof Date ? rest.timestamp.toISOString() : rest.timestamp,
      ...(rest.editedAt ? { editedAt: rest.editedAt instanceof Date ? rest.editedAt.toISOString() : rest.editedAt } : {}),
    };

    const socketPayload = text !== undefined ? { ...base, text: plainText } : base;
    const io = req.app.get('io');
    if (io) io.to(base.channelId).emit('message_updated', { channelId: base.channelId, message: socketPayload });

    res.json({ success: true, message: base });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function search(req, res) {
  try {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    if (!q) return res.json({ success: true, results: [], total: 0 });

    const textFilter = { $text: { $search: q }, channelId: { $not: /^member-/ } };
    const scoreProj = { score: { $meta: 'textScore' } };

    const [msgDocs, wikiDocs, taskDocs] = await Promise.all([
      Message.find(textFilter, scoreProj).sort({ score: { $meta: 'textScore' } }).limit(limit).lean(),
      WikiPage.find(textFilter, scoreProj).sort({ score: { $meta: 'textScore' } }).limit(10).lean(),
      KanbanTask.find(textFilter, scoreProj).sort({ score: { $meta: 'textScore' } }).limit(10).lean(),
    ]);

    const results = [
      ...msgDocs.map(d => ({
        type: 'message', id: String(d._id), channelId: d.channelId,
        text: decryptField(d.text), sender: d.sender, timestamp: d.timestamp, score: d.score,
      })),
      ...wikiDocs.map(d => ({
        type: 'wiki', id: String(d._id), channelId: d.channelId,
        text: `${d.title}: ${String(d.content).replace(/<[^>]*>/g, '').slice(0, 200)}`,
        sender: d.createdBy, timestamp: d.updatedAt, score: d.score,
      })),
      ...taskDocs.map(d => ({
        type: 'task', id: String(d._id), channelId: d.sourceChannel,
        text: `${d.text} → ${d.assignee} [${d.status}]`,
        sender: d.assignee, timestamp: d.createdAt, score: d.score,
      })),
    ].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, limit);

    res.json({ success: true, results, total: results.length });
  } catch (err) {
    if (String(err).includes('text index')) {
      const q = String(req.query.q || '').trim();
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      // Only search non-DM channels (DMs have channelId starting with 'member-')
      const allMsgs = await Message.find({
        channelId: { $not: /^member-/ },
        deletedAt: { $exists: false },
      }).sort({ timestamp: -1 }).limit(500).lean();
      const matched = allMsgs.filter(d => re.test(decryptField(d.text) || '')).slice(0, 20);
      return res.json({
        success: true,
        results: matched.map(d => ({ type: 'message', id: String(d._id), channelId: d.channelId, text: decryptField(d.text), sender: d.sender, timestamp: d.timestamp })),
        total: matched.length,
      });
    }
    res.status(500).json({ success: false, error: String(err) });
  }
}

function isPrivateUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    if (!['http:', 'https:'].includes(u.protocol)) return true;
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host === '0.0.0.0' || host === '::1') return true;
    const parts = host.split('.').map(Number);
    if (parts[0] === 127) return true;
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    return false;
  } catch { return true; }
}

async function ogLinkPreview(req, res) {
  const url = String(req.query.url || '');
  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ success: false, error: 'Valid URL required' });
  }
  if (isPrivateUrl(url)) {
    return res.status(400).json({ success: false, error: 'URL not allowed' });
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EduTechExOSBot/1.0; +https://edutechexos.vercel.app)' },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const html = await resp.text();

    const og = (prop) => {
      const m = html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']{1,400})["']`, 'i'))
               || html.match(new RegExp(`<meta[^>]+content=["']([^"']{1,400})["'][^>]+property=["']og:${prop}["']`, 'i'));
      return m?.[1]?.trim() || '';
    };
    const meta = (name) => {
      const m = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']{1,400})["']`, 'i'))
               || html.match(new RegExp(`<meta[^>]+content=["']([^"']{1,400})["'][^>]+name=["']${name}["']`, 'i'));
      return m?.[1]?.trim() || '';
    };
    const titleTag = (html.match(/<title[^>]*>([^<]{1,200})<\/title>/i) || [])[1]?.trim() || '';

    res.json({
      success: true,
      preview: {
        url,
        title:       og('title')       || meta('title')       || titleTag,
        description: og('description') || meta('description') || '',
        image:       og('image')       || '',
        siteName:    og('site_name')   || '',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

module.exports = { getMessages, postMessage, deleteMessage, patchMessage, search, ogLinkPreview };
