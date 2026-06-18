const router = require('express').Router();
const express = require('express');
const { authMiddleware, requireAuth, requireAdmin } = require('../middleware/auth');
const { authLimiter, apiLimiter, globalLimiter } = require('../config/rateLimiter');
const { listWebhooks, createWebhook, updateWebhook, deleteWebhook, githubReceiver, genericReceiver } = require('../controllers/webhookController');

router.get('/', authMiddleware, listWebhooks);
router.post('/', authMiddleware, createWebhook);
router.patch('/:id', authMiddleware, updateWebhook);
router.delete('/:id', authMiddleware, deleteWebhook);

module.exports = router;

const receiverRouter = require('express').Router();
receiverRouter.post('/github/:token', express.json({ type: '*/*' }), githubReceiver);
receiverRouter.post('/incoming/:token', express.json({ type: '*/*' }), genericReceiver);
module.exports.receiverRouter = receiverRouter;
