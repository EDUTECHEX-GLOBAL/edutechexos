const jwt = require('jsonwebtoken');
const { revokedEmails } = require('../utils/helpers');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET environment variable is not set. Refusing to start.');
  process.exit(1);
}
const JWT_EXPIRY = '7d';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      const decoded = jwt.verify(token, JWT_SECRET);
      if (revokedEmails.has(decoded.email?.toLowerCase())) {
        return res.status(401).json({ success: false, error: 'Account removed. Please contact admin.' });
      }
      req.user = decoded;
    } catch (_) {}
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required.' });
  if (req.user.status === 'pending') return res.status(403).json({ success: false, error: 'Account pending approval.' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required.' });
  if (req.user.role !== 'Admin') return res.status(403).json({ success: false, error: 'Admin access required.' });
  next();
}

module.exports = { authMiddleware, requireAuth, requireAdmin, JWT_SECRET, JWT_EXPIRY };
