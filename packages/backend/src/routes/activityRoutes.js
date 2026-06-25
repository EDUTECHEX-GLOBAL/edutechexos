const router = require('express').Router();
const { authMiddleware, requireAuth, requireAdmin } = require('../middleware/auth');
const { authLimiter, apiLimiter, globalLimiter } = require('../config/rateLimiter');
const { heartbeat, getLive, getHistory, getStats, awSync, getAw, getAWStatus, isSessionActive, logMessage, getAttendance, getLoginHistory, getMyAttendance, resetAwDevice } = require('../controllers/activityController');

router.post('/heartbeat', authMiddleware, heartbeat);
router.get('/live', authMiddleware, getLive);
router.get('/history', authMiddleware, getHistory);
router.get('/stats', authMiddleware, getStats);
router.post('/aw-sync', authMiddleware, awSync);
router.get('/aw', authMiddleware, getAw);
router.get('/aw-status', authMiddleware, requireAuth, getAWStatus);
router.get('/session-active', authMiddleware, requireAuth, isSessionActive);
router.post('/message', authMiddleware, logMessage);
router.get('/attendance', authMiddleware, getAttendance);
router.get('/login-history', authMiddleware, getLoginHistory);
router.get('/my-attendance', authMiddleware, getMyAttendance);
router.post('/reset-aw-device', authMiddleware, requireAdmin, resetAwDevice);

module.exports = router;
