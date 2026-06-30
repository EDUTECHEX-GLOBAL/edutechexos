const { getUserEmail } = require('../utils/helpers');
const Notification = require('../models/Notification');

async function getNotifications(req, res) {
  try {
    const email = getUserEmail(req);
    const query = email
      ? { $or: [{ recipientEmails: { $size: 0 } }, { recipientEmails: email.toLowerCase() }] }
      : {};
    const notifs = await Notification.find(query).sort({ timestamp: -1 }).limit(60).lean();
    const formatted = notifs.map(({ _id, __v, ...rest }) => ({
      ...rest,
      id: _id.toString(),
      timestamp: rest.timestamp instanceof Date ? rest.timestamp.toISOString() : rest.timestamp,
    }));
    res.json({ success: true, notifications: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function createNotification(req, res) {
  try {
    const email = getUserEmail(req);
    if (!email) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    // Whitelist client-supplied fields and stamp the actor from the verified JWT
    // so a user cannot forge who a notification appears to come from.
    const { type, message, channel, actorInitials, actorColor, joinLink, recipientEmails } = req.body;
    if (!message || !channel) {
      return res.status(400).json({ success: false, error: 'message and channel are required.' });
    }
    const body = {
      type: type || 'mention',
      actor: req.user?.name || 'Someone',
      actorInitials: actorInitials || '',
      actorColor: actorColor || '#4f46e5',
      message: String(message).slice(0, 1000),
      channel: String(channel),
      joinLink: joinLink || '',
      recipientEmails: Array.isArray(recipientEmails) ? recipientEmails.map((e) => String(e).toLowerCase()) : [],
      timestamp: new Date(),
    };
    const notif = new Notification(body);
    const saved = await notif.save();
    const { _id, __v, ...rest } = saved.toObject();
    res.json({
      success: true,
      notification: {
        ...rest,
        id: _id.toString(),
        timestamp: rest.timestamp instanceof Date ? rest.timestamp.toISOString() : rest.timestamp,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

module.exports = { getNotifications, createNotification };
