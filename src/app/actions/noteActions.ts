/* src/app/actions/noteActions.ts */
'use server';

import connectToDatabase from '@/lib/mongoose';
import Note from '@/models/Note';

async function ensureDb() {
  try {
    await connectToDatabase();
  } catch (err) {
    console.error('Note action DB connection error:', err);
  }
}

/**
 * Fetch a single note for a given channel.
 */
export async function getNoteAction(channelId: string) {
  try {
    await ensureDb();
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
    await ensureDb();
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
    await ensureDb();
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
