const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { AccessRequest, AuditLog, InviteToken, RemovedMember } = require('../models/index');
const { VALID_ACCOUNTS, revokedEmails } = require('../utils/helpers');
const { sendBrevoEmail, diagnoseBrevo } = require('../services/emailService');
const { encryptField, _encKey } = require('../services/encryptionService');
const { JWT_SECRET, JWT_EXPIRY } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');
const Message = require('../models/Message');

async function setPassword(req, res) {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, error: 'Admin access required.' });
  }
  try {
    const { email, password, name, role, status } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'email and password are required.' });
    }
    const emailClean = String(email).trim().toLowerCase();
    const pwStr = String(password);
    if (pwStr.length < 8 || !/[A-Z]/.test(pwStr) || !/[0-9]/.test(pwStr)) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters with an uppercase letter and a number.' });
    }
    if (VALID_ACCOUNTS.some((a) => a.email === emailClean)) {
      return res.status(409).json({ success: false, error: 'Cannot override a system account via this endpoint.' });
    }
    const hashed = await bcrypt.hash(String(password), 10);
    const existing = await AccessRequest.findOne({ email: emailClean }).lean();
    if (existing) {
      await AccessRequest.findOneAndUpdate(
        { email: emailClean },
        { $set: { password: hashed, ...(role ? { role } : {}), ...(status ? { status } : {}), ...(name ? { name } : {}) } }
      );
      return res.json({ success: true, action: 'updated', email: emailClean });
    }
    const newUser = new AccessRequest({
      name: name || emailClean.split('@')[0],
      email: emailClean,
      password: hashed,
      role: role || 'Member',
      status: status || 'approved',
    });
    await newUser.save();
    return res.json({ success: true, action: 'created', email: emailClean });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function generatePassword(req, res) {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Admin access required.' });
    }
    const { requestId } = req.body;
    if (!requestId) return res.status(400).json({ success: false, error: 'requestId is required.' });
    const request = await AccessRequest.findById(requestId).lean();
    if (!request) return res.status(404).json({ success: false, error: 'Access request not found.' });
    if (request.status === 'rejected') return res.status(409).json({ success: false, error: 'This request has been rejected.' });
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
    let plainPassword = 'Edx@';
    for (let i = 0; i < 10; i++) plainPassword += charset[Math.floor(Math.random() * charset.length)];
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    await AccessRequest.findByIdAndUpdate(requestId, {
      $set: { status: 'approved', password: hashedPassword },
    });
    const appUrl = process.env.APP_URL || 'https://edutechexos.vercel.app';
    const emailResult = await sendBrevoEmail({
      to: [{ email: request.email, name: request.name }],
      subject: 'EduTechExOS — Your account is ready',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#FAF8F5;border-radius:12px;">
          <div style="background:linear-gradient(135deg,#191E2F,#252D45);border-radius:10px;padding:24px;text-align:center;margin-bottom:24px;">
            <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:-0.5px;">EduTechExOS</h1>
            <p style="color:rgba(255,255,255,0.6);margin:6px 0 0;font-size:13px;">Team Operating System</p>
          </div>
          <h2 style="color:#1E2636;font-size:20px;margin:0 0 12px;">Welcome, ${request.name}!</h2>
          <p style="color:#4A5578;font-size:14px;line-height:1.6;margin:0 0 20px;">
            Your workspace account has been created by the admin. Use the credentials below to sign in.
          </p>
          <div style="background:#fff;border:1px solid rgba(62,74,137,0.15);border-radius:10px;padding:18px 20px;margin-bottom:20px;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#9BA6D3;text-transform:uppercase;letter-spacing:1px;">Your login credentials</p>
            <p style="margin:8px 0;font-size:13px;color:#4A5578;"><strong>Email:</strong> ${request.email}</p>
            <p style="margin:8px 0;font-size:13px;color:#4A5578;"><strong>Password:</strong>
              <span style="font-family:monospace;font-size:15px;font-weight:700;color:#1E2636;background:#EEF0FB;padding:3px 10px;border-radius:6px;letter-spacing:1px;">${plainPassword}</span>
            </p>
            <p style="margin:8px 0;font-size:13px;color:#4A5578;"><strong>Role:</strong> ${request.role}</p>
          </div>
          <div style="text-align:center;margin:24px 0;">
            <a href="${appUrl}/sign-up-login-screen" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:700;letter-spacing:0.3px;">Sign In to EduTechExOS &#x2192;</a>
          </div>
          <p style="color:#9BA6D3;font-size:12px;text-align:center;line-height:1.6;">We recommend changing your password after first login.<br/>If you didn't expect this email, contact your workspace admin.</p>
          <hr style="border:none;border-top:1px solid rgba(62,74,137,0.10);margin:24px 0;" />
          <p style="color:#B0B8D1;font-size:11px;text-align:center;margin:0;">EduTechExOS - Powered by EduTechEx</p>
        </div>`,
    });
    const emailSent = emailResult && emailResult.ok === true;
    if (!emailSent) console.error('[email] generate-password credentials email failed:', emailResult?.brevoError);
    const io = req.app.get('io');
    if (io) io.emit('access_approved', { email: request.email });
    await logAudit(req, 'member.password_generated', request.email, request.name, { role: request.role, emailSent });
    res.json({
      success: true, emailSent, generatedPassword: plainPassword,
      message: emailSent ? `Password generated and emailed to ${request.email}` : 'Password generated — email failed. Share manually.',
    });
  } catch (err) {
    console.error('[/api/admin/generate-password]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function sendInvite(req, res) {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Admin access required.' });
    }
    const { email, name, role, requestId } = req.body;
    if (!email || !name) return res.status(400).json({ success: false, error: 'email and name are required.' });
    const emailClean = String(email).trim().toLowerCase();
    await InviteToken.deleteMany({ email: emailClean, used: false });
    const token     = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 4.5 * 60 * 60 * 1000);
    await new InviteToken({
      email: emailClean, name, role: role || 'Member',
      requestId: requestId || null, token, expiresAt, createdBy: req.user.email,
    }).save();
    if (requestId) {
      await AccessRequest.findByIdAndUpdate(requestId, { $set: { status: 'invited' } });
    }
    const appUrl    = process.env.APP_URL || 'https://edutechexos.vercel.app';
    const inviteUrl = `${appUrl}/invite?token=${token}`;
    const expireStr = expiresAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
    const emailResult = await sendBrevoEmail({
      to: [{ email: emailClean, name }],
      subject: "You're invited to EduTechExOS Workspace",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#FAF8F5;border-radius:12px;">
          <div style="background:linear-gradient(135deg,#191E2F,#252D45);border-radius:10px;padding:28px;text-align:center;margin-bottom:24px;">
            <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:-0.5px;">EduTechExOS</h1>
            <p style="color:rgba(255,255,255,0.55);margin:6px 0 0;font-size:13px;">Team Operating System</p>
          </div>
          <h2 style="color:#1E2636;font-size:20px;margin:0 0 10px;">Hello ${name}!</h2>
          <p style="color:#4A5578;font-size:14px;line-height:1.65;margin:0 0 20px;">
            You have been invited to join the <strong>EduTechExOS</strong> workspace by the admin.<br/>
            Click the button below to set your password and activate your account.
          </p>
          <div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#9BA6D3;text-transform:uppercase;letter-spacing:1px;">Your invite details</p>
            <p style="margin:6px 0;font-size:13px;color:#4A5578;"><strong>Email:</strong> ${emailClean}</p>
            <p style="margin:6px 0;font-size:13px;color:#4A5578;"><strong>Role:</strong> ${role || 'Member'}</p>
            <p style="margin:6px 0;font-size:13px;color:#EF476F;"><strong>&#x23F0; Link expires:</strong> Today at ${expireStr} IST (4.5 hours)</p>
          </div>
          <div style="text-align:center;margin:28px 0;">
            <a href="${inviteUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:15px 36px;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:0.3px;">Accept Invite &amp; Set Password &#x2192;</a>
          </div>
          <p style="color:#94a3b8;font-size:12px;text-align:center;line-height:1.6;">This link is personal — do not share it.<br/>It can only be used once and expires in 4.5 hours.</p>
          <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0;"/>
          <p style="color:#B0B8D1;font-size:11px;text-align:center;margin:0;">EduTechExOS - Powered by EduTechEx</p>
        </div>`,
    });
    const emailSent = emailResult && emailResult.ok === true;
    if (!emailSent) {
      console.warn('[/api/admin/invite] Email delivery failed for', emailClean, emailResult?.brevoError || '');
    }
    await logAudit(req, 'member.invited', emailClean, name, { role, expiresAt, emailSent });
    res.json({ success: true, emailSent, inviteUrl, message: emailSent ? `Invite sent to ${emailClean}` : 'Invite link created — email delivery failed. Share the link manually.' });
  } catch (err) {
    console.error('[/api/admin/invite]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function broadcastEmail(req, res) {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Admin access required.' });
    }
    const { subject, message } = req.body;
    if (!subject || !subject.trim()) return res.status(400).json({ success: false, error: 'Subject is required.' });
    if (!message || !message.trim()) return res.status(400).json({ success: false, error: 'Message is required.' });
    const dbUsers = await AccessRequest.find({ status: 'approved' }).lean().catch(() => []);
    const removedSystemEmails = new Set(
      (await RemovedMember.find({}).lean().catch(() => [])).map(r => r.email.toLowerCase())
    );
    const allRecipients = [
      ...VALID_ACCOUNTS.filter(a => !removedSystemEmails.has(a.email.toLowerCase())).map((a) => ({ email: a.email, name: a.name })),
      ...dbUsers.map((u) => ({ email: u.email, name: u.name })),
    ];
    if (allRecipients.length === 0) {
      return res.json({ success: false, error: 'No users to send to.' });
    }
    const appUrl = process.env.APP_URL || 'https://edutechexos.vercel.app';
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#FAF8F5;border-radius:12px;">
        <div style="background:linear-gradient(135deg,#191E2F,#252D45);border-radius:10px;padding:24px;text-align:center;margin-bottom:24px;">
          <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:-0.5px;">EduTechExOS</h1>
          <p style="color:rgba(255,255,255,0.6);margin:6px 0 0;font-size:13px;">Message from Admin</p>
        </div>
        <div style="background:#fff;border:1px solid rgba(62,74,137,0.12);border-radius:10px;padding:20px 24px;margin-bottom:20px;">
          <p style="white-space:pre-wrap;font-size:14px;color:#1E2636;line-height:1.7;margin:0;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        </div>
        <div style="text-align:center;margin:20px 0;">
          <a href="${appUrl}" style="display:inline-block;background:#3E4A89;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:13px;font-weight:700;">Open EduTechExOS →</a>
        </div>
        <hr style="border:none;border-top:1px solid rgba(62,74,137,0.10);margin:20px 0;" />
        <p style="color:#B0B8D1;font-size:11px;text-align:center;margin:0;">EduTechExOS · Sent by workspace admin</p>
      </div>`;
    const [primary, ...rest] = allRecipients;
    const r = await sendBrevoEmail({
      to: [{ email: primary.email, name: primary.name }],
      bcc: rest.length > 0 ? rest.map(e => ({ email: e.email, name: e.name })) : undefined,
      subject: subject.trim(),
      html,
    });
    if (!r.ok) {
      if (r.brevoError === 'NOT_CONFIGURED') {
        return res.status(503).json({
          success: false,
          error: 'Email service not configured. Set BREVO_API_KEY in Render environment variables.',
        });
      }
      return res.status(502).json({ success: false, error: `Email send failed: ${r.brevoError}` });
    }
    console.log(`[broadcast] Admin ${req.user.email} sent "${subject.trim()}" to ${allRecipients.length} users.`);
    res.json({ success: true, sentTo: allRecipients.length });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function migrateEncrypt(req, res) {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Admin access required.' });
    }
    if (!_encKey()) {
      return res.status(500).json({ success: false, error: 'ENCRYPTION_KEY is not set or invalid on this server.' });
    }
    const plainMessages = await Message.find(
      { text: { $exists: true, $not: { $regex: '^enc:' } } },
      { _id: 1, text: 1 }
    ).lean();
    if (plainMessages.length === 0) {
      return res.json({ success: true, message: 'All messages are already encrypted.', encrypted: 0 });
    }
    const ops = plainMessages
      .filter(m => m.text && typeof m.text === 'string')
      .map(m => ({
        updateOne: {
          filter: { _id: m._id },
          update: { $set: { text: encryptField(m.text) } },
        },
      }));
    const result = await Message.bulkWrite(ops, { ordered: false });
    console.log(`[migrate-encrypt] Encrypted ${result.modifiedCount} messages by admin ${req.user.email}`);
    res.json({
      success: true,
      message: `Successfully encrypted ${result.modifiedCount} message(s).`,
      encrypted: result.modifiedCount,
      total: plainMessages.length,
    });
  } catch (err) {
    console.error('[migrate-encrypt]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function getAuditLog(req, res) {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, error: 'Admin access required.' });
  }
  try {
    const limit  = Math.min(parseInt(req.query.limit) || 200, 500);
    const before = req.query.before ? new Date(req.query.before) : null;
    const filter = before ? { timestamp: { $lt: before } } : {};
    const logs   = await AuditLog.find(filter).sort({ timestamp: -1 }).limit(limit).lean();
    res.json({ success: true, logs: logs.map(({ _id, __v, ...l }) => ({ ...l, id: _id.toString() })) });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function validateInvite(req, res) {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ success: false, error: 'token is required.' });
    const invite = await InviteToken.findOne({ token: String(token) }).lean();
    if (!invite)       return res.status(404).json({ success: false, error: 'Invalid invite link.' });
    if (invite.used)   return res.status(410).json({ success: false, error: 'This invite has already been used.' });
    if (invite.expiresAt < new Date()) return res.status(410).json({ success: false, error: 'This invite link has expired. Ask the admin to resend.' });
    res.json({ success: true, email: invite.email, name: invite.name, role: invite.role, expiresAt: invite.expiresAt.toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function acceptInvite(req, res) {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ success: false, error: 'token and password are required.' });
    const pwStr = String(password);
    if (pwStr.length < 8 || !/[A-Z]/.test(pwStr) || !/[0-9]/.test(pwStr)) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters with an uppercase letter and a number.' });
    }
    const invite = await InviteToken.findOne({ token: String(token) }).lean();
    if (!invite)       return res.status(404).json({ success: false, error: 'Invalid invite link.' });
    if (invite.used)   return res.status(410).json({ success: false, error: 'This invite has already been used.' });
    if (invite.expiresAt < new Date()) return res.status(410).json({ success: false, error: 'This invite link has expired. Ask the admin to resend.' });
    const hashed = await bcrypt.hash(String(password), 12);
    await AccessRequest.findOneAndUpdate(
      { email: invite.email },
      { $set: { status: 'approved', password: hashed, name: invite.name, role: invite.role } },
      { upsert: true, new: true }
    );
    // Clear removed/revoked status so re-invited users can log in
    await RemovedMember.deleteOne({ email: invite.email.toLowerCase() }).catch(() => {});
    revokedEmails.delete(invite.email.toLowerCase());
    await InviteToken.findOneAndUpdate({ token: String(token) }, { $set: { used: true, usedAt: new Date() } });
    const io = req.app.get('io');
    if (io) {
      io.emit('access_approved', { email: invite.email });
      io.emit('member_updated', { email: invite.email, status: 'approved' });
    }
    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || (VALID_ACCOUNTS.find(a => a.role === 'Admin') || {}).email;
    const appUrl = process.env.APP_URL || 'https://edutechexos.vercel.app';
    if (adminEmail) {
      sendBrevoEmail({
        to: [{ email: adminEmail }],
        subject: `EduTechExOS — ${invite.name} accepted their invite`,
        html: `<div style="font-family:Arial,sans-serif;max-width:480px;padding:24px;background:#F8FAFC;border-radius:10px;">
          <h2 style="color:#1E2636;margin:0 0 12px;font-size:17px;">New team member joined</h2>
          <p style="color:#4A5578;font-size:14px;margin:0 0 8px;"><strong>${invite.name}</strong> (${invite.email}) accepted their invite and activated their account.</p>
          <p style="color:#4A5578;font-size:14px;margin:0 0 16px;">Role: <strong>${invite.role}</strong></p>
          <a href="${appUrl}/admin" style="display:inline-block;background:#3E4A89;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:700;">View in Admin Panel &#x2192;</a>
        </div>`,
      }).catch((err) => console.error('[email] invite-accepted admin notification failed:', err));
    }
    res.json({ success: true, message: 'Account activated! You can now sign in.' });
  } catch (err) {
    console.error('[/api/invite/accept]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function emailDiagnostics(req, res) {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, error: 'Admin access required.' });
  }
  try {
    const diag = await diagnoseBrevo();

    const fromConfig = process.env.SMTP_FROM || 'EduTechExOS <edutechexos121@gmail.com>';
    const match = fromConfig.match(/(.*)<(.*)>/);
    const configuredSender = match ? match[2].trim() : fromConfig.trim();

    const senderVerified = (diag.senders?.list || []).some(
      s => s.email.toLowerCase() === configuredSender.toLowerCase() && s.active
    );

    diag.configuredSender = configuredSender;
    diag.senderVerified = senderVerified;
    if (!senderVerified) {
      diag.fix = `The sender email "${configuredSender}" is NOT verified in your Brevo account. Go to Brevo → Settings → Senders & IPs → Add/verify this email. Until verified, Brevo accepts API calls but silently drops emails.`;
    }

    res.json({ success: true, diagnostics: diag });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function testEmail(req, res) {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, error: 'Admin access required.' });
  }
  try {
    const { to } = req.body;
    const recipient = to || req.user.email;
    const result = await sendBrevoEmail({
      to: [{ email: recipient, name: 'Test' }],
      subject: 'EduTechExOS — Email Delivery Test',
      html: `<div style="font-family:Arial,sans-serif;padding:24px;">
        <h2 style="color:#4f46e5;">Email Delivery Test</h2>
        <p>If you are reading this, email delivery from EduTechExOS is working.</p>
        <p style="color:#64748b;font-size:12px;">Sent at: ${new Date().toISOString()}</p>
        <p style="color:#64748b;font-size:12px;">Server: ${process.env.RENDER_EXTERNAL_URL || 'localhost'}</p>
      </div>`,
    });
    res.json({ success: result.ok, messageId: result.messageId, error: result.brevoError || null, sentTo: recipient });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function getUsers(req, res) {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, error: 'Admin access required.' });
  }
  try {
    const dbUsers = await AccessRequest.find({}).sort({ createdAt: -1 }).lean();
    const removed = new Set(
      (await RemovedMember.find({}).lean().catch(() => [])).map(r => r.email.toLowerCase())
    );
    const systemUsers = VALID_ACCOUNTS
      .filter(a => !removed.has(a.email.toLowerCase()))
      .map(a => ({ id: a.email, email: a.email, name: a.name, role: a.role, status: 'system', source: 'system' }));
    const dbFormatted = dbUsers.map(({ _id, __v, password, ...rest }) => ({
      ...rest, id: _id.toString(), source: 'db',
    }));
    res.json({ success: true, users: [...systemUsers, ...dbFormatted] });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function updateUserRole(req, res) {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, error: 'Admin access required.' });
  }
  try {
    const { userId } = req.params;
    const { role } = req.body;
    if (!role || !['Admin', 'Member', 'Viewer'].includes(role)) {
      return res.status(400).json({ success: false, error: 'role must be Admin, Member, or Viewer.' });
    }
    const updated = await AccessRequest.findByIdAndUpdate(userId, { $set: { role } }, { new: true }).lean();
    if (!updated) return res.status(404).json({ success: false, error: 'User not found.' });
    await logAudit(req, 'member.role_changed', updated.email, updated.name, { newRole: role });
    res.json({ success: true, user: { id: updated._id.toString(), email: updated.email, name: updated.name, role } });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function removeUser(req, res) {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, error: 'Admin access required.' });
  }
  try {
    const { userId } = req.params;
    const user = await AccessRequest.findByIdAndDelete(userId).lean();
    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });
    await new RemovedMember({ email: user.email, name: user.name, removedBy: req.user.email }).save().catch(() => {});
    await logAudit(req, 'member.removed', user.email, user.name, {});
    const io = req.app.get('io');
    if (io) io.emit('member_removed', { email: user.email });
    res.json({ success: true, removed: user.email });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

module.exports = { setPassword, generatePassword, sendInvite, broadcastEmail, migrateEncrypt, getAuditLog, validateInvite, acceptInvite, emailDiagnostics, testEmail, getUsers, updateUserRole, removeUser };
