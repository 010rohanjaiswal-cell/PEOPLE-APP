/**
 * User Routes - People App Backend
 * Routes for user profile management
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');
const FreelancerVerification = require('../models/FreelancerVerification');

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

    // Get verification details if user is a freelancer
    let verificationData = null;
    if (user.role === 'freelancer') {
      // Simple query - explicitly select fields we need, use .lean() for plain object
      const verification = await FreelancerVerification.findOne({ user: user._id })
        .select('fullName dob gender address status')
        .lean() // Convert to plain object
        .sort({ createdAt: -1 });
      
      // Fallback to string ID if not found
      const verificationToUse = verification || await FreelancerVerification.findOne({ user: user._id.toString() })
        .select('fullName dob gender address status')
        .lean() // Convert to plain object
        .sort({ createdAt: -1 });
      
      if (verificationToUse) {
        verificationData = {
          fullName: verificationToUse.fullName || null,
          dob: verificationToUse.dob || null,
          gender: verificationToUse.gender || null,
          address: verificationToUse.address || null,
        };
        console.log('📋 User profile - Found verification data:', verificationData);
      } else {
        console.log('⚠️ User profile - No verification found for user:', userId);
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
    console.error('Error getting user profile:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get user profile'
    });
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

module.exports = router;

