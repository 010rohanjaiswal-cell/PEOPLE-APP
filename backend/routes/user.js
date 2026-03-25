/**
 * User Routes - People App Backend
 * Routes for user profile management
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');
const PushToken = require('../models/PushToken');
const FreelancerVerification = require('../models/FreelancerVerification');
const multer = require('multer');
const streamifier = require('streamifier');
const cloudinary = require('../config/cloudinary');

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
 * Get current user profile
 * GET /api/user/profile
 * Requires authentication
 */
router.get('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    // Get user from database
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get the appropriate profile photo (freelancer verification photo takes priority)
    const profilePhoto = await getUserProfilePhoto(userId);

    // Get verification details if user is a freelancer (or has freelancer verification for display when both roles)
    let verificationData = null;
    const verification = await FreelancerVerification.findOne({ user: user._id })
      .select('fullName dob gender address status')
      .lean()
      .sort({ createdAt: -1 });
    const verificationToUse = verification || await FreelancerVerification.findOne({ user: user._id.toString() })
      .select('fullName dob gender address status')
      .lean()
      .sort({ createdAt: -1 });

    if (verificationToUse) {
      verificationData = {
        fullName: verificationToUse.fullName || null,
        dob: verificationToUse.dob || null,
        gender: verificationToUse.gender || null,
        address: verificationToUse.address || null,
      };
      if (user.role === 'freelancer') {
        console.log('📋 User profile - Found verification data:', verificationData);
      }
    } else if (user.role === 'freelancer') {
      console.log('⚠️ User profile - No verification found for user:', userId);
    }

    // When user has both roles (freelancer verification exists), use freelancer name/photo for display
    const displayFullName = (verificationToUse && verificationToUse.fullName) ? verificationToUse.fullName : (user.fullName || null);

    res.json({
      success: true,
      user: {
        id: user._id || user.id,
        phone: user.phone,
        role: user.role,
        fullName: displayFullName,
        profilePhoto: profilePhoto,
        email: user.email || null,
        verificationStatus: user.verificationStatus || null,
        verification: verificationData,
        averageRating: user.averageRating ?? 0,
        ratingCount: user.ratingCount ?? 0,
      }
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get user profile'
    });
  }
});

/**
 * Update current user profile (fullName + profile photo)
 * PUT /api/user/profile
 * multipart/form-data:
 * - fullName?: string
 * - image?: file
 */
router.put('/profile', authenticate, upload.single('image'), async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const fullName = (req.body?.fullName || '').trim();
    if (fullName) user.fullName = fullName;

    if (req.file?.buffer) {
      const folderBase = `people-app/users/${user._id.toString()}`;
      const photoUrl = await uploadToCloudinary(req.file.buffer, `${folderBase}/profile`);
      user.profilePhoto = photoUrl;
    }

    await user.save();

    // Return profile in the same shape as GET /profile
    const profilePhoto = await getUserProfilePhoto(userId);
    return res.json({
      success: true,
      user: {
        id: user._id || user.id,
        phone: user.phone,
        role: user.role,
        fullName: user.fullName || null,
        profilePhoto,
        email: user.email || null,
        verificationStatus: user.verificationStatus || null,
        averageRating: user.averageRating ?? 0,
        ratingCount: user.ratingCount ?? 0,
      },
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to update profile' });
  }
});

/**
 * Get user profile by ID (for viewing other users' profiles)
 * GET /api/user/profile/:userId
 * Requires authentication
 */
router.get('/profile/:userId', authenticate, async (req, res) => {
  try {
    const userId = req.params.userId;
    const currentUserId = req.user.id || req.user._id;

    // Get user from database
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get the appropriate profile photo (freelancer verification photo takes priority)
    const profilePhoto = await getUserProfilePhoto(userId);

    // Get verification details if user is a freelancer
    let verificationData = null;
    if (user.role === 'freelancer') {
      // Simple query - explicitly select fields we need, use .lean() for plain object
      const verification = await FreelancerVerification.findOne({ user: user._id })
        .select('fullName dob gender address profilePhoto')
        .lean() // Convert to plain object
        .sort({ createdAt: -1 });
      
      // Fallback to string ID if not found
      const verificationToUse = verification || await FreelancerVerification.findOne({ user: user._id.toString() })
        .select('fullName dob gender address profilePhoto')
        .lean() // Convert to plain object
        .sort({ createdAt: -1 });
      
      if (verificationToUse) {
        verificationData = {
          fullName: verificationToUse.fullName || null,
          dob: verificationToUse.dob || null,
          gender: verificationToUse.gender || null,
          address: verificationToUse.address || null,
          profilePhoto: verificationToUse.profilePhoto || null,
        };
        console.log('📋 User profile by ID - Found verification data:', verificationData);
      } else {
        console.log('⚠️ User profile by ID - No verification found for user:', userId);
      }
    }

    res.json({
      success: true,
      user: {
        id: user._id || user.id,
        phone: user.phone,
        role: user.role,
        fullName: user.fullName || null,
        profilePhoto: profilePhoto, // Use the helper function result
        email: user.email || null,
        verificationStatus: user.verificationStatus || null,
        verification: verificationData, // Include verification details for freelancers
      }
    });
  } catch (error) {
    console.error('Error getting user profile by ID:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get user profile'
    });
  }
});

/**
 * Register Expo push token for push notifications
 * POST /api/user/push-token
 * Body: { expoPushToken: string, platform?: 'android'|'ios' }
 * Requires authentication
 */
router.post('/push-token', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { expoPushToken, platform } = req.body || {};
    const token = (expoPushToken || '').trim();
    if (!token || !token.startsWith('ExponentPushToken[')) {
      return res.status(400).json({
        success: false,
        error: 'Valid Expo push token required',
      });
    }
    await PushToken.findOneAndUpdate(
      { user: userId, expoPushToken: token },
      { user: userId, expoPushToken: token, platform: platform || null },
      { upsert: true, new: true }
    );
    res.json({ success: true, message: 'Push token registered' });
  } catch (error) {
    console.error('Error registering push token:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to register push token',
    });
  }
});

module.exports = router;

