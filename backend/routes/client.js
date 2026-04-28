/**
 * Client Routes - People App Backend
 *
 * Routes for client-specific actions (posting jobs, viewing jobs, etc.)
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const Job = require('../models/Job');
const CommissionTransaction = require('../models/CommissionTransaction');
const { getStateFromPincode, getCoordsFromPincode } = require('../services/locationService');
const FreelancerVerification = require('../models/FreelancerVerification');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const WalletLedger = require('../models/WalletLedger');
const FreelancerRating = require('../models/FreelancerRating');
const {
  notifyOfferAccepted,
  notifyOfferRejected,
  notifyJobAssigned,
  notifyWorkDone,
  notifyPaymentReceived,
  notifyPaymentSent,
  notifyApplicationRejected,
} = require('../services/notificationService');
const {
  acceptApplicationCore,
  evaluateAutoPick,
  clearAutoPickTimer,
} = require('../services/autoPickApplications');
const { assertJobTitleAllowed, assertJobDescriptionAllowed } = require('../utils/jobTextPolicy');
// NOTE: Job posting moderation/AI gate removed per product decision.
const { isJobTextBlockedByWords } = require('../utils/jobBlockedWords');
const { moderateJobText } = require('../services/openAiModerationService');
const { safetyGateJobText } = require('../services/openAiJobSafetyGate');

function isDeliveryCategory(category) {
  return String(category || '')
    .trim()
    .toLowerCase() === 'delivery';
}

/**
 * Helper function to get the appropriate profile photo for a user
 * Priority: Freelancer verification profilePhoto > User profilePhoto > null
 */
async function getUserProfilePhoto(userId) {
  try {
    // First, check if user has a freelancer verification with profilePhoto
    const verification = await FreelancerVerification.findOne({ 
      user: userId,
      profilePhoto: { $exists: true, $ne: null }
    }).sort({ createdAt: -1 }); // Get the most recent verification
    
    if (verification && verification.profilePhoto) {
      return verification.profilePhoto;
    }
    
    // If no freelancer verification photo, check user's profilePhoto (from client profile setup)
    const user = await User.findById(userId);
    if (user && user.profilePhoto) {
      return user.profilePhoto;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user profile photo:', error);
    // Fallback to user's profilePhoto if verification lookup fails
    try {
      const user = await User.findById(userId);
      return user?.profilePhoto || null;
    } catch (err) {
      return null;
    }
  }
}

/**
 * Post a new job
 * POST /api/client/jobs
 * Requires authentication as client
 */
router.post('/jobs', authenticate, async (req, res) => {
  try {
    const user = req.user;

    if (!user || user.role !== 'client') {
      return res.status(403).json({
        success: false,
        error: 'Only clients can post jobs',
      });
    }

    const {
      title,
      category,
      address,
      pincode,
      jobLat: jobLatInput,
      jobLng: jobLngInput,
      budget,
      gender,
      description,
      deliveryFromAddress,
      deliveryFromPincode,
      deliveryToAddress,
      deliveryToPincode,
    } = req.body || {};

    const titleCheck = assertJobTitleAllowed(title);
    if (!titleCheck.ok) {
      return res.status(400).json({ success: false, code: titleCheck.code, error: titleCheck.error });
    }
    const titleNormalized = titleCheck.normalized;

    const catTrim = String(category || '').trim();
    const hasDeliveryPayload =
      String(deliveryFromAddress || '').trim().length > 0 &&
      String(deliveryFromPincode || '').trim().length > 0 &&
      String(deliveryToAddress || '').trim().length > 0 &&
      String(deliveryToPincode || '').trim().length > 0;
    /** Delivery if category says so OR all four delivery fields are sent (covers client / casing issues). */
    const delivery = isDeliveryCategory(catTrim) || hasDeliveryPayload;

    let addressStr;
    let pincodeStr;
    let normalizedGender;
    let descriptionStr;
    /** Stored category (normalized to Delivery when using delivery payload). */
    let categoryStored = catTrim;
    let deliveryFields = {
      deliveryFromAddress: null,
      deliveryFromPincode: null,
      deliveryToAddress: null,
      deliveryToPincode: null,
    };

    if (delivery) {
      const fromA = String(deliveryFromAddress || '').trim();
      const fromP = String(deliveryFromPincode || '').trim();
      const toA = String(deliveryToAddress || '').trim();
      const toP = String(deliveryToPincode || '').trim();
      if (!title || !fromA || !fromP || !toA || !toP || budget === undefined || budget === null) {
        return res.status(400).json({
          success: false,
          error: 'Missing required delivery job fields (from/to address and pincode)',
        });
      }
      if (!/^\d{6}$/.test(fromP) || !/^\d{6}$/.test(toP)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid pincode (6 digits required for from and to)',
        });
      }
      pincodeStr = toP;
      addressStr = `From: ${fromA} (${fromP}) → To: ${toA} (${toP})`;
      normalizedGender = 'any';
      descriptionStr = null;
      deliveryFields = {
        deliveryFromAddress: fromA,
        deliveryFromPincode: fromP,
        deliveryToAddress: toA,
        deliveryToPincode: toP,
      };
      categoryStored = isDeliveryCategory(catTrim) && catTrim ? catTrim : 'Delivery';
    } else {
      if (!title || !catTrim || !address || !pincode || budget === undefined || budget === null || !gender) {
        return res.status(400).json({
          success: false,
          error: 'Missing required job fields',
        });
      }
      normalizedGender = String(gender).toLowerCase();
      if (!['male', 'female', 'any'].includes(normalizedGender)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid gender value',
        });
      }
      addressStr = String(address).trim();
      pincodeStr = String(pincode).trim();
      const descCheck = assertJobDescriptionAllowed(description);
      if (!descCheck.ok) {
        return res.status(400).json({ success: false, code: descCheck.code, error: descCheck.error });
      }
      descriptionStr = descCheck.normalized;
    }

    const wordBlock = isJobTextBlockedByWords(titleNormalized, descriptionStr);
    if (wordBlock.blocked) {
      return res.status(400).json({
        success: false,
        code: 'JOB_BLOCKED_WORD',
        error: 'This job does not feel appropriate. Please try again.',
      });
    }

    const moderation = await moderateJobText({ title: titleNormalized, description: descriptionStr });
    if (!moderation.allowed) {
      return res.status(moderation.code === 'JOB_MODERATION_UNAVAILABLE' ? 503 : 400).json({
        success: false,
        code: moderation.code,
        error: moderation.error,
      });
    }

    const safety = await safetyGateJobText({ title: titleNormalized, description: descriptionStr });
    if (!safety.allowed) {
      return res.status(safety.code === 'JOB_SAFETY_UNAVAILABLE' ? 503 : 400).json({
        success: false,
        code: safety.code,
        error: safety.error,
      });
    }

    const budgetNum = Number(budget);
    if (!Number.isFinite(budgetNum) || budgetNum < 10) {
      return res.status(400).json({
        success: false,
        error: 'Budget must be at least ₹10',
      });
    }

    let state = null;
    let jobLat = null;
    let jobLng = null;
    try {
      const [pinInfo, coords] = await Promise.all([
        getStateFromPincode(pincodeStr),
        getCoordsFromPincode(pincodeStr),
      ]);
      if (pinInfo && pinInfo.state) state = pinInfo.state;
      const parsedLat = jobLatInput !== undefined ? Number(jobLatInput) : null;
      const parsedLng = jobLngInput !== undefined ? Number(jobLngInput) : null;
      const hasValidCoords =
        jobLatInput !== undefined &&
        jobLngInput !== undefined &&
        parsedLat != null &&
        parsedLng != null &&
        !Number.isNaN(parsedLat) &&
        !Number.isNaN(parsedLng) &&
        Math.abs(parsedLat) <= 90 &&
        Math.abs(parsedLng) <= 180;
      if (hasValidCoords) {
        jobLat = parsedLat;
        jobLng = parsedLng;
      } else if (coords) {
        jobLat = coords.lat;
        jobLng = coords.lng;
      }
    } catch (e) {
      console.warn('Could not resolve state/coords for pincode:', pincodeStr, e.message);
    }

    const job = await Job.create({
      client: user._id || user.id,
      title: titleNormalized,
      category: categoryStored,
      address: addressStr,
      pincode: pincodeStr,
      state,
      jobLat,
      jobLng,
      budget: Number(budget),
      gender: normalizedGender,
      description: descriptionStr,
      ...deliveryFields,
      status: 'open',
    });

    res.status(201).json({
      success: true,
      job,
    });
  } catch (error) {
    console.error('Error posting client job:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to post job',
    });
  }
});


