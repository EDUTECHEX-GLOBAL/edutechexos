const { getUserEmail } = require('../utils/helpers');
const Bookmark = require('../models/Bookmark');

async function getBookmarks(req, res) {
  try {
    const userEmail = getUserEmail(req);
    if (!userEmail) {
      return res.status(400).json({ success: false, error: 'userEmail required' });
    }
    const bookmarks = await Bookmark.find({ userEmail }).sort({ timestamp: -1 }).lean();
    const formatted = bookmarks.map(({ _id, __v, ...rest }) => ({
      ...rest,
      id: _id.toString(),
      timestamp: rest.timestamp instanceof Date ? rest.timestamp.toISOString() : rest.timestamp,
    }));
    res.json({ success: true, bookmarks: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function toggleBookmark(req, res) {
  try {
    const userEmail = getUserEmail(req);
    const { messageId, channelId, text, sender, timestamp } = req.body;
    if (!userEmail || !messageId) {
      return res.status(400).json({ success: false, error: 'userEmail and messageId required' });
    }
    const existing = await Bookmark.findOne({ userEmail, messageId }).lean();
    if (existing) {
      await Bookmark.deleteOne({ userEmail, messageId });
      return res.json({ success: true, bookmarked: false });
    }
    const bookmark = new Bookmark({ userEmail, messageId, channelId, text, sender, timestamp });
    await bookmark.save();
    res.json({ success: true, bookmarked: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function deleteBookmark(req, res) {
  try {
    const userEmail = getUserEmail(req);
    const { id } = req.params;
    const bookmark = await Bookmark.findOneAndDelete({ _id: id, userEmail });
    if (!bookmark) {
      return res.status(404).json({ success: false, error: 'Bookmark not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

module.exports = { getBookmarks, toggleBookmark, deleteBookmark };
