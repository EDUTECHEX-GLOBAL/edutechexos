const mongoose = require('mongoose');

const UserSettingsSchema = new mongoose.Schema({
  email:                { type: String, required: true, unique: true, index: true },
  displayName:          { type: String, default: '' },
  avatarEmoji:          { type: String, default: '' },
  status:               { type: String, enum: ['online', 'away', 'busy', 'offline'], default: 'online' },
  meetLink:             { type: String, default: '' },
  emailNotifications:   { type: Boolean, default: true },
  desktopNotifications: { type: Boolean, default: false },
  soundNotifications:   { type: Boolean, default: true },
  compactChat:          { type: Boolean, default: false },
  fontSize:             { type: String, enum: ['normal', 'large'], default: 'normal' },
  enterToSend:          { type: Boolean, default: false },
  darkMode:             { type: Boolean, default: false },
}, { timestamps: true });

const UserSettings = mongoose.model('UserSettings', UserSettingsSchema);
module.exports = UserSettings;
