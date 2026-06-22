const crypto = require('crypto');
const { encryptField } = require('../services/encryptionService');
const Webhook = require('../models/Webhook');
const Message = require('../models/Message');

function generateWebhookToken() {
  return crypto.randomBytes(24).toString('hex');
}

async function postBotMessage(io, channelId, text) {
  const msg = new Message({
    channelId,
    sender:   'EduTechExOS Bot',
    initials: 'EB',
    color:    '#4f46e5',
    text:     encryptField(text),
    timestamp: new Date(),
  });
  const saved = await msg.save();
  const { _id, __v, ...rest } = saved.toObject();
  const payload = {
    ...rest,
    id: _id.toString(),
    text,
    timestamp: rest.timestamp instanceof Date ? rest.timestamp.toISOString() : rest.timestamp,
  };
  io.to(channelId).emit('new_message', { channelId, message: payload });
  return payload;
}

async function listWebhooks(req, res) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const hooks = await Webhook.find({}).sort({ createdAt: -1 }).lean();
    const formatted = hooks.map(({ _id, __v, ...rest }) => ({
      ...rest,
      id: _id.toString(),
      createdAt: rest.createdAt instanceof Date ? rest.createdAt.toISOString() : rest.createdAt,
      lastUsed:  rest.lastUsed  instanceof Date ? rest.lastUsed.toISOString()  : rest.lastUsed,
    }));
    res.json({ success: true, webhooks: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function createWebhook(req, res) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const { name, channelId, type, secret } = req.body;
    if (!name || !channelId || !type) {
      return res.status(400).json({ success: false, error: 'name, channelId, and type are required' });
    }
    const token = generateWebhookToken();
    const hook = new Webhook({ name, channelId, type, token, secret: secret || '' });
    const saved = await hook.save();
    const { _id, __v, ...rest } = saved.toObject();
    res.json({
      success: true,
      webhook: {
        ...rest,
        id: _id.toString(),
        createdAt: rest.createdAt instanceof Date ? rest.createdAt.toISOString() : rest.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function updateWebhook(req, res) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const { id } = req.params;
    const updates = {};
    if (req.body.active  !== undefined) updates.active  = req.body.active;
    if (req.body.name    !== undefined) updates.name    = req.body.name;
    if (req.body.secret  !== undefined) updates.secret  = req.body.secret;
    const updated = await Webhook.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
    if (!updated) return res.status(404).json({ success: false, error: 'Webhook not found' });
    const { _id, __v, ...rest } = updated;
    res.json({
      success: true,
      webhook: {
        ...rest,
        id: _id.toString(),
        createdAt: rest.createdAt instanceof Date ? rest.createdAt.toISOString() : rest.createdAt,
        lastUsed:  rest.lastUsed  instanceof Date ? rest.lastUsed.toISOString()  : rest.lastUsed,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function deleteWebhook(req, res) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    await Webhook.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

// POST /webhook/github/:token — receives GitHub events
// Requires express.json({ type: '*/*' }) middleware applied at route level
async function githubReceiver(req, res) {
  try {
    const hook = await Webhook.findOne({ token: req.params.token, type: 'github', active: true }).lean();
    if (!hook) return res.status(404).json({ error: 'Webhook not found or inactive' });

    if (!hook.secret) {
      return res.status(400).json({ error: 'Webhook secret not configured. Set a secret in webhook settings.' });
    }
    const sig = req.headers['x-hub-signature-256'] || '';
    const expected = 'sha256=' + crypto.createHmac('sha256', hook.secret).update(JSON.stringify(req.body)).digest('hex');
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    const valid = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
    if (!valid) return res.status(401).json({ error: 'Invalid signature' });

    const event   = req.headers['x-github-event'] || 'push';
    const payload = req.body;
    let text = '';

    if (event === 'push') {
      const repo    = payload.repository?.full_name ?? 'repo';
      const branch  = (payload.ref || '').replace('refs/heads/', '');
      const pusher  = payload.pusher?.name ?? 'someone';
      const commits = (payload.commits || []).length;
      const msg     = payload.head_commit?.message?.split('\n')[0] ?? '';
      text = `🔀 **[${repo}]** ${pusher} pushed ${commits} commit${commits !== 1 ? 's' : ''} to \`${branch}\`${msg ? `: "${msg}"` : ''}`;
    } else if (event === 'pull_request') {
      const pr     = payload.pull_request;
      const action = payload.action;
      const repo   = payload.repository?.full_name ?? 'repo';
      text = `🔁 **[${repo}]** PR #${pr?.number} **${action}**: "${pr?.title}" by ${pr?.user?.login ?? 'someone'} → ${pr?.html_url}`;
    } else if (event === 'issues') {
      const issue  = payload.issue;
      const action = payload.action;
      const repo   = payload.repository?.full_name ?? 'repo';
      text = `🐛 **[${repo}]** Issue #${issue?.number} **${action}**: "${issue?.title}" → ${issue?.html_url}`;
    } else if (event === 'release') {
      const release = payload.release;
      const repo    = payload.repository?.full_name ?? 'repo';
      text = `🚀 **[${repo}]** Release **${release?.tag_name}** published: "${release?.name}" → ${release?.html_url}`;
    } else {
      text = `⚡ **GitHub** event \`${event}\` received from ${payload.repository?.full_name ?? 'unknown repo'}`;
    }

    await Webhook.findByIdAndUpdate(hook._id, { lastUsed: new Date() });
    const io = req.app.get('io');
    await postBotMessage(io, hook.channelId, text);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[webhook/github]', err);
    res.status(500).json({ error: String(err) });
  }
}

// POST /webhook/incoming/:token — generic receiver (Zapier, Make, IFTTT, etc.)
// Requires express.json({ type: '*/*' }) middleware applied at route level
async function genericReceiver(req, res) {
  try {
    const hook = await Webhook.findOne({ token: req.params.token, type: 'generic', active: true }).lean();
    if (!hook) return res.status(404).json({ error: 'Webhook not found or inactive' });

    const { text, title } = req.body;
    if (!text || typeof text !== 'string' || text.length > 10000) {
      return res.status(400).json({ error: '`text` is required and must be under 10000 characters' });
    }
    if (title && (typeof title !== 'string' || title.length > 500)) {
      return res.status(400).json({ error: '`title` must be under 500 characters' });
    }

    const message = title ? `**${title}**\n${text}` : text;
    await Webhook.findByIdAndUpdate(hook._id, { lastUsed: new Date() });
    const io = req.app.get('io');
    await postBotMessage(io, hook.channelId, message);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[webhook/incoming]', err);
    res.status(500).json({ error: String(err) });
  }
}

module.exports = {
  generateWebhookToken,
  postBotMessage,
  listWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  githubReceiver,
  genericReceiver,
};
