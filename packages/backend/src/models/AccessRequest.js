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
});

const AccessRequest = mongoose.model('AccessRequest', AccessRequestSchema);
module.exports = AccessRequest;
