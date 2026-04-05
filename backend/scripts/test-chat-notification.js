#!/usr/bin/env node
/**
 * Verify chat notification module + optional DB + HTTP smoke test.
 *
 * From backend/ directory:
 *   node scripts/test-chat-notification.js
 *   node scripts/test-chat-notification.js --http
 *
 * Env (.env or shell):
 *   MONGODB_URI          — required for --db (default: runs module check only if omitted with --module-only)
 *   TEST_RECIPIENT_ID    — Mongo user id who should receive the notification
 *   TEST_SENDER_ID       — sender ObjectId string (defaults to a placeholder; use real user id)
 *   API_BASE_URL         — for --http (e.g. https://your-api.onrender.com)
 *   CHAT_TEST_JWT        — Bearer token for POST /api/chat/send (sender user)
 */

require('dotenv').config();

async function testModuleExport() {
  const cm = require('../services/chatMessageNotifications');
  const t = typeof cm.notifyChatMessage;
  console.log('[module] notifyChatMessage typeof:', t);
  if (t !== 'function') {
    throw new Error('notifyChatMessage is not a function — check circular requires / deploy');
  }
}

async function testDbCreate() {
  const { connectDB } = require('../config/database');
  const recipient = process.env.TEST_RECIPIENT_ID;
  const sender = process.env.TEST_SENDER_ID;
  if (!recipient || !sender) {
    console.log('[db] skip: set TEST_RECIPIENT_ID and TEST_SENDER_ID');
    return;
  }
  await connectDB();
  // Notification.populate('user') needs User model registered (normally loaded via server routes)
  require('../models/User');
  const { notifyChatMessage } = require('../services/chatMessageNotifications');
  const doc = await notifyChatMessage(recipient, 'CLI test', 'Hello from notification script', sender);
  console.log('[db] notification created:', doc?._id ? String(doc._id) : doc);
}

async function testHttpSend() {
  const base = (process.env.API_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');
  const token = process.env.CHAT_TEST_JWT;
  const recipientId = process.env.TEST_RECIPIENT_ID;
  if (!token || !recipientId) {
    console.log('[http] skip: set CHAT_TEST_JWT and TEST_RECIPIENT_ID');
    return;
  }
  const axios = require('axios');
  const res = await axios.post(
    `${base}/api/chat/send`,
    { recipientId, message: 'HTTP smoke test' },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      validateStatus: () => true,
    }
  );
  console.log('[http] POST /api/chat/send status:', res.status, res.data?.success ? 'success' : res.data);
}

async function main() {
  const moduleOnly = process.argv.includes('--module-only');
  const http = process.argv.includes('--http');

  await testModuleExport();
  if (moduleOnly) {
    console.log('[ok] module-only check passed');
    return;
  }

  await testDbCreate();
  if (http) {
    await testHttpSend();
  }
  console.log('[ok] done');
}

main().catch((err) => {
  console.error('[fail]', err.message || err);
  process.exit(1);
});
