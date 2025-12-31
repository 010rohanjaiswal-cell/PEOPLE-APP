/**
 * Freelancer Routes - People App Backend
 * Routes for freelancer-specific features
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');
const FreelancerVerification = require('../models/FreelancerVerification');
const Job = require('../models/Job');
const CommissionTransaction = require('../models/CommissionTransaction');
const multer = require('multer');
const streamifier = require('streamifier');
const cloudinary = require('../config/cloudinary');
const {
  notifyOfferReceived,
  notifyJobAssigned,
  notifyWorkDone,
  notifyJobPickedUp,
} = require('../services/notificationService');

// Use memory storage; we'll stream buffers to Cloudinary
const upload = multer({ storage: multer.memoryStorage() });

async function uploadToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

/**
 * Get verification status for freelancer
 * GET /api/freelancer/verification/status
 * Requires authentication
 */
router.get('/verification/status', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user is a freelancer
    if (user.role !== 'freelancer') {
      return res.status(403).json({
        success: false,
        error: 'This endpoint is only for freelancers'
      });
    }

    // Get verification details from FreelancerVerification collection
    // Use .lean() to get plain JavaScript object (faster and ensures all fields are accessible)
    let verification = await FreelancerVerification.findOne({ user: user._id })
      .select('fullName dob gender address status rejectionReason createdAt updatedAt')
      .lean() // Convert to plain object
      .sort({ createdAt: -1 }); // Get the most recent verification
    
    // If not found, try with string ID as fallback
    if (!verification) {
      verification = await FreelancerVerification.findOne({ user: user._id.toString() })
        .select('fullName dob gender address status rejectionReason createdAt updatedAt')
        .lean() // Convert to plain object
        .sort({ createdAt: -1 });
    }
    
    // Log detailed query info for debugging
    if (!verification) {
      const allVerifications = await FreelancerVerification.find({}).select('user fullName dob gender address status').limit(5).sort({ createdAt: -1 });
      console.log('⚠️ Verification not found. Sample verifications in DB:', allVerifications.map(v => ({
        id: v._id,
        userId: v.user,
        userIdType: typeof v.user,
        fullName: v.fullName,
        dob: v.dob,
        gender: v.gender,
        address: v.address,
        status: v.status,
      })));
    } else {
      // Also check if there are other verification records for this user
      const allUserVerifications = await FreelancerVerification.find({
        $or: [
          { user: user._id },
          { user: user._id.toString() }
        ]
      }).select('_id fullName dob gender address status createdAt').sort({ createdAt: -1 });
      console.log('📋 All verification records for this user:', allUserVerifications.map(v => ({
        id: v._id,
        fullName: v.fullName,
        dob: v.dob,
        gender: v.gender,
        address: v.address,
        status: v.status,
        createdAt: v.createdAt,
      })));
    }
    
    const verificationStatus = verification?.status || user.verificationStatus || null;

    console.log('📋 Freelancer verification data:', {
      userId: user._id,
      userIdString: user._id.toString(),
      userIdFromReq: userId,
      hasVerification: !!verification,
      verificationData: verification ? {
        fullName: verification.fullName,
        dob: verification.dob,
        gender: verification.gender,
        address: verification.address,
        status: verification.status,
      } : null,
    });
    
    // Log the full verification object to see what's actually in the database
    if (verification) {
      console.log('📋 Full verification object from DB:', JSON.stringify(verification.toObject ? verification.toObject() : verification, null, 2));
    }

    // Ensure we always return all fields, even if null
    const verificationResponse = {
      success: true,
      status: verificationStatus,
      verification: {
        status: verificationStatus,
        rejectionReason: verification?.rejectionReason || user.verificationRejectionReason || null,
        fullName: verification?.fullName ?? null,
        dob: verification?.dob ?? null,
        gender: verification?.gender ?? null,
        address: verification?.address ?? null,
      }
    };
    
    // Log what we're actually sending
    console.log('📤 Sending verification response:', JSON.stringify(verificationResponse, null, 2));
    console.log('📤 Verification object fields check:', {
      hasVerification: !!verification,
      fullName: verification?.fullName,
      dob: verification?.dob,
      gender: verification?.gender,
      address: verification?.address,
      allKeys: verification ? Object.keys(verification.toObject ? verification.toObject() : verification) : [],
    });
    
    // Log the actual response being sent with explicit field values
    console.log('📤 Response verification object contains:', {
      fullName: verificationResponse.verification.fullName,
      dob: verificationResponse.verification.dob,
      gender: verificationResponse.verification.gender,
      address: verificationResponse.verification.address,
      status: verificationResponse.verification.status,
    });
    
    res.json(verificationResponse);

  } catch (error) {
    console.error('Error getting verification status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get verification status'
    });
  }
});

