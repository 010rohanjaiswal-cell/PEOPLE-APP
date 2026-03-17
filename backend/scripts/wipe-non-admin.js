/**
 * DANGER: Wipe all non-admin data from MongoDB.
 *
 * - Deletes all users where role != 'admin'
 * - Deletes related collections that reference users/jobs/verifications
 *
 * Usage:
 *   WIPE_NON_ADMIN=YES node scripts/wipe-non-admin.js
 *
 * Requires:
 *   MONGODB_URI set in environment
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

async function main() {
  if (process.env.WIPE_NON_ADMIN !== 'YES') {
    console.error('Refusing to run. Set WIPE_NON_ADMIN=YES to proceed.');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(uri, { autoIndex: false });

  const adminCount = await User.countDocuments({ role: 'admin' });
  const nonAdminUsers = await User.find({ role: { $ne: 'admin' } }).select('_id role phone').lean();
  const nonAdminIds = nonAdminUsers.map((u) => u._id);

  console.log(`Admins to keep: ${adminCount}`);
  console.log(`Non-admin users to delete: ${nonAdminIds.length}`);

  // Delete collections that reference users
  const results = {};
  results.pushTokens = await PushToken.deleteMany({ user: { $in: nonAdminIds } });
  results.notifications = await Notification.deleteMany({ user: { $in: nonAdminIds } });
  results.messages = await Message.deleteMany({
    $or: [{ sender: { $in: nonAdminIds } }, { recipient: { $in: nonAdminIds } }],
  });
  results.verifications = await FreelancerVerification.deleteMany({ user: { $in: nonAdminIds } });
  results.commissionTransactions = await CommissionTransaction.deleteMany({ freelancer: { $in: nonAdminIds } });

  // Jobs: delete jobs created by non-admin clients, and jobs assigned to non-admin freelancers.
  // (Most jobs are by clients; admins likely don't create jobs.)
  results.jobs = await Job.deleteMany({
    $or: [{ client: { $in: nonAdminIds } }, { assignedFreelancer: { $in: nonAdminIds } }],
  });

  // Finally delete users
  results.users = await User.deleteMany({ _id: { $in: nonAdminIds } });

  console.log('Delete summary:');
  for (const [k, v] of Object.entries(results)) {
    console.log(`- ${k}: deleted ${v.deletedCount}`);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((e) => {
  console.error('Wipe failed:', e);
  process.exit(1);
});

