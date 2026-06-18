const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  adminEmail: { type: String, required: true },
  adminName:  { type: String, default: '' },
  action:     { type: String, required: true },
  target:     { type: String, default: '' },
  targetName: { type: String, default: '' },
  details:    { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp:  { type: Date, default: Date.now, index: true },
});
AuditLogSchema.index({ timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
module.exports = AuditLog;
