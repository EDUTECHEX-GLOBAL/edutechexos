const mongoose = require('mongoose');

const ActivitySessionSchema = new mongoose.Schema({
  email:           { type: String, required: true, index: true },
  name:            { type: String, default: '' },
  dateStr:         { type: String, required: true, index: true },
  totalMinutes:    { type: Number, default: 0 },
  lastHeartbeat:   { type: Date, default: null },
  messageCount:    { type: Number, default: 0 },
  taskCount:       { type: Number, default: 0 },
  currentActivity: { type: String, default: '' },
  currentPanel:    { type: String, default: '' },
});
ActivitySessionSchema.index({ email: 1, dateStr: 1 }, { unique: true });

const ActivitySession = mongoose.model('ActivitySession', ActivitySessionSchema);
module.exports = ActivitySession;
