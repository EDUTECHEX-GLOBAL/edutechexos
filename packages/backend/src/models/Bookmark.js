const mongoose = require('mongoose');

const BookmarkSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, index: true },
  messageId: { type: String, required: true },
  channelId: { type: String, required: true },
  text:      { type: String, default: '' },
  sender:    { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });
BookmarkSchema.index({ userEmail: 1, messageId: 1 }, { unique: true });

const Bookmark = mongoose.model('Bookmark', BookmarkSchema);
module.exports = Bookmark;