/**
 * Get active jobs for client
 * GET /api/client/jobs/active
 */
router.get('/jobs/active', authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'client') {
      return res.status(403).json({
        success: false,
        error: 'Only clients can view their jobs',
      });
    }

    const jobs = await Job.find({
      client: user._id || user.id,
      status: { $in: ['open', 'assigned', 'work_done'] },
    })
      .populate('assignedFreelancer', 'fullName profilePhoto phone email')
      .populate('offers.freelancer', 'fullName profilePhoto phone')
      .sort({ createdAt: -1 })
      .lean();

    // Fetch verification data and profile photo for assigned freelancers
    const jobsWithVerification = await Promise.all(
      jobs.map(async (job) => {
        if (job.assignedFreelancer) {
          const freelancerId = job.assignedFreelancer._id || job.assignedFreelancer.id;
          
          // Get profile photo using helper function
          const profilePhoto = await getUserProfilePhoto(freelancerId);
          if (profilePhoto) {
            job.assignedFreelancer.profilePhoto = profilePhoto;
          }
          
          // Get full user data to ensure we have email and fullName
          const fullUser = await User.findById(freelancerId).select('fullName email').lean();
          if (fullUser) {
            if (fullUser.fullName && !job.assignedFreelancer.fullName) {
              job.assignedFreelancer.fullName = fullUser.fullName;
            }
            if (fullUser.email && !job.assignedFreelancer.email) {
              job.assignedFreelancer.email = fullUser.email;
            }
          }
          
          // Try multiple query formats to find verification
          let verification = await FreelancerVerification.findOne({
            user: freelancerId
          })
            .select('fullName dob gender address profilePhoto')
            .lean()
            .sort({ createdAt: -1 });
          
          // If not found, try with string ID
          if (!verification && freelancerId) {
            verification = await FreelancerVerification.findOne({
              user: freelancerId.toString()
            })
              .select('fullName dob gender address profilePhoto')
              .lean()
              .sort({ createdAt: -1 });
          }
          
          // If still not found, try with ObjectId
          if (!verification && freelancerId) {
            try {
              const objectId = new mongoose.Types.ObjectId(freelancerId);
              verification = await FreelancerVerification.findOne({
                user: objectId
              })
                .select('fullName dob gender address profilePhoto')
                .lean()
                .sort({ createdAt: -1 });
            } catch (e) {
              // Invalid ObjectId format, skip
            }
          }
          
          // Also try querying with $or to handle different ID formats
          if (!verification && freelancerId) {
            try {
              verification = await FreelancerVerification.findOne({
                $or: [
                  { user: freelancerId },
                  { user: freelancerId.toString() },
                  { user: new mongoose.Types.ObjectId(freelancerId) }
                ]
              })
                .select('fullName dob gender address profilePhoto')
                .lean()
                .sort({ createdAt: -1 });
            } catch (e) {
              // Skip if error
            }
          }
          
          if (verification) {
            job.assignedFreelancer.verification = verification;
            console.log('✅ Found verification for freelancer:', freelancerId, {
              fullName: verification.fullName,
              dob: verification.dob,
              gender: verification.gender,
              address: verification.address
            });
          } else {
            console.log('⚠️ No verification found for freelancer:', freelancerId, 'Type:', typeof freelancerId);
            // Still create an empty verification object so the structure is consistent
            job.assignedFreelancer.verification = null;
          }
        }
        return job;
      })
    );

    res.json({
      success: true,
      jobs: jobsWithVerification,
    });
  } catch (error) {
    console.error('Error getting active client jobs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get active jobs',
    });
  }
});

