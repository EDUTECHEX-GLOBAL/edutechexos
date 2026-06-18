const mongoose = require('mongoose');

const PinnedMessageSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, index: true },
  channelId: { type: String, required: true, index: true },
  messageId: { type: String, required: true },
  pinnedBy:  { type: String, required: true },
  pinnedAt:  { type: Date, default: Date.now },
});
PinnedMessageSchema.index({ userEmail: 1, channelId: 1, messageId: 1 }, { unique: true });

const PinnedMessage = mongoose.model('PinnedMessage', PinnedMessageSchema);
module.exports = PinnedMessage;
