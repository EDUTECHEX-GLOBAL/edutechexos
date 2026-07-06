const router = require('express').Router();
const { authMiddleware, requireAuth } = require('../middleware/auth');
const { syncDeadlines } = require('../controllers/deadlineController');

router.post('/sync', authMiddleware, requireAuth, syncDeadlines);

module.exports = router;
