const UserKey = require('../models/UserKey');

async function publishKey(req, res) {
  try {
    const email = req.user?.email?.toLowerCase();
    if (!email) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    const { publicKey } = req.body;
    if (!publicKey) return res.status(400).json({ success: false, error: 'publicKey required.' });
    await UserKey.findOneAndUpdate(
      { email },
      { $set: { publicKey, updatedAt: new Date() } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function getKey(req, res) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    const { email } = req.params;
    const doc = await UserKey.findOne({ email: email.toLowerCase() }).lean();
    if (!doc) return res.status(404).json({ success: false, error: 'No key found.' });
    res.json({ success: true, publicKey: doc.publicKey });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

module.exports = { publishKey, getKey };
