const router = require('express').Router();
const { authMiddleware, requireAuth } = require('../middleware/auth');
const { getNote, saveNote } = require('../controllers/noteController');

router.get('/:channelId', authMiddleware, requireAuth, getNote);
router.put('/:channelId', authMiddleware, requireAuth, saveNote);

module.exports = router;
