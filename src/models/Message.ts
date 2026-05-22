import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  channelId: string;
  sender: string;
  initials: string;
  color: string;
  text: string;
  timestamp: Date;
}

const MessageSchema: Schema = new Schema({
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
