const router = require('express').Router();
const express = require('express');
const { authMiddleware, requireAuth } = require('../middleware/auth');
const { uploadFile, serveFile } = require('../controllers/fileController');

// Raw binary upload — express.raw must run before auth so the body stream isn't consumed.
// Limit raised to 60mb so screen recordings upload to GridFS (a shareable URL
// everyone can view) instead of falling back to an oversized inline base64 blob.
router.post(
  '/',
  express.raw({ type: '*/*', limit: '60mb' }),
  authMiddleware,
  requireAuth,
  uploadFile
);

// Serve files — serveFile itself requires a valid JWT (Authorization header OR the
// `auth_session` cookie, so inline <img>/<a> loads work). Files are also referenced
// by unguessable MongoDB ObjectId as defence-in-depth.
router.get('/:id', serveFile);

module.exports = router;
