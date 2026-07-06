const router = require('express').Router();
const { authMiddleware, requireAuth, requireAdmin } = require('../middleware/auth');
const { authLimiter, apiLimiter, globalLimiter } = require('../config/rateLimiter');
const { getMessages, postMessage, deleteMessage, patchMessage, search, ogLinkPreview, markChannelRead } = require('../controllers/messageController');

router.get('/', authMiddleware, requireAuth, getMessages);
router.post('/', authMiddleware, requireAuth, postMessage);
router.delete('/:id', authMiddleware, requireAuth, deleteMessage);
router.patch('/:id', authMiddleware, requireAuth, patchMessage);
router.post('/read', authMiddleware, requireAuth, markChannelRead);

module.exports = router;
