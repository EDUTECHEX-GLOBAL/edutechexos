const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const { publishKey, getKey } = require('../controllers/keysController');

router.post('/', authMiddleware, publishKey);
router.get('/:email', authMiddleware, getKey);

module.exports = router;
