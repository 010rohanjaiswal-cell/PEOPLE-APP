/**
 * Notify freelancers when new jobs match their category preference (every 3 posts).
 * Only applies when freelancer has no active assigned job.
 */

const User = require('../models/User');
const Job = require('../models/Job');
const { getParentCategory, jobMatchesPreference } = require('../utils/jobCategories');
const { notifyPreferredCategoryJobs } = require('./notificationService');

const BATCH_SIZE = 3;

async function freelancerHasActiveJob(freelancerId) {
  const active = await Job.findOne({
    assignedFreelancer: freelancerId,
    status: { $ne: 'cancelled' },
    freelancerCompleted: { $ne: true },
  })
    .select('_id')
    .lean();
  return Boolean(active);
}

async function onJobPosted(job) {
  try {
    const parentCategory = getParentCategory(job?.category);
    if (!parentCategory) return;

    const freelancers = await User.find({
      role: 'freelancer',
      jobCategoryPreference: { $ne: null },
      verificationStatus: 'approved',
    })
      .select('_id jobPreferencePostedCount jobCategoryPreference')
      .lean();

    if (!freelancers.length) return;

    await Promise.all(
      freelancers.map(async (freelancer) => {
        if (!jobMatchesPreference(job?.category, freelancer.jobCategoryPreference)) return;
        const hasActive = await freelancerHasActiveJob(freelancer._id);
        if (hasActive) return;

        const prev = Number(freelancer.jobPreferencePostedCount) || 0;
        const next = prev + 1;
        await User.updateOne({ _id: freelancer._id }, { $set: { jobPreferencePostedCount: next } });
        if (next > 0 && next % BATCH_SIZE === 0) {
          await notifyPreferredCategoryJobs(freelancer._id, freelancer.jobCategoryPreference);
        }
      })
    );
  } catch (err) {
    console.error('jobPreferenceNotifications.onJobPosted error:', err.message);
  }
}

module.exports = {
  onJobPosted,
  BATCH_SIZE,
  freelancerHasActiveJob,
};
