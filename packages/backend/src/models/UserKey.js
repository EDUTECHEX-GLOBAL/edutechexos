const mongoose = require('mongoose');

const UserKeySchema = new mongoose.Schema({
  email:     { type: String, required: true, unique: true, index: true },
  publicKey: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
});

const UserKey = mongoose.model('UserKey', UserKeySchema);
module.exports = UserKey;
