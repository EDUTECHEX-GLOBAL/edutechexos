const mongoose = require('mongoose');

const WorkspaceChannelSchema = new mongoose.Schema({
  _id:         { type: String, required: true },
  name:        { type: String, required: true },
  description: { type: String, default: '' },
  isDefault:   { type: Boolean, default: false },
  createdBy:   { type: String, default: '' },
  order:       { type: Number, default: 0 },
}, { timestamps: true });

const WorkspaceChannel = mongoose.model('WorkspaceChannel', WorkspaceChannelSchema);
module.exports = WorkspaceChannel;
