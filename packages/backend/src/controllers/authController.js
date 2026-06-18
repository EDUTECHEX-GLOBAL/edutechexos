const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { JWT_SECRET, JWT_EXPIRY } = require('../middleware/auth');
const { VALID_ACCOUNTS, revokedEmails } = require('../utils/helpers');
const { AccessRequest, LoginEvent, LoginOtp, ResetCode, RemovedMember } = require('../models/index');
const { sendResetEmail, sendBrevoEmail } = require('../services/emailService');

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'invalid', message: 'Email and password are required.' });
    }
    const emailClean = String(email).trim().toLowerCase();

    const isSystemRemoved = await RemovedMember.exists({ email: emailClean });
    const hardcoded = isSystemRemoved ? null : VALID_ACCOUNTS.find((a) => {
      if (a.email !== emailClean || !a.password) return false;
      try {
        const b1 = Buffer.from(String(password));
        const b2 = Buffer.from(a.password);
        return b1.length === b2.length && crypto.timingSafeEqual(b1, b2);
      } catch { return false; }
    });
    if (hardcoded) {
      const token = jwt.sign(
        { email: hardcoded.email, name: hardcoded.name, role: hardcoded.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );
      try {
        const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        await LoginEvent.findOneAndUpdate(
          { email: emailClean, dateStr },
          { $set: { name: hardcoded.name, loginAt: new Date() } },
          { upsert: true }
        );
        const io = req.app.get('io');
        if (io) io.emit('login_status_updated', { email: emailClean, dateStr, loggedIn: true });
      } catch (_) {}
      const { password: _pw, ...safeUser } = hardcoded;
      return res.json({ success: true, user: safeUser, token });
    }

    const request = await AccessRequest.findOne({ email: emailClean }).lean();

    if (!request) {
      return res.status(401).json({ success: false, error: 'invalid', message: 'Invalid credentials. Use an approved user account.' });
    }
    const bcryptMatch = await bcrypt.compare(password, request.password).catch(() => false);
    const plainMatch  = !bcryptMatch && request.password === password;
    if (!bcryptMatch && !plainMatch) {
      return res.status(401).json({ success: false, error: 'invalid', message: 'Invalid credentials. Use an approved user account.' });
    }
    if (plainMatch) {
      bcrypt.hash(password, 10).then((h) =>
        AccessRequest.findOneAndUpdate({ email: emailClean }, { $set: { password: h } })
      ).catch(() => {});
    }
    if (request.status === 'rejected') {
      return res.status(401).json({ success: false, error: 'rejected', message: 'Your access request was declined. Contact admin.' });
    }

    if (request.status === 'pending') {
      const token = jwt.sign(
        { email: request.email, name: request.name, role: request.role, status: 'pending' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );
      return res.json({
        success: true,
        user: { email: request.email, name: request.name, role: request.role, status: 'pending' },
        token,
      });
    }

    const token = jwt.sign(
      { email: request.email, name: request.name, role: request.role, status: 'approved' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    try {
      const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      await LoginEvent.findOneAndUpdate(
        { email: emailClean, dateStr },
        { $set: { name: request.name, loginAt: new Date() } },
        { upsert: true }
      );
      const io = req.app.get('io');
      if (io) io.emit('login_status_updated', { email: emailClean, dateStr, loggedIn: true });
    } catch (_) {}

    return res.json({
      success: true,
      user: { email: request.email, name: request.name, role: request.role, status: 'approved' },
      token,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email is required.' });
    const emailClean = String(email).trim().toLowerCase();

    if (VALID_ACCOUNTS.some((a) => a.email === emailClean)) {
      return res.status(400).json({
        success: false,
        error: 'System accounts cannot reset their password via this form. Contact admin directly.',
      });
    }

    const GENERIC_OK = 'If this email is registered, a reset code has been sent.';
    const request = await AccessRequest.findOne({ email: emailClean }).lean();
    if (!request) return res.json({ success: true, message: GENERIC_OK });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await ResetCode.deleteMany({ email: emailClean });
    await new ResetCode({ email: emailClean, code, expiresAt }).save();

    await sendResetEmail(emailClean, request.name, code);

    res.json({ success: true, message: GENERIC_OK });
  } catch (err) {
    console.error('[forgot-password]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function resetPassword(req, res) {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ success: false, error: 'Email, code, and new password are required.' });
    }
    const emailClean = String(email).trim().toLowerCase();

    const resetCode = await ResetCode.findOne({ email: emailClean, code: String(code), used: false }).lean();
    if (!resetCode) {
      return res.status(400).json({ success: false, error: 'Invalid or expired reset code.' });
    }
    if (new Date(resetCode.expiresAt) < new Date()) {
      await ResetCode.findByIdAndDelete(resetCode._id);
      return res.status(400).json({ success: false, error: 'Reset code has expired. Please request a new one.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
    }

    await AccessRequest.findOneAndUpdate({ email: emailClean }, { $set: { password: await bcrypt.hash(newPassword, 10) } });
    await ResetCode.findByIdAndUpdate(resetCode._id, { $set: { used: true } });

    res.json({ success: true, message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    console.error('[reset-password]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function changePassword(req, res) {
  try {
    const { email, currentPassword, newPassword } = req.body;
    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Email, current password, and new password are required.' });
    }
    const emailClean = String(email).trim().toLowerCase();

    if (VALID_ACCOUNTS.some((a) => a.email === emailClean)) {
      return res.status(400).json({
        success: false,
        error: 'System accounts cannot change their password here. Ask the admin to update it directly.',
      });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({ success: false, error: 'New password must be at least 8 characters.' });
    }

    const request = await AccessRequest.findOne({ email: emailClean }).lean();
    if (!request) {
      return res.status(404).json({ success: false, error: 'Account not found.' });
    }
    const passwordMatch = await bcrypt.compare(currentPassword, request.password)
      .catch(() => false);
    const legacyMatch = !passwordMatch && request.password === currentPassword;
    if (!passwordMatch && !legacyMatch) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect.' });
    }

    await AccessRequest.findOneAndUpdate({ email: emailClean }, { $set: { password: await bcrypt.hash(newPassword, 10) } });
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    console.error('[change-password]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
}

module.exports = { login, forgotPassword, resetPassword, changePassword };