/**
 * Submit verification
 * POST /api/freelancer/verification
 * Requires authentication
 */
router.post(
  '/verification',
  authenticate,
  upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'aadhaarFront', maxCount: 1 },
    { name: 'aadhaarBack', maxCount: 1 },
    { name: 'panCard', maxCount: 1 },
  ]),
  async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    if (user.role !== 'freelancer') {
      return res.status(403).json({
        success: false,
        error: 'This endpoint is only for freelancers',
      });
    }

    const {
      fullName,
      dob,
      gender,
      address,
    } = req.body || {};
    
    console.log('📥 Verification submission received:', {
      fullName,
      dob,
      gender,
      address,
      hasProfilePhoto: !!req.files?.profilePhoto?.[0],
      hasAadhaarFront: !!req.files?.aadhaarFront?.[0],
      hasAadhaarBack: !!req.files?.aadhaarBack?.[0],
      hasPanCard: !!req.files?.panCard?.[0],
      bodyKeys: Object.keys(req.body || {}),
    });

    const profilePhotoFile = req.files?.profilePhoto?.[0];
    const aadhaarFrontFile = req.files?.aadhaarFront?.[0];
    const aadhaarBackFile = req.files?.aadhaarBack?.[0];
    const panCardFile = req.files?.panCard?.[0];

    // Basic validation to mirror mobile form
    if (
      !fullName ||
      !dob ||
      !gender ||
      !address ||
      !profilePhotoFile ||
      !aadhaarFrontFile ||
      !aadhaarBackFile ||
      !panCardFile
    ) {
      return res.status(400).json({
        success: false,
        error: 'Missing required verification fields',
      });
    }

    // Upload images to Cloudinary
    const folderBase = `people-app/freelancers/${user._id.toString()}`;
    const profilePhoto = await uploadToCloudinary(profilePhotoFile.buffer, `${folderBase}/profile`);
    const aadhaarFront = await uploadToCloudinary(aadhaarFrontFile.buffer, `${folderBase}/aadhaar`);
    const aadhaarBack = await uploadToCloudinary(aadhaarBackFile.buffer, `${folderBase}/aadhaar`);
    const panCard = await uploadToCloudinary(panCardFile.buffer, `${folderBase}/pan`);

    // Upsert verification record for this freelancer
    const verification = await FreelancerVerification.findOneAndUpdate(
      { user: user._id },
      {
        fullName,
        dob,
        gender,
        address,
        profilePhoto,
        aadhaarFront,
        aadhaarBack,
        panCard,
        status: 'pending',
        rejectionReason: null,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
    
    console.log('💾 Verification saved to DB:', {
      userId: user._id,
      verificationId: verification._id,
      savedData: {
        fullName: verification.fullName,
        dob: verification.dob,
        gender: verification.gender,
        address: verification.address,
        status: verification.status,
      }
    });

    // Keep a simple status mirror on User for quick checks
    user.verificationStatus = 'pending';
    user.verificationRejectionReason = null;
    await user.save();

    res.json({
      success: true,
      status: 'pending',
      message: 'Verification submitted. Pending admin review.',
      verification,
    });
  } catch (error) {
    console.error('Error submitting verification:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit verification',
    });
  }
});

/**
 * Get available jobs for freelancer
 * GET /api/freelancer/jobs/available
 * Requires authentication as freelancer
 */
