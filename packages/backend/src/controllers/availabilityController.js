const AdminAvailability = require('../models/AdminAvailability');

async function getAvailability(req, res) {
  try {
    const { month } = req.query;
    let records;
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      records = await AdminAvailability.find({ date: { $regex: `^${month}` } }).lean();
    } else {
      records = await AdminAvailability.find({}).lean();
    }
    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function saveAvailability(req, res) {
  try {
    const email = req.user?.email?.toLowerCase();
    if (!email) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    const { date, slots } = req.body;
    if (!date || !Array.isArray(slots)) {
      return res.status(400).json({ success: false, error: 'date and slots required.' });
    }
    const parsed = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isNaN(parsed.getTime())) {
      return res.status(400).json({ success: false, error: 'date must be a valid date.' });
    }
    if (parsed < today) {
      return res.status(400).json({ success: false, error: 'date cannot be in the past.' });
    }
    const record = await AdminAvailability.findOneAndUpdate(
      { date, adminEmail: email },
      { $set: { slots, adminEmail: email } },
      { upsert: true, new: true }
    );
    res.json({ success: true, record });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function deleteAvailability(req, res) {
  try {
    const email = req.user?.email?.toLowerCase();
    if (!email) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    const { dateStr } = req.params;
    await AdminAvailability.deleteOne({ date: dateStr, adminEmail: email });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

module.exports = { getAvailability, saveAvailability, deleteAvailability };
