const mongoose = require('mongoose');

const MeetingAccessSchema = new mongoose.Schema({
  messageId:       { type: String, required: true, index: true },
  channelId:       { type: String, required: true },
  hostEmail:       { type: String, required: true },
  allowedEmails:   [{ type: String }],
  grantedEmails:   [{ type: String }],
  meetingCode:     { type: String, index: true, sparse: true },
  meetLink:        { type: String },
  createdAt:       { type: Date, default: Date.now },
});
MeetingAccessSchema.index({ messageId: 1, channelId: 1 }, { unique: true });

const MeetingAccess = mongoose.model('MeetingAccess', MeetingAccessSchema);
module.exports = MeetingAccess;
