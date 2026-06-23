const router = require('express').Router();
const { authMiddleware, requireAuth, requireAdmin } = require('../middleware/auth');
const { authLimiter, apiLimiter, globalLimiter } = require('../config/rateLimiter');
const { getChannels, createChannel, updateChannel, deleteChannel, getOrCreateDM } = require('../controllers/channelController');

router.get('/', authMiddleware, getChannels);
router.post('/', authMiddleware, createChannel);
router.post('/dm', authMiddleware, getOrCreateDM);
router.patch('/:id', authMiddleware, updateChannel);
router.delete('/:id', authMiddleware, deleteChannel);

module.exports = router;
