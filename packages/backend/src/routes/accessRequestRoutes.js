const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const { authLimiter } = require('../config/rateLimiter');
const { submitRequest, getRequests, reviewRequest } = require('../controllers/accessRequestController');

router.post('/', authLimiter, submitRequest);
router.get('/', authMiddleware, getRequests);
router.patch('/:id', authMiddleware, reviewRequest);

module.exports = router;
