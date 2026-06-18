const mongoose = require('mongoose');

const WikiPageSchema = new mongoose.Schema({
  _id:       { type: String, required: true },
  channelId: { type: String, required: true, index: true },
  title:     { type: String, required: true },
  content:   { type: String, required: true },
  createdBy: { type: String, index: true },
  isPrivate: { type: Boolean, default: true },
}, {
  timestamps: true
});
WikiPageSchema.index({ title: 'text', content: 'text' });

const WikiPage = mongoose.model('WikiPage', WikiPageSchema);
module.exports = WikiPage;
