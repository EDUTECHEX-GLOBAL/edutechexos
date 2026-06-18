const mongoose = require('mongoose');
const { encryptField, decryptField } = require('../services/encryptionService');

const MessageSchema = new mongoose.Schema(
  {
    clientId:    { type: String },
    channelId:   { type: String, required: true, index: true },
    sender:      { type: String, required: true },
    senderEmail: { type: String, index: true },
    initials:    { type: String, required: true },
    color:       { type: String, required: true },
    text:        { type: String, default: '' },
    timestamp:   { type: Date, default: Date.now },
    audioUrl:    { type: String },
    videoUrl:    { type: String },
    files:       [{ name: String, url: String, type: String }],
    editedAt:    { type: Date },
    parentId:    { type: String },
    reactions:   { type: mongoose.Schema.Types.Mixed, default: {} },
    poll:        { type: mongoose.Schema.Types.Mixed },
    linkPreview: { type: mongoose.Schema.Types.Mixed },
  },
  { strict: false }
);
MessageSchema.index({ text: 'text', sender: 'text' });

MessageSchema.methods.encryptText = function () {
  if (this.text) this.text = encryptField(this.text);
};
MessageSchema.methods.decryptText = function () {
  if (this.text) return decryptField(this.text);
  return this.text;
};

const Message = mongoose.model('Message', MessageSchema);
module.exports = Message;
