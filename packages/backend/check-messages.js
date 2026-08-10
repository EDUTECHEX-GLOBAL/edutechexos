const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://edutechexos121_db_user:Edutechexos_12@cluster0.fh6t6wn.mongodb.net/edutechexos';

async function main() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas\n');

    const db = mongoose.connection.db;

    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('📁 Collections in edutechexos DB:');
    collections.forEach(c => console.log('  -', c.name));
    console.log('');

    // Check messages collection
    const msgCollection = db.collection('messages');
    const totalCount = await msgCollection.countDocuments();
    console.log(`💬 Total messages in DB: ${totalCount}\n`);

    const last5 = await msgCollection.find({}).sort({ _id: -1 }).limit(5).toArray();

    if (last5.length === 0) {
      console.log('⚠️  No messages found yet.');
    } else {
      console.log('=== LAST 5 MESSAGES ===');
      last5.forEach((m, i) => {
        const channel = m.channel || m.channelId || m.room || '?';
        const sender  = m.senderName || m.sender || m.senderEmail || '?';
        const text    = String(m.text || m.content || m.body || '[encrypted/empty]').slice(0, 80);
        const time    = m.timestamp || m.createdAt || m._id.getTimestamp();
        console.log(`[${i + 1}] channel: ${channel}`);
        console.log(`     sender : ${sender}`);
        console.log(`     text   : ${text}`);
        console.log(`     time   : ${time}`);
        console.log('');
      });
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

main();
