// ── Brevo HTTP API helper ─────────────────────────────────────────────────
// Supports: to (array of {email,name?}), bcc (optional array), subject, html.

async function sendBrevoEmail({ to, bcc, subject, html }) {
  const toList = Array.isArray(to) ? to : [{ email: String(to) }];
  const totalRecipients = toList.length + (Array.isArray(bcc) ? bcc.length : 0);
  console.log(`[Mail] Sending "${subject}" → ${totalRecipients} recipient(s)`);

  // ── Local preview mode ────────────────────────────────────────────────
  if (process.env.MAIL_PREVIEW === 'true') {
    const fs = require('fs');
    const path = require('path');
    const dir = path.join(__dirname, '..', '..', 'mail-preview');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const slug = subject.replace(/[^a-z0-9]/gi, '_').slice(0, 40);
    const filename = `${Date.now()}-${slug}.html`;
    const preview = `<h2 style="color:#6366f1">📧 ${subject}</h2>
<p><strong>To:</strong> ${toList.map(r => `${r.name||r.email} <${r.email}>`).join(', ')}${bcc ? `<br><strong>BCC:</strong> ${Array.isArray(bcc) ? bcc.map(r => typeof r === 'string' ? r : (r.name||r.email)+' <'+r.email+'>').join(', ') : ''}` : ''}</p>
<hr>${html}`;
    fs.writeFileSync(path.join(dir, filename), preview);
    console.log(`[Mail] PREVIEW → mail-preview/${filename}`);
    return { ok: true };
  }

  if (!process.env.BREVO_API_KEY) {
    console.error('[Mail] BREVO_API_KEY not set');
    return { ok: false, brevoError: 'NOT_CONFIGURED' };
  }

  try {
    const fromConfig = process.env.SMTP_FROM || 'EduTechExOS <edutechexos121@gmail.com>';
    let senderEmail = 'edutechexos121@gmail.com';
    let senderName = 'EduTechExOS';
    const match = fromConfig.match(/(.*)<(.*)>/);
    if (match) {
      senderName = match[1].trim();
      senderEmail = match[2].trim();
    } else if (fromConfig.includes('@')) {
      senderEmail = fromConfig.trim();
    }

    const toName = (n, e) => (n && n.trim() ? n.trim() : (e ? e.split('@')[0] : 'Member'));

    const payload = {
      sender: { name: senderName, email: senderEmail },
      to: toList.map(r => ({ email: r.email, name: toName(r.name, r.email) })),
      subject: subject,
      htmlContent: html
    };

    if (Array.isArray(bcc) && bcc.length > 0) {
      payload.bcc = bcc.map(r => {
        const e = typeof r === 'string' ? r : r.email;
        const n = typeof r === 'string' ? '' : r.name;
        return { email: e, name: toName(n, e) };
      });
    }

    const postData = JSON.stringify(payload);
    const https = require('https');

    const apiResult = await new Promise((resolve, reject) => {
      const req = https.request('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': process.env.BREVO_API_KEY,
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(postData)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, body: data });
        });
      });

      req.on('error', err => reject(err));
      req.write(postData);
      req.end();
    });

    if (apiResult.statusCode >= 200 && apiResult.statusCode < 300) {
      console.log(`[Mail] OK — delivered to ${totalRecipients} recipient(s)`);
      return { ok: true };
    }

    const errMsg = `${apiResult.statusCode}: ${apiResult.body}`;
    console.error(`[Mail] HTTP API returned ${errMsg}`);
    return { ok: false, brevoError: errMsg };
  } catch (err) {
    console.error('[Mail] HTTP API call failed:', err.message);
    return { ok: false, brevoError: err.message };
  }
}

async function sendResetEmail(toEmail, toName, code) {
  const html = `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:32px;">
      <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#4f46e5,#3b82f6);color:#fff;padding:24px 28px;">
          <h1 style="margin:0;font-size:22px;">EduTechEx<span style="color:#93c5fd;">OS</span></h1>
          <p style="margin:6px 0 0;color:#e0e7ff;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Password Reset</p>
        </div>
        <div style="padding:28px;">
          <p style="margin:0 0 16px;color:#334155;font-size:15px;">Hello ${toName},</p>
          <p style="margin:0 0 20px;color:#334155;font-size:15px;">Use the code below to reset your password — it expires in <strong>15 minutes</strong>.</p>
          <div style="letter-spacing:8px;font-size:32px;font-weight:800;color:#4f46e5;background:#eef2ff;border-radius:14px;padding:18px;text-align:center;margin-bottom:24px;">${code}</div>
          <p style="margin:0;color:#64748b;font-size:13px;">If you didn't request this, ignore this email.</p>
        </div>
        <div style="background:#f8fafc;padding:16px 28px;border-top:1px solid #f1f5f9;text-align:center;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">&copy; 2026 EduTechExOS</div>
      </div>
    </div>`;

  const { ok } = await sendBrevoEmail({ to: [{ email: toEmail, name: toName }], subject: `EduTechExOS: Password reset code ${code}`, html });
  return { ok };
}

module.exports = { sendBrevoEmail, sendResetEmail };
