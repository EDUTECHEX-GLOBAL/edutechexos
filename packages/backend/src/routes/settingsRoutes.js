const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const { getSettings, saveSettings } = require('../controllers/settingsController');

router.get('/', authMiddleware, getSettings);
router.put('/', authMiddleware, saveSettings);

module.exports = router;
