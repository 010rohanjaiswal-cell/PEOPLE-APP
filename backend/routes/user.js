/**
 * User Routes - People App Backend
 * Routes for user profile management
 */

const express = require('express');
const router = express.Router();
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

module.exports = router;

