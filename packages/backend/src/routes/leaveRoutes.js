const router = require('express').Router();
const { authMiddleware, requireAuth, requireAdmin } = require('../middleware/auth');
const { authLimiter, apiLimiter, globalLimiter } = require('../config/rateLimiter');
const { getLeaves, getOnLeaveToday, createLeave, reviewLeave } = require('../controllers/leaveController');

router.get('/on-leave-today', authMiddleware, requireAuth, getOnLeaveToday);
router.get('/', authMiddleware, getLeaves);
router.post('/', authMiddleware, createLeave);
router.patch('/:id', authMiddleware, reviewLeave);

module.exports = router;
