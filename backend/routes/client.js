/**
 * Client Routes - People App Backend
 *
 * Routes for client-specific actions (posting jobs, viewing jobs, etc.)
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Job = require('../models/Job');

/**
 * Post a new job
 * POST /api/client/jobs
 * Requires authentication as client
 */
router.post('/jobs', authenticate, async (req, res) => {
  try {
    const user = req.user;

    if (!user || user.role !== 'client') {
      return res.status(403).json({
        success: false,
        error: 'Only clients can post jobs',
      });
    }

    const { title, category, address, pincode, budget, gender, description } = req.body || {};

    // Basic validation to mirror mobile form
    if (!title || !category || !address || !pincode || !budget || !gender) {
      return res.status(400).json({
        success: false,
        error: 'Missing required job fields',
      });
    }

    const normalizedGender = String(gender).toLowerCase();
    if (!['male', 'female', 'any'].includes(normalizedGender)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid gender value',
      });
    }

    const job = await Job.create({
      client: user._id || user.id,
      title: String(title).trim(),
      category: String(category).trim(),
      address: String(address).trim(),
      pincode: String(pincode).trim(),
      budget: Number(budget),
      gender: normalizedGender,
      description: description ? String(description).trim() : null,
      status: 'open',
    });

    res.status(201).json({
      success: true,
      job,
    });
  } catch (error) {
    console.error('Error posting client job:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to post job',
    });
  }
});

/**
 * Get active jobs for client
 * GET /api/client/jobs/active
 */
router.get('/jobs/active', authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'client') {
      return res.status(403).json({
        success: false,
        error: 'Only clients can view their jobs',
      });
    }

    const jobs = await Job.find({
      client: user._id || user.id,
      status: { $in: ['open', 'assigned', 'work_done'] },
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      jobs,
    });
  } catch (error) {
    console.error('Error getting active client jobs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get active jobs',
    });
  }
});

/**
 * Get job history for client
 * GET /api/client/jobs/history
 */
router.get('/jobs/history', authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'client') {
      return res.status(403).json({
        success: false,
        error: 'Only clients can view their jobs',
      });
    }

    const jobs = await Job.find({
      client: user._id || user.id,
      status: 'completed',
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      jobs,
    });
  } catch (error) {
    console.error('Error getting client job history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get job history',
    });
  }
});

module.exports = router;


