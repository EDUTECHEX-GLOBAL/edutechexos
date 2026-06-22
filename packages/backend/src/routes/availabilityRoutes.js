const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const { globalLimiter } = require('../config/rateLimiter');
const { getAvailability, saveAvailability, deleteAvailability } = require('../controllers/availabilityController');

router.get('/', authMiddleware, getAvailability);
router.post('/', authMiddleware, saveAvailability);
router.delete('/:dateStr', authMiddleware, deleteAvailability);

module.exports = router;