/**
 * Primary job for Support "cancel job" flow (most recently updated open / assigned / work_done).
 * GET /api/client/jobs/support-cancel-context
 */
router.get('/jobs/support-cancel-context', authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'client') {
      return res.status(403).json({
        success: false,
        error: 'Only clients can use this',
      });
    }

    const clientOid =
      user._id instanceof mongoose.Types.ObjectId
        ? user._id
        : new mongoose.Types.ObjectId(String(user._id));

    const job = await Job.findOne({
      client: clientOid,
      status: { $in: ['open', 'assigned', 'work_done'] },
    })
      .sort({ updatedAt: -1 })
      .select('title budget status assignedFreelancer')
      .lean();

    if (!job) {
      return res.json({ success: true, hasJob: false });
    }

    return res.json({
      success: true,
      hasJob: true,
      job: {
        _id: job._id,
        title: job.title,
        budget: job.budget,
        status: job.status,
      },
    });
  } catch (error) {
    console.error('Error support-cancel-context:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to load job context',
    });
  }
});

/**
 * Job with an assigned freelancer for Support "unassign" flow (latest assigned/work_done with assignee).
 * GET /api/client/jobs/support-unassign-context
 */
router.get('/jobs/support-unassign-context', authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'client') {
      return res.status(403).json({
        success: false,
        error: 'Only clients can use this',
      });
    }

    const clientOid =
      user._id instanceof mongoose.Types.ObjectId
        ? user._id
        : new mongoose.Types.ObjectId(String(user._id));

    const job = await Job.findOne({
      client: clientOid,
      assignedFreelancer: { $ne: null },
      status: { $in: ['assigned', 'work_done'] },
    })
      .sort({ updatedAt: -1 })
      .populate('assignedFreelancer', 'fullName')
      .select('title status assignedFreelancer')
      .lean();

    if (!job) {
      return res.json({ success: true, hasJob: false });
    }

    const fl = job.assignedFreelancer;
    const freelancerName =
      (fl && (fl.fullName || fl.name)) || 'Freelancer';

    return res.json({
      success: true,
      hasJob: true,
      job: {
        _id: job._id,
        title: job.title,
        status: job.status,
        freelancerName: String(freelancerName).trim() || 'Freelancer',
      },
    });
  } catch (error) {
    console.error('Error support-unassign-context:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to load unassign context',
    });
  }
});

/**
 * Get job history for client
 * GET /api/client/jobs/history
 */
router.get('/jobs/history', authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'client') {
      return res.status(403).json({
        success: false,
        error: 'Only clients can view their jobs',
      });
    }

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 1);

    const jobs = await Job.find({
      client: user._id || user.id,
      status: 'completed',
      updatedAt: { $gte: cutoff },
    })
      .populate('assignedFreelancer', 'fullName profilePhoto phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      jobs,
    });
  } catch (error) {
    console.error('Error getting client job history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get job history',
    });
  }
});

/**
 * Update a job
 * PUT /api/client/jobs/:id
 * Requires authentication as client and job ownership
 */
