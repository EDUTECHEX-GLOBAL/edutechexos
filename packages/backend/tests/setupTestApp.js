const crypto = require('crypto');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Set env vars BEFORE requiring any app modules (auth.js calls process.exit if JWT_SECRET missing)
process.env.JWT_SECRET = 'test-jwt-secret-for-e2e-tests';
process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
process.env.MAIL_PREVIEW = 'true';
process.env.INTERNAL_API_SECRET = 'test-internal-secret';
process.env.SYS_PASS_ADMIN = 'AdminPass123';

const express = require('express');
const http = require('http');
const jwt = require('jsonwebtoken');
const routes = require('../src/routes/index');
const { errorHandler } = require('../src/middleware/errorHandler');
const { authLimiter, apiLimiter, globalLimiter } = require('../src/config/rateLimiter');

let mongod;

async function createTestApp() {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  const uri = mongod.getUri();

  await mongoose.connect(uri);

  const app = express();
  app.use(express.json());

  // Mock socket.io
  const mockIo = {
    emit: jest.fn(),
    to: jest.fn().mockReturnThis(),
  };
  app.set('io', mockIo);

  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use(routes);
  app.use(errorHandler);

  return { app, io: mockIo };
}

async function teardownTestApp() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

async function clearDatabase() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  authLimiter.resetAll();
  apiLimiter.resetAll();
  globalLimiter.resetAll();
}

function generateToken(payload, expiresIn = '7d') {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

function adminToken() {
  return generateToken({ email: 'admin@edutechex.in', name: 'Admin', role: 'Admin' });
}

function memberToken(email = 'testuser@example.com', name = 'Test User') {
  return generateToken({ email, name, role: 'Member', status: 'approved' });
}

function pendingToken(email = 'pending@example.com', name = 'Pending User') {
  return generateToken({ email, name, role: 'Member', status: 'pending' });
}

module.exports = {
  createTestApp,
  teardownTestApp,
  clearDatabase,
  generateToken,
  adminToken,
  memberToken,
  pendingToken,
};
