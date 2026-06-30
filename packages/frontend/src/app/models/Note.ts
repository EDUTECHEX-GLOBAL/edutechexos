import mongoose from 'mongoose';

const NoteSchema = new mongoose.Schema({
  channelId: { type: String, required: true },
  userEmail: { type: String, required: false, default: '' },
  content: { type: String, default: '' },
}, { timestamps: true });

// Compound unique: one note per user per channel
NoteSchema.index({ channelId: 1, userEmail: 1 }, { unique: true });

export default mongoose.models.Note ?? mongoose.model('Note', NoteSchema);
