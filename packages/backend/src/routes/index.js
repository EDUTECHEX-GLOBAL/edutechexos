const router = require('express').Router();
const express = require('express');
const { authLimiter, apiLimiter, globalLimiter } = require('../config/rateLimiter');
const { authMiddleware, requireAuth } = require('../middleware/auth');
const { search, ogLinkPreview } = require('../controllers/messageController');
const { githubReceiver, genericReceiver } = require('../controllers/webhookController');

router.use('/api/auth', authLimiter, require('./authRoutes'));
router.use('/api/messages', apiLimiter, require('./messageRoutes'));
router.use('/api/kanban', apiLimiter, require('./kanbanRoutes'));

router.use('/api/members', globalLimiter, require('./memberRoutes'));
router.use('/api/wikipages', globalLimiter, require('./wikiRoutes'));
router.use('/api/bookmarks', globalLimiter, require('./bookmarkRoutes'));
router.use('/api/notifications', globalLimiter, require('./notificationRoutes'));
router.use('/api/webhooks', globalLimiter, require('./webhookRoutes'));
router.use('/api/channels', globalLimiter, require('./channelRoutes'));
router.use('/api/activity', globalLimiter, require('./activityRoutes'));
router.use('/api/leaves', globalLimiter, require('./leaveRoutes'));
router.use('/api/access-requests', globalLimiter, require('./accessRequestRoutes'));
router.use('/api/admin', globalLimiter, require('./adminRoutes'));
router.use('/api/invite', globalLimiter, require('./adminRoutes'));
router.use('/api/digest', globalLimiter, require('./digestRoutes'));

router.use('/api', globalLimiter, require('./meetingRoutes'));

router.get('/api/search', apiLimiter, authMiddleware, search);
router.get('/api/og', apiLimiter, authMiddleware, requireAuth, ogLinkPreview);

router.post('/webhook/github/:token', express.json({ type: '*/*' }), githubReceiver);
router.post('/webhook/incoming/:token', express.json({ type: '*/*' }), genericReceiver);

// ── Internal email relay (used by Next.js server actions) ──────────────────
const { sendBrevoEmail } = require('../services/emailService');
router.post('/api/internal/send-email', express.json(), async (req, res) => {
  const expected = process.env.INTERNAL_API_SECRET;
  if (!expected || req.headers['x-internal-key'] !== expected) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }
  const { to, subject, htmlContent, bcc } = req.body;
  if (!to?.length || !subject || !htmlContent) {
    return res.status(400).json({ success: false, error: 'to, subject, and htmlContent required' });
  }
  const result = await sendBrevoEmail({ to, subject, html: htmlContent, bcc });
  if (result.ok) return res.json({ success: true });
  res.status(500).json({ success: false, error: result.brevoError });
});

module.exports = router;
