const mongoose = require('mongoose');

const LoginOtpSchema = new mongoose.Schema({
  email:       { type: String, required: true, index: true },
  code:        { type: String, required: true },
  expiresAt:   { type: Date,   required: true },
  userPayload: { type: mongoose.Schema.Types.Mixed, required: true },
});
LoginOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const LoginOtp = mongoose.model('LoginOtp', LoginOtpSchema);
module.exports = LoginOtp;
