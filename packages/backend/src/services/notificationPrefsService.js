const UserSettings = require('../models/UserSettings');

const CATEGORY_FIELD = {
  mentions: 'emailOnMentions',
  meetings: 'emailOnMeetings',
  leave: 'emailOnLeave',
  digest: 'emailOnDigest',
  deadline: 'emailOnDeadlines',
};

// Master `emailNotifications` switch always wins; the per-category field
// only matters when the master switch is on.
async function wantsEmail(email, category) {
  try {
    const s = await UserSettings.findOne({ email: email.toLowerCase() }).lean();
    if (!s) return true;
    if (s.emailNotifications === false) return false;
    const field = CATEGORY_FIELD[category];
    if (!field) return true;
    return s[field] !== false;
  } catch {
    return true;
  }
}

module.exports = { wantsEmail };
