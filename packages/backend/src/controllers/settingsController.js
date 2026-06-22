const UserSettings = require('../models/UserSettings');

async function getSettings(req, res) {
  try {
    const email = req.user?.email?.toLowerCase();
    if (!email) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    const doc = await UserSettings.findOne({ email }).lean();
    if (!doc) return res.json({ success: true, settings: {} });
    const { email: _e, _id, __v, createdAt, updatedAt, ...settings } = doc;
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function saveSettings(req, res) {
  try {
    const email = req.user?.email?.toLowerCase();
    if (!email) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    const updates = req.body;
    const allowed = [
      'displayName','avatarEmoji','status','meetLink',
      'emailNotifications','desktopNotifications','soundNotifications',
      'compactChat','fontSize','enterToSend','darkMode',
    ];
    const safe = {};
    for (const k of allowed) {
      if (k in updates) safe[k] = updates[k];
    }
    await UserSettings.findOneAndUpdate(
      { email },
      { $set: safe },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

module.exports = { getSettings, saveSettings };
