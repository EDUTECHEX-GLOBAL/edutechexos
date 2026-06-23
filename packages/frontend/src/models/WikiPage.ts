import mongoose, { Schema, Document } from 'mongoose';
import { randomUUID } from 'crypto';

export interface IWikiPage extends Document {
  channelId: string;
  title: string;
  content: string;
  createdBy?: string;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WikiPageSchema: Schema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    channelId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    content: { type: String, default: '' },
    createdBy: { type: String, index: true },
    isPrivate: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const WikiPage = mongoose.models.WikiPage || mongoose.model<IWikiPage>('WikiPage', WikiPageSchema);

export default WikiPage;
