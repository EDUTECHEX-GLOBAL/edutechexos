const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const { getPinned, pinMessage, unpinMessage } = require('../controllers/pinnedController');

router.get('/', authMiddleware, getPinned);
router.post('/', authMiddleware, pinMessage);
router.delete('/:channelId/:messageId', authMiddleware, unpinMessage);

module.exports = router;
