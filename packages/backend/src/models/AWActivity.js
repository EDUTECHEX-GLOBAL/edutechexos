const mongoose = require('mongoose');

const AWActivitySchema = new mongoose.Schema({
  email:              { type: String, required: true, index: true },
  name:               { type: String, default: '' },
  dateStr:            { type: String, required: true, index: true },
  currentApp:         { type: String, default: '' },
  currentTitle:       { type: String, default: '' },
  isAfk:              { type: Boolean, default: false },
  totalActiveMinutes: { type: Number, default: 0 },
  totalAfkMinutes:    { type: Number, default: 0 },
  totalActiveSeconds: { type: Number, default: 0 },
  totalAfkSeconds:    { type: Number, default: 0 },
  // Every desktop app opened, each with its own time (seconds) + when it was used.
  appBreakdown:       [{ app: String, minutes: Number, seconds: Number, firstSeen: String, lastSeen: String }],
  // Most-recently-used apps, newest first.
  recentApps:         [{ app: String, seconds: Number, lastSeen: String }],
  // aw-watcher-web fields — every tab visited, each with its own time.
  currentUrl:         { type: String, default: '' },
  currentPageTitle:   { type: String, default: '' },
  webBreakdown:       [{ domain: String, minutes: Number, seconds: Number, title: String, lastSeen: String }],
  // Minute-by-minute record: what app/tab was dominant in each minute of the day.
  // m = "HH:MM" (IST). Lets admin answer "what were they doing at 11:42?".
  timeline:           [{ m: String, app: String, title: String, tab: String, seconds: Number, afkSeconds: Number }],
  lastSync:           { type: Date, default: Date.now },
}, { timestamps: true });
AWActivitySchema.index({ email: 1, dateStr: 1 }, { unique: true });

const AWActivity = mongoose.model('AWActivity', AWActivitySchema);
module.exports = AWActivity;
