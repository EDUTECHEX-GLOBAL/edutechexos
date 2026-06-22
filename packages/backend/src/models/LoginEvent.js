const mongoose = require('mongoose');

const LoginEventSchema = new mongoose.Schema({
  email:       { type: String, required: true, index: true },
  name:        { type: String, default: '' },
  loginAt:     { type: Date, default: Date.now, index: true },
  logoutAt:    { type: Date, default: null },
  hoursWorked: { type: Number, default: null },
  attendance:  { type: String, enum: ['full', 'half', 'absent', null], default: null },
  dateStr:     { type: String, required: true, index: true },
});
LoginEventSchema.index({ email: 1, dateStr: 1 });

const LoginEvent = mongoose.model('LoginEvent', LoginEventSchema);
module.exports = LoginEvent;
