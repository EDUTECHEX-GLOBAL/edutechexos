const { getUserEmail } = require('../utils/helpers');
const WikiPage = require('../models/WikiPage');

async function getPages(req, res) {
  try {
    const userEmail = getUserEmail(req);
    const filter = userEmail
      ? { $or: [{ createdBy: userEmail }, { isPrivate: false }, { isPrivate: { $exists: false } }, { createdBy: { $exists: false } }] }
      : { $or: [{ isPrivate: false }, { isPrivate: { $exists: false } }, { createdBy: { $exists: false } }] };
    const pages = await WikiPage.find(filter).sort({ updatedAt: -1 }).lean();
    const formatted = pages.map((p) => ({
      id: p._id,
      channelId: p.channelId,
      title: p.title,
      content: p.content,
      createdBy: p.createdBy ?? null,
      isPrivate: p.isPrivate === true,
      createdAt: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: p.updatedAt ? p.updatedAt.toISOString() : new Date().toISOString(),
    }));
    res.json({ success: true, pages: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function upsertPage(req, res) {
  try {
    const id = req.body.id || req.params.id;
    const { channelId, title, content, isPrivate } = req.body;
    const userEmail = getUserEmail(req);
    const privacy = isPrivate === true;

    if (id) {
      const existing = await WikiPage.findById(id).lean();
      if (existing && existing.createdBy && userEmail &&
          existing.createdBy.toLowerCase() !== userEmail.toLowerCase() &&
          req.user?.role !== 'Admin') {
        return res.status(403).json({ success: false, error: 'You can only edit your own wiki pages.' });
      }
    }

    const setFields = { channelId, title, content, isPrivate: privacy, updatedAt: new Date() };
    const setOnInsertFields = userEmail ? { createdBy: userEmail } : {};
    const updated = await WikiPage.findOneAndUpdate(
      { _id: id },
      { $set: setFields, $setOnInsert: setOnInsertFields },
      { upsert: true, new: true }
    ).lean();
    const { _id, ...rest } = updated;
    req.app.get('io')?.emit('wiki_changed');
    res.json({
      success: true,
      page: {
        ...rest,
        id: _id,
        isPrivate: updated.isPrivate === true,
        createdAt: updated.createdAt ? updated.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: updated.updatedAt ? updated.updatedAt.toISOString() : new Date().toISOString(),
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function deletePage(req, res) {
  try {
    const { id } = req.params;
    const userEmail = getUserEmail(req);
    const page = await WikiPage.findById(id).lean();
    if (!page) return res.status(404).json({ success: false, error: 'Note not found.' });
    if (page.createdBy && userEmail && page.createdBy.toLowerCase() !== userEmail.toLowerCase()) {
      return res.status(403).json({ success: false, error: 'You can only delete your own notes.' });
    }
    await WikiPage.findByIdAndDelete(id);
    req.app.get('io')?.emit('wiki_changed');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

module.exports = { getPages, upsertPage, deletePage };