router.get('/jobs/available', authenticate, async (req, res) => {
  try {
    const user = req.user;

    if (!user || user.role !== 'freelancer') {
      return res.status(403).json({
        success: false,
        error: 'Only freelancers can view available jobs',
      });
    }

    // Only show jobs that are open and not yet assigned
    // Also exclude jobs posted by the same user (prevent client from seeing their own jobs as freelancer)
    const freelancerId = user._id || user.id;
    const jobs = await Job.find({
      status: 'open',
      assignedFreelancer: null,
      client: { $ne: freelancerId }, // Exclude jobs posted by the same user
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({
      success: true,
      jobs,
    });
  } catch (error) {
    console.error('Error getting available jobs for freelancer:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get available jobs',
    });
  }
});

/**
 * Get assigned jobs for freelancer
 * GET /api/freelancer/jobs/assigned
 * Requires authentication as freelancer
 */
router.get('/jobs/assigned', authenticate, async (req, res) => {
  try {
    const user = req.user;

    if (!user || user.role !== 'freelancer') {
      return res.status(403).json({
        success: false,
        error: 'Only freelancers can view assigned jobs',
      });
    }

    const freelancerId = user._id || user.id;

    // Jobs assigned to this freelancer and not fully completed from their side
    const jobs = await Job.find({
      assignedFreelancer: freelancerId,
      freelancerCompleted: false,
      status: { $in: ['assigned', 'work_done', 'completed'] },
    })
      .populate('client', 'fullName phone profilePhoto')
      .sort({ createdAt: -1 })
      .lean();

    // Attach commission summary for each job if exists
    const jobIds = jobs.map((job) => job._id);
    const commissions = await CommissionTransaction.find({
      freelancer: freelancerId,
      job: { $in: jobIds },
    }).lean();

    const commissionByJob = {};
    commissions.forEach((c) => {
      commissionByJob[c.job.toString()] = {
        jobAmount: c.jobAmount,
        platformCommission: c.platformCommission,
        amountReceived: c.amountReceived,
        duesPaid: c.duesPaid,
      };
    });

    // Ensure client profile photos are included
    const mappedJobs = await Promise.all(jobs.map(async (job) => {
      // If client exists but doesn't have profilePhoto, fetch it from User model
      if (job.client && !job.client.profilePhoto) {
        try {
          const clientUser = await User.findById(job.client._id || job.client).select('profilePhoto').lean();
          if (clientUser && clientUser.profilePhoto) {
            job.client.profilePhoto = clientUser.profilePhoto;
          }
        } catch (err) {
          console.error('Error fetching client profile photo:', err);
        }
      }
      
      return {
        ...job,
        commission: commissionByJob[job._id.toString()] || null,
      };
    }));

    res.json({
      success: true,
      jobs: mappedJobs,
    });
  } catch (error) {
    console.error('Error getting assigned jobs for freelancer:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get assigned jobs',
    });
  }
});

/**
 * Get completed orders for freelancer (order history)
 * GET /api/freelancer/orders
 * Requires authentication as freelancer
 */
router.get('/orders', authenticate, async (req, res) => {
  try {
    const user = req.user;

    if (!user || user.role !== 'freelancer') {
      return res.status(403).json({
        success: false,
        error: 'Only freelancers can view orders',
      });
    }

    const freelancerId = user._id || user.id;

    // Orders = jobs assigned to this freelancer that they've fully completed
    const jobs = await Job.find({
      assignedFreelancer: freelancerId,
      freelancerCompleted: true,
      status: 'completed',
    })
      .populate('client', 'fullName phone profilePhoto')
      .sort({ updatedAt: -1 })
      .lean();
    
    // Ensure client profile photos are included
    const jobsWithClientPhotos = await Promise.all(jobs.map(async (job) => {
      // If client exists but doesn't have profilePhoto, fetch it from User model
      if (job.client && !job.client.profilePhoto) {
        try {
          const clientUser = await User.findById(job.client._id || job.client).select('profilePhoto').lean();
          if (clientUser && clientUser.profilePhoto) {
            job.client.profilePhoto = clientUser.profilePhoto;
          }
        } catch (err) {
          console.error('Error fetching client profile photo:', err);
        }
      }
      return job;
    }));

    // Attach commission summary for each job if exists
    const jobIds = jobsWithClientPhotos.map((job) => job._id);
    const commissions = await CommissionTransaction.find({
      freelancer: freelancerId,
      job: { $in: jobIds },
    }).lean();

    const commissionByJob = {};
    commissions.forEach((c) => {
      commissionByJob[c.job.toString()] = {
        jobAmount: c.jobAmount,
        platformCommission: c.platformCommission,
        amountReceived: c.amountReceived,
        duesPaid: c.duesPaid,
      };
    });

    const mappedJobs = jobsWithClientPhotos.map((job) => ({
      ...job,
      commission: commissionByJob[job._id.toString()] || null,
    }));

    res.json({
      success: true,
      orders: mappedJobs,
    });
  } catch (error) {
    console.error('Error getting freelancer orders:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get orders',
    });
  }
});

