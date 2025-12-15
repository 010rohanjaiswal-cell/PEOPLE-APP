/**
 * Freelancer Routes - People App Backend
 * Routes for freelancer-specific features
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');
const FreelancerVerification = require('../models/FreelancerVerification');
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

module.exports = router;

