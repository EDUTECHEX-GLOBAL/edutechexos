const mongoose = require('mongoose');
const crypto = require('crypto');

const InviteTokenSchema = new mongoose.Schema({
  email:     { type: String, required: true, lowercase: true, index: true },
  name:      { type: String, required: true },
  role:      { type: String, default: 'Member' },
  requestId: { type: String },
  token:     { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  used:      { type: Boolean, default: false },
  usedAt:    { type: Date },
  createdBy: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const InviteToken = mongoose.model('InviteToken', InviteTokenSchema);
module.exports = InviteToken;
