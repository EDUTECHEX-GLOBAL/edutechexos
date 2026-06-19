const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const { authLimiter } = require('../config/rateLimiter');
const { submitRequest, getRequests, reviewRequest, deleteRequest } = require('../controllers/accessRequestController');

router.post('/', authLimiter, submitRequest);
router.get('/', authMiddleware, getRequests);
router.patch('/:id', authMiddleware, reviewRequest);
router.delete('/:id', authMiddleware, deleteRequest);

module.exports = router;
