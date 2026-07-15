const mongoose = require('mongoose');

const ActivitySessionSchema = new mongoose.Schema({
  email:           { type: String, required: true, index: true },
  name:            { type: String, default: '' },
  dateStr:         { type: String, required: true, index: true },
  totalMinutes:    { type: Number, default: 0 },
  // First heartbeat of the day = the moment the user opened the EduTechExOS web
  // app. ActivityWatch data is only counted from this point (not from whenever
  // the laptop / ActivityWatch happened to start earlier in the day).
  sessionStart:    { type: Date, default: null },
  lastHeartbeat:   { type: Date, default: null },
  messageCount:    { type: Number, default: 0 },
  taskCount:       { type: Number, default: 0 },
  currentActivity: { type: String, default: '' },
  currentPanel:    { type: String, default: '' },
});
ActivitySessionSchema.index({ email: 1, dateStr: 1 }, { unique: true });

const ActivitySession = mongoose.model('ActivitySession', ActivitySessionSchema);
module.exports = ActivitySession;
