const { VALID_ACCOUNTS } = require('../utils/helpers');
const MeetingAccess = require('../models/MeetingAccess');
const MeetingRequest = require('../models/MeetingRequest');
const MediaFile = require('../models/MediaFile');
const AccessRequest = require('../models/AccessRequest');
const { sendBrevoEmail } = require('../services/emailService');

async function createMeetingAccess(req, res) {
  try {
    const { messageId, channelId, allowedEmails, meetingCode, meetLink } = req.body;
    const hostEmail = req.user.email;
    if (!messageId || !channelId) {
      return res.status(400).json({ success: false, error: 'messageId and channelId are required.' });
    }
    const doc = await MeetingAccess.findOneAndUpdate(
      { messageId, channelId },
      { $setOnInsert: { hostEmail, allowedEmails: allowedEmails || [], grantedEmails: [], meetingCode, meetLink } },
      { upsert: true, new: true }
    ).lean();
    res.json({ success: true, access: doc });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function checkMeetingAccess(req, res) {
  try {
    const doc = await MeetingAccess.findOne({ messageId: req.params.messageId }).lean();
    if (!doc) return res.json({ success: true, canJoin: true, exists: false });

    const userEmail = req.user?.email?.toLowerCase() || '';
    const allowed = doc.allowedEmails.map((e) => e.toLowerCase());
    const granted = doc.grantedEmails.map((e) => e.toLowerCase());
    const canJoin = userEmail === doc.hostEmail.toLowerCase()
      || allowed.includes(userEmail)
      || granted.includes(userEmail);

    res.json({ success: true, canJoin, hostEmail: doc.hostEmail, exists: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function grantMeetingAccess(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'email is required.' });

    const doc = await MeetingAccess.findOne({ messageId: req.params.messageId }).lean();
    if (!doc) return res.status(404).json({ success: false, error: 'Meeting access record not found.' });

    if (req.user?.email?.toLowerCase() !== doc.hostEmail.toLowerCase() && req.user?.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Only the meeting host or admin can grant access.' });
    }

    await MeetingAccess.findByIdAndUpdate(doc._id, { $addToSet: { grantedEmails: email.toLowerCase() } });

    const io = req.app.get('io');
    io.emit('meeting_access_granted', { messageId: req.params.messageId, email: email.toLowerCase() });

    res.json({ success: true, message: `Access granted to ${email}.` });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function sendMeetingInvite(req, res) {
  try {
    const { title, time, joinLink, channelId, inviteeEmails } = req.body;
    if (!title || !joinLink) {
      return res.status(400).json({ success: false, error: 'title and joinLink are required.' });
    }

    const allMap = new Map(VALID_ACCOUNTS.map(a => [a.email.toLowerCase(), { email: a.email, name: a.name }]));
    try {
      const dbUsers = await AccessRequest.find({ status: 'approved' }).lean();
      for (const u of dbUsers) {
        if (!allMap.has(u.email.toLowerCase())) allMap.set(u.email.toLowerCase(), { email: u.email, name: u.name });
      }
    } catch (_) {}

    let to;
    if (Array.isArray(inviteeEmails) && inviteeEmails.length > 0) {
      to = inviteeEmails
        .map(e => allMap.get(e.toLowerCase()) ?? { email: e, name: e })
        .filter(r => r.email);
    } else {
      to = Array.from(allMap.values());
    }

    const senderEmail = req.user?.email?.toLowerCase();
    if (senderEmail) to = to.filter(r => r.email.toLowerCase() !== senderEmail);
    const hostName = req.user?.name || req.user?.email || 'A team member';

    const html = `
      <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:32px;">
        <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#0A1128,#1E2E5C);padding:24px 28px;">
            <p style="margin:0;color:rgba(212,175,55,0.7);font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">EduTechExOS · Meeting Invite</p>
            <h1 style="margin:8px 0 0;font-size:22px;color:#fff;">${title}</h1>
          </div>
          <div style="padding:28px;">
            <p style="margin:0 0 20px;color:#334155;font-size:14px;line-height:1.7;">
              <strong>${hostName}</strong> has scheduled a meeting and invited you.
            </p>
            ${time ? `
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding:14px 16px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
              <span style="font-size:20px;">📅</span>
              <div>
                <p style="margin:0;font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;">Scheduled Time</p>
                <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#1e293b;">${time}</p>
              </div>
            </div>` : ''}
            <div style="margin-bottom:28px;padding:14px 16px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
              <p style="margin:0;font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;">Channel</p>
              <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#1e293b;">#${channelId || 'general'}</p>
            </div>
            <a href="${joinLink}" style="display:inline-block;padding:14px 32px;background:#D4AF37;color:#0A1128;font-weight:800;font-size:13px;text-decoration:none;border-radius:8px;">
              Join Meeting →
            </a>
            <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;word-break:break-all;">
              Or copy this link:<br/>
              <a href="${joinLink}" style="color:#3E4A89;">${joinLink}</a>
            </p>
          </div>
          <div style="background:#f8fafc;padding:14px 28px;border-top:1px solid #f1f5f9;text-align:center;font-size:11px;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;">
            &copy; 2026 EduTechExOS &middot; Institutional Team OS
          </div>
        </div>
      </div>`;

    const subject = `Meeting Invite: ${title}${time ? ' · ' + time : ''}`;
    const [primaryRecipient, ...otherRecipients] = to;
    const bccRecipients = otherRecipients.map(r => ({ email: r.email, name: r.name }));
    const { ok } = await sendBrevoEmail({
      to: [{ email: primaryRecipient.email, name: primaryRecipient.name }],
      bcc: bccRecipients.length > 0 ? bccRecipients : undefined,
      subject,
      html,
    });
    console.log(`[meeting-invite] ${ok ? 'OK' : 'FAILED'} → ${to.length} recipients (BCC)`);
    res.json({ success: true, sent: to.length, ok });
  } catch (err) {
    console.error('[meeting-invite]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function registerMedia(req, res) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    const { channelId, messageId, kind, url, mimeType, sizeBytes } = req.body;
    if (!channelId || !kind || !url) {
      return res.status(400).json({ success: false, error: 'channelId, kind, and url are required.' });
    }
    const file = new MediaFile({
      ownerEmail: req.user.email,
      channelId,
      messageId: messageId || null,
      kind: ['audio', 'video', 'screen'].includes(kind) ? kind : 'audio',
      url,
      mimeType: mimeType || '',
      sizeBytes: sizeBytes || 0,
    });
    const saved = await file.save();
    res.json({ success: true, mediaId: saved._id.toString() });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function getMedia(req, res) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    const file = await MediaFile.findById(req.params.id).lean();
    if (!file) return res.status(404).json({ success: false, error: 'Media file not found.' });

    const isOwner = file.ownerEmail.toLowerCase() === req.user.email.toLowerCase();
    const isAdmin = req.user.role === 'Admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Access denied. Only the sender and admin can access this recording.' });
    }

    res.json({ success: true, url: file.url, kind: file.kind, mimeType: file.mimeType });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function getMeetingRequests(req, res) {
  try {
    const email = req.user?.email?.toLowerCase();
    const filter = req.user?.role === 'Admin' ? {} : { userEmail: email };
    const requests = await MeetingRequest.find(filter).sort({ date: 1, time: 1 }).lean();
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function createMeetingRequest(req, res) {
  try {
    const { date, time, purpose, adminEmail } = req.body;
    if (!date || !time) return res.status(400).json({ success: false, error: 'date and time required.' });
    const mr = new MeetingRequest({
      userEmail: req.user.email,
      userName:  req.user.name,
      adminEmail: adminEmail || 'admin@edutechex.in',
      date, time, purpose: purpose || '',
    });
    const saved = await mr.save();
    sendBrevoEmail({
      to: [{ email: adminEmail || 'admin@edutechex.in' }],
      subject: `EduTechExOS — Meeting request from ${req.user.name} on ${date} at ${time}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;padding:24px;background:#FAF8F5;border-radius:10px;">
          <h2 style="color:#1E2636;margin:0 0 12px;font-size:17px;">New Meeting Request</h2>
          <div style="background:#fff;border:1px solid rgba(62,74,137,0.12);border-radius:8px;padding:14px;margin-bottom:16px;">
            <p style="margin:4px 0;font-size:13px;color:#4A5578;"><strong>From:</strong> ${req.user.name} (${req.user.email})</p>
            <p style="margin:4px 0;font-size:13px;color:#4A5578;"><strong>Date:</strong> ${date} at ${time}</p>
            <p style="margin:4px 0;font-size:13px;color:#4A5578;"><strong>Purpose:</strong> ${purpose || 'Not specified'}</p>
          </div>
          <a href="${process.env.APP_URL || 'https://edutechexos.vercel.app'}/admin" style="display:inline-block;background:#3E4A89;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:13px;font-weight:700;">Review in Admin Panel &#x2192;</a>
        </div>`,
    }).catch((err) => console.error('[email] meeting-request admin alert failed:', err));
    res.json({ success: true, request: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function reviewMeetingRequest(req, res) {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Admin only.' });
    }
    const { status } = req.body;
    const updated = await MeetingRequest.findByIdAndUpdate(
      req.params.id, { status }, { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ success: false, error: 'Not found.' });
    sendBrevoEmail({
      to: [{ email: updated.userEmail }],
      subject: `EduTechExOS — Your meeting request has been ${status}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;padding:24px;background:#FAF8F5;border-radius:10px;">
          <h2 style="color:#1E2636;margin:0 0 12px;font-size:17px;">Meeting Request ${status === 'confirmed' ? 'Confirmed' : 'Declined'}</h2>
          <p style="color:#4A5578;font-size:14px;margin:0 0 12px;">Hi <strong>${updated.userName}</strong>,</p>
          <p style="color:#4A5578;font-size:14px;margin:0 0 16px;">Your meeting request for <strong>${updated.date}</strong> at <strong>${updated.time}</strong> has been <strong>${status}</strong> by the admin.</p>
          <a href="${process.env.APP_URL || 'https://edutechexos.vercel.app'}/dashboard" style="display:inline-block;background:#3E4A89;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:13px;font-weight:700;">Go to Dashboard &#x2192;</a>
        </div>`,
    }).catch((err) => console.error('[email] meeting-decision notification failed:', err));
    res.json({ success: true, request: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function lookupMeetingByCode(req, res) {
  try {
    const doc = await MeetingAccess.findOne({ meetingCode: req.params.code }).lean();
    if (!doc) return res.status(404).json({ success: false, error: 'Meeting not found.' });
    res.json({ success: true, messageId: doc.messageId, channelId: doc.channelId, hostEmail: doc.hostEmail, meetLink: doc.meetLink });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

module.exports = {
  createMeetingAccess,
  checkMeetingAccess,
  grantMeetingAccess,
  sendMeetingInvite,
  registerMedia,
  getMedia,
  getMeetingRequests,
  createMeetingRequest,
  reviewMeetingRequest,
  lookupMeetingByCode,
};
