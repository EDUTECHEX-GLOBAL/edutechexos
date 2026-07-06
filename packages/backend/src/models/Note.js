const mongoose = require('mongoose');

// A private, per-user, per-channel scratchpad note. The owner is the authenticated
// user (from the JWT) — never a client-supplied value — so no one can read or
// overwrite another user's notes.
const NoteSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
  channelId: { type: String, required: true },
  content:   { type: String, default: '' },
}, { timestamps: true });

NoteSchema.index({ userEmail: 1, channelId: 1 }, { unique: true });

module.exports = mongoose.model('Note', NoteSchema);
