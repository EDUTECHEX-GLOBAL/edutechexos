// src/app/models/Message.ts
import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  clientId: { type: String, required: true },
  channelId: { type: String, required: true },
  sender: { type: String, required: true },
  initials: String,
  color: String,
  text: String,
  timestamp: { type: Date, default: Date.now },
  deletedForEveryone: { type: Boolean, default: false },
  deletedForUsers: [String],
  deletedAt: Date,
  deletedBy: String,
});

export default mongoose.models.Message ?? mongoose.model('Message', MessageSchema);
