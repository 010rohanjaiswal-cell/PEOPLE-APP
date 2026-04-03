/**
 * Clear legacy freelancerPickupBlockedUntil by phone (field is no longer enforced by the API).
 *
 * Usage (from repo root):
 *   MONGODB_URI="..." node backend/scripts/clear-freelancer-pickup-block-by-phone.js 7021098460
 *
 * Does not print the URI.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/database');
const User = require('../models/User');

function normalizePhone(input) {
  const digits = String(input || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (String(input || '').startsWith('+') && digits.length >= 10) return `+${digits}`;
  return String(input || '').trim();
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error(
      'Phone number is required.\nExample: node backend/scripts/clear-freelancer-pickup-block-by-phone.js 7021098460'
    );
    process.exit(1);
  }

  const phone = normalizePhone(arg);

  await connectDB();

  const user = await User.findOne({ phone }).select('_id phone role freelancerPickupBlockedUntil').lean();
  if (!user) {
    console.log(`No user found for phone ${phone}.`);
    await disconnectDB();
    return;
  }

  if (user.role !== 'freelancer') {
    console.log(`User ${phone} is not a freelancer (role=${user.role}). Nothing cleared.`);
    await disconnectDB();
    return;
  }

  const res = await User.updateOne({ _id: user._id }, { $unset: { freelancerPickupBlockedUntil: 1 } });
  console.log(
    `Cleared freelancerPickupBlockedUntil for ${phone} (userId=${user._id}). modifiedCount=${res.modifiedCount}`
  );

  await disconnectDB();
}

main().catch(async (e) => {
  console.error('Failed to clear pickup block:', e?.message || e);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
