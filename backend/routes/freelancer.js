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

    // Basic implementation: all open jobs
    const jobs = await Job.find({
      status: 'open',
    })
      .sort({ createdAt: -1 })
      .limit(100);

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

module.exports = router;

