const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  type:            { type: String, default: 'mention' },
  actor:           { type: String, required: true },
  actorInitials:   { type: String, default: '' },
  actorColor:      { type: String, default: '#4f46e5' },
  message:         { type: String, required: true },
  channel:         { type: String, required: true },
  timestamp:       { type: Date, default: Date.now },
  recipientEmails: [{ type: String }],
  joinLink:        { type: String, default: '' },
});

const Notification = mongoose.model('Notification', NotificationSchema);
module.exports = Notification;
