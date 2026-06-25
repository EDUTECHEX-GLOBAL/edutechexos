const router = require('express').Router();
const express = require('express');
const { authMiddleware, requireAuth } = require('../middleware/auth');
const { uploadFile, serveFile } = require('../controllers/fileController');

// Raw binary upload — express.raw must run before auth so the body stream isn't consumed
router.post(
  '/',
  express.raw({ type: '*/*', limit: '20mb' }),
  authMiddleware,
  requireAuth,
  uploadFile
);

// Serve files — no auth needed; files are referenced by unguessable MongoDB ObjectId
router.get('/:id', serveFile);

module.exports = router;