router.put('/jobs/:id', authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'client') {
      return res.status(403).json({
        success: false,
        error: 'Only clients can update jobs',
      });
    }

    const job = await Job.findOne({
      _id: req.params.id,
      client: user._id || user.id,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    // Only allow editing if job is open and no offers accepted
    if (job.status !== 'open') {
      return res.status(400).json({
        success: false,
        error: 'Can only edit jobs with status "open"',
      });
    }

    const hasAcceptedOffers = job.offers && job.offers.some((offer) => offer.status === 'accepted');
    const hasAcceptedApplications =
      job.applications && job.applications.some((a) => a.status === 'accepted');
    if (hasAcceptedOffers || hasAcceptedApplications) {
      return res.status(400).json({
        success: false,
        error: 'Cannot edit job with an accepted offer or application',
      });
    }

    const {
      title,
      category,
      address,
      pincode,
      budget,
      gender,
      description,
      deliveryFromAddress,
      deliveryFromPincode,
      deliveryToAddress,
      deliveryToPincode,
    } = req.body || {};

    if (title !== undefined && title !== null && String(title).length > 0) {
      const titleCheck = assertJobTitleAllowed(title);
      if (!titleCheck.ok) {
        return res.status(400).json({ success: false, code: titleCheck.code, error: titleCheck.error });
      }
      job.title = titleCheck.normalized;
    }
    if (category) job.category = String(category).trim();

    const catNow = job.category;
    const delivery = isDeliveryCategory(catNow);

    const parsedLat = jobLat !== undefined ? Number(jobLat) : null;
    const parsedLng = jobLng !== undefined ? Number(jobLng) : null;
    const hasValidCoords =
      jobLat !== undefined &&
      jobLng !== undefined &&
      parsedLat != null &&
      parsedLng != null &&
      !Number.isNaN(parsedLat) &&
      !Number.isNaN(parsedLng) &&
      Math.abs(parsedLat) <= 90 &&
      Math.abs(parsedLng) <= 180;

    if (delivery) {
      const fromA = deliveryFromAddress !== undefined ? String(deliveryFromAddress).trim() : job.deliveryFromAddress;
      const fromP = deliveryFromPincode !== undefined ? String(deliveryFromPincode).trim() : job.deliveryFromPincode;
      const toA = deliveryToAddress !== undefined ? String(deliveryToAddress).trim() : job.deliveryToAddress;
      const toP = deliveryToPincode !== undefined ? String(deliveryToPincode).trim() : job.deliveryToPincode;
      if (!fromA || !fromP || !toA || !toP) {
        return res.status(400).json({
          success: false,
          error: 'Delivery jobs require from/to address and pincode',
        });
      }
      if (!/^\d{6}$/.test(fromP) || !/^\d{6}$/.test(toP)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid pincode (6 digits required for from and to)',
        });
      }
      job.deliveryFromAddress = fromA;
      job.deliveryFromPincode = fromP;
      job.deliveryToAddress = toA;
      job.deliveryToPincode = toP;
      job.address = `From: ${fromA} (${fromP}) → To: ${toA} (${toP})`;
      job.pincode = toP;
      job.gender = 'any';
      job.description = null;
      try {
        const [pinInfo, coords] = await Promise.all([
          getStateFromPincode(toP),
          getCoordsFromPincode(toP),
        ]);
        job.state = (pinInfo && pinInfo.state) ? pinInfo.state : null;
        if (hasValidCoords) {
          job.jobLat = parsedLat;
          job.jobLng = parsedLng;
        } else if (coords) {
          job.jobLat = coords.lat;
          job.jobLng = coords.lng;
        } else {
          job.jobLat = null;
          job.jobLng = null;
        }
      } catch (e) {
        console.warn('Could not resolve state/coords for delivery to-pincode on update:', toP, e.message);
      }
    } else {
      if (address) job.address = String(address).trim();
      if (pincode) {
        job.pincode = String(pincode).trim();
        try {
          const [pinInfo, coords] = await Promise.all([
            getStateFromPincode(job.pincode),
            getCoordsFromPincode(job.pincode),
          ]);
          job.state = (pinInfo && pinInfo.state) ? pinInfo.state : null;
          if (hasValidCoords) {
            job.jobLat = parsedLat;
            job.jobLng = parsedLng;
          } else if (coords) {
            job.jobLat = coords.lat;
            job.jobLng = coords.lng;
          } else {
            job.jobLat = null;
            job.jobLng = null;
          }
        } catch (e) {
          console.warn('Could not resolve state/coords for pincode on update:', job.pincode, e.message);
        }
      }
      job.deliveryFromAddress = null;
      job.deliveryFromPincode = null;
      job.deliveryToAddress = null;
      job.deliveryToPincode = null;
      if (gender) {
        const normalizedGender = String(gender).toLowerCase();
        if (!['male', 'female', 'any'].includes(normalizedGender)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid gender value',
          });
        }
        job.gender = normalizedGender;
      }
      if (description !== undefined) {
        const descCheck = assertJobDescriptionAllowed(description);
        if (!descCheck.ok) {
          return res.status(400).json({ success: false, code: descCheck.code, error: descCheck.error });
        }
        job.description = descCheck.normalized;
      }
    }

    if (budget !== undefined) job.budget = Number(budget);

    const wordBlock = isJobTextBlockedByWords(job.title, job.description);
    if (wordBlock.blocked) {
      return res.status(400).json({
        success: false,
        code: 'JOB_BLOCKED_WORD',
        error: 'This job does not feel appropriate. Please try again.',
      });
    }

    const moderation = await moderateJobText({ title: job.title, description: job.description });
    if (!moderation.allowed) {
      return res.status(moderation.code === 'JOB_MODERATION_UNAVAILABLE' ? 503 : 400).json({
        success: false,
        code: moderation.code,
        error: moderation.error,
      });
    }

    const safety = await safetyGateJobText({ title: job.title, description: job.description });
    if (!safety.allowed) {
      return res.status(safety.code === 'JOB_SAFETY_UNAVAILABLE' ? 503 : 400).json({
        success: false,
        code: safety.code,
        error: safety.error,
      });
    }

    await job.save();

    res.json({
      success: true,
      job,
    });
  } catch (error) {
    console.error('Error updating client job:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update job',
    });
  }
});

/**
 * Delete a job
 * DELETE /api/client/jobs/:id
 * Requires authentication as client and job ownership
 */
