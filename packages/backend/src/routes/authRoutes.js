const router = require('express').Router();
const { authMiddleware, requireAuth, requireAdmin } = require('../middleware/auth');
const { authLimiter, apiLimiter, globalLimiter } = require('../config/rateLimiter');
const { login, forgotPassword, resetPassword, changePassword, resendConfirmation, logout, me, updateProfile } = require('../controllers/authController');
const { getGoogleLoginUrl, googleLoginCallback } = require('../controllers/googleAuthController');

router.post('/login', login);
router.get('/google/url', getGoogleLoginUrl);
router.get('/google/callback', googleLoginCallback);
router.get('/me', authMiddleware, me);
router.post('/logout', authMiddleware, logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', authMiddleware, changePassword);
router.patch('/profile', authMiddleware, updateProfile);
router.post('/resend-confirmation', resendConfirmation);

module.exports = router;
