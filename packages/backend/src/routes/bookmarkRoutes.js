const router = require('express').Router();
const { authMiddleware, requireAuth, requireAdmin } = require('../middleware/auth');
const { authLimiter, apiLimiter, globalLimiter } = require('../config/rateLimiter');
const { getBookmarks, toggleBookmark, deleteBookmark } = require('../controllers/bookmarkController');

router.get('/', authMiddleware, requireAuth, getBookmarks);
router.post('/toggle', authMiddleware, requireAuth, toggleBookmark);
router.delete('/:id', authMiddleware, requireAuth, deleteBookmark);

module.exports = router;
