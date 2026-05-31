import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  type: 'message' | 'mention' | 'task' | 'system';
  actor: string;
  actorInitials: string;
  actorColor: string;
  channel?: string;
  message: string;
  read: boolean;
  recipientEmails?: string[];
  createdAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    type:            { type: String, enum: ['message', 'mention', 'task', 'system'], default: 'message' },
    actor:           { type: String, required: true },
    actorInitials:   { type: String, required: true },
    actorColor:      { type: String, required: true },
    channel:         { type: String },
    message:         { type: String, required: true },
    read:            { type: Boolean, default: false },
    recipientEmails: [{ type: String }],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const Notification =
  mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
