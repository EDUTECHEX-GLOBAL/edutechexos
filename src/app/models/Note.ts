import mongoose from 'mongoose';

const NoteSchema = new mongoose.Schema({
  channelId: { type: String, required: true, unique: true },
  content: { type: String, default: '' },
  // updatedAt will be managed by timestamps option below
}, { timestamps: true });

export default mongoose.models.Note ?? mongoose.model('Note', NoteSchema);
