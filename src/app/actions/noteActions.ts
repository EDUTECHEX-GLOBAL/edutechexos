/* src/app/actions/noteActions.ts */
'use server';

import Note from '@/models/Note';

/**
 * Fetch a single note for a given channel.
 */
export async function getNoteAction(channelId: string) {
  try {
    // Ensure DB and uploads dir exist (no‑op if already initialized)
    await import('./dbActions').then(({ ensureDbExists }) => ensureDbExists());
    const note = await Note.findOne({ channelId }).lean();
    if (!note) return null;
    const { _id, __v, ...rest } = note as any;
    return { ...rest, id: _id.toString() };
  } catch (err) {
    console.error('Failed to get note from MongoDB:', err);
    return null;
  }
}

/**
 * Fetch all notes across channels.
 */
export async function getAllNotesAction() {
  try {
    await import('./dbActions').then(({ ensureDbExists }) => ensureDbExists());
    const notes = await Note.find({}).lean();
    return notes.map((n: any) => {
      const { _id, __v, ...rest } = n;
      return { ...rest, id: _id.toString() };
    });
  } catch (err) {
    console.error('Failed to get all notes from MongoDB:', err);
    return [];
  }
}

/**
 * Save or update a note for a channel.
 */
export async function saveNoteAction(channelId: string, content: string) {
  try {
    await import('./dbActions').then(({ ensureDbExists }) => ensureDbExists());
    const updated = await Note.findOneAndUpdate(
      { channelId },
      { content, updatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    const { _id, __v, ...rest } = updated as any;
    return { success: true, note: { ...rest, id: _id.toString() } };
  } catch (err) {
    console.error('Failed to save note to MongoDB:', err);
    return { success: false, error: String(err) };
  }
}
