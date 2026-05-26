import mongoose, { Schema, Document } from 'mongoose';

export interface IWikiPage extends Document {
  channelId: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const WikiPageSchema: Schema = new Schema({
  _id: { type: String, required: true },
  channelId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
}, {
  timestamps: true
});

const WikiPage = mongoose.models.WikiPage || mongoose.model<IWikiPage>('WikiPage', WikiPageSchema);

export default WikiPage;