router.delete('/jobs/:id', authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'client') {
      return res.status(403).json({
        success: false,
        error: 'Only clients can delete jobs',
      });
    }

    const job = await Job.findOne({
      _id: req.params.id,
      client: user._id || user.id,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    // Only allow deleting if job is open and no offers accepted
    if (job.status !== 'open') {
      return res.status(400).json({
        success: false,
        error: 'Can only delete jobs with status "open"',
      });
    }

    // If no freelancer is currently assigned, allow deletion even if stale accepted offers/applications exist.
    if (!job.assignedFreelancer) {
      await job.deleteOne();
      return res.json({
        success: true,
        message: 'Job deleted successfully',
      });
    }

    const hasAcceptedOffers = job.offers && job.offers.some((offer) => offer.status === 'accepted');
    const hasAcceptedApplications =
      job.applications && job.applications.some((a) => a.status === 'accepted');
    if (hasAcceptedOffers || hasAcceptedApplications) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete job with an accepted offer or application',
      });
    }

    await job.deleteOne();

    res.json({
      success: true,
      message: 'Job deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting client job:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete job',
    });
  }
});

/**
 * Get offers for a job
 * GET /api/client/jobs/:id/offers
 * Requires authentication as client and job ownership
 */
router.get('/jobs/:id/offers', authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'client') {
      return res.status(403).json({
        success: false,
        error: 'Only clients can view job offers',
      });
    }

    const job = await Job.findOne({
      _id: req.params.id,
      client: user._id || user.id,
    }).populate('offers.freelancer', 'fullName profilePhoto phone');

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    res.json({
      success: true,
      offers: job.offers || [],
    });
  } catch (error) {
    console.error('Error getting job offers:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get job offers',
    });
  }
});

/**
 * Accept an offer
 * POST /api/client/jobs/:id/accept-offer
 * Requires authentication as client and job ownership
 */
router.post('/jobs/:id/accept-offer', authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'client') {
      return res.status(403).json({
        success: false,
        error: 'Only clients can accept offers',
      });
    }

    const { offerId } = req.body;
    if (!offerId) {
      return res.status(400).json({
        success: false,
        error: 'Offer ID is required',
      });
    }

    const job = await Job.findOne({
      _id: req.params.id,
      client: user._id || user.id,
    }).populate('offers.freelancer', 'fullName profilePhoto phone');

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    if (job.status !== 'open') {
      return res.status(400).json({
        success: false,
        error: 'Can only accept offers for jobs with status "open"',
      });
    }

    const offer = job.offers.id(offerId);
    if (!offer) {
      return res.status(404).json({
        success: false,
        error: 'Offer not found',
      });
    }

    if (offer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Offer has already been processed',
      });
    }

    const freelancerIdRaw = offer.freelancer?._id?.toString() || offer.freelancer?.toString?.() || offer.freelancer;
    const freelancerOid = mongoose.Types.ObjectId.isValid(String(freelancerIdRaw))
      ? new mongoose.Types.ObjectId(String(freelancerIdRaw))
      : null;

    // Acquire freelancer bucket lock (atomic) before assigning.
    if (freelancerOid) {
      const tryLock = async () =>
        User.findOneAndUpdate(
          { _id: freelancerOid, role: 'freelancer', activeAssignedJob: null },
          { $set: { activeAssignedJob: job._id, activeAssignedAt: new Date() } },
          { new: true }
        )
          .select('_id activeAssignedJob')
          .lean();

      let lock = await tryLock();
      if (!lock) {
        // Stale-lock self-heal: if lock points to a missing/terminal/unassigned job, clear and retry once.
        const u = await User.findById(freelancerOid).select('activeAssignedJob').lean();
        const lockedJobId = u?.activeAssignedJob;
        if (lockedJobId) {
          const lockedJob = await Job.findById(lockedJobId).select('status assignedFreelancer').lean();
          const assignedMatches =
            lockedJob?.assignedFreelancer && String(lockedJob.assignedFreelancer) === String(freelancerOid);
          const isTerminal = lockedJob && (lockedJob.status === 'completed' || lockedJob.status === 'cancelled');
          const isMissing = !lockedJob;
          const isNotActuallyAssigned = !assignedMatches;
          if (isMissing || isTerminal || isNotActuallyAssigned) {
            await User.updateOne(
              { _id: freelancerOid, activeAssignedJob: lockedJobId },
              { $set: { activeAssignedJob: null, activeAssignedAt: null } }
            );
            lock = await tryLock();
          }
        }
      }

      if (!lock) {
        return res.status(409).json({
          success: false,
          code: 'FREELANCER_ALREADY_ASSIGNED',
          error: 'Freelancer already picked another job',
        });
      }
    }

    // Accept the offer
    offer.status = 'accepted';
    // Reject all other pending offers
    job.offers.forEach((o) => {
      if (o._id.toString() !== offerId && o.status === 'pending') {
        o.status = 'rejected';
      }
    });

    // Reject all pending applications (another path was chosen)
    const clientForApps = await User.findById(user._id || user.id).select('fullName').lean();
    const clientNameApps = clientForApps?.fullName || 'The client';
    if (job.applications && job.applications.length) {
      for (const app of job.applications) {
        if (app.status === 'pending') {
          app.status = 'rejected';
          try {
            await notifyApplicationRejected(
              app.freelancer.toString(),
              clientNameApps,
              job.title,
              'other_selected',
              job._id
            );
          } catch (e) {
            console.error('Notify application not selected:', e);
          }
        }
      }
    }

    // Assign job to freelancer and update status
    job.assignedFreelancer = offer.freelancer._id || offer.freelancer;
    job.status = 'assigned';

    // Update job budget to accepted offer amount so client/freelancer see final agreed amount
    if (offer.amount && Number(offer.amount) > 0) {
      job.budget = Number(offer.amount);
    }

    await job.save();

    // Notify freelancer about offer acceptance
    try {
      const client = await User.findById(user._id || user.id).select('fullName').lean();
      await notifyOfferAccepted(
        offer.freelancer._id?.toString() || offer.freelancer.toString(),
        client?.fullName || 'The client',
        job.title,
        job._id
      );
      // Also notify about job assignment
      await notifyJobAssigned(
        offer.freelancer._id?.toString() || offer.freelancer.toString(),
        client?.fullName || 'The client',
        job.title,
        job._id
      );
    } catch (notifError) {
      console.error('Error sending offer acceptance notification:', notifError);
      // Don't fail the request if notification fails
    }

    res.json({
      success: true,
      message: 'Offer accepted successfully',
      job,
    });
  } catch (error) {
    console.error('Error accepting offer:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to accept offer',
    });
  }
});

