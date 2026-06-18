const router = require('express').Router();
const { authMiddleware, requireAuth, requireAdmin } = require('../middleware/auth');
const { authLimiter, apiLimiter, globalLimiter } = require('../config/rateLimiter');
const { sendDigest } = require('../controllers/digestController');

router.post('/', authMiddleware, sendDigest);

module.exports = router;
