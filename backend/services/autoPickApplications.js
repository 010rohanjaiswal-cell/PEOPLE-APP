/**
 * Auto pick: when enabled, selects best pending applicant by ratingCount (priority), then averageRating.
 * Triggers:
 * - (1) ≥10 pending → immediate
 * - (2) ≥AUTO_PICK_MIN pending and AUTO_PICK_DELAY_MS since the AUTO_PICK_MIN-th application
 */

const mongoose = require('mongoose');
const Job = require('../models/Job');
const User = require('../models/User');
const {
  notifyJobAssigned,
  notifyOfferRejected,
  notifyApplicationRejected,
  notifyAutoPickClient,
} = require('./notificationService');

// When pending applicants reach this number, we schedule a delayed auto-pick.
// User request: trigger at 1 pending app (instead of waiting for 5).
const AUTO_PICK_MIN = 1;
const AUTO_PICK_INSTANT = 10;
// User request (updated): delay from 1 minute to 20 minutes.
const AUTO_PICK_DELAY_MS = 20 * 60 * 1000;

/** jobId -> NodeJS timer id */
const delayedAutoPickTimers = new Map();

/**
 * Bucket lock can get stale if some legacy/uncovered code-path assigned/unassigned/completed a job
 * without clearing User.activeAssignedJob. Before blocking an accept, try to self-heal:
 * - If lock points to a job that is missing, completed/cancelled, or no longer assigned to this freelancer → clear it.
 * Then retry lock acquisition once.
 */
