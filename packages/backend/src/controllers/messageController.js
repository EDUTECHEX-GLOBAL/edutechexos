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
    }).catch((e) => console.error('[email] notification send failed:', e));
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
    // Only return non-DM channels in the aggregate endpoint to prevent
    // leaking private DMs to users who are not participants.
    const visibleChIds = allChannelIds.filter((id) => !id.startsWith('member-') && !id.startsWith('dm-'));
    const grouped  = {};
    const hasMoreMap = {};

    for (const chId of visibleChIds) {
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
    // Identity is authoritative from the verified JWT — never trust a
    // client-supplied senderEmail (prevents posting as / deleting as another
    // user, since senderEmail drives the edit/delete ownership checks).
    if (userEmail) {
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
      processMentions(preSaveText, senderName, base.channelId, base.id, io, appUrl).catch((e) => console.error('[mentions] processing failed:', e));
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

    // "Delete for everyone" is restricted to the message author or an admin.
    const target = await Message.findById(id).select('senderEmail').lean();
    if (!target) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }
    const owns = target.senderEmail && target.senderEmail.toLowerCase() === userEmail;
    if (!owns && req.user?.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'You can only delete your own messages for everyone.' });
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
    const requester = req.user?.email?.toLowerCase();
    const isAdmin = req.user?.role === 'Admin';

    // Editing the text is restricted to the author (or an admin). Reactions and
    // poll votes are collaborative and may be updated by any authenticated user.
    if (text !== undefined) {
      const existing = await Message.findById(id).select('senderEmail').lean();
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Message not found' });
      }
      const owns = existing.senderEmail && existing.senderEmail.toLowerCase() === requester;
      if (!owns && !isAdmin) {
        return res.status(403).json({ success: false, error: 'You can only edit your own messages.' });
      }
    }

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

function isPrivateIPv4(a, b) {
  if (a === 127) return true;                       // loopback
  if (a === 10) return true;                        // private
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true;          // private
  if (a === 169 && b === 254) return true;          // link-local / cloud metadata
  if (a === 0) return true;                         // "this" network
  return false;
}

function isPrivateUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    if (!['http:', 'https:'].includes(u.protocol)) return true;
    const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');

    // Block obvious internal names and IPv6 loopback/private (fc00::/7, fe80::/10)
    if (host === 'localhost' || host === '0.0.0.0' || host === '::1' || host === '::') return true;
    if (host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) return true;
    if (host.includes(':')) {
      // IPv6 literal — block unique-local (fc/fd) and link-local (fe8-feb)
      if (/^f[cd]/.test(host) || /^fe[89ab]/.test(host)) return true;
      return false;
    }

    // Single-token numeric hosts (decimal/hex/octal IPv4 encodings, e.g. 2130706433, 0x7f000001)
    if (/^(0x[0-9a-f]+|\d+)$/i.test(host)) {
      const n = host.startsWith('0x') ? parseInt(host, 16) : parseInt(host, 10);
      if (Number.isFinite(n)) {
        const a = (n >>> 24) & 0xff;
        const b = (n >>> 16) & 0xff;
        if (isPrivateIPv4(a, b)) return true;
      }
      return true; // numeric host that doesn't decode cleanly — reject to be safe
    }

    // Dotted IPv4 — parse each octet honouring hex (0x..) and octal (0..) notation
    if (/^[0-9a-fx.]+$/i.test(host) && host.includes('.')) {
      const octets = host.split('.').map((p) => {
        if (/^0x[0-9a-f]+$/i.test(p)) return parseInt(p, 16);
        if (/^0[0-7]+$/.test(p)) return parseInt(p, 8);
        return parseInt(p, 10);
      });
      if (octets.every((o) => Number.isFinite(o))) {
        if (isPrivateIPv4(octets[0], octets[1])) return true;
      }
    }
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
