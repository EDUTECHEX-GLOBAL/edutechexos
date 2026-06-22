const PinnedMessage = require('../models/PinnedMessage');

async function getPinned(req, res) {
  try {
    const email = req.user?.email?.toLowerCase();
    if (!email) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    const pins = await PinnedMessage.find({ userEmail: email }).lean();
    const pinnedMessageIds = {};
    for (const p of pins) {
      if (!pinnedMessageIds[p.channelId]) pinnedMessageIds[p.channelId] = [];
      pinnedMessageIds[p.channelId].push(p.messageId);
    }
    res.json({ success: true, pinnedMessageIds });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function pinMessage(req, res) {
  try {
    const email = req.user?.email?.toLowerCase();
    if (!email) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    const { channelId, messageId } = req.body;
    if (!channelId || !messageId) {
      return res.status(400).json({ success: false, error: 'channelId and messageId required.' });
    }
    await PinnedMessage.findOneAndUpdate(
      { userEmail: email, channelId, messageId },
      { $set: { userEmail: email, channelId, messageId, pinnedBy: email } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function unpinMessage(req, res) {
  try {
    const email = req.user?.email?.toLowerCase();
    if (!email) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    const { channelId, messageId } = req.params;
    await PinnedMessage.deleteOne({ userEmail: email, channelId, messageId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

module.exports = { getPinned, pinMessage, unpinMessage };
