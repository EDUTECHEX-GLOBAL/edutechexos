const mongoose = require('mongoose');

const ResetCodeSchema = new mongoose.Schema({
  email:     { type: String, required: true, index: true },
  code:      { type: String, required: true },
  expiresAt: { type: Date,   required: true },
  used:      { type: Boolean, default: false },
  attempts:  { type: Number, default: 0 },
});

const ResetCode = mongoose.model('ResetCode', ResetCodeSchema);
module.exports = ResetCode;
