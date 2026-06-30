const mongoose = require('mongoose');

const MeetingAccessSchema = new mongoose.Schema({
  messageId:       { type: String, required: true, index: true },
  channelId:       { type: String, required: true },
  hostEmail:       { type: String, required: true },
  allowedEmails:   [{ type: String }],
  grantedEmails:   [{ type: String }],
  meetingCode:     { type: String, index: true, sparse: true },
  meetLink:        { type: String },
  // Auto-start support: when startAt arrives, a cron fires the meeting once.
  startAt:         { type: Date, default: null, index: true },
  started:         { type: Boolean, default: false },
  title:           { type: String, default: '' },
  channelName:     { type: String, default: '' },
  createdAt:       { type: Date, default: Date.now },
});
MeetingAccessSchema.index({ messageId: 1, channelId: 1 }, { unique: true });

const MeetingAccess = mongoose.model('MeetingAccess', MeetingAccessSchema);
module.exports = MeetingAccess;
