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
      .populate('user', 'phone fullName profilePhoto role email');

    // Transform to ensure all fields are present and properly formatted for admin panel
    const formattedVerifications = verifications.map(verification => ({
      _id: verification._id,
      id: verification._id.toString(),
      // Freelancer Info
      fullName: verification.fullName || verification.user?.fullName || 'N/A',
      phone: verification.user?.phone || 'N/A',
      email: verification.user?.email || null,
      profilePhoto: verification.profilePhoto || verification.user?.profilePhoto || null,
      role: verification.user?.role || 'freelancer',
      // Verification Details
      dob: verification.dob || null,
      gender: verification.gender || null,
      address: verification.address || null,
      // Documents
      aadhaarFront: verification.aadhaarFront || null,
      aadhaarBack: verification.aadhaarBack || null,
      panCard: verification.panCard || null,
      // Status
      status: verification.status || 'pending',
      rejectionReason: verification.rejectionReason || null,
      // Timestamps
      createdAt: verification.createdAt,
      updatedAt: verification.updatedAt,
      // User reference (for admin actions)
      userId: verification.user?._id || verification.user,
    }));

    res.json({
      success: true,
      data: formattedVerifications,
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

// POST /api/admin/approve-freelancer/:verificationId
router.post('/approve-freelancer/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const verification = await FreelancerVerification.findById(id);
    if (!verification) {
      return res.status(404).json({
        success: false,
        error: 'Verification record not found',
      });
    }

    // Update verification record
    verification.status = 'approved';
    verification.rejectionReason = null;
    await verification.save();

    // Update related user
    if (verification.user) {
      await User.findByIdAndUpdate(verification.user, {
        verificationStatus: 'approved',
        verificationRejectionReason: null,
      });
    }

    res.json({
      success: true,
      message: 'Freelancer approved successfully',
      verification,
    });
  } catch (error) {
    console.error('Error approving freelancer:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to approve freelancer',
    });
  }
});

// POST /api/admin/reject-freelancer/:verificationId
router.post('/reject-freelancer/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    const verification = await FreelancerVerification.findById(id);
    if (!verification) {
      return res.status(404).json({
        success: false,
        error: 'Verification record not found',
      });
    }

    // Update verification record
    verification.status = 'rejected';
    verification.rejectionReason = reason || 'Rejected by admin';
    await verification.save();

    // Update related user
    if (verification.user) {
      await User.findByIdAndUpdate(verification.user, {
        verificationStatus: 'rejected',
        verificationRejectionReason: verification.rejectionReason,
      });
    }

    res.json({
      success: true,
      message: 'Freelancer rejected successfully',
      verification,
    });
  } catch (error) {
    console.error('Error rejecting freelancer:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reject freelancer',
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

