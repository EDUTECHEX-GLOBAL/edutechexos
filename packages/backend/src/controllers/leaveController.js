const { VALID_ACCOUNTS } = require('../utils/helpers');
const { sendBrevoEmail } = require('../services/emailService');
const { logAudit } = require('../services/auditService');
const Leave = require('../models/Leave');
const UserSettings = require('../models/UserSettings');

async function userWantsEmail(email) {
  try {
    const s = await UserSettings.findOne({ email: email.toLowerCase() }).lean();
    return s ? s.emailNotifications !== false : true;
  } catch { return true; }
}

async function getLeaves(req, res) {
  try {
    const isAdmin = req.user?.role === 'Admin';
    const query = isAdmin ? {} : { email: req.user.email };
    const leaves = await Leave.find(query).sort({ requestedAt: -1 }).lean();
    const formatted = leaves.map(({ _id, __v, ...rest }) => ({ ...rest, id: _id.toString() }));
    res.json({ success: true, leaves: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function createLeave(req, res) {
  try {
    const { type, leaveCategory, startDate, endDate, duration, reason } = req.body;
    if (!type || !startDate || !reason) {
      return res.status(400).json({ success: false, error: 'type, startDate and reason are required.' });
    }
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      return res.status(400).json({ success: false, error: 'startDate must be a valid date.' });
    }
    if (endDate) {
      const end = new Date(endDate);
      if (isNaN(end.getTime())) {
        return res.status(400).json({ success: false, error: 'endDate must be a valid date.' });
      }
      if (end < start) {
        return res.status(400).json({ success: false, error: 'endDate must be on or after startDate.' });
      }
    }
    if (duration && !['full', 'half'].includes(String(duration))) {
      return res.status(400).json({ success: false, error: 'duration must be full or half.' });
    }
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required.' });
    const leave = new Leave({
      email: req.user.email,
      name:  req.user.name,
      type, leaveCategory, startDate,
      endDate:  endDate  || '',
      duration: duration || 'full',
      reason,
    });
    const saved = await leave.save();
    const { _id, __v, ...rest } = saved.toObject();
    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || (VALID_ACCOUNTS.find(a => a.role === 'Admin') || {}).email;
    const appUrl = process.env.APP_URL || 'https://edutechexos.vercel.app';
    const typeLabel  = type === 'instant' ? 'Emergency / Instant' : 'Planned';
    const catLabel   = { sick: 'Sick', vacation: 'Vacation', personal: 'Personal', emergency: 'Emergency', other: 'Other' }[leaveCategory] || leaveCategory;
    const dateRange  = type === 'instant'
      ? `${startDate} (${duration === 'half' ? 'Half day' : 'Full day'})`
      : `${startDate} → ${endDate || startDate}`;
    if (adminEmail) {
      sendBrevoEmail({
        to: [{ email: adminEmail }],
        subject: `EduTechExOS — Leave request from ${req.user.name}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#FAF8F5;border-radius:12px;">
            <div style="background:linear-gradient(135deg,#191E2F,#252D45);border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;">
              <h1 style="color:#fff;margin:0;font-size:20px;">EduTechExOS</h1>
              <p style="color:rgba(255,255,255,0.6);margin:4px 0 0;font-size:12px;">Leave Management</p>
            </div>
            <h2 style="color:#1E2636;font-size:17px;margin:0 0 12px;">New Leave Request</h2>
            <div style="background:#fff;border:1px solid rgba(62,74,137,0.12);border-radius:10px;padding:16px;margin-bottom:20px;">
              <p style="margin:4px 0;font-size:13px;color:#4A5578;"><strong>Name:</strong> ${req.user.name}</p>
              <p style="margin:4px 0;font-size:13px;color:#4A5578;"><strong>Email:</strong> ${req.user.email}</p>
              <p style="margin:4px 0;font-size:13px;color:#4A5578;"><strong>Type:</strong> ${typeLabel}</p>
              <p style="margin:4px 0;font-size:13px;color:#4A5578;"><strong>Category:</strong> ${catLabel}</p>
              <p style="margin:4px 0;font-size:13px;color:#4A5578;"><strong>Dates:</strong> ${dateRange}</p>
              <p style="margin:4px 0;font-size:13px;color:#4A5578;"><strong>Reason:</strong> ${reason}</p>
            </div>
            <div style="text-align:center;">
              <a href="${appUrl}/admin" style="display:inline-block;background:#3E4A89;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:13px;font-weight:700;">Review in Admin Panel &#x2192;</a>
            </div>
          </div>`,
      }).catch((err) => console.error('[email] leave-request admin alert failed:', err));
    }
    const io = req.app.get('io');
    if (io) io.emit('leave_requested', { leaveId: _id.toString(), email: req.user.email, name: req.user.name, type, startDate, endDate });
    res.json({ success: true, leave: { ...rest, id: _id.toString() } });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function reviewLeave(req, res) {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, error: 'Admin access required.' });
  }
  try {
    const { status, adminNote } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'status must be approved or rejected.' });
    }
    const updated = await Leave.findByIdAndUpdate(
      req.params.id,
      { $set: { status, adminNote: adminNote || '' } },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ success: false, error: 'Leave not found.' });
    const { _id, __v, ...rest } = updated;
    await logAudit(req, `leave.${status}`, rest.email, rest.name, {
      leaveId: _id.toString(), type: rest.type, startDate: rest.startDate, adminNote: adminNote || '',
    });
    const io = req.app.get('io');
    if (io) {
      io.emit('leave_updated', { leaveId: _id.toString(), email: rest.email, status, adminNote: rest.adminNote });
      // Broadcast leave indicator so all users update the badge in real-time
      io.emit('leave_status_update', { email: rest.email, onLeave: status === 'approved' });
    }
    const appUrl = process.env.APP_URL || 'https://edutechexos.vercel.app';
    const statusLabel = status === 'approved' ? 'Approved' : 'Rejected';
    const typeLabel   = rest.type === 'instant' ? 'Emergency / Instant' : 'Planned';
    const dateRange   = rest.type === 'instant'
      ? `${rest.startDate} (${rest.duration === 'half' ? 'Half day' : 'Full day'})`
      : `${rest.startDate} → ${rest.endDate || rest.startDate}`;
    const wantsEmail = await userWantsEmail(rest.email);
    if (wantsEmail) sendBrevoEmail({
      to: [{ email: rest.email, name: rest.name }],
      subject: `EduTechExOS — Your leave request has been ${status}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#FAF8F5;border-radius:12px;">
          <div style="background:linear-gradient(135deg,#191E2F,#252D45);border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;">
            <h1 style="color:#fff;margin:0;font-size:20px;">EduTechExOS</h1>
          </div>
          <h2 style="color:#1E2636;font-size:17px;margin:0 0 8px;">Hi ${rest.name}, your leave has been ${statusLabel}</h2>
          <div style="background:#fff;border:1px solid rgba(62,74,137,0.12);border-radius:10px;padding:16px;margin:16px 0;">
            <p style="margin:4px 0;font-size:13px;color:#4A5578;"><strong>Type:</strong> ${typeLabel}</p>
            <p style="margin:4px 0;font-size:13px;color:#4A5578;"><strong>Dates:</strong> ${dateRange}</p>
            <p style="margin:4px 0;font-size:13px;color:#4A5578;"><strong>Reason:</strong> ${rest.reason}</p>
            ${rest.adminNote ? `<p style="margin:8px 0 4px;font-size:13px;color:#4A5578;"><strong>Admin note:</strong> ${rest.adminNote}</p>` : ''}
          </div>
          <div style="text-align:center;">
            <a href="${appUrl}/dashboard" style="display:inline-block;background:#3E4A89;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:13px;font-weight:700;">Go to Dashboard &#x2192;</a>
          </div>
        </div>`,
    }).catch((err) => console.error('[email] leave-decision notification failed:', err));
    res.json({ success: true, leave: { ...rest, id: _id.toString() } });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

module.exports = { getLeaves, createLeave, reviewLeave };
