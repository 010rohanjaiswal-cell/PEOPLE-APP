/**
 * Support Routes - People App Backend
 * Persists chatbot sessions as tickets.
 */

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const SupportTicket = require('../models/SupportTicket');
const Job = require('../models/Job');
const User = require('../models/User');

const BOT_BLOCKED_8H_KEY = 'supportTicket.bot.blocked8hAndEnd';

function now() {
  return new Date();
}

function hoursFromNow(h) {
  return new Date(Date.now() + h * 60 * 60 * 1000);
}

/** Freelancer-only: cancel-order / unassign-from-freelancer side of support. */
function requireFreelancer(req, res) {
  const user = req.user;
  if (!user || user.role !== 'freelancer') {
    res.status(403).json({
      success: false,
      error: 'Only freelancers can use this support action (order cancellation).',
    });
    return null;
  }
  return user;
}

/** Freelancers and clients can open support tickets (separate flows in the app). */
function requireSupportUser(req, res) {
  const user = req.user;
  if (!user || (user.role !== 'freelancer' && user.role !== 'client')) {
    res.status(403).json({ success: false, error: 'Support is not available for this account' });
    return null;
  }
  return user;
}

function requireClient(req, res) {
  const user = req.user;
  if (!user || user.role !== 'client') {
    res.status(403).json({ success: false, error: 'Only clients can use this action' });
    return null;
  }
  return user;
}

function buildClientStart() {
  const greeting = { sender: 'bot', textKey: 'supportClientBot.greeting', createdAt: now() };
  return {
    currentNodeId: 'client_root',
    messages: [
      greeting,
      { sender: 'bot', textKey: 'supportClientBot.root.text', createdAt: now() },
    ],
  };
}

/**
 * Start a new support ticket
 * POST /api/support/tickets/start
 */
router.post('/tickets/start', authenticate, async (req, res) => {
  try {
    const user = requireSupportUser(req, res);
    if (!user) return;

    // Resume latest open ticket if it exists (prevents creating multiple open tickets)
    const existing = await SupportTicket.findOne({ user: user._id, status: 'open' })
      .sort({ updatedAt: -1 });
    if (existing) {
      return res.json({ success: true, ticket: existing, resumed: true });
    }

    if (user.role === 'client') {
      const { messages, currentNodeId } = buildClientStart();
      const ticket = await SupportTicket.create({
        user: user._id,
        status: 'open',
        currentNodeId,
        messages,
      });
      return res.json({ success: true, ticket, resumed: false });
    }

    const ticket = await SupportTicket.create({
      user: user._id,
      status: 'open',
      currentNodeId: 'root',
      messages: [
        { sender: 'bot', textKey: 'supportBot.greeting', createdAt: now() },
        { sender: 'bot', textKey: 'supportBot.root.text', createdAt: now() },
      ],
    });

    res.json({ success: true, ticket, resumed: false });
  } catch (e) {
    console.error('Error starting support ticket:', e);
    res.status(500).json({ success: false, error: e?.message || 'Failed to start ticket' });
  }
});

/** Max tickets stored per user; older tickets are removed when listing. */
const SUPPORT_TICKETS_RETAIN = 7;

/**
 * List recent tickets for current user (keeps only the latest SUPPORT_TICKETS_RETAIN; deletes the rest).
 * GET /api/support/tickets?limit=7
 */
router.get('/tickets', authenticate, async (req, res) => {
  try {
    const user = requireSupportUser(req, res);
    if (!user) return;

    const limit = Math.min(
      Math.max(parseInt(req.query.limit || String(SUPPORT_TICKETS_RETAIN), 10) || SUPPORT_TICKETS_RETAIN, 1),
      SUPPORT_TICKETS_RETAIN
    );

    const keep = await SupportTicket.find({ user: user._id })
      .sort({ updatedAt: -1 })
      .limit(SUPPORT_TICKETS_RETAIN)
      .select('_id')
      .lean();
    const keepIds = keep.map((t) => t._id);

    if (keepIds.length > 0) {
      await SupportTicket.deleteMany({ user: user._id, _id: { $nin: keepIds } });
    }

    const tickets = await SupportTicket.find({ user: user._id })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    res.json({ success: true, tickets });
  } catch (e) {
    console.error('Error listing support tickets:', e);
    res.status(500).json({ success: false, error: e?.message || 'Failed to load tickets' });
  }
});

/**
 * Get a ticket (for resume)
 * GET /api/support/tickets/:id
 */