/**
 * Pickup a job (assign job directly to freelancer)
 * POST /api/freelancer/jobs/:id/pickup
 * Requires authentication as freelancer
 */
router.post('/jobs/:id/pickup', authenticate, async (req, res) => {
  try {
    const user = req.user;

    if (!user || user.role !== 'freelancer') {
      return res.status(403).json({
        success: false,
        error: 'Only freelancers can pickup jobs',
      });
    }

    const freelancerId = user._id || user.id;

    // Check unpaid dues - cannot pickup jobs if dues > 450rs
    const unpaidCommissions = await CommissionTransaction.find({
      freelancer: freelancerId,
      duesPaid: false,
    }).lean();

    const totalDues = unpaidCommissions.reduce(
      (sum, c) => sum + (c.platformCommission || 0),
      0
    );

    const DUES_THRESHOLD = 450;
    if (totalDues >= DUES_THRESHOLD) {
      return res.status(400).json({
        success: false,
        error: `You have unpaid dues of ₹${totalDues}. Please pay dues in Wallet to pickup jobs.`,
      });
    }

    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    if (job.status !== 'open' || job.assignedFreelancer) {
      return res.status(400).json({
        success: false,
        error: 'Job is no longer available to pickup',
      });
    }

    job.assignedFreelancer = freelancerId;
    job.status = 'assigned';
    await job.save();

    // Notify client about job pickup
    try {
      const freelancer = await User.findById(freelancerId).select('fullName').lean();
      await notifyJobPickedUp(
        job.client.toString(),
        freelancer?.fullName || 'A freelancer',
        job.title
      );
    } catch (notifError) {
      console.error('Error sending job pickup notification to client:', notifError);
      // Don't fail the request if notification fails
    }

    // Notify freelancer about job assignment
    try {
      const client = await User.findById(job.client).select('fullName').lean();
      await notifyJobAssigned(
        freelancerId,
        client?.fullName || 'The client',
        job.title
      );
    } catch (notifError) {
      console.error('Error sending job assignment notification to freelancer:', notifError);
      // Don't fail the request if notification fails
    }

    res.json({
      success: true,
      message: 'Job picked up successfully',
      job,
    });
  } catch (error) {
    console.error('Error picking up job:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to pickup job',
    });
  }
});

/**
 * Make an offer on a job
 * POST /api/freelancer/jobs/:id/offer
 * Requires authentication as freelancer
 */
router.post('/jobs/:id/offer', authenticate, async (req, res) => {
  try {
    const user = req.user;

    if (!user || user.role !== 'freelancer') {
      return res.status(403).json({
        success: false,
        error: 'Only freelancers can make offers',
      });
    }

    const freelancerId = user._id || user.id;
    const { amount, message } = req.body || {};

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid offer amount is required',
      });
    }

    // Check unpaid dues - cannot make offers if dues > 450rs
    const unpaidCommissions = await CommissionTransaction.find({
      freelancer: freelancerId,
      duesPaid: false,
    }).lean();

    const totalDues = unpaidCommissions.reduce(
      (sum, c) => sum + (c.platformCommission || 0),
      0
    );

    const DUES_THRESHOLD = 450;
    if (totalDues >= DUES_THRESHOLD) {
      return res.status(400).json({
        success: false,
        error: `You have unpaid dues of ₹${totalDues}. Please pay dues in Wallet to make offers.`,
      });
    }

    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    if (job.status !== 'open' || job.assignedFreelancer) {
      return res.status(400).json({
        success: false,
        error: 'Cannot make offer on this job anymore',
      });
    }

    // Cooldown: 5 minutes between offers on same job
    const FIVE_MINUTES = 5 * 60 * 1000;
    const now = new Date();
    const existingOffers = job.offers || [];
    const myOffers = existingOffers.filter(
      (o) => o.freelancer.toString() === freelancerId.toString()
    );

    if (myOffers.length > 0) {
      const lastOffer = myOffers.reduce((latest, current) =>
        (latest.createdAt || new Date(0)) > (current.createdAt || new Date(0))
          ? latest
          : current
      );

      if (lastOffer.createdAt && now - lastOffer.createdAt < FIVE_MINUTES) {
        const remainingMs = FIVE_MINUTES - (now - lastOffer.createdAt);
        const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
        return res.status(400).json({
          success: false,
          error: `You can make another offer on this job in ${remainingMinutes} minute(s).`,
        });
      }
    }

    // Add new offer
    job.offers.push({
      freelancer: freelancerId,
      amount: Number(amount),
      message: message || null,
      status: 'pending',
      createdAt: now,
    });

    await job.save();

    // Notify client about new offer
    try {
      const freelancer = await User.findById(freelancerId).select('fullName').lean();
      await notifyOfferReceived(
        job.client.toString(),
        freelancer?.fullName || 'A freelancer',
        job.title,
        Number(amount)
      );
    } catch (notifError) {
      console.error('Error sending offer notification:', notifError);
      // Don't fail the request if notification fails
    }

    res.json({
      success: true,
      message: 'Offer submitted successfully',
      jobId: job._id,
    });
  } catch (error) {
    console.error('Error making offer on job:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to make offer',
    });
  }
});

