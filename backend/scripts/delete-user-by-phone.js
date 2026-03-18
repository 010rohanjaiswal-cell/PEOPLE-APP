/**
 * Delete a single user (non-admin) and their related records by phone number.
 *
 * Usage:
 *   node scripts/delete-user-by-phone.js "+917021098460"
 *
 * Requires:
 *   MONGODB_URI set in environment
 *
 * Safety:
 * - Refuses to delete admins
 */

require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../models/User');
const Job = require('../models/Job');
const FreelancerVerification = require('../models/FreelancerVerification');
const CommissionTransaction = require('../models/CommissionTransaction');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const PushToken = require('../models/PushToken');

function normalizePhone(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  if (raw.startsWith('+')) return raw;
  // Allow "91xxxxxxxxxx" or "xxxxxxxxxx" inputs
  return `+${raw}`;
}

async function main() {
  const phoneArg = process.argv[2];
  const phone = normalizePhone(phoneArg);
  if (!phone) {
    console.error('Phone is required. Example: node scripts/delete-user-by-phone.js "+917021098460"');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(uri, { autoIndex: false });

  const user = await User.findOne({ phone }).select('_id role phone').lean();
  if (!user) {
    console.log(`No user found for phone: ${phone}`);
    await mongoose.disconnect();
    return;
  }

  if (user.role === 'admin') {
    console.error(`Refusing to delete admin user: ${phone}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const userId = user._id;
  const results = {};

  results.pushTokens = await PushToken.deleteMany({ user: userId });
  results.notifications = await Notification.deleteMany({ user: userId });
  results.messages = await Message.deleteMany({ $or: [{ sender: userId }, { recipient: userId }] });
  results.verifications = await FreelancerVerification.deleteMany({ user: userId });
  results.commissionTransactions = await CommissionTransaction.deleteMany({ freelancer: userId });
  results.jobs = await Job.deleteMany({ $or: [{ client: userId }, { assignedFreelancer: userId }] });
  results.users = await User.deleteOne({ _id: userId });

  console.log(`Deleted user ${phone} (${String(userId)})`);
  console.log('Delete summary:');
  for (const [k, v] of Object.entries(results)) {
    console.log(`- ${k}: deleted ${v.deletedCount ?? v.deleted ?? 0}`);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((e) => {
  console.error('Delete failed:', e);
  process.exit(1);
});