/**
 * Reject an offer
 * POST /api/client/jobs/:id/reject-offer
 * Requires authentication as client and job ownership
 */
router.post('/jobs/:id/reject-offer', authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'client') {
      return res.status(403).json({
        success: false,
        error: 'Only clients can reject offers',
      });
    }

    const { offerId } = req.body;
    if (!offerId) {
      return res.status(400).json({
        success: false,
        error: 'Offer ID is required',
      });
    }

    const job = await Job.findOne({
      _id: req.params.id,
      client: user._id || user.id,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    const offer = job.offers.id(offerId);
    if (!offer) {
      return res.status(404).json({
        success: false,
        error: 'Offer not found',
      });
    }

    if (offer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Offer has already been processed',
      });
    }

    offer.status = 'rejected';
    await job.save();

    // Notify freelancer about offer rejection
    try {
      const client = await User.findById(user._id || user.id).select('fullName').lean();
      const freelancerId = offer.freelancer._id?.toString() || offer.freelancer.toString();
      await notifyOfferRejected(
        freelancerId,
        client?.fullName || 'The client',
        job.title,
        job._id
      );
    } catch (notifError) {
      console.error('Error sending offer rejection notification:', notifError);
      // Don't fail the request if notification fails
    }

    res.json({
      success: true,
      message: 'Offer rejected successfully',
      job,
    });
  } catch (error) {
    console.error('Error rejecting offer:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reject offer',
    });
  }
});

/**
 * Get pending applications for a job (sorted: ratingCount desc, then averageRating desc)
 * GET /api/client/jobs/:id/applications
 */
router.get('/jobs/:id/applications', authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'client') {
      return res.status(403).json({
        success: false,
        error: 'Only clients can view job applications',
      });
    }

    await evaluateAutoPick(req.params.id);

    const job = await Job.findOne({
      _id: req.params.id,
      client: user._id || user.id,
    }).populate(
      'applications.freelancer',
      'fullName profilePhoto averageRating ratingCount'
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    const pending = (job.applications || []).filter((a) => a.status === 'pending');
    pending.sort((a, b) => {
      const ca = Number(a.freelancer?.ratingCount ?? 0);
      const cb = Number(b.freelancer?.ratingCount ?? 0);
      if (cb !== ca) return cb - ca;
      const ra = Number(a.freelancer?.averageRating ?? 0);
      const rb = Number(b.freelancer?.averageRating ?? 0);
      return rb - ra;
    });

    res.json({
      success: true,
      applications: pending,
      autoPickEnabled: job.autoPickEnabled !== false,
    });
  } catch (error) {
    console.error('Error getting job applications:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get applications',
    });
  }
});

/**
 * Enable/disable Auto pick for a job (default on)
 * PUT /api/client/jobs/:id/auto-pick
 * Body: { enabled: boolean }
 */
router.put('/jobs/:id/auto-pick', authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'client') {
      return res.status(403).json({ success: false, error: 'Only clients can update auto pick' });
    }

    const { enabled } = req.body || {};
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, error: 'enabled (boolean) is required' });
    }

    const job = await Job.findOne({
      _id: req.params.id,
      client: user._id || user.id,
    });

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    job.autoPickEnabled = enabled;
    await job.save();

    if (!enabled) {
      clearAutoPickTimer(job._id);
    }

    res.json({
      success: true,
      autoPickEnabled: job.autoPickEnabled,
    });
  } catch (error) {
    console.error('Error updating auto pick:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update auto pick',
    });
  }
});

/**
 * Accept an application (assigns freelancer; rejects other pending applications and offers)
 * POST /api/client/jobs/:id/accept-application
 */
router.post('/jobs/:id/accept-application', authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'client') {
      return res.status(403).json({
        success: false,
        error: 'Only clients can accept applications',
      });
    }

    const { applicationId } = req.body;
    if (!applicationId) {
      return res.status(400).json({
        success: false,
        error: 'Application ID is required',
      });
    }

    const { job } = await acceptApplicationCore({
      jobId: req.params.id,
      applicationId,
      clientUserId: user._id || user.id,
      isAutoPick: false,
    });

    const jobOut = await Job.findById(job._id)
      .populate(
        'applications.freelancer',
        'fullName profilePhoto averageRating ratingCount'
      )
      .lean();

    res.json({
      success: true,
      message: 'Application accepted successfully',
      job: jobOut,
    });
  } catch (error) {
    console.error('Error accepting application:', error);
    const code = error.statusCode || 500;
    res.status(code >= 400 && code < 600 ? code : 500).json({
      success: false,
      code: error.code || undefined,
      error: error.message || 'Failed to accept application',
    });
  }
});

/**
 * Reject a single application
 * POST /api/client/jobs/:id/reject-application
 */