/**
 * Mark work as done
 * POST /api/freelancer/jobs/:id/complete
 * Requires authentication as freelancer
 */
router.post('/jobs/:id/complete', authenticate, async (req, res) => {
  try {
    const user = req.user;

    if (!user || user.role !== 'freelancer') {
      return res.status(403).json({
        success: false,
        error: 'Only freelancers can mark work as done',
      });
    }

    const freelancerId = user._id || user.id;

    const job = await Job.findOne({
      _id: req.params.id,
      assignedFreelancer: freelancerId,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    if (job.status !== 'assigned') {
      return res.status(400).json({
        success: false,
        error: 'Only assigned jobs can be marked as work done',
      });
    }

    job.status = 'work_done';
    await job.save();

    // Notify client about work done
    try {
      const freelancer = await User.findById(freelancerId).select('fullName').lean();
      await notifyWorkDone(
        job.client.toString(),
        freelancer?.fullName || 'The freelancer',
        job.title
      );
    } catch (notifError) {
      console.error('Error sending work done notification:', notifError);
      // Don't fail the request if notification fails
    }

    res.json({
      success: true,
      message: 'Job marked as work done. Waiting for client payment.',
      job,
    });
  } catch (error) {
    console.error('Error marking work as done:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to mark work as done',
    });
  }
});

/**
 * Mark job as fully completed (remove from active list)
 * POST /api/freelancer/jobs/:id/fully-complete
 * Requires authentication as freelancer
 */
router.post('/jobs/:id/fully-complete', authenticate, async (req, res) => {
  try {
    const user = req.user;

    if (!user || user.role !== 'freelancer') {
      return res.status(403).json({
        success: false,
        error: 'Only freelancers can fully complete jobs',
      });
    }

    const freelancerId = user._id || user.id;

    const job = await Job.findOne({
      _id: req.params.id,
      assignedFreelancer: freelancerId,
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
        error: 'Only completed jobs can be fully completed',
      });
    }

    // Mark job as fully completed (commission payment is separate and can be done anytime)
    job.freelancerCompleted = true;
    await job.save();

    res.json({
      success: true,
      message: 'Job marked as completed and removed from active list.',
      job,
    });
  } catch (error) {
    console.error('Error fully completing job:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fully complete job',
    });
  }
});

/**
 * Get freelancer wallet data
 * GET /api/freelancer/wallet
 * Requires authentication as freelancer
 */
