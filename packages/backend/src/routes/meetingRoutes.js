const router = require('express').Router();
const { authMiddleware, requireAuth, requireAdmin } = require('../middleware/auth');
const { authLimiter, apiLimiter, globalLimiter } = require('../config/rateLimiter');
const { createMeetingAccess, checkMeetingAccess, grantMeetingAccess, sendMeetingInvite, registerMedia, getMedia, getMeetingRequests, createMeetingRequest, reviewMeetingRequest, lookupMeetingByCode } = require('../controllers/meetingController');

router.get('/meeting-requests', authMiddleware, getMeetingRequests);
router.post('/meeting-requests', authMiddleware, createMeetingRequest);
router.patch('/meeting-requests/:id', authMiddleware, reviewMeetingRequest);

router.post('/meeting-access', authMiddleware, requireAuth, createMeetingAccess);
router.get('/meeting-access/:messageId', authMiddleware, checkMeetingAccess);
router.patch('/meeting-access/:messageId/grant', authMiddleware, grantMeetingAccess);

router.post('/meetings/invite', authMiddleware, sendMeetingInvite);
router.get('/meetings/code/:code', lookupMeetingByCode);

router.post('/media', authMiddleware, registerMedia);
router.get('/media/:id', authMiddleware, getMedia);

module.exports = router;