router.get('/tickets/:id', authenticate, async (req, res) => {
  try {
    const user = requireSupportUser(req, res);
    if (!user) return;

    const ticket = await SupportTicket.findOne({ _id: req.params.id, user: user._id }).lean();
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

    res.json({ success: true, ticket });
  } catch (e) {
    console.error('Error getting support ticket:', e);
    res.status(500).json({ success: false, error: e?.message || 'Failed to load ticket' });
  }
});

/**
 * Append messages and move node (mobile drives the flow)
 * POST /api/support/tickets/:id/append
 * Body: { userText?: string, botText?: string, nextNodeId?: string }
 */
router.post('/tickets/:id/append', authenticate, async (req, res) => {
  try {
    const user = requireSupportUser(req, res);
    if (!user) return;

    const {
      userText,
      userTextKey,
      userParams,
      botText,
      nextNodeId,
      botTextKey,
      botParams,
    } = req.body || {};

    const ticket = await SupportTicket.findOne({ _id: req.params.id, user: user._id });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });
    if (ticket.status !== 'open') return res.status(400).json({ success: false, error: 'Ticket is not open' });

    if (typeof userTextKey === 'string' && userTextKey.trim()) {
      ticket.messages.push({
        sender: 'user',
        textKey: userTextKey.trim(),
        params: userParams || null,
        createdAt: now(),
      });
    } else if (typeof userText === 'string' && userText.trim()) {
      // Backward compatible
      ticket.messages.push({ sender: 'user', text: userText.trim(), createdAt: now() });
    }
    if (typeof botTextKey === 'string' && botTextKey.trim()) {
      ticket.messages.push({ sender: 'bot', textKey: botTextKey.trim(), params: botParams || null, createdAt: now() });
    } else if (typeof botText === 'string' && botText.trim()) {
      // Backward compatible
      ticket.messages.push({ sender: 'bot', text: botText.trim(), createdAt: now() });
    }
    if (typeof nextNodeId === 'string' && nextNodeId.trim()) {
      ticket.currentNodeId = nextNodeId.trim();
    }

    await ticket.save();
    res.json({ success: true, ticket });
  } catch (e) {
    console.error('Error appending support ticket:', e);
    res.status(500).json({ success: false, error: e?.message || 'Failed to update ticket' });
  }
});

/**
 * Cancel order action:
 * - If freelancer has an assigned job, unassign them (job -> open)
 * - Sets User.freelancerPickupBlockedUntil (~8h); pickup/apply/offer are blocked until then
 * POST /api/support/tickets/:id/actions/cancel-order
 */
router.post('/tickets/:id/actions/cancel-order', authenticate, async (req, res) => {
  try {
    const user = requireFreelancer(req, res);
    if (!user) return;

    const ticket = await SupportTicket.findOne({ _id: req.params.id, user: user._id });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });
    if (ticket.status !== 'open') return res.status(400).json({ success: false, error: 'Ticket is not open' });

    const freelancerId = user._id;
    let freelancerOid = freelancerId;
    if (!(freelancerId instanceof mongoose.Types.ObjectId)) {
      try {
        freelancerOid = new mongoose.Types.ObjectId(String(freelancerId));
      } catch {
        freelancerOid = freelancerId;
      }
    }

    const job = await Job.findOne({
      assignedFreelancer: freelancerOid,
      status: { $in: ['assigned', 'work_done'] },
    });

    let unassignedJobId = null;
    if (job) {
      job.assignedFreelancer = null;
      job.status = 'open';
      job.freelancerCompleted = false;
      await job.save();
      unassignedJobId = job._id;
    }

    ticket.effects.unassignedJobId = unassignedJobId;
    if (unassignedJobId) {
      const blockedUntil = hoursFromNow(8);
      await User.updateOne(
        { _id: freelancerId },
        { $set: { freelancerPickupBlockedUntil: blockedUntil } }
      );
      ticket.effects.pickupBlockedUntil = blockedUntil;
      ticket.messages.push({
        sender: 'system',
        textKey: 'supportTicket.system.unassigned',
        meta: { unassignedJobId, blockedUntil },
        createdAt: now(),
      });
      ticket.messages.push({
        sender: 'bot',
        textKey: 'supportTicket.bot.blocked8hAndEnd',
        params: { hours: 8 },
        createdAt: now(),
      });
      ticket.currentNodeId = 'end_ready';
    } else {
      ticket.effects.pickupBlockedUntil = null;
      // Drop stale 8h bubbles from earlier sessions/bugs so "no job" path never shows them
      ticket.messages = ticket.messages.filter((m) => m.textKey !== BOT_BLOCKED_8H_KEY);
      ticket.messages.push({
        sender: 'system',
        textKey: 'supportTicket.system.noAssignedJob',
        meta: { unassignedJobId: null },
        createdAt: now(),
      });
      ticket.messages.push({
        sender: 'bot',
        textKey: 'supportBot.endReady.text',
        createdAt: now(),
      });
      // Same leaf as successful unassign: user can complete the ticket (no 8h block)
      ticket.currentNodeId = 'end_ready';
    }
    await ticket.save();

    res.json({
      success: true,
      unassigned: Boolean(unassignedJobId),
      unassignedJobId,
      pickupBlockedUntil: ticket.effects.pickupBlockedUntil,
      ticket,
    });
  } catch (e) {
    console.error('Error cancel-order action:', e);
    res.status(500).json({ success: false, error: e?.message || 'Failed to cancel order action' });
  }
});

/**
 * Client: unassign freelancer from their active job (mirrors freelancer cancel-order on that job).
 * POST /api/support/tickets/:id/actions/client-unassign
 */
router.post('/tickets/:id/actions/client-unassign', authenticate, async (req, res) => {
  try {
    const user = requireClient(req, res);
    if (!user) return;

    const ticket = await SupportTicket.findOne({ _id: req.params.id, user: user._id });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });
    if (ticket.status !== 'open') return res.status(400).json({ success: false, error: 'Ticket is not open' });

    const clientOid =
      user._id instanceof mongoose.Types.ObjectId
        ? user._id
        : new mongoose.Types.ObjectId(String(user._id));

    const job = await Job.findOne({
      client: clientOid,
      assignedFreelancer: { $ne: null },
      status: { $in: ['assigned', 'work_done'] },
    }).sort({ updatedAt: -1 });

    let unassignedJobId = null;
    let freelancerId = null;
    if (job) {
      freelancerId = job.assignedFreelancer;
      job.assignedFreelancer = null;
      job.status = 'open';
      job.freelancerCompleted = false;
      await job.save();
      unassignedJobId = job._id;
    }

    ticket.effects.unassignedJobId = unassignedJobId;
    if (unassignedJobId && freelancerId) {
      const blockedUntil = hoursFromNow(8);
      await User.updateOne(
        { _id: freelancerId },
        { $set: { freelancerPickupBlockedUntil: blockedUntil } }
      );
      ticket.effects.pickupBlockedUntil = blockedUntil;
      ticket.messages.push({
        sender: 'system',
        textKey: 'supportTicket.system.unassigned',
        meta: { unassignedJobId, blockedUntil },
        createdAt: now(),
      });
      ticket.messages.push({
        sender: 'bot',
        textKey: 'supportTicket.bot.blocked8hAndEnd',
        params: { hours: 8 },
        createdAt: now(),
      });
      ticket.currentNodeId = 'end_ready';
    } else {
      ticket.effects.pickupBlockedUntil = null;
      ticket.messages = ticket.messages.filter((m) => m.textKey !== BOT_BLOCKED_8H_KEY);
      ticket.messages.push({
        sender: 'system',
        textKey: 'supportClientBot.system.noAssignedJob',
        meta: {},
        createdAt: now(),
      });
      ticket.messages.push({
        sender: 'bot',
        textKey: 'supportBot.endReady.text',
        createdAt: now(),
      });
      ticket.currentNodeId = 'end_ready';
    }
    await ticket.save();

    res.json({
      success: true,
      unassigned: Boolean(unassignedJobId),
      unassignedJobId,
      pickupBlockedUntil: ticket.effects.pickupBlockedUntil,
      ticket,
    });
  } catch (e) {
    console.error('Error client-unassign action:', e);
    res.status(500).json({ success: false, error: e?.message || 'Failed to unassign' });
  }
});

/**
 * Client: confirm delete after "Was this your job?" Yes — blocks if work_done, else deletes job.
 * POST /api/support/tickets/:id/actions/client-confirm-delete-job
 * Body: { jobId: string }
 */
router.post('/tickets/:id/actions/client-confirm-delete-job', authenticate, async (req, res) => {
  try {
    const user = requireClient(req, res);
    if (!user) return;

    const rawId = req.body?.jobId;
    if (!rawId || !mongoose.Types.ObjectId.isValid(String(rawId))) {
      return res.status(400).json({ success: false, error: 'Invalid jobId' });
    }

    const ticket = await SupportTicket.findOne({ _id: req.params.id, user: user._id });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });
    if (ticket.status !== 'open') return res.status(400).json({ success: false, error: 'Ticket is not open' });

    const clientOid =
      user._id instanceof mongoose.Types.ObjectId
        ? user._id
        : new mongoose.Types.ObjectId(String(user._id));
    const jid = new mongoose.Types.ObjectId(String(rawId));

    const job = await Job.findOne({ _id: jid, client: clientOid });
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const title = job.title || '';

    ticket.messages.push({
      sender: 'user',
      textKey: 'supportBot.common.yes',
      createdAt: now(),
    });

    if (job.status === 'work_done') {
      ticket.messages.push({
        sender: 'bot',
        textKey: 'supportClientBot.cancelCannotWorkDone',
        createdAt: now(),
      });
      ticket.messages.push({
        sender: 'bot',
        textKey: 'supportBot.endReady.text',
        createdAt: now(),
      });
      ticket.currentNodeId = 'end_ready';
      await ticket.save();
      return res.json({ success: true, ticket, deleted: false, reason: 'work_done' });
    }

    if (job.status === 'completed' || job.status === 'cancelled') {
      ticket.messages.push({
        sender: 'bot',
        textKey: 'supportClientBot.cancelJobAlreadyClosed',
        params: { title },
        createdAt: now(),
      });
      ticket.messages.push({
        sender: 'bot',
        textKey: 'supportBot.endReady.text',
        createdAt: now(),
      });
      ticket.currentNodeId = 'end_ready';
      await ticket.save();
      return res.json({ success: true, ticket, deleted: false });
    }

    await job.deleteOne();

    ticket.messages.push({
      sender: 'bot',
      textKey: 'supportClientBot.cancelJobDeleted',
      params: { title },
      createdAt: now(),
    });
    ticket.messages.push({
      sender: 'bot',
      textKey: 'supportBot.endReady.text',
      createdAt: now(),
    });
    ticket.currentNodeId = 'end_ready';
    await ticket.save();

    return res.json({ success: true, ticket, deleted: true, jobId: jid });
  } catch (e) {
    console.error('Error client-confirm-delete-job:', e);
    res.status(500).json({ success: false, error: e?.message || 'Failed to delete job' });
  }
});

/**
 * Client: cancel an active job (not completed) — sets status to cancelled.
 * POST /api/support/tickets/:id/actions/client-cancel-job
 */
router.post('/tickets/:id/actions/client-cancel-job', authenticate, async (req, res) => {
  try {
    const user = requireClient(req, res);
    if (!user) return;

    const ticket = await SupportTicket.findOne({ _id: req.params.id, user: user._id });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });
    if (ticket.status !== 'open') return res.status(400).json({ success: false, error: 'Ticket is not open' });

    const clientOid =
      user._id instanceof mongoose.Types.ObjectId
        ? user._id
        : new mongoose.Types.ObjectId(String(user._id));

    const job = await Job.findOne({
      client: clientOid,
      status: { $nin: ['completed', 'cancelled'] },
    }).sort({ updatedAt: -1 });

    if (!job) {
      ticket.messages.push({
        sender: 'bot',
        textKey: 'supportClientBot.system.noJobToCancel',
        createdAt: now(),
      });
      ticket.messages.push({
        sender: 'bot',
        textKey: 'supportBot.endReady.text',
        createdAt: now(),
      });
      ticket.currentNodeId = 'end_ready';
      await ticket.save();
      return res.json({ success: true, cancelled: false, ticket });
    }

    job.status = 'cancelled';
    job.assignedFreelancer = null;
    job.freelancerCompleted = false;
    await job.save();

    ticket.messages.push({
      sender: 'system',
      textKey: 'supportClientBot.system.jobCancelled',
      params: { title: job.title || '' },
      createdAt: now(),
    });
    ticket.messages.push({
      sender: 'bot',
      textKey: 'supportBot.endReady.text',
      createdAt: now(),
    });
    ticket.currentNodeId = 'end_ready';
    await ticket.save();

    res.json({
      success: true,
      cancelled: true,
      jobId: job._id,
      ticket,
    });
  } catch (e) {
    console.error('Error client-cancel-job action:', e);
    res.status(500).json({ success: false, error: e?.message || 'Failed to cancel job' });
  }
});

/**
 * Complete ticket
 * POST /api/support/tickets/:id/complete
 */
router.post('/tickets/:id/complete', authenticate, async (req, res) => {
  try {
    const user = requireSupportUser(req, res);
    if (!user) return;

    const ticket = await SupportTicket.findOne({ _id: req.params.id, user: user._id });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

    ticket.status = 'completed';
    ticket.currentNodeId = 'completed';
    ticket.messages.push({ sender: 'system', textKey: 'supportTicket.system.completed', createdAt: now() });
    await ticket.save();

    res.json({ success: true, ticket });
  } catch (e) {
    console.error('Error completing ticket:', e);
    res.status(500).json({ success: false, error: e?.message || 'Failed to complete ticket' });
  }
});

module.exports = router;