router.post('/jobs/:id/reject-application', authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'client') {
      return res.status(403).json({
        success: false,
        error: 'Only clients can reject applications',
      });
    }

    const { applicationId } = req.body;
    if (!applicationId) {
      return res.status(400).json({
        success: false,
        error: 'Application ID is required',
      });
    }

    const job = await Job.findOne({
      _id: req.params.id,
      client: user._id || user.id,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    const application = job.applications.id(applicationId);
    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
      });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Application has already been processed',
      });
    }

    application.status = 'rejected';
    await job.save();

    try {
      const client = await User.findById(user._id || user.id).select('fullName').lean();
      const freelancerId = application.freelancer._id?.toString() || application.freelancer.toString();
      await notifyApplicationRejected(
        freelancerId,
        client?.fullName || 'The client',
        job.title,
        'rejected',
        job._id
      );
    } catch (notifError) {
      console.error('Error sending application rejection notification:', notifError);
    }

    res.json({
      success: true,
      message: 'Application rejected successfully',
      job,
    });
  } catch (error) {
    console.error('Error rejecting application:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reject application',
    });
  }
});

/**
 * Mark job as paid
 * POST /api/client/jobs/:id/pay
 * Requires authentication as client and job ownership
 */
router.post('/jobs/:id/pay', authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'client') {
      return res.status(403).json({
        success: false,
        error: 'Only clients can mark jobs as paid',
      });
    }

    const job = await Job.findOne({
      _id: req.params.id,
      client: user._id || user.id,
    }).populate('assignedFreelancer', 'fullName profilePhoto phone');

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    if (job.status !== 'work_done') {
      return res.status(400).json({
        success: false,
        error: 'Can only pay for jobs with status "work_done"',
      });
    }

    if (!job.assignedFreelancer) {
      return res.status(400).json({
        success: false,
        error: 'Job has no assigned freelancer',
      });
    }

    // Update job status to completed
    job.status = 'completed';

    // Create commission transaction for freelancer (10% commission)
    const jobAmount = job.budget || 0;
    const platformCommission = Math.round(jobAmount * 0.1);
    const amountReceived = jobAmount - platformCommission;

    await CommissionTransaction.create({
      freelancer: job.assignedFreelancer._id || job.assignedFreelancer,
      job: job._id,
      jobTitle: job.title,
      clientName: job.client?.fullName || null,
      clientId: job.client?._id || job.client || null,
      jobAmount,
      platformCommission,
      amountReceived,
      duesPaid: false,
    });

    await job.save();

    // Release freelancer bucket lock (if it still points to this job)
    try {
      const freelancerIdToUnlock = job.assignedFreelancer?._id?.toString() || job.assignedFreelancer?.toString?.();
      if (freelancerIdToUnlock) {
        await User.updateOne(
          { _id: freelancerIdToUnlock, activeAssignedJob: job._id },
          { $set: { activeAssignedJob: null, activeAssignedAt: null } }
        );
      }
    } catch (e) {
      console.error('Failed to release activeAssignedJob on completion:', e);
    }

    // Notify freelancer about payment received
    try {
      const client = await User.findById(user._id || user.id).select('fullName').lean();
      const freelancerId = job.assignedFreelancer._id?.toString() || job.assignedFreelancer.toString();
      await notifyPaymentReceived(
        freelancerId,
        client?.fullName || 'The client',
        amountReceived,
        job.title
      );
      // Notify client about payment sent
      await notifyPaymentSent(
        user._id?.toString() || user.id,
        job.assignedFreelancer?.fullName || 'The freelancer',
        jobAmount,
        job.title
      );
    } catch (notifError) {
      console.error('Error sending payment notification:', notifError);
      // Don't fail the request if notification fails
    }

    res.json({
      success: true,
      message: 'Job marked as paid successfully',
      job,
    });
  } catch (error) {
    console.error('Error marking job as paid:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to mark job as paid',
    });
  }
});

function toRupees(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 100) / 100;
}

async function getOrCreateWallet(userId) {
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) wallet = await Wallet.create({ user: userId });
  return wallet;
}

/**
 * Mark job as paid by cash (client confirms cash payment)
 * POST /api/client/jobs/:id/pay-cash
 *
 * - marks job completed
 * - collects 10% commission: deducts from freelancer wallet if available; otherwise creates dues
 */
