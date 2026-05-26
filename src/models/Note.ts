import mongoose, { Schema, Document } from 'mongoose';

export interface INote extends Document {
  channelId: string;
  content: string;
  updatedAt: Date;
}

const NoteSchema: Schema = new Schema({
  channelId: { type: String, required: true, unique: true, index: true },
  content: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now }
});

// Avoid OverwriteModelError during hot reloading
const Note = mongoose.models.Note || mongoose.model<INote>('Note', NoteSchema);

export default Note;