router.get('/wallet', authenticate, async (req, res) => {
  try {
    const user = req.user;

    if (!user || user.role !== 'freelancer') {
      return res.status(403).json({
        success: false,
        error: 'Only freelancers can view wallet',
      });
    }

    const freelancerId = user._id || user.id;

    // Get all commission transactions for this freelancer
    const transactions = await CommissionTransaction.find({
      freelancer: freelancerId,
    })
      .sort({ createdAt: -1 })
      .populate('job', 'title')
      .lean();

    // Calculate total dues (sum of unpaid commission amounts)
    const totalDues = transactions
      .filter((t) => !t.duesPaid)
      .reduce((sum, t) => sum + (t.platformCommission || 0), 0);

    // Freelancers can work if dues are < 450rs
    const DUES_THRESHOLD = 450;
    const canWork = totalDues < DUES_THRESHOLD;
    
    // Debug log to verify calculation
    console.log(`[Wallet API] totalDues: ${totalDues}, DUES_THRESHOLD: ${DUES_THRESHOLD}, canWork: ${canWork} (${totalDues} < ${DUES_THRESHOLD} = ${totalDues < DUES_THRESHOLD})`);

    // Map transactions to a frontend-friendly shape
    const mappedTransactions = transactions.map((t) => ({
      id: t._id.toString(),
      jobId: t.job?._id || t.job,
      jobTitle: t.jobTitle || t.job?.title || 'Job',
      clientName: t.clientName || null,
      jobAmount: t.jobAmount,
      platformCommission: t.platformCommission,
      amountReceived: t.amountReceived,
      duesPaid: t.duesPaid,
      duesPaidAt: t.duesPaidAt,
      duesPaymentOrderId: t.duesPaymentOrderId,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      status: t.duesPaid ? 'paid' : 'pending',
    }));

    // Get payment transactions (grouped by duesPaymentOrderId)
    // Each payment transaction represents one dues payment made by the user
    const paymentTransactionsMap = new Map();
    
    transactions
      .filter((t) => t.duesPaid && t.duesPaymentOrderId)
      .forEach((t) => {
        const orderId = t.duesPaymentOrderId;
        if (!paymentTransactionsMap.has(orderId)) {
          // First transaction with this order ID - create payment transaction
          paymentTransactionsMap.set(orderId, {
            id: orderId,
            orderId: orderId,
            paymentDate: t.duesPaidAt || t.updatedAt,
            amount: 0, // Will sum up all commissions paid in this payment
            transactionCount: 0,
            createdAt: t.duesPaidAt || t.updatedAt,
          });
        }
        // Add to the payment amount
        const paymentTx = paymentTransactionsMap.get(orderId);
        paymentTx.amount += t.platformCommission || 0;
        paymentTx.transactionCount += 1;
      });

    // Convert map to array and sort by payment date (newest first)
    const paymentTransactions = Array.from(paymentTransactionsMap.values())
      .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

    res.json({
      success: true,
      wallet: {
        totalDues,
        canWork,
        transactions: mappedTransactions,
        paymentTransactions, // New: List of dues payments made
      },
    });
  } catch (error) {
    console.error('Error getting freelancer wallet:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get wallet data',
    });
  }
});

/**
 * Pay dues (mark all unpaid commission as paid)
 * POST /api/freelancer/pay-dues
 * NOTE: PhonePe integration will be added later.
 */
router.post('/pay-dues', authenticate, async (req, res) => {
  try {
    const user = req.user;

    if (!user || user.role !== 'freelancer') {
      return res.status(403).json({
        success: false,
        error: 'Only freelancers can pay dues',
      });
    }

    const freelancerId = user._id || user.id;

    // In production, this will be triggered by PhonePe callback with orderId
    const now = new Date();
    const duesPaymentOrderId =
      req.body?.orderId ||
      `DUES_${freelancerId.toString()}_${now.getTime()}`;

    // Mark all unpaid transactions as paid
    await CommissionTransaction.updateMany(
      {
        freelancer: freelancerId,
        duesPaid: false,
      },
      {
        $set: {
          duesPaid: true,
          duesPaidAt: now,
          duesPaymentOrderId,
        },
      }
    );

    // Return updated wallet data
    const transactions = await CommissionTransaction.find({
      freelancer: freelancerId,
    })
      .sort({ createdAt: -1 })
      .lean();

    const totalDues = transactions
      .filter((t) => !t.duesPaid)
      .reduce((sum, t) => sum + (t.platformCommission || 0), 0);

    // Freelancers can work if dues are < 450rs
    const DUES_THRESHOLD = 450;
    const canWork = totalDues < DUES_THRESHOLD;

    const mappedTransactions = transactions.map((t) => ({
      id: t._id.toString(),
      jobId: t.job,
      jobTitle: t.jobTitle,
      clientName: t.clientName || null,
      jobAmount: t.jobAmount,
      platformCommission: t.platformCommission,
      amountReceived: t.amountReceived,
      duesPaid: t.duesPaid,
      duesPaidAt: t.duesPaidAt,
      duesPaymentOrderId: t.duesPaymentOrderId,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      status: t.duesPaid ? 'paid' : 'pending',
    }));

    res.json({
      success: true,
      wallet: {
        totalDues,
        canWork,
        transactions: mappedTransactions,
        lastOrderId: duesPaymentOrderId,
      },
    });
  } catch (error) {
    console.error('Error paying freelancer dues:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to pay dues',
    });
  }
});

/**
 * NOTE: The pay-dues route above is kept for backward compatibility.
 * For PhonePe integration, use /api/payment/create-dues-order instead.
 */

module.exports = router;

