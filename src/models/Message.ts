import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  _id: string;
  clientId?: string;
  channelId: string;
  sender: string;
  initials: string;
  color: string;
  text: string;
  timestamp: Date;
}

const MessageSchema: Schema = new Schema({
  // Let MongoDB generate the default ObjectId
  // If you need a client‑side identifier, store it separately
  clientId: { type: String, required: false },
  channelId: { type: String, required: true, index: true },
  sender: { type: String, required: true },
  initials: { type: String, required: true },
  color: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

// Avoid OverwriteModelError during hot reloading
const Message = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);

export default Message;
