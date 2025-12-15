/**
 * Admin Routes - People App Backend
 * Minimal stub to avoid 404s; extend with real data later
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/admin/freelancer-verifications?status=pending
router.get('/freelancer-verifications', authenticate, requireRole('admin'), async (req, res) => {
  const { status } = req.query;
  // TODO: Replace with real verification data
  res.json({
    success: true,
    data: [],
    status: status || 'all',
  });
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

module.exports = router;

