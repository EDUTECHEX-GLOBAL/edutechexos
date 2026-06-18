import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  clientId?: string;
  channelId: string;
  sender: string;
  initials: string;
  color: string;
  text: string;
  timestamp: Date;
  audioUrl?: string;
  videoUrl?: string;
  files?: { name: string; url: string; type: string }[];
  editedAt?: Date;
  parentId?: string;
  reactions?: Record<string, string[]>;
  poll?: {
    question: string;
    options: { text: string; votes: string[] }[];
  };
  linkPreview?: {
    url: string;
    title?: string;
    description?: string;
    image?: string;
  };
  // soft-delete fields — message persists in DB, UI shows placeholder
  deletedAt?: Date;
  deletedForEveryone?: boolean;
  deletedBy?: string;
  deletedForUsers?: string[];
}

const MessageSchema: Schema = new Schema(
  {
    clientId: { type: String },
    channelId: { type: String, required: true, index: true },
    sender: { type: String, required: true },
    initials: { type: String, required: true },
    color: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    // ── optional message payload fields ──────────────────────────────
    audioUrl: { type: String },
    videoUrl: { type: String },
    files: [{ name: String, url: String, type: String }],
    editedAt: { type: Date },
    parentId: { type: String },
    reactions: { type: Schema.Types.Mixed, default: {} },
    poll: { type: Schema.Types.Mixed },
    linkPreview: { type: Schema.Types.Mixed },
    // soft-delete — never hard-remove; UI renders a placeholder instead
    deletedAt: { type: Date },
    deletedForEveryone: { type: Boolean, default: false },
    deletedBy: { type: String },
    deletedForUsers: [{ type: String }],
  },
  { strict: false }
);

// Avoid OverwriteModelError during hot reloading
const Message = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);

export default Message;
