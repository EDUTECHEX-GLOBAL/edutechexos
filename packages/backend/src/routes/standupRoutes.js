const router = require('express').Router();
const { authMiddleware, requireAuth } = require('../middleware/auth');
const { globalLimiter } = require('../config/rateLimiter');
const StandupReply = require('../models/StandupReply');

const getTodayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

// Get today's standup for current user
router.get('/today', authMiddleware, requireAuth, async (req, res) => {
  try {
    const dateStr = getTodayIST();
    const reply = await StandupReply.findOne({ email: req.user.email.toLowerCase(), dateStr });
    res.json({ success: true, reply });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Upsert today's standup
router.put('/today', authMiddleware, requireAuth, async (req, res) => {
  try {
    const dateStr = getTodayIST();
    const { yesterday, today, blockers } = req.body;
    const reply = await StandupReply.findOneAndUpdate(
      { email: req.user.email.toLowerCase(), dateStr },
      { yesterday: yesterday || '', today: today || '', blockers: blockers || '', updatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, reply });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all team standups for today
router.get('/team', authMiddleware, requireAuth, async (req, res) => {
  try {
    const dateStr = getTodayIST();
    const replies = await StandupReply.find({ dateStr }).sort({ createdAt: -1 });
    res.json({ success: true, replies });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get current user's standup history
router.get('/history', authMiddleware, requireAuth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const start = new Date();
    start.setDate(start.getDate() - days);
    const replies = await StandupReply.find({
      email: req.user.email.toLowerCase(),
      createdAt: { $gte: start },
    }).sort({ dateStr: -1 });
    res.json({ success: true, replies });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
