const mongoose = require('mongoose');

const AccessRequestSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  email:       { type: String, required: true, index: true },
  password:    { type: String, default: '' },
  role:        { type: String, required: true },
  status:      { type: String, enum: ['pending', 'approved', 'rejected', 'invited'], default: 'pending' },
  requestedAt: { type: Date, default: Date.now },
  channelId:   { type: String },
  channelIds:  [{ type: String }],
  // Flips true the first time an admin explicitly sets this user's channelIds.
  // Until then, Admins/Managers default into every channel on the client; after
  // that their channelIds list is honoured exactly, so they can be removed from
  // individual channels (even down to none).
  channelsExplicit: { type: Boolean, default: false },
  bio:         { type: String, default: '' },
  timezone:    { type: String, default: '' },
  avatarUrl:   { type: String, default: '' },
});

const AccessRequest = mongoose.model('AccessRequest', AccessRequestSchema);
module.exports = AccessRequest;
