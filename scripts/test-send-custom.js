const fs = require('fs');
const path = require('path');
const dns = require('dns');

// Override DNS to bypass local lookup issues
try { dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']); } catch (_) {}

const nodemailer = require('nodemailer');

const envPath = path.join(__dirname, '..', 'packages', 'backend', '.env');
console.log('Loading env from:', envPath);

let SMTP_USER = '';
let SMTP_PASS = '';

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      if (key === 'SMTP_USER') SMTP_USER = val;
      else if (key === 'SMTP_PASS') SMTP_PASS = val;
    }
  }
}

const args = process.argv.slice(2);
const toEmail = args[0] || 'edutechexos121@gmail.com';
const fromEmail = args[1] || 'ac2bb9001@smtp-brevo.com';

console.log(`Sending from "${fromEmail}" to "${toEmail}" using SMTP...`);

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

async function run() {
  try {
    await transporter.sendMail({
      from: `EduTechExOS <${fromEmail}>`,
      to: toEmail,
      subject: `EduTechExOS Sender Verification Test: ${fromEmail}`,
      html: `<h1>Test Email</h1><p>This email was sent from <b>${fromEmail}</b> to <b>${toEmail}</b> to verify if it is received.</p>`
    });
    console.log('Sent successfully!');
  } catch (err) {
    console.error('Send failed:', err.message);
  }
}

run();
