/**
 * Admin Routes - People App Backend
 * Minimal stub to avoid 404s; extend with real data later
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const FreelancerVerification = require('../models/FreelancerVerification');
const User = require('../models/User');

// GET /api/admin/freelancer-verifications?status=pending
router.get('/freelancer-verifications', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.query;

    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const verifications = await FreelancerVerification.find(query)
      .sort({ createdAt: -1 })
      .populate('user', 'phone fullName profilePhoto role');

    res.json({
      success: true,
      data: verifications,
      status: status || 'all',
    });
  } catch (error) {
    console.error('Error fetching freelancer verifications:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to load freelancer verifications',
    });
  }
});

// GET /api/admin/withdrawal-requests?status=pending
router.get('/withdrawal-requests', authenticate, requireRole('admin'), async (req, res) => {
  const { status } = req.query;
  // TODO: Replace with real withdrawal data
  res.json({
    success: true,
    data: [],
    status: status || 'all',
  });
});

// GET /api/admin/search-users?phoneNumber=
router.get('/search-users', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { phoneNumber } = req.query;

    if (!phoneNumber) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const users = await User.find({
      phone: { $regex: phoneNumber, $options: 'i' },
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search users',
    });
  }
});

module.exports = router;

