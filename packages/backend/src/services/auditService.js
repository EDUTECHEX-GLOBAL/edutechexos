const AuditLog = require('../models/AuditLog');

async function logAudit(req, action, target = '', targetName = '', details = {}) {
  try {
    await AuditLog.create({
      adminEmail: req.user?.email  || 'system',
      adminName:  req.user?.name   || '',
      action,
      target,
      targetName,
      details,
    });
  } catch (e) {
    console.error('[audit] Failed to log:', e.message);
  }
}

module.exports = { logAudit };
