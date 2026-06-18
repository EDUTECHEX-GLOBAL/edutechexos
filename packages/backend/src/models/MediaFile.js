const mongoose = require('mongoose');

const MediaFileSchema = new mongoose.Schema({
  ownerEmail: { type: String, required: true, index: true },
  channelId:  { type: String, required: true, index: true },
  messageId:  { type: String, index: true },
  kind:       { type: String, enum: ['audio', 'video', 'screen'], required: true },
  url:        { type: String, required: true },
  mimeType:   { type: String, default: '' },
  sizeBytes:  { type: Number, default: 0 },
  uploadedAt: { type: Date, default: Date.now },
});

const MediaFile = mongoose.model('MediaFile', MediaFileSchema);
module.exports = MediaFile;
