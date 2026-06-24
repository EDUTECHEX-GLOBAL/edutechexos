const mongoose = require('mongoose');

const RemovedMemberSchema = new mongoose.Schema({
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  name:      { type: String, default: '' },
  removedBy: { type: String, default: '' },
  removedAt: { type: Date, default: Date.now },
});

const RemovedMember = mongoose.model('RemovedMember', RemovedMemberSchema);
module.exports = RemovedMember;
