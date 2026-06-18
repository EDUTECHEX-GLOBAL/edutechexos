const router = require('express').Router();
const { authMiddleware, requireAuth, requireAdmin } = require('../middleware/auth');
const { authLimiter, apiLimiter, globalLimiter } = require('../config/rateLimiter');
const { getNotifications, createNotification } = require('../controllers/notificationController');

router.get('/', authMiddleware, requireAuth, getNotifications);
router.post('/', authMiddleware, requireAuth, createNotification);

module.exports = router;
