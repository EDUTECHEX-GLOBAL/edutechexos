const { DEFAULT_WORKSPACE_CHANNELS } = require('../utils/helpers');
const WorkspaceChannel = require('../models/WorkspaceChannel');
const { logAudit } = require('../services/auditService');

async function getChannels(req, res) {
  try {
    const userEmail = req.user?.email?.toLowerCase();
    let channels = await WorkspaceChannel.find({ $or: [{ type: 'channel' }, { type: { $exists: false } }] }).sort({ order: 1 }).lean();
    if (channels.length === 0) {
      await WorkspaceChannel.insertMany(DEFAULT_WORKSPACE_CHANNELS);
      channels = DEFAULT_WORKSPACE_CHANNELS;
    }
    const dms = userEmail
      ? await WorkspaceChannel.find({ type: 'dm', dmMembers: userEmail }).sort({ updatedAt: -1 }).lean()
      : [];
    const all = [...channels, ...dms];
    const formatted = all.map(({ _id, __v, ...rest }) => ({
      ...rest,
      id: _id,
      createdAt: rest.createdAt instanceof Date ? rest.createdAt.toISOString() : rest.createdAt,
      updatedAt: rest.updatedAt instanceof Date ? rest.updatedAt.toISOString() : rest.updatedAt,
    }));
    res.json({ success: true, channels: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function getOrCreateDM(req, res) {
  try {
    const myEmail = req.user?.email?.toLowerCase();
    const { targetEmail } = req.body;
    if (!myEmail || !targetEmail) return res.status(400).json({ success: false, error: 'targetEmail is required.' });
    const other = targetEmail.toLowerCase();
    const members = [myEmail, other].sort();
    const dmId = `dm-${members[0].replace(/[@.]/g,'-')}-${members[1].replace(/[@.]/g,'-')}`;
    let existing = await WorkspaceChannel.findById(dmId).lean();
    if (!existing) {
      const ch = new WorkspaceChannel({ _id: dmId, name: dmId, type: 'dm', dmMembers: members, isDefault: false, createdBy: myEmail, order: 9999 });
      existing = (await ch.save()).toObject();
    }
    const { _id, __v, ...rest } = existing;
    res.json({ success: true, channel: { ...rest, id: _id } });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function createChannel(req, res) {
  try {
    if (!req.user || req.user.role !== 'Admin') return res.status(403).json({ success: false, error: 'Only admins can create channels.' });
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'name is required.' });
    if (String(name).length > 50) return res.status(400).json({ success: false, error: 'Channel name must be 50 characters or fewer.' });
    if (description && String(description).length > 500) return res.status(400).json({ success: false, error: 'Description must be 500 characters or fewer.' });
    const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const exists = await WorkspaceChannel.findById(id).lean();
    if (exists) return res.status(409).json({ success: false, error: 'A channel with this name already exists.' });
    const count = await WorkspaceChannel.countDocuments();
    const channel = new WorkspaceChannel({
      _id: id, name: id, description: description || '',
      isDefault: false, createdBy: req.user.email, order: count,
    });
    const saved = await channel.save();
    const { _id, __v, ...rest } = saved.toObject();
    const io = req.app.get('io');
    io.emit('channel_created', { ...rest, id: _id });
    await logAudit(req, 'channel.created', '', '', { channelId: _id, name: id });
    res.json({ success: true, channel: { ...rest, id: _id } });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function updateChannel(req, res) {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Only admins can edit channels.' });
    }
    const updates = {};
    if (req.body.name) {
      if (String(req.body.name).length > 50) return res.status(400).json({ success: false, error: 'Channel name must be 50 characters or fewer.' });
      updates.name = req.body.name;
    }
    if (req.body.description !== undefined) {
      if (String(req.body.description).length > 500) return res.status(400).json({ success: false, error: 'Description must be 500 characters or fewer.' });
      updates.description = req.body.description;
    }
    const updated = await WorkspaceChannel.findByIdAndUpdate(
      req.params.id, { $set: updates }, { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ success: false, error: 'Channel not found.' });
    const { _id, __v, ...rest } = updated;
    res.json({ success: true, channel: { ...rest, id: _id } });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function deleteChannel(req, res) {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Only admins can delete channels.' });
    }
    const channel = await WorkspaceChannel.findById(req.params.id).lean();
    if (!channel) return res.status(404).json({ success: false, error: 'Channel not found.' });
    if (channel.isDefault) return res.status(400).json({ success: false, error: 'Default channels cannot be deleted.' });
    await WorkspaceChannel.findByIdAndDelete(req.params.id);
    const io = req.app.get('io');
    io.emit('channel_deleted', { channelId: req.params.id });
    await logAudit(req, 'channel.deleted', '', '', { channelId: req.params.id, name: channel.name });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

module.exports = { getChannels, createChannel, updateChannel, deleteChannel, getOrCreateDM };
