// ── "Sign in with Google" — login only, no new accounts ────────────────────
// Google Sign-In here is purely an alternate way to prove "this is really
// you" for an email that ALREADY has an approved account (hardcoded
// VALID_ACCOUNTS or an approved AccessRequest). It never creates a new
// account — same authorization model as password login, just a different
// way to verify identity.

const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRY } = require('../middleware/auth');
const { VALID_ACCOUNTS } = require('../utils/helpers');
const { AccessRequest, LoginEvent } = require('../models/index');

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

function isConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_LOGIN_REDIRECT_URI);
}

async function getGoogleLoginUrl(req, res) {
  if (!isConfigured()) {
    return res.status(503).json({ success: false, error: 'Google Sign-In is not configured on this server yet.' });
  }
  const mode = req.query.mode === 'admin' ? 'admin' : 'user';
  const state = jwt.sign({ mode, purpose: 'google-login' }, JWT_SECRET, { expiresIn: '10m' });
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_LOGIN_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  res.json({ success: true, url: `${GOOGLE_AUTH_URL}?${params.toString()}` });
}

async function googleLoginCallback(req, res) {
  const appUrl = process.env.APP_URL || 'https://edutechexos.vercel.app';
  const redirectBase = `${appUrl}/sign-up-login-screen`;
  try {
    const { code, state, error } = req.query;
    if (error || !code || !state) return res.redirect(`${redirectBase}?googleAuth=error`);

    let mode = 'user';
    try {
      const decodedState = jwt.verify(state, JWT_SECRET);
      if (decodedState.purpose !== 'google-login') throw new Error('bad state');
      mode = decodedState.mode === 'admin' ? 'admin' : 'user';
    } catch {
      return res.redirect(`${redirectBase}?googleAuth=error`);
    }

    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_LOGIN_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) return res.redirect(`${redirectBase}?googleAuth=error`);

    const userRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!userRes.ok) return res.redirect(`${redirectBase}?googleAuth=error`);
    const googleUser = await userRes.json();
    const emailClean = String(googleUser.email || '').trim().toLowerCase();
    if (!emailClean || !googleUser.verified_email) {
      return res.redirect(`${redirectBase}?googleAuth=error`);
    }

    // Same authorization lookup as password login — hardcoded accounts first.
    const hardcoded = VALID_ACCOUNTS.find((a) => a.email === emailClean);
    let user = null;
    if (hardcoded) {
      if (mode === 'user' && hardcoded.role === 'Admin') return res.redirect(`${redirectBase}?googleAuth=wrong-portal`);
      if (mode === 'admin' && hardcoded.role !== 'Admin') return res.redirect(`${redirectBase}?googleAuth=wrong-portal`);
      user = { email: hardcoded.email, name: hardcoded.name, role: hardcoded.role };
    } else {
      const request = await AccessRequest.findOne({ email: emailClean }).lean();
      if (!request || request.status === 'rejected') {
        return res.redirect(`${redirectBase}?googleAuth=not-registered`);
      }
      if (mode === 'user' && request.role === 'Admin') return res.redirect(`${redirectBase}?googleAuth=wrong-portal`);
      if (mode === 'admin' && request.role !== 'Admin') return res.redirect(`${redirectBase}?googleAuth=wrong-portal`);
      user = { email: request.email, name: request.name, role: request.role, status: request.status };
    }

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRY });

    try {
      const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      await LoginEvent.findOneAndUpdate(
        { email: emailClean, dateStr },
        { $set: { name: user.name, loginAt: new Date(), authMethod: 'google' } },
        { upsert: true }
      );
    } catch (_) { /* non-fatal */ }

    // Hand the token to the frontend via a one-time redirect fragment (not a
    // query param, so it never lands in server logs / browser history search).
    res.redirect(`${redirectBase}#googleToken=${encodeURIComponent(token)}&user=${encodeURIComponent(JSON.stringify(user))}`);
  } catch (err) {
    console.error('[google-login] callback failed:', err);
    res.redirect(`${redirectBase}?googleAuth=error`);
  }
}

module.exports = { getGoogleLoginUrl, googleLoginCallback, isConfigured };
