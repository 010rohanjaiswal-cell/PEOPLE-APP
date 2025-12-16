/**
 * Freelancer Routes - People App Backend
 * Routes for freelancer-specific features
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');
const FreelancerVerification = require('../models/FreelancerVerification');
const Job = require('../models/Job');
const CommissionTransaction = require('../models/CommissionTransaction');
const multer = require('multer');
const streamifier = require('streamifier');
const cloudinary = require('../config/cloudinary');

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

    // For now, check if user has verification fields
    // In production, you would check a separate Verification collection
    // For now, we'll return a status based on user data
    // If the user exists and is a freelancer, we'll check for verification status
    
    // TODO: In production, check Verification collection for actual status
    // Default to null so new freelancers see "Verification Required" until they submit
    const verificationStatus = user.verificationStatus || null;

    res.json({
      success: true,
      status: verificationStatus,
      verification: {
        status: verificationStatus,
        rejectionReason: user.verificationRejectionReason || null,
      }
    });

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
    const jobs = await Job.find({
      status: 'open',
      assignedFreelancer: null,
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
      .populate('client', 'fullName phone')
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

    const mappedJobs = jobs.map((job) => ({
      ...job,
      commission: commissionByJob[job._id.toString()] || null,
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
      .populate('client', 'fullName phone')
      .sort({ updatedAt: -1 })
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

    const mappedJobs = jobs.map((job) => ({
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

    // Check unpaid dues - cannot pickup jobs if dues > 0
    const unpaidCommissions = await CommissionTransaction.find({
      freelancer: freelancerId,
      duesPaid: false,
    }).lean();

    const totalDues = unpaidCommissions.reduce(
      (sum, c) => sum + (c.platformCommission || 0),
      0
    );

    if (totalDues > 0) {
      return res.status(400).json({
        success: false,
        error: 'You have unpaid commission dues. Pay dues in Wallet to pickup jobs.',
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

    // Check unpaid dues - cannot make offers if dues > 0
    const unpaidCommissions = await CommissionTransaction.find({
      freelancer: freelancerId,
      duesPaid: false,
    }).lean();

    const totalDues = unpaidCommissions.reduce(
      (sum, c) => sum + (c.platformCommission || 0),
      0
    );

    if (totalDues > 0) {
      return res.status(400).json({
        success: false,
        error: 'You have unpaid commission dues. Pay dues in Wallet to make offers.',
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

    const canWork = totalDues <= 0;

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

    res.json({
      success: true,
      wallet: {
        totalDues,
        canWork,
        transactions: mappedTransactions,
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

    const canWork = totalDues <= 0;

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