async function acquireFreelancerBucketLockOrThrow({ freelancerOid, jobId }) {
  const tryLock = async () =>
    User.findOneAndUpdate(
      { _id: freelancerOid, role: 'freelancer', activeAssignedJob: null },
      { $set: { activeAssignedJob: jobId, activeAssignedAt: new Date() } },
      { new: true }
    )
      .select('_id activeAssignedJob')
      .lean();

  const locked = await tryLock();
  if (locked) return;

  const u = await User.findById(freelancerOid).select('activeAssignedJob').lean();
  const lockedJobId = u?.activeAssignedJob;
  if (!lockedJobId) {
    const err = new Error('Freelancer already picked another job');
    err.statusCode = 409;
    err.code = 'FREELANCER_ALREADY_ASSIGNED';
    throw err;
  }

  const lockedJob = await Job.findById(lockedJobId).select('status assignedFreelancer').lean();
  const assignedMatches =
    lockedJob?.assignedFreelancer &&
    String(lockedJob.assignedFreelancer) === String(freelancerOid);

  const isTerminal = lockedJob && (lockedJob.status === 'completed' || lockedJob.status === 'cancelled');
  const isMissing = !lockedJob;
  const isNotActuallyAssigned = !assignedMatches;

  if (isMissing || isTerminal || isNotActuallyAssigned) {
    await User.updateOne(
      { _id: freelancerOid, activeAssignedJob: lockedJobId },
      { $set: { activeAssignedJob: null, activeAssignedAt: null } }
    );

    const relocked = await tryLock();
    if (relocked) return;
  }

  const err = new Error('Freelancer already picked another job');
  err.statusCode = 409;
  err.code = 'FREELANCER_ALREADY_ASSIGNED';
  throw err;
}

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
  let lockedFreelancerOid = null;
  let lockAcquired = false;
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

  const freelancerIdForCheckRaw =
    application.freelancer?._id?.toString() ||
    application.freelancer?.toString?.() ||
    application.freelancer;

  const freelancerObjectIdForCheck = mongoose.Types.ObjectId.isValid(String(freelancerIdForCheckRaw))
    ? new mongoose.Types.ObjectId(String(freelancerIdForCheckRaw))
    : null;

  if (freelancerObjectIdForCheck) {
    lockedFreelancerOid = freelancerObjectIdForCheck;
    await acquireFreelancerBucketLockOrThrow({
      freelancerOid: freelancerObjectIdForCheck,
      jobId: job._id,
    });
    lockAcquired = true;
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
        await notifyApplicationRejected(fid, clientName, job.title, 'other_selected', job._id);
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
          await notifyOfferRejected(fid, clientName, job.title, job._id);
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

  try {
    await job.save();
  } catch (e) {
    // If we already acquired lock but job save fails, release lock to avoid stuck freelancers.
    if (lockAcquired && lockedFreelancerOid) {
      try {
        await User.updateOne(
          { _id: lockedFreelancerOid, activeAssignedJob: job._id },
          { $set: { activeAssignedJob: null, activeAssignedAt: null } }
        );
      } catch (unlockErr) {
        console.error('Failed to release activeAssignedJob after job save failure:', unlockErr);
      }
    }
    throw e;
  }

  // If this freelancer applied to other open jobs, mark those pending applications as rejected
  // so other clients won't see them in the Applications list anymore.
  const freelancerObjectId =
    mongoose.Types.ObjectId.isValid(String(freelancerId)) ? new mongoose.Types.ObjectId(String(freelancerId)) : null;

  if (freelancerObjectId) {
    try {
      await Job.updateMany(
        {
          _id: { $ne: job._id },
          status: 'open',
          assignedFreelancer: null,
          'applications.freelancer': freelancerObjectId,
        },
        {
          $set: { 'applications.$[a].status': 'rejected' },
        },
        {
          arrayFilters: [{ 'a.freelancer': freelancerObjectId, 'a.status': 'pending' }],
        }
      );
    } catch (e) {
      console.error('Failed to reject other pending applications:', e);
    }
  }

  try {
    await notifyJobAssigned(freelancerId, clientName, job.title, job._id);
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
    // Generalize "5th application" logic so changing AUTO_PICK_MIN works.
    const minIndex = Math.max(0, AUTO_PICK_MIN - 1);
    const minApp = sortedByTime[minIndex];
    if (
      minApp &&
      Date.now() - new Date(minApp.createdAt).getTime() >= AUTO_PICK_DELAY_MS
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
 * Background runner: check for open jobs whose auto-pick delay threshold has passed.
 * This makes auto-pick resilient to process restarts / in-memory timer loss.
 */
async function checkAutoPickDueJobs({ maxJobsToCheck = 30, concurrency = 3 } = {}) {
  const candidates = await Job.find({
    status: 'open',
    assignedFreelancer: null,
    autoPickEnabled: { $ne: false },
    'applications.status': 'pending',
  })
    .select('_id applications')
    .limit(maxJobsToCheck)
    .lean();

  const now = Date.now();

  // Filter in-process to avoid unnecessary evaluateAutoPick() calls.
  const dueJobIds = [];
  for (const job of candidates) {
    const pending = (job.applications || []).filter((a) => a.status === 'pending');
    if (pending.length < AUTO_PICK_MIN) continue;

    let shouldPick = false;
    if (pending.length >= AUTO_PICK_INSTANT) {
      shouldPick = true;
    } else {
      const sortedByTime = [...pending].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const minIndex = Math.max(0, AUTO_PICK_MIN - 1);
      const minApp = sortedByTime[minIndex];
      if (minApp?.createdAt) {
        const createdMs = new Date(minApp.createdAt).getTime();
        if (!Number.isNaN(createdMs) && now - createdMs >= AUTO_PICK_DELAY_MS) {
          shouldPick = true;
        }
      }
    }

    if (shouldPick) dueJobIds.push(job._id);
  }

  if (!dueJobIds.length) return { checked: candidates.length, due: 0 };

  // Evaluate with a small concurrency cap to reduce DB load.
  let evaluated = 0;
  for (let i = 0; i < dueJobIds.length; i += concurrency) {
    const chunk = dueJobIds.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async (jid) => {
        try {
          evaluated += 1;
          await evaluateAutoPick(jid);
        } catch (e) {
          // Avoid crashing background runner if auto-pick races with manual accept/unassign.
          console.error('Auto-pick due-job evaluation failed:', e?.message || e);
        }
      })
    );
  }

  return { checked: candidates.length, due: dueJobIds.length, evaluated };
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
  checkAutoPickDueJobs,
};
