const mongoose = require('mongoose');

const UserSettingsSchema = new mongoose.Schema({
  email:                { type: String, required: true, unique: true, index: true },
  displayName:          { type: String, default: '' },
  avatarEmoji:          { type: String, default: '' },
  // Default 'offline' so a settings doc created by a background write (agent sync,
  // availability toggle) never makes a user look online before a real socket connects.
  status:               { type: String, enum: ['online', 'away', 'in-meeting', 'offline'], default: 'offline' },
  meetLink:             { type: String, default: '' },
  meetLinkThuPM:        { type: String, default: '' },
  meetLinkFriday:       { type: String, default: '' },
  emailNotifications:   { type: Boolean, default: true },
  emailOnMentions:      { type: Boolean, default: true },
  emailOnMeetings:      { type: Boolean, default: true },
  emailOnLeave:         { type: Boolean, default: true },
  emailOnDigest:        { type: Boolean, default: true },
  emailOnDeadlines:     { type: Boolean, default: true },
  desktopNotifications: { type: Boolean, default: false },
  soundNotifications:   { type: Boolean, default: true },
  compactChat:          { type: Boolean, default: false },
  fontSize:             { type: String, enum: ['normal', 'large'], default: 'normal' },
  enterToSend:          { type: Boolean, default: false },
  darkMode:             { type: Boolean, default: false },
  available:            { type: Boolean, default: false },
  awDeviceId:           { type: String, default: '' },
  awDeviceName:         { type: String, default: '' },
}, { timestamps: true });

const UserSettings = mongoose.model('UserSettings', UserSettingsSchema);
module.exports = UserSettings;
