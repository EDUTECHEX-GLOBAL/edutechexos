const mongoose = require('mongoose');

// Tracks which meeting/deadline was already pushed to which user's Google
// Calendar, so re-scans or re-invites update the existing event instead of
// creating duplicates.
const SyncedCalendarEventSchema = new mongoose.Schema({
  userEmail:     { type: String, required: true, index: true },
  externalId:    { type: String, required: true }, // stable id for the meeting/deadline
  googleEventId: { type: String, required: true },
}, { timestamps: true });
SyncedCalendarEventSchema.index({ userEmail: 1, externalId: 1 }, { unique: true });

const SyncedCalendarEvent = mongoose.model('SyncedCalendarEvent', SyncedCalendarEventSchema);
module.exports = SyncedCalendarEvent;
