const router = require('express').Router();
const { authMiddleware, requireAuth, requireAdmin } = require('../middleware/auth');
const { authLimiter, apiLimiter, globalLimiter } = require('../config/rateLimiter');
const { setPassword, generatePassword, sendInvite, broadcastEmail, migrateEncrypt, getAuditLog, emailDiagnostics, testEmail, getUsers, updateUserRole, removeUser } = require('../controllers/adminController');
const { validateInvite, acceptInvite } = require('../controllers/adminController');

router.post('/set-password', authMiddleware, requireAdmin, setPassword);
router.post('/generate-password', authMiddleware, requireAdmin, generatePassword);
router.post('/invite', authMiddleware, requireAdmin, sendInvite);
router.post('/migrate-encrypt', authMiddleware, requireAdmin, migrateEncrypt);
router.post('/broadcast-email', authMiddleware, requireAdmin, broadcastEmail);
router.get('/audit-log', authMiddleware, requireAdmin, getAuditLog);

router.get('/email-diagnostics', authMiddleware, requireAdmin, emailDiagnostics);
router.post('/test-email', authMiddleware, requireAdmin, testEmail);

router.get('/users', authMiddleware, requireAdmin, getUsers);
router.patch('/users/:userId/role', authMiddleware, requireAdmin, updateUserRole);
router.delete('/users/:userId', authMiddleware, requireAdmin, removeUser);

router.get('/invite/validate', validateInvite);
router.post('/invite/accept', acceptInvite);

module.exports = router;
