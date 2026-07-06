const mongoose = require('mongoose');

// A deadline detected from chat and owned by a specific user (mirrors the
// per-user deadline cache the frontend builds). Persisted so a server-side cron
// can email the owner a reminder — the browser cache alone can't do that.
const DeadlineSchema = new mongoose.Schema({
  email:        { type: String, required: true, index: true, lowercase: true, trim: true },
  externalId:   { type: String, required: true },   // stable id from the client (e.g. "deadline-<msgId>")
  task:         { type: String, default: '' },
  channel:      { type: String, default: '' },
  snippet:      { type: String, default: '' },
  dateMs:       { type: Number, required: true },    // epoch ms of the deadline
  dueDateStr:   { type: String, index: true },       // YYYY-MM-DD in IST, for cheap day queries
  lastNotified: { type: String, default: '' },       // IST dateStr we last emailed about this deadline
}, { timestamps: true });

DeadlineSchema.index({ email: 1, externalId: 1 }, { unique: true });

module.exports = mongoose.model('Deadline', DeadlineSchema);
