/**
 * Auto pick: when enabled, selects best pending applicant by ratingCount (priority), then averageRating.
 * Triggers: (1) ≥10 pending → immediate; (2) ≥5 pending and 30+ minutes since 5th application.
 */

const Job = require('../models/Job');
const User = require('../models/User');
const {
  notifyJobAssigned,
  notifyOfferRejected,
  notifyApplicationRejected,
  notifyAutoPickClient,
} = require('./notificationService');

const AUTO_PICK_MIN = 5;
const AUTO_PICK_INSTANT = 10;
const AUTO_PICK_DELAY_MS = 30 * 60 * 1000;

/** jobId -> NodeJS timer id */
const delayedAutoPickTimers = new Map();

function clearAutoPickTimer(jobId) {
  const key = jobId.toString();
  const tid = delayedAutoPickTimers.get(key);
  if (tid) {
    clearTimeout(tid);
    delayedAutoPickTimers.delete(key);
  }
}

function scheduleDelayedAutoPick(jobId) {
  const key = jobId.toString();
  if (delayedAutoPickTimers.has(key)) return;
  const tid = setTimeout(async () => {
    delayedAutoPickTimers.delete(key);
    try {
      await evaluateAutoPick(jobId);
    } catch (e) {
      console.error('Delayed auto pick failed:', e);
    }
  }, AUTO_PICK_DELAY_MS);
  delayedAutoPickTimers.set(key, tid);
}

/** Sort pending apps: higher ratingCount first, then higher averageRating */
function rankPendingApplications(pending) {
  return [...pending].sort((a, b) => {
    const fa = a.freelancer || {};
    const fb = b.freelancer || {};
    const ca = Number(fa.ratingCount ?? 0);
    const cb = Number(fb.ratingCount ?? 0);
    if (cb !== ca) return cb - ca;
    const ra = Number(fa.averageRating ?? 0);
    const rb = Number(fb.averageRating ?? 0);
    return rb - ra;
  });
}

/**
 * Shared accept logic (manual or auto pick).
 * @param {Object} opts
 * @param {boolean} [opts.isAutoPick]
 */
async function acceptApplicationCore({ jobId, applicationId, clientUserId, isAutoPick = false }) {
  const job = await Job.findOne({
    _id: jobId,
    client: clientUserId,
  }).populate('applications.freelancer', 'fullName profilePhoto phone averageRating ratingCount');

  if (!job) {
    const err = new Error('Job not found');
    err.statusCode = 404;
    throw err;
  }

  if (job.status !== 'open') {
    const err = new Error('Can only accept applications for jobs with status "open"');
    err.statusCode = 400;
    throw err;
  }

  const application = job.applications.id(applicationId);
  if (!application) {
    const err = new Error('Application not found');
    err.statusCode = 404;
    throw err;
  }

  if (application.status !== 'pending') {
    const err = new Error('Application has already been processed');
    err.statusCode = 400;
    throw err;
  }

  application.status = 'accepted';

  const clientDoc = await User.findById(clientUserId).select('fullName').lean();
  const clientName = clientDoc?.fullName || 'The client';
  const appIdStr = applicationId.toString();

  for (const app of job.applications) {
    if (app._id.toString() !== appIdStr && app.status === 'pending') {
      app.status = 'rejected';
      try {
        const fid = app.freelancer._id?.toString() || app.freelancer.toString();
        await notifyApplicationRejected(fid, clientName, job.title, 'other_selected');
      } catch (e) {
        console.error('Notify application not selected:', e);
      }
    }
  }

  if (job.offers && job.offers.length) {
    for (const o of job.offers) {
      if (o.status === 'pending') {
        o.status = 'rejected';
        try {
          const fid = o.freelancer._id?.toString() || o.freelancer.toString();
          await notifyOfferRejected(fid, clientName, job.title);
        } catch (e) {
          console.error('Notify offer rejected:', e);
        }
      }
    }
  }

  const freelancerId =
    application.freelancer._id?.toString() || application.freelancer.toString() || application.freelancer;

  job.assignedFreelancer = freelancerId;
  job.status = 'assigned';

  clearAutoPickTimer(job._id);

  await job.save();

  try {
    await notifyJobAssigned(freelancerId, clientName, job.title);
  } catch (notifError) {
    console.error('Error sending job assignment notification:', notifError);
  }

  if (isAutoPick) {
    const f = application.freelancer;
    const avg = f?.averageRating != null ? Number(f.averageRating).toFixed(1) : '—';
    const cnt = f?.ratingCount != null ? Number(f.ratingCount) : 0;
    const ratingLabel = `${avg} (${cnt})`;
    try {
      await notifyAutoPickClient(
        clientUserId.toString(),
        f?.fullName || 'Freelancer',
        job.title,
        ratingLabel,
        job._id
      );
    } catch (e) {
      console.error('Auto pick client notification:', e);
    }
  }

  return { job };
}

/**
 * Run auto pick rules; picks one applicant if eligible.
 * @returns {{ ran: boolean, reason?: string }}
 */
async function evaluateAutoPick(jobId) {
  const job = await Job.findById(jobId).populate(
    'applications.freelancer',
    'fullName averageRating ratingCount'
  );

  if (!job) return { ran: false, reason: 'no_job' };
  if (job.autoPickEnabled === false) return { ran: false, reason: 'disabled' };
  if (job.status !== 'open' || job.assignedFreelancer) return { ran: false, reason: 'not_open' };

  const pending = (job.applications || []).filter((a) => a.status === 'pending');
  if (pending.length < AUTO_PICK_MIN) return { ran: false, reason: 'below_min' };

  let shouldPick = false;
  if (pending.length >= AUTO_PICK_INSTANT) {
    shouldPick = true;
  } else {
    const sortedByTime = [...pending].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const fifth = sortedByTime[4];
    if (
      fifth &&
      Date.now() - new Date(fifth.createdAt).getTime() >= AUTO_PICK_DELAY_MS
    ) {
      shouldPick = true;
    }
  }

  if (!shouldPick) return { ran: false, reason: 'conditions_not_met' };

  const ranked = rankPendingApplications(pending);
  const best = ranked[0];
  if (!best?._id) return { ran: false, reason: 'no_candidate' };

  const clientId = job.client._id?.toString() || job.client.toString();

  await acceptApplicationCore({
    jobId: job._id,
    applicationId: best._id,
    clientUserId: clientId,
    isAutoPick: true,
  });

  return { ran: true };
}

/**
 * After a new application is saved: maybe schedule 30m timer when count hits 5; maybe instant at 10.
 */
async function afterApplicationSubmitted(jobId) {
  const job = await Job.findById(jobId);
  if (!job || job.autoPickEnabled === false) return;

  const pending = (job.applications || []).filter((a) => a.status === 'pending');
  const n = pending.length;

  if (n >= AUTO_PICK_INSTANT) {
    clearAutoPickTimer(jobId);
    await evaluateAutoPick(jobId);
    return;
  }

  if (n === AUTO_PICK_MIN) {
    scheduleDelayedAutoPick(jobId);
  }
}

module.exports = {
  acceptApplicationCore,
  evaluateAutoPick,
  afterApplicationSubmitted,
  clearAutoPickTimer,
  rankPendingApplications,
};
