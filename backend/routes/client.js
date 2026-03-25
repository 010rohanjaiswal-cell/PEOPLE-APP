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
const {
  notifyOfferAccepted,
  notifyOfferRejected,
  notifyJobAssigned,
  notifyWorkDone,
  notifyPaymentReceived,
  notifyPaymentSent,
  notifyApplicationRejected,
} = require('../services/notificationService');

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
      budget,
      gender,
      description,
      deliveryFromAddress,
      deliveryFromPincode,
      deliveryToAddress,
      deliveryToPincode,
    } = req.body || {};

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
      descriptionStr = description ? String(description).trim() : null;
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
      if (coords) {
        jobLat = coords.lat;
        jobLng = coords.lng;
      }
    } catch (e) {
      console.warn('Could not resolve state/coords for pincode:', pincodeStr, e.message);
    }

    const job = await Job.create({
      client: user._id || user.id,
      title: String(title).trim(),
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

    const jobs = await Job.find({
      client: user._id || user.id,
      status: 'completed',
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

    if (title) job.title = String(title).trim();
    if (category) job.category = String(category).trim();

    const catNow = job.category;
    const delivery = isDeliveryCategory(catNow);

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
        if (coords) {
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
          if (coords) {
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
      if (description !== undefined) job.description = description ? String(description).trim() : null;
    }

    if (budget !== undefined) job.budget = Number(budget);

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
              'other_selected'
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
        job.title
      );
      // Also notify about job assignment
      await notifyJobAssigned(
        offer.freelancer._id?.toString() || offer.freelancer.toString(),
        client?.fullName || 'The client',
        job.title
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
        job.title
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
 * Get pending applications for a job (sorted by freelancer rating, high to low)
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

    const job = await Job.findOne({
      _id: req.params.id,
      client: user._id || user.id,
    }).populate('applications.freelancer', 'fullName profilePhoto phone averageRating ratingCount');

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    const pending = (job.applications || []).filter((a) => a.status === 'pending');
    pending.sort((a, b) => {
      const ra = a.freelancer?.averageRating ?? 0;
      const rb = b.freelancer?.averageRating ?? 0;
      return rb - ra;
    });

    res.json({
      success: true,
      applications: pending,
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

    const job = await Job.findOne({
      _id: req.params.id,
      client: user._id || user.id,
    }).populate('applications.freelancer', 'fullName profilePhoto phone averageRating ratingCount');

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    if (job.status !== 'open') {
      return res.status(400).json({
        success: false,
        error: 'Can only accept applications for jobs with status "open"',
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

    // Accept this application
    application.status = 'accepted';

    const clientDoc = await User.findById(user._id || user.id).select('fullName').lean();
    const clientName = clientDoc?.fullName || 'The client';
    const appIdStr = applicationId.toString();

    // Reject other pending applications
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

    // Reject all pending offers
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

    await job.save();

    try {
      await notifyJobAssigned(freelancerId, clientName, job.title);
    } catch (notifError) {
      console.error('Error sending job assignment notification:', notifError);
    }

    res.json({
      success: true,
      message: 'Application accepted successfully',
      job,
    });
  } catch (error) {
    console.error('Error accepting application:', error);
    res.status(500).json({
      success: false,
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
        'rejected'
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

/**
 * Rate the assigned freelancer for a completed job (required after payment)
 * POST /api/client/jobs/:id/rate-freelancer
 * Body: { rating: number } where rating is 0..5
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

    if (job.clientRating != null) {
      return res.status(400).json({
        success: false,
        error: 'You have already rated this job',
      });
    }

    const freelancerId = job.assignedFreelancer.toString();
    const freelancer = await User.findById(freelancerId).select('averageRating ratingCount').lean();
    if (!freelancer) {
      return res.status(404).json({
        success: false,
        error: 'Freelancer not found',
      });
    }

    const oldAvg = Number(freelancer.averageRating || 0);
    const oldCount = Number(freelancer.ratingCount || 0);
    const newCount = oldCount + 1;
    const newAvg = (oldAvg * oldCount + rating) / newCount;

    await User.updateOne(
      { _id: freelancerId },
      {
        $set: { averageRating: newAvg },
        $inc: { ratingCount: 1 },
      }
    );

    job.clientRating = rating;
    job.clientRatedAt = new Date();
    await job.save();

    res.json({
      success: true,
      message: 'Rating submitted successfully',
      rating: job.clientRating,
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


