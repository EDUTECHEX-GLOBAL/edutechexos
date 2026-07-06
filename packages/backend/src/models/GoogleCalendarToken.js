const mongoose = require('mongoose');

const GoogleCalendarTokenSchema = new mongoose.Schema({
  userEmail:    { type: String, required: true, unique: true, index: true },
  googleEmail:  { type: String, default: '' },
  accessToken:  { type: String, required: true },
  refreshToken: { type: String, required: true },
  expiryDate:   { type: Number, required: true }, // ms epoch
  scope:        { type: String, default: '' },
}, { timestamps: true });

const GoogleCalendarToken = mongoose.model('GoogleCalendarToken', GoogleCalendarTokenSchema);
module.exports = GoogleCalendarToken;
