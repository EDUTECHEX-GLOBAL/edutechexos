const bcrypt = require('bcrypt');
const { VALID_ACCOUNTS, revokedEmails, getDeterministicColor } = require('../utils/helpers');
const { sendBrevoEmail } = require('../services/emailService');
const { AccessRequest, RemovedMember } = require('../models/index');

async function removeMember(req, res) {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, error: 'Admin access required.' });
  }
  try {
    const { email, memberId } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'email is required.' });

    await RemovedMember.findOneAndUpdate(
      { email: email.toLowerCase() },
      { email: email.toLowerCase(), removedAt: new Date() },
      { upsert: true, new: true }
    );

    revokedEmails.add(email.toLowerCase());

    const io = req.app.get('io');
    if (memberId && io) io.emit('member_removed', { memberId });
    if (io) io.emit('user_forcefully_removed', { email: email.toLowerCase() });

    res.json({ success: true, removedEmail: email });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function restoreMember(req, res) {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, error: 'Admin access required.' });
  }
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'email is required.' });
    await RemovedMember.deleteOne({ email: email.toLowerCase() });
    revokedEmails.delete(email.toLowerCase());
    res.json({ success: true, restoredEmail: email });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function getMembers(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized. Please log in first.' });
    }

    const allHardcoded = [
      { id: 'member-admin', name: 'Admin', email: 'admin@edutechex.in', role: 'Admin', initials: 'AD', status: 'online', color: '#3E4A89' },
    ];

    const removedDocs = await RemovedMember.find({}).lean();
    const removedEmailSet = new Set(removedDocs.map(r => r.email.toLowerCase()));
    const hardcoded = allHardcoded.filter(m => !removedEmailSet.has(m.email.toLowerCase()));

    const approvedRequests = await AccessRequest.find({ status: 'approved' }).lean();

    const dbMembers = approvedRequests.map((r) => {
      const initials = r.name
        .split(' ')
        .map((p) => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      const ids = Array.isArray(r.channelIds)
        ? r.channelIds
        : (r.channelId ? [r.channelId] : []);
      return {
        id: `member-${r._id.toString()}`,
        name: r.name,
        email: r.email,
        role: r.role,
        status: 'online',
        color: getDeterministicColor(r.email),
        initials,
        channelId: r.channelId,
        channelIds: ids,
      };
    });

    const allMembers = [...hardcoded];
    dbMembers.forEach((dbm) => {
      if (!allMembers.some((m) => m.email.toLowerCase() === dbm.email.toLowerCase())) {
        allMembers.push(dbm);
      }
    });

    res.json({ success: true, members: allMembers });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function createMember(req, res) {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Only admins can add members directly.' });
    }

    const { name, email, role, channelId } = req.body;
    const emailClean = String(email).trim().toLowerCase();

    if (VALID_ACCOUNTS.some(a => a.email === emailClean)) {
      return res.status(409).json({ success: false, error: 'This email belongs to a system account.' });
    }

    const existing = await AccessRequest.findOne({ email: emailClean }).lean();
    if (existing) {
      return res.status(409).json({ success: false, error: 'A user request/account with this email already exists.' });
    }

    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let generatedPassword = 'Edx@';
    for (let i = 0; i < 10; i++) generatedPassword += charset[Math.floor(Math.random() * charset.length)];

    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    const request = new AccessRequest({
      name,
      email: emailClean,
      password: hashedPassword,
      role,
      status: 'approved',
      channelId,
    });

    const saved = await request.save();
    const { _id, __v, ...rest } = saved.toObject();

    const credEmail = await sendBrevoEmail({
      to: [{ email: emailClean, name }],
      subject: 'Your EduTechExOS account has been created',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#f8f9ff;border-radius:12px;">
          <h2 style="color:#3E4A89;margin:0 0 16px;">Welcome to EduTechExOS, ${name}!</h2>
          <p style="color:#4A5578;">An admin has created an account for you. Here are your login credentials:</p>
          <div style="background:#fff;border:1px solid #d1d5f0;border-radius:8px;padding:20px;margin:20px 0;">
            <p style="margin:0 0 8px;color:#4A5578;"><strong>Email:</strong> ${emailClean}</p>
            <p style="margin:0;color:#4A5578;"><strong>Password:</strong> <code style="background:#f0f2ff;padding:4px 8px;border-radius:4px;font-size:15px;letter-spacing:1px;">${generatedPassword}</code></p>
          </div>
          <p style="color:#9BA6D3;font-size:13px;">Please change your password after your first login. If you did not expect this email, contact your workspace admin.</p>
        </div>`,
    });
    const emailOk = credEmail && credEmail.ok === true;
    if (!emailOk) console.error('[email] admin-create-member credentials email failed:', credEmail?.brevoError);

    res.json({
      success: true,
      emailSent: emailOk,
      generatedPassword,
      member: {
        id: `member-${_id.toString()}`,
        name: rest.name,
        email: rest.email,
        role: rest.role,
        status: 'online',
        color: '#4f46e5',
        initials: rest.name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2),
        channelId: rest.channelId,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function promoteAdmin(req, res) {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Only admins can promote users.' });
    }

    const HARDCODED_ADMINS = VALID_ACCOUNTS.filter((a) => a.role === 'Admin').length;
    const dbAdmins = await AccessRequest.countDocuments({ status: 'approved', role: 'Admin' });
    const totalAdmins = HARDCODED_ADMINS + dbAdmins;

    if (totalAdmins >= 3) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 3 admins allowed. Remove an existing admin first.',
      });
    }

    const { id } = req.params;
    const updated = await AccessRequest.findByIdAndUpdate(
      id,
      { $set: { role: 'Admin' } },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ success: false, error: 'User not found.' });

    const io = req.app.get('io');
    if (io) io.emit('member_updated', {
      memberId: `member-${id}`,
      email: updated.email,
      role: 'Admin',
      channelId: updated.channelId,
    });

    res.json({ success: true, message: `${updated.name} is now an Admin.` });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function exportMembers(req, res) {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Admin only.' });
    }
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EduTechExOS';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Members');
    sheet.columns = [
      { header: 'Name',        key: 'name',        width: 24 },
      { header: 'Email',       key: 'email',       width: 30 },
      { header: 'Role',        key: 'role',        width: 14 },
      { header: 'Status',      key: 'status',      width: 12 },
      { header: 'Password',    key: 'password',    width: 20 },
      { header: 'Created At',  key: 'createdAt',   width: 22 },
    ];

    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3E4A89' } };
      cell.alignment = { horizontal: 'center' };
    });

    const dbMembers = await AccessRequest.find({ status: 'approved' }).lean();
    dbMembers.forEach((m) => {
      sheet.addRow({
        name:      m.name,
        email:     m.email,
        role:      m.role,
        status:    'approved',
        password:  '(hidden)',
        createdAt: m.requestedAt ? new Date(m.requestedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
      });
    });

    sheet.eachRow((row, i) => {
      if (i > 1) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFF0F2FF' : 'FFFFFFFF' } };
        });
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="edutechexos-members-${new Date().toISOString().slice(0,10)}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

module.exports = { removeMember, restoreMember, getMembers, createMember, promoteAdmin, exportMembers };