router.post('/jobs/:id/pay-cash', authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'client') {
      return res.status(403).json({
        success: false,
        error: 'Only clients can mark jobs as paid',
      });
    }

    const job = await Job.findOne({
      _id: req.params.id,
      client: user._id || user.id,
    }).populate('assignedFreelancer', 'fullName profilePhoto phone');

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    if (job.status !== 'work_done') {
      return res.status(400).json({
        success: false,
        error: 'Can only pay for jobs with status "work_done"',
      });
    }
    if (!job.assignedFreelancer) {
      return res.status(400).json({ success: false, error: 'Job has no assigned freelancer' });
    }

    const freelancerId = job.assignedFreelancer._id?.toString() || job.assignedFreelancer.toString();

    const jobAmount = toRupees(job.budget || 0);
    const platformCommission = toRupees(jobAmount * 0.1);
    const amountReceived = toRupees(Math.max(0, jobAmount - platformCommission));

    // Deduct commission from freelancer withdrawable wallet if possible
    const wallet = await getOrCreateWallet(freelancerId);
    const available = toRupees(wallet.availableBalance || 0);
    const debit = toRupees(Math.min(available, platformCommission));
    const remaining = toRupees(Math.max(0, platformCommission - debit));

    if (debit > 0) {
      wallet.availableBalance = toRupees(Math.max(0, wallet.availableBalance - debit));
      await wallet.save();
      await WalletLedger.create({
        walletUser: freelancerId,
        type: 'DEBIT_COMMISSION',
        amount: -debit,
        refType: 'Job',
        refId: job._id.toString(),
        meta: { jobId: job._id.toString(), method: 'cash' },
      });
    }

    // Record dues: only the remaining commission becomes dues
    if (remaining > 0) {
      await CommissionTransaction.create({
        freelancer: freelancerId,
        job: job._id,
        jobTitle: job.title,
        clientName: null,
        clientId: user._id || user.id,
        jobAmount,
        platformCommission: remaining,
        amountReceived,
        duesPaid: false,
        duesPaidAt: null,
        duesPaymentOrderId: `CASH_JOB_${job._id.toString()}`,
      });
    } else {
      // Commission fully collected via wallet
      await CommissionTransaction.create({
        freelancer: freelancerId,
        job: job._id,
        jobTitle: job.title,
        clientName: null,
        clientId: user._id || user.id,
        jobAmount,
        platformCommission,
        amountReceived,
        duesPaid: true,
        duesPaidAt: new Date(),
        duesPaymentOrderId: `WALLET_DEBIT_JOB_${job._id.toString()}`,
      });
    }

    // Mark job completed
    job.status = 'completed';
    await job.save();

    // Notify freelancer about payment received (cash)
    try {
      const client = await User.findById(user._id || user.id).select('fullName').lean();
      await notifyPaymentReceived(
        freelancerId,
        client?.fullName || 'The client',
        amountReceived,
        job.title
      );
      await notifyPaymentSent(
        user._id?.toString() || user.id,
        job.assignedFreelancer?.fullName || 'The freelancer',
        jobAmount,
        job.title
      );
    } catch (notifError) {
      console.error('Error sending payment notification:', notifError);
    }

    res.json({
      success: true,
      message: 'Cash payment recorded successfully',
      job,
      commission: {
        platformCommission,
        deductedFromWallet: debit,
        remainingDues: remaining,
      },
    });
  } catch (error) {
    console.error('Error marking job paid by cash:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to mark job as paid',
    });
  }
});

/**
 * Rate the assigned freelancer for a completed job (required after payment)
 * POST /api/client/jobs/:id/rate-freelancer
 * Body: { rating: number, reason?: string } where rating is 0..5
 */
router.post('/jobs/:id/rate-freelancer', authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'client') {
      return res.status(403).json({
        success: false,
        error: 'Only clients can rate freelancers',
      });
    }

    const ratingRaw = req.body?.rating;
    const rating = Number(ratingRaw);
    if (ratingRaw === undefined || Number.isNaN(rating) || rating < 0 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be a number between 0 and 5',
      });
    }

    const reasonRaw = req.body?.reason;
    const reason = reasonRaw != null ? String(reasonRaw).trim() : null;
    if (rating === 1 && (!reason || reason.length < 3)) {
      return res.status(400).json({
        success: false,
        error: 'Please select a reason for a 1-star rating',
      });
    }

    const job = await Job.findOne({
      _id: req.params.id,
      client: user._id || user.id,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'You can rate only after the job is completed',
      });
    }

    if (!job.assignedFreelancer) {
      return res.status(400).json({
        success: false,
        error: 'Job has no assigned freelancer',
      });
    }

    // Per-job rating: keep it one-time (so the job's record stays stable).
    if (job.clientRating != null) {
      return res.status(400).json({
        success: false,
        error: 'You have already rated this job',
      });
    }

    const clientId = (user._id || user.id).toString();
    const freelancerId = job.assignedFreelancer.toString();

    // Update freelancer aggregate rating per-client (repeat ratings from same client replace previous).
    // IMPORTANT: compute aggregate from FreelancerRating collection to avoid drift from legacy counts.
    const session = await mongoose.startSession();
    let newAvg = 0;
    let newCount = 0;
    try {
      await session.withTransaction(async () => {
        const freelancerExists = await User.findById(freelancerId).select('_id').session(session).lean();
        if (!freelancerExists) {
          const err = new Error('Freelancer not found');
          err.statusCode = 404;
          throw err;
        }

        await FreelancerRating.updateOne(
          { client: clientId, freelancer: freelancerId },
          { $set: { rating } },
          { upsert: true, session }
        );

        const agg = await FreelancerRating.aggregate([
          { $match: { freelancer: new mongoose.Types.ObjectId(freelancerId) } },
          { $group: { _id: '$freelancer', averageRating: { $avg: '$rating' }, ratingCount: { $sum: 1 } } },
        ]).session(session);

        const computed = agg && agg[0] ? agg[0] : null;
        newAvg = computed?.averageRating != null ? Number(computed.averageRating) : 0;
        newCount = computed?.ratingCount != null ? Number(computed.ratingCount) : 0;

        await User.updateOne(
          { _id: freelancerId },
          { $set: { averageRating: newAvg, ratingCount: newCount } },
          { session }
        );
      });
    } catch (e) {
      if (e?.statusCode === 404) {
        return res.status(404).json({ success: false, error: e.message });
      }
      throw e;
    } finally {
      session.endSession();
    }

    job.clientRating = rating;
    job.clientRatedAt = new Date();
    job.clientRatingReason = rating === 1 ? reason : null;
    await job.save();

    res.json({
      success: true,
      message: 'Rating submitted successfully',
      rating: job.clientRating,
      reason: job.clientRatingReason,
      freelancer: {
        _id: freelancerId,
        averageRating: newAvg,
        ratingCount: newCount,
      },
    });
  } catch (error) {
    console.error('Error rating freelancer:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit rating',
    });
  }
});

module.exports = router;


