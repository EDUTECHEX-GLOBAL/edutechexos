const mongoose = require('mongoose');
const StandupReplySchema = new mongoose.Schema({
  email:        { type: String, required: true, lowercase: true },
  dateStr:      { type: String, required: true },
  yesterday:    { type: String, default: '' },
  today:        { type: String, default: '' },
  blockers:     { type: String, default: '' },
  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now },
});
StandupReplySchema.index({ email: 1, dateStr: 1 }, { unique: true });
const StandupReply = mongoose.model('StandupReply', StandupReplySchema);
module.exports = StandupReply;
