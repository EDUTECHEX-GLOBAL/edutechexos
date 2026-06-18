const router = require('express').Router();
const { authMiddleware, requireAuth, requireAdmin } = require('../middleware/auth');
const { authLimiter, apiLimiter, globalLimiter } = require('../config/rateLimiter');
const { getMembers, createMember, removeMember, restoreMember, promoteAdmin, exportMembers } = require('../controllers/memberController');

router.get('/', authMiddleware, getMembers);
router.post('/', authMiddleware, createMember);
router.delete('/system', authMiddleware, removeMember);
router.post('/remove', authMiddleware, removeMember);
router.post('/system/restore', authMiddleware, restoreMember);
router.post('/:id/promote-admin', authMiddleware, promoteAdmin);
router.get('/export', authMiddleware, exportMembers);

module.exports = router;
