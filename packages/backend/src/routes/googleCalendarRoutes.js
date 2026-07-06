const router = require('express').Router();
const { authMiddleware, requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/googleCalendarController');

router.get('/auth-url', authMiddleware, requireAuth, ctrl.getAuthUrl);
// Public — this is Google redirecting the user's browser back, not an API call.
router.get('/oauth-callback', ctrl.oauthCallback);
router.get('/status', authMiddleware, requireAuth, ctrl.getStatus);
router.post('/disconnect', authMiddleware, requireAuth, ctrl.disconnect);
router.post('/sync-event', authMiddleware, requireAuth, ctrl.syncEvent);

module.exports = router;
