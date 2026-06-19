const { VALID_ACCOUNTS } = require('../utils/helpers');
const { sendBrevoEmail } = require('../services/emailService');
const { logAudit } = require('../services/auditService');
const AccessRequest = require('../models/AccessRequest');

async function submitRequest(req, res) {
  try {
    const { name, email, role } = req.body;
    const emailClean = String(email).trim().toLowerCase();

    if (VALID_ACCOUNTS.some((a) => a.email === emailClean)) {
      return res.status(409).json({ success: false, error: 'This email is already registered as a system account.' });
    }

    const existing = await AccessRequest.findOne({ email: emailClean }).lean();
    if (existing) {
      return res.json({
        success: true,
        exists: true,
        status: existing.status,
        message:
          existing.status === 'approved'
            ? 'Your access is approved. You can sign in now.'
            : existing.status === 'rejected'
            ? 'Your previous request was declined. Please contact admin.'
            : 'Your account is pending admin approval. Check your email for your temporary password.',
      });
    }

    const request = new AccessRequest({ name, email: emailClean, password: '', role, status: 'pending' });
    const saved = await request.save();
    const { _id, __v, ...rest } = saved.toObject();

    const appUrl = process.env.APP_URL || 'https://edutechexos.vercel.app';

    sendBrevoEmail({
      to: [{ email: emailClean, name }],
      subject: 'EduTechExOS — Access Request Received',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#FAF8F5;border-radius:12px;">
          <div style="background:linear-gradient(135deg,#191E2F,#252D45);border-radius:10px;padding:24px;text-align:center;margin-bottom:24px;">
            <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:-0.5px;">EduTechExOS</h1>
            <p style="color:rgba(255,255,255,0.6);margin:6px 0 0;font-size:13px;">Team Operating System</p>
          </div>
          <h2 style="color:#1E2636;font-size:18px;margin:0 0 12px;">Hi ${name}, your request is received!</h2>
          <p style="color:#4A5578;font-size:14px;line-height:1.6;margin:0 0 16px;">
            Thank you for requesting access to <strong>EduTechExOS</strong>. Your request has been sent to the workspace admin for review.
          </p>
          <div style="background:#fff;border:1px solid rgba(62,74,137,0.12);border-radius:10px;padding:16px;margin-bottom:20px;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#9BA6D3;text-transform:uppercase;letter-spacing:1px;">Request details</p>
            <p style="margin:4px 0;font-size:13px;color:#4A5578;"><strong>Name:</strong> ${name}</p>
            <p style="margin:4px 0;font-size:13px;color:#4A5578;"><strong>Email:</strong> ${emailClean}</p>
            <p style="margin:4px 0;font-size:13px;color:#4A5578;"><strong>Role:</strong> ${role}</p>
          </div>
          <p style="color:#4A5578;font-size:13px;line-height:1.6;margin:0 0 8px;">
            Once approved, you will receive a <strong>personal invite link</strong> by email. The link will let you set your password and activate your account.
          </p>
          <p style="color:#9BA6D3;font-size:12px;">If you don't hear back within 24 hours, contact your workspace admin directly.</p>
          <hr style="border:none;border-top:1px solid rgba(62,74,137,0.10);margin:24px 0;" />
          <p style="color:#B0B8D1;font-size:11px;text-align:center;margin:0;">EduTechExOS - Powered by EduTechEx</p>
        </div>`,
    }).catch((err) => console.error('[email] access-request confirmation failed:', err));

    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || (VALID_ACCOUNTS.find(a => a.role === 'Admin') || {}).email;
    if (adminEmail) {
      sendBrevoEmail({
        to: [{ email: adminEmail, name }],
        subject: `EduTechExOS — New access request from ${name}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#FAF8F5;border-radius:12px;">
            <div style="background:linear-gradient(135deg,#191E2F,#252D45);border-radius:10px;padding:24px;text-align:center;margin-bottom:24px;">
              <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:-0.5px;">EduTechExOS</h1>
              <p style="color:rgba(255,255,255,0.6);margin:6px 0 0;font-size:13px;">Admin Notification</p>
            </div>
            <h2 style="color:#1E2636;font-size:17px;margin:0 0 12px;">New Access Request</h2>
            <p style="color:#4A5578;font-size:14px;line-height:1.6;margin:0 0 16px;">
              A new user has requested access to the <strong>EduTechExOS</strong> workspace. Review and send them an invite link from the admin panel.
            </p>
            <div style="background:#fff;border:1px solid rgba(62,74,137,0.12);border-radius:10px;padding:16px;margin-bottom:20px;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#9BA6D3;text-transform:uppercase;letter-spacing:1px;">Request details</p>
              <p style="margin:4px 0;font-size:13px;color:#4A5578;"><strong>Name:</strong> ${name}</p>
              <p style="margin:4px 0;font-size:13px;color:#4A5578;"><strong>Email:</strong> ${emailClean}</p>
              <p style="margin:4px 0;font-size:13px;color:#4A5578;"><strong>Role:</strong> ${role}</p>
            </div>
            <div style="text-align:center;margin:20px 0;">
              <a href="${appUrl}/admin" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;text-decoration:none;padding:13px 28px;border-radius:10px;font-size:13px;font-weight:700;">Review in Admin Panel &#x2192;</a>
            </div>
            <hr style="border:none;border-top:1px solid rgba(62,74,137,0.10);margin:24px 0;" />
            <p style="color:#B0B8D1;font-size:11px;text-align:center;margin:0;">EduTechExOS - Powered by EduTechEx</p>
          </div>`,
      }).catch((err) => console.error('[email] admin new-request alert failed:', err));
    }

    res.json({
      success: true,
      request: {
        ...rest,
        id: _id.toString(),
        requestedAt: rest.requestedAt instanceof Date ? rest.requestedAt.toISOString() : rest.requestedAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function getRequests(req, res) {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, error: 'Admin access required.' });
  }
  try {
    const requests = await AccessRequest.find({}).sort({ requestedAt: -1 }).lean();
    const formatted = requests.map(({ _id, __v, password, ...rest }) => ({
      ...rest,
      id: _id.toString(),
      requestedAt: rest.requestedAt instanceof Date ? rest.requestedAt.toISOString() : rest.requestedAt,
    }));
    res.json({ success: true, requests: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function reviewRequest(req, res) {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, error: 'Admin access required.' });
  }
  try {
    const { id } = req.params;
    const { status, channelId, channelIds, role } = req.body;

    const updateFields = {};
    if (status !== undefined) updateFields.status = status;
    if (channelId !== undefined) updateFields.channelId = channelId;
    if (channelIds !== undefined) updateFields.channelIds = Array.isArray(channelIds) ? channelIds : [];
    if (role !== undefined) updateFields.role = role;

    const updated = await AccessRequest.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ success: false, error: 'Request not found' });
    const { _id, __v, ...rest } = updated;

    const io = req.app.get('io') || null;

    if (io && (status === 'approved' || role !== undefined || channelId !== undefined || channelIds !== undefined)) {
      io.emit('member_updated', {
        memberId: `member-${_id.toString()}`,
        email: rest.email,
        role: rest.role,
        channelId: rest.channelId,
        channelIds: rest.channelIds || [],
        status: rest.status,
      });
    }
    if (io && status === 'approved') io.emit('access_approved', { email: rest.email });
    if (io && status === 'rejected') io.emit('access_rejected', { email: rest.email });

    if (status === 'approved') await logAudit(req, 'member.approved', rest.email, rest.name, { role: rest.role });
    else if (status === 'rejected') await logAudit(req, 'member.rejected', rest.email, rest.name, {});
    else if (role !== undefined) await logAudit(req, 'member.role_changed', rest.email, rest.name, { role });

    const appUrl = process.env.APP_URL || 'https://edutechexos.vercel.app';
    if (status === 'approved') {
      sendBrevoEmail({
        to: [{ email: rest.email, name: rest.name }],
        subject: 'EduTechExOS — Your access request has been approved',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#FAF8F5;border-radius:12px;">
            <div style="background:linear-gradient(135deg,#191E2F,#252D45);border-radius:10px;padding:24px;text-align:center;margin-bottom:24px;">
              <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:-0.5px;">EduTechExOS</h1>
              <p style="color:rgba(255,255,255,0.6);margin:6px 0 0;font-size:13px;">Team Operating System</p>
            </div>
            <h2 style="color:#1E2636;font-size:20px;margin:0 0 12px;">Welcome aboard, ${rest.name}!</h2>
            <p style="color:#4A5578;font-size:14px;line-height:1.6;margin:0 0 16px;">
              Your access request to <strong>EduTechExOS</strong> has been approved. Check your inbox for a separate invite email with your personal activation link.
            </p>
            <p style="color:#4A5578;font-size:13px;line-height:1.6;margin:0 0 20px;">
              The invite link lets you set your own password and activate your account. It expires in 4.5 hours.
            </p>
            <div style="text-align:center;margin:24px 0;">
              <a href="${appUrl}/sign-up-login-screen" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:700;letter-spacing:0.3px;">Sign In to EduTechExOS &#x2192;</a>
            </div>
            <p style="color:#9BA6D3;font-size:12px;text-align:center;">If you have any questions, reach out to your workspace admin.</p>
            <hr style="border:none;border-top:1px solid rgba(62,74,137,0.10);margin:24px 0;" />
            <p style="color:#B0B8D1;font-size:11px;text-align:center;margin:0;">EduTechExOS - Powered by EduTechEx</p>
          </div>`,
      }).catch((err) => console.error('[email] access-approved notification failed:', err));
    } else if (status === 'rejected') {
      sendBrevoEmail({
        to: [{ email: rest.email, name: rest.name }],
        subject: 'EduTechExOS — Update on your access request',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#FAF8F5;border-radius:12px;">
            <div style="background:linear-gradient(135deg,#191E2F,#252D45);border-radius:10px;padding:24px;text-align:center;margin-bottom:24px;">
              <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:-0.5px;">EduTechExOS</h1>
            </div>
            <h2 style="color:#1E2636;font-size:18px;margin:0 0 12px;">Hi ${rest.name},</h2>
            <p style="color:#4A5578;font-size:14px;line-height:1.6;margin:0 0 16px;">
              Thank you for your interest in <strong>EduTechExOS</strong>. After review, the admin was unable to approve your access request at this time.
            </p>
            <p style="color:#4A5578;font-size:14px;line-height:1.6;margin:0 0 16px;">
              If you believe this was a mistake or would like to discuss further, please contact your workspace admin directly.
            </p>
            <hr style="border:none;border-top:1px solid rgba(62,74,137,0.10);margin:24px 0;" />
            <p style="color:#B0B8D1;font-size:11px;text-align:center;margin:0;">EduTechExOS - Powered by EduTechEx</p>
          </div>`,
      }).catch((err) => console.error('[email] access-rejected notification failed:', err));
    }

    res.json({
      success: true,
      request: {
        ...rest,
        id: _id.toString(),
        requestedAt: rest.requestedAt instanceof Date ? rest.requestedAt.toISOString() : rest.requestedAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function deleteRequest(req, res) {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, error: 'Admin access required.' });
  }
  try {
    const { id } = req.params;
    const deleted = await AccessRequest.findByIdAndDelete(id).lean();
    if (!deleted) return res.status(404).json({ success: false, error: 'Request not found.' });

    const { revokedEmails } = require('../utils/helpers');
    const { RemovedMember } = require('../models/index');
    await RemovedMember.findOneAndUpdate(
      { email: deleted.email.toLowerCase() },
      { email: deleted.email.toLowerCase(), removedAt: new Date() },
      { upsert: true, new: true }
    );
    revokedEmails.add(deleted.email.toLowerCase());

    const io = req.app.get('io');
    if (io) {
      io.emit('member_removed', { memberId: `member-${id}` });
      io.emit('user_forcefully_removed', { email: deleted.email.toLowerCase() });
    }

    await logAudit(req, 'member.removed', deleted.email, deleted.name, { role: deleted.role });
    res.json({ success: true, removedEmail: deleted.email });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

module.exports = { submitRequest, getRequests, reviewRequest, deleteRequest };
