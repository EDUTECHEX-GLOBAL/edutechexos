const mongoose = require('mongoose');

const WebhookSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  channelId: { type: String, required: true },
  type:      { type: String, enum: ['github', 'generic'], required: true },
  token:     { type: String, required: true, unique: true, index: true },
  secret:    { type: String, default: '' },
  active:    { type: Boolean, default: true },
  lastUsed:  { type: Date },
  createdAt: { type: Date, default: Date.now },
});

const Webhook = mongoose.model('Webhook', WebhookSchema);
module.exports = Webhook;
