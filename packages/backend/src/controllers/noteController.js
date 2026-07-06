const Note = require('../models/Note');

// GET /api/notes/:channelId — the caller's own note for that channel.
async function getNote(req, res) {
  try {
    const email = req.user?.email?.toLowerCase();
    if (!email) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    const { channelId } = req.params;
    if (!channelId) return res.status(400).json({ success: false, error: 'channelId is required.' });
    const note = await Note.findOne({ userEmail: email, channelId }).lean();
    res.json({ success: true, content: note?.content ?? '', updatedAt: note?.updatedAt ?? null });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

// PUT /api/notes/:channelId — upsert the caller's own note for that channel.
async function saveNote(req, res) {
  try {
    const email = req.user?.email?.toLowerCase();
    if (!email) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    const { channelId } = req.params;
    if (!channelId) return res.status(400).json({ success: false, error: 'channelId is required.' });
    // Ownership is fixed to the authenticated user — the client cannot target
    // another user's note. Cap size to avoid abusive payloads.
    const content = String(req.body?.content ?? '').slice(0, 100000);
    const note = await Note.findOneAndUpdate(
      { userEmail: email, channelId },
      { $set: { content } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    res.json({ success: true, content: note.content, updatedAt: note.updatedAt });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

module.exports = { getNote, saveNote };
