const router = require('express').Router();
const { authMiddleware, requireAuth, requireAdmin } = require('../middleware/auth');
const { authLimiter, apiLimiter, globalLimiter } = require('../config/rateLimiter');
const { getTasks, createTask, updateTask, deleteTask } = require('../controllers/kanbanController');

router.get('/', authMiddleware, requireAuth, getTasks);
router.post('/', authMiddleware, requireAuth, createTask);
router.patch('/:id', authMiddleware, requireAuth, updateTask);
router.delete('/:id', authMiddleware, requireAuth, deleteTask);

module.exports = router;
