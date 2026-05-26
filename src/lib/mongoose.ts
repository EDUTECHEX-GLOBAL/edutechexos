import mongoose from 'mongoose';
import dns from 'dns';

// Set DNS servers to Google's public DNS in development to resolve DNS resolution issues
// common on some local ISP and home networks.
if (process.env.NODE_ENV !== 'production') {
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
  } catch (error) {
    console.warn('Failed to set custom DNS servers, using system defaults:', error);
  }
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    if (process.env.NODE_ENV !== 'production') {
      try {
        dns.setServers(['8.8.8.8', '8.8.4.4']);
      } catch (e) {
        console.error('Failed to set DNS servers inside connectToDatabase:', e);
      }
    }

    cached.promise = mongoose.connect(MONGODB_URI as string, opts).then((mongooseInstance: any) => {
      console.log('Successfully connected to MongoDB Atlas');
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;
