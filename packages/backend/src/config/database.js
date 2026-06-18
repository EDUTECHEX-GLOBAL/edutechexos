const mongoose = require('mongoose');

let connected = false;
let connectionPromise = null;

function connectDatabase() {
  if (connected) return Promise.resolve();
  if (connectionPromise) return connectionPromise;

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.warn('WARNING: MONGODB_URI environment variable is missing. DB routes will fail.');
    return Promise.resolve();
  }

  connectionPromise = mongoose.connect(MONGODB_URI)
    .then(() => {
      connected = true;
      console.log('Successfully connected to MongoDB Atlas');
      dropTtlIndexes();
    })
    .catch((err) => {
      console.error('Failed to connect to MongoDB Atlas (non-fatal):', err);
      connectionPromise = null;
    });

  return connectionPromise;
}

async function dropTtlIndexes() {
  try {
    const idxs = await mongoose.connection.collection('accessrequests').indexes();
    for (const idx of idxs) {
      if (idx.expireAfterSeconds !== undefined) {
        await mongoose.connection.collection('accessrequests')
          .dropIndex(idx.name)
          .then(() => console.log('[startup] Removed TTL index on accessrequests:', idx.name))
          .catch((e) => console.warn('[startup] Could not drop TTL index:', e.message));
      }
    }
  } catch (_) {}
}

function isConnected() {
  return connected;
}

module.exports = { connectDatabase, isConnected };
