const router = require('express').Router();
const { authMiddleware, requireAuth, requireAdmin } = require('../middleware/auth');
const { authLimiter, apiLimiter, globalLimiter } = require('../config/rateLimiter');
const { setPassword, generatePassword, sendInvite, broadcastEmail, migrateEncrypt, getAuditLog, emailDiagnostics, testEmail } = require('../controllers/adminController');
const { validateInvite, acceptInvite } = require('../controllers/adminController');

router.post('/set-password', authMiddleware, setPassword);
router.post('/generate-password', authMiddleware, requireAdmin, generatePassword);
router.post('/invite', authMiddleware, requireAdmin, sendInvite);
router.post('/migrate-encrypt', authMiddleware, requireAdmin, migrateEncrypt);
router.post('/broadcast-email', authMiddleware, broadcastEmail);
router.get('/audit-log', authMiddleware, getAuditLog);

router.get('/email-diagnostics', authMiddleware, requireAdmin, emailDiagnostics);
router.post('/test-email', authMiddleware, requireAdmin, testEmail);

router.get('/invite/validate', validateInvite);
router.post('/invite/accept', acceptInvite);

module.exports = router;
