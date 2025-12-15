/**
 * Freelancer Routes - People App Backend
 * Routes for freelancer-specific features
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');

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
        // Add more fields as needed when Verification model is created
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

module.exports = router;

