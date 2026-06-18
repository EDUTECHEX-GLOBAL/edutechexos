/**
 * check-encryption.js
 * Run: node check-encryption.js
 * Shows the last 5 messages as stored RAW in MongoDB (no decryption)
 * so you can verify the text field is encrypted.
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({ text: String, sender: String, channelId: String, timestamp: Date }, { strict: false });
const Message = mongoose.model('Message', MessageSchema);

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const msgs = await Message.find({}).sort({ timestamp: -1 }).limit(5).lean();

  console.log('\n=== Last 5 messages (RAW from MongoDB) ===\n');
  msgs.forEach((m, i) => {
    const isEncrypted = typeof m.text === 'string' && m.text.startsWith('enc:');
    const preview = typeof m.text === 'string' ? m.text.slice(0, 80) : '(no text)';
    console.log(`[${i + 1}] Sender : ${m.sender}`);
    console.log(`    Channel: ${m.channelId}`);
    console.log(`    Status : ${isEncrypted ? '🔒 ENCRYPTED' : '⚠️  PLAIN TEXT (not encrypted yet)'}`);
    console.log(`    Raw    : ${preview}${m.text?.length > 80 ? '…' : ''}`);
    console.log();
  });

  await mongoose.disconnect();
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });
