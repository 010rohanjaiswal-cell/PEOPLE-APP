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
    })
      .populate('assignedFreelancer', 'fullName profilePhoto phone')
      .populate('offers.freelancer', 'fullName profilePhoto phone')
      .sort({ createdAt: -1 });

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
    })
      .populate('assignedFreelancer', 'fullName profilePhoto phone')
      .sort({ createdAt: -1 });

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

/**
 * Update a job
 * PUT /api/client/jobs/:id
 * Requires authentication as client and job ownership
 */
router.put('/jobs/:id', authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'client') {
      return res.status(403).json({
        success: false,
        error: 'Only clients can update jobs',
      });
    }

    const job = await Job.findOne({
      _id: req.params.id,
      client: user._id || user.id,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    // Only allow editing if job is open and no offers accepted
    if (job.status !== 'open') {
      return res.status(400).json({
        success: false,
        error: 'Can only edit jobs with status "open"',
      });
    }

    const hasAcceptedOffers = job.offers && job.offers.some((offer) => offer.status === 'accepted');
    if (hasAcceptedOffers) {
      return res.status(400).json({
        success: false,
        error: 'Cannot edit job with accepted offers',
      });
    }

    const { title, category, address, pincode, budget, gender, description } = req.body || {};

    if (title) job.title = String(title).trim();
    if (category) job.category = String(category).trim();
    if (address) job.address = String(address).trim();
    if (pincode) job.pincode = String(pincode).trim();
    if (budget !== undefined) job.budget = Number(budget);
    if (gender) {
      const normalizedGender = String(gender).toLowerCase();
      if (!['male', 'female', 'any'].includes(normalizedGender)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid gender value',
        });
      }
      job.gender = normalizedGender;
    }
    if (description !== undefined) job.description = description ? String(description).trim() : null;

    await job.save();

    res.json({
      success: true,
      job,
    });
  } catch (error) {
    console.error('Error updating client job:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update job',
    });
  }
});

/**
 * Delete a job
 * DELETE /api/client/jobs/:id
 * Requires authentication as client and job ownership
 */
router.delete('/jobs/:id', authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'client') {
      return res.status(403).json({
        success: false,
        error: 'Only clients can delete jobs',
      });
    }

    const job = await Job.findOne({
      _id: req.params.id,
      client: user._id || user.id,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    // Only allow deleting if job is open and no offers accepted
    if (job.status !== 'open') {
      return res.status(400).json({
        success: false,
        error: 'Can only delete jobs with status "open"',
      });
    }

    const hasAcceptedOffers = job.offers && job.offers.some((offer) => offer.status === 'accepted');
    if (hasAcceptedOffers) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete job with accepted offers',
      });
    }

    await job.deleteOne();

    res.json({
      success: true,
      message: 'Job deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting client job:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete job',
    });
  }
});

/**
 * Get offers for a job
 * GET /api/client/jobs/:id/offers
 * Requires authentication as client and job ownership
 */
router.get('/jobs/:id/offers', authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'client') {
      return res.status(403).json({
        success: false,
        error: 'Only clients can view job offers',
      });
    }

    const job = await Job.findOne({
      _id: req.params.id,
      client: user._id || user.id,
    }).populate('offers.freelancer', 'fullName profilePhoto phone');

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    res.json({
      success: true,
      offers: job.offers || [],
    });
  } catch (error) {
    console.error('Error getting job offers:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get job offers',
    });
  }
});

/**
 * Accept an offer
 * POST /api/client/jobs/:id/accept-offer
 * Requires authentication as client and job ownership
 */
router.post('/jobs/:id/accept-offer', authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'client') {
      return res.status(403).json({
        success: false,
        error: 'Only clients can accept offers',
      });
    }

    const { offerId } = req.body;
    if (!offerId) {
      return res.status(400).json({
        success: false,
        error: 'Offer ID is required',
      });
    }

    const job = await Job.findOne({
      _id: req.params.id,
      client: user._id || user.id,
    }).populate('offers.freelancer', 'fullName profilePhoto phone');

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    if (job.status !== 'open') {
      return res.status(400).json({
        success: false,
        error: 'Can only accept offers for jobs with status "open"',
      });
    }

    const offer = job.offers.id(offerId);
    if (!offer) {
      return res.status(404).json({
        success: false,
        error: 'Offer not found',
      });
    }

    if (offer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Offer has already been processed',
      });
    }

    // Accept the offer
    offer.status = 'accepted';
    // Reject all other pending offers
    job.offers.forEach((o) => {
      if (o._id.toString() !== offerId && o.status === 'pending') {
        o.status = 'rejected';
      }
    });

    // Assign job to freelancer and update status
    job.assignedFreelancer = offer.freelancer._id || offer.freelancer;
    job.status = 'assigned';

    await job.save();

    res.json({
      success: true,
      message: 'Offer accepted successfully',
      job,
    });
  } catch (error) {
    console.error('Error accepting offer:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to accept offer',
    });
  }
});

/**
 * Reject an offer
 * POST /api/client/jobs/:id/reject-offer
 * Requires authentication as client and job ownership
 */
router.post('/jobs/:id/reject-offer', authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'client') {
      return res.status(403).json({
        success: false,
        error: 'Only clients can reject offers',
      });
    }

    const { offerId } = req.body;
    if (!offerId) {
      return res.status(400).json({
        success: false,
        error: 'Offer ID is required',
      });
    }

    const job = await Job.findOne({
      _id: req.params.id,
      client: user._id || user.id,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    const offer = job.offers.id(offerId);
    if (!offer) {
      return res.status(404).json({
        success: false,
        error: 'Offer not found',
      });
    }

    if (offer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Offer has already been processed',
      });
    }

    offer.status = 'rejected';
    await job.save();

    res.json({
      success: true,
      message: 'Offer rejected successfully',
      job,
    });
  } catch (error) {
    console.error('Error rejecting offer:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reject offer',
    });
  }
});

/**
 * Mark job as paid
 * POST /api/client/jobs/:id/pay
 * Requires authentication as client and job ownership
 */
router.post('/jobs/:id/pay', authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'client') {
      return res.status(403).json({
        success: false,
        error: 'Only clients can mark jobs as paid',
      });
    }

    const job = await Job.findOne({
      _id: req.params.id,
      client: user._id || user.id,
    }).populate('assignedFreelancer', 'fullName profilePhoto phone');

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    if (job.status !== 'work_done') {
      return res.status(400).json({
        success: false,
        error: 'Can only pay for jobs with status "work_done"',
      });
    }

    if (!job.assignedFreelancer) {
      return res.status(400).json({
        success: false,
        error: 'Job has no assigned freelancer',
      });
    }

    // Update job status to completed
    job.status = 'completed';

    // TODO: Add commission to freelancer's ledger (will be implemented in Phase 4)
    // For now, just mark the job as completed

    await job.save();

    res.json({
      success: true,
      message: 'Job marked as paid successfully',
      job,
    });
  } catch (error) {
    console.error('Error marking job as paid:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to mark job as paid',
    });
  }
});

module.exports = router;


