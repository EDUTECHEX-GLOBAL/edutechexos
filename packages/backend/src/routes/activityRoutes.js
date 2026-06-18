const router = require('express').Router();
const { authMiddleware, requireAuth, requireAdmin } = require('../middleware/auth');
const { authLimiter, apiLimiter, globalLimiter } = require('../config/rateLimiter');
const { heartbeat, getLive, getHistory, getStats, awSync, getAw, logMessage } = require('../controllers/activityController');

router.post('/heartbeat', authMiddleware, heartbeat);
router.get('/live', authMiddleware, getLive);
router.get('/history', authMiddleware, getHistory);
router.get('/stats', authMiddleware, getStats);
router.post('/aw-sync', authMiddleware, awSync);
router.get('/aw', authMiddleware, getAw);
router.post('/message', authMiddleware, logMessage);

module.exports = router;
