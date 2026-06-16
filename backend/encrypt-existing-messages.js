/**
 * encrypt-existing-messages.js
 * One-time migration: encrypts all plain-text messages in MongoDB.
 *
 * Run from the backend folder:
 *   node encrypt-existing-messages.js
 *
 * Safe to run multiple times — already-encrypted messages are skipped.
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const crypto   = require('crypto');

// ── Same AES-256-GCM helpers as server.js ────────────────────────────────────
function _encKey() {
  const hex = process.env.ENCRYPTION_KEY || '';
  if (hex.length !== 64) {
    console.error(`❌  ENCRYPTION_KEY must be 64 hex chars. Got length: ${hex.length}`);
    process.exit(1);
  }
  return Buffer.from(hex, 'hex');
}

function encryptField(text) {
  const key    = _encKey();
  const iv     = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc    = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag    = cipher.getAuthTag();
  return `enc:${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

// ── Minimal schema ────────────────────────────────────────────────────────────
const MessageSchema = new mongoose.Schema({ text: String }, { strict: false });
const Message = mongoose.model('Message', MessageSchema);

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log('\n🔐  EduTechExOS — Message Encryption Migration\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅  Connected to MongoDB\n');

  // Only fetch messages that are NOT yet encrypted
  const total = await Message.countDocuments({ text: { $exists: true, $not: /^enc:/ } });
  console.log(`📦  Found ${total} plain-text message(s) to encrypt.\n`);

  if (total === 0) {
    console.log('🎉  All messages are already encrypted. Nothing to do.\n');
    await mongoose.disconnect();
    process.exit(0);
  }

  const BATCH = 100;
  let processed = 0;
  let failed    = 0;

  // Process in batches to avoid memory issues on large collections
  let skip = 0;
  while (true) {
    const batch = await Message.find(
      { text: { $exists: true, $not: /^enc:/ } },
      { _id: 1, text: 1 }
    ).limit(BATCH).skip(skip).lean();

    if (batch.length === 0) break;

    const ops = batch
      .filter(m => m.text && typeof m.text === 'string')
      .map(m => ({
        updateOne: {
          filter: { _id: m._id },
          update: { $set: { text: encryptField(m.text) } },
        },
      }));

    if (ops.length > 0) {
      try {
        await Message.bulkWrite(ops, { ordered: false });
        processed += ops.length;
        process.stdout.write(`\r⏳  Encrypted ${processed}/${total} messages...`);
      } catch (err) {
        failed += ops.length;
        console.error('\n❌  Batch error:', err.message);
      }
    }

    skip += BATCH;
  }

  console.log(`\n\n✅  Done!\n`);
  console.log(`   Encrypted : ${processed}`);
  console.log(`   Failed    : ${failed}`);
  console.log(`   Skipped   : ${total - processed - failed} (had no text field)\n`);

  // Verify — show last 3 messages raw
  console.log('📋  Sample of last 3 messages (raw from DB):\n');
  const sample = await Message.find({}).sort({ timestamp: -1 }).limit(3).lean();
  sample.forEach((m, i) => {
    const isEnc = typeof m.text === 'string' && m.text.startsWith('enc:');
    console.log(`   [${i + 1}] ${isEnc ? '🔒 ENCRYPTED' : '⚠️  PLAIN TEXT'} — ${String(m.text).slice(0, 60)}`);
  });

  console.log('\n');
  await mongoose.disconnect();
  process.exit(0);
})().catch(err => {
  console.error('\n❌  Fatal error:', err);
  process.exit(1);
});
