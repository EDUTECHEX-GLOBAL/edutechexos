const fs = require('fs');
const path = require('path');
const https = require('https');
const nodemailer = require('nodemailer');

const envPath = path.join(__dirname, '.env');
console.log('Loading env from:', envPath);

let BREVO_API_KEY = '';
let SMTP_USER = '';
let SMTP_PASS = '';
let SMTP_FROM = '';

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      if (key === 'BREVO_API_KEY') BREVO_API_KEY = val;
      else if (key === 'SMTP_USER') SMTP_USER = val;
      else if (key === 'SMTP_PASS') SMTP_PASS = val;
      else if (key === 'SMTP_FROM') SMTP_FROM = val;
    }
  }
} else {
  console.error('.env file not found!');
}

console.log('BREVO_API_KEY:', BREVO_API_KEY ? 'Set' : 'NOT Set');
console.log('SMTP_USER:', SMTP_USER);
console.log('SMTP_PASS:', SMTP_PASS ? 'Set' : 'NOT Set');
console.log('SMTP_FROM:', SMTP_FROM);

async function testHttp() {
  if (!BREVO_API_KEY) {
    console.log('--- HTTP API test skipped (no key) ---');
    return;
  }
  console.log('\n--- Testing HTTP API ---');

  const payload = {
    sender: { name: 'EduTechExOS Test', email: 'edutechexos121@gmail.com' },
    to: [{ email: 'edutechexos121@gmail.com', name: 'Test User' }],
    subject: 'Test email from Antigravity (HTTP)',
    htmlContent: '<h1>Test Email</h1><p>Sent via Brevo HTTP API</p>'
  };

  const postData = JSON.stringify(payload);

  try {
    const res = await new Promise((resolve, reject) => {
      const req = https.request('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': BREVO_API_KEY,
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
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    console.log('HTTP Status:', res.statusCode);
    console.log('HTTP Body:', res.body);
  } catch (err) {
    console.error('HTTP Error:', err.message);
  }
}

async function testSmtp() {
  if (!SMTP_USER || !SMTP_PASS) {
    console.log('--- SMTP test skipped (no credentials) ---');
    return;
  }
  console.log('\n--- Testing SMTP ---');

  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: SMTP_FROM || 'EduTechExOS <edutechexos121@gmail.com>',
      to: 'edutechexos121@gmail.com',
      subject: 'Test email from Antigravity (SMTP)',
      html: '<h1>Test Email</h1><p>Sent via Brevo SMTP</p>'
    });
    console.log('SMTP OK!');
  } catch (err) {
    console.error('SMTP Error:', err.message);
  }
}

async function run() {
  await testHttp();
  await testSmtp();
}

run();
