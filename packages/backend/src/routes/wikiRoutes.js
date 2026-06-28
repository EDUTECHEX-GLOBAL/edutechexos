const router = require('express').Router();
const { authMiddleware, requireAuth, requireAdmin } = require('../middleware/auth');
const { authLimiter, apiLimiter, globalLimiter } = require('../config/rateLimiter');
const { getPages, upsertPage, deletePage } = require('../controllers/wikiController');

router.get('/', authMiddleware, requireAuth, getPages);
router.post('/', authMiddleware, requireAuth, upsertPage);
router.patch('/:id', authMiddleware, requireAuth, upsertPage);
router.delete('/:id', authMiddleware, requireAuth, deletePage);

module.exports = router;
