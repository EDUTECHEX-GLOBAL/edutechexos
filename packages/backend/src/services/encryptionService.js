const crypto = require('crypto');

function _encKey() {
  const hex = process.env.ENCRYPTION_KEY || '';
  if (hex.length !== 64) return null;
  try {
    const buf = Buffer.from(hex, 'hex');
    return buf.length === 32 ? buf : null;
  } catch { return null; }
}

function encryptField(text) {
  const key = _encKey();
  if (!key || !text || typeof text !== 'string') return text;
  const iv     = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc    = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag    = cipher.getAuthTag();
  return `enc:${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

function decryptField(val) {
  if (!val || typeof val !== 'string' || !val.startsWith('enc:')) return val;
  try {
    const key = _encKey();
    if (!key) return val;
    const parts = val.split(':');
    const iv  = Buffer.from(parts[1], 'hex');
    const tag = Buffer.from(parts[2], 'hex');
    const enc = Buffer.from(parts.slice(3).join(':'), 'hex');
    const dec = crypto.createDecipheriv('aes-256-gcm', key, iv);
    dec.setAuthTag(tag);
    return Buffer.concat([dec.update(enc), dec.final()]).toString('utf8');
  } catch {
    return val;
  }
}

module.exports = { encryptField, decryptField, _encKey };
