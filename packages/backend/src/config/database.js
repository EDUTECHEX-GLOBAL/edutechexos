const mongoose = require('mongoose');

let connected = false;
let connectionPromise = null;
let lastError = null;
let retryTimer = null;

function connectDatabase() {
  if (connected) return Promise.resolve();
  if (connectionPromise) return connectionPromise;

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.warn('WARNING: MONGODB_URI environment variable is missing. DB routes will fail.');
    return Promise.resolve();
  }

  connectionPromise = mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
  })
    .then(() => {
      connected = true;
      lastError = null;
      console.log('Successfully connected to MongoDB Atlas');

      mongoose.connection.on('disconnected', () => {
        connected = false;
        connectionPromise = null;
        console.warn('[DB] MongoDB disconnected — will retry in 30s');
        if (!retryTimer) {
          retryTimer = setTimeout(() => {
            retryTimer = null;
            connectDatabase();
          }, 30000);
        }
      });

      dropTtlIndexes();
    })
    .catch((err) => {
      lastError = err.message;
      console.error('Failed to connect to MongoDB Atlas:', err.message);
      connectionPromise = null;
      if (!retryTimer) {
        retryTimer = setTimeout(() => {
          retryTimer = null;
          console.log('[DB] Retrying MongoDB connection…');
          connectDatabase();
        }, 30000);
      }
    });

  return connectionPromise;
}

function getConnectionStatus() {
  return {
    connected,
    readyState: mongoose.connection.readyState,
    lastError,
  };
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

module.exports = { connectDatabase, isConnected, getConnectionStatus };
