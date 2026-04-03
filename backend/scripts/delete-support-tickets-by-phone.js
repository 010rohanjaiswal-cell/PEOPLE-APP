/**
 * Delete support tickets by phone
 *
 * Usage:
 *   MONGODB_URI="..." node scripts/delete-support-tickets-by-phone.js 7021098460
 *
 * Notes:
 * - Deletes ALL support tickets (open + completed) for the given phone.
 * - Does NOT print the MongoDB URI.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/database');
const User = require('../models/User');
const SupportTicket = require('../models/SupportTicket');

function normalizePhone(input) {
  const digits = String(input || '').replace(/\D/g, '');
  // allow +91 prefixed numbers too
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (String(input || '').startsWith('+') && digits.length >= 10) return `+${digits}`;
  return String(input || '').trim();
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Phone number is required.\nExample: node scripts/delete-support-tickets-by-phone.js 7021098460');
    process.exit(1);
  }

  const phone = normalizePhone(arg);

  await connectDB();

  const user = await User.findOne({ phone }).select('_id phone role').lean();
  if (!user) {
    console.log(`No user found for phone ${phone}. Nothing deleted.`);
    await disconnectDB();
    return;
  }

  const result = await SupportTicket.deleteMany({ user: user._id });
  console.log(`Deleted ${result.deletedCount || 0} support ticket(s) for ${phone} (userId=${user._id}).`);

  await disconnectDB();
}

main().catch(async (e) => {
  console.error('Failed to delete support tickets:', e?.message || e);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});

