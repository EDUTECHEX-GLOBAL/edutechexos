const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const { authLimiter, emailActionLimiter } = require('../config/rateLimiter');
const { submitRequest, getRequests, reviewRequest, deleteRequest } = require('../controllers/accessRequestController');

// Public + sends 2 emails per call → tighter per-IP throttle on top of authLimiter.
router.post('/', emailActionLimiter, authLimiter, submitRequest);
router.get('/', authMiddleware, getRequests);
router.patch('/:id', authMiddleware, reviewRequest);
router.delete('/:id', authMiddleware, deleteRequest);

module.exports = router;
