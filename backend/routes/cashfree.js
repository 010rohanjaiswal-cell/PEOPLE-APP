const express = require('express');
const crypto = require('crypto');
const { authenticate, requireRole } = require('../middleware/auth');
const { createPaymentsClient, createPayoutsClient } = require('../config/cashfree');

const Job = require('../models/Job');
const User = require('../models/User');
const CommissionTransaction = require('../models/CommissionTransaction');
const Wallet = require('../models/Wallet');
const WalletLedger = require('../models/WalletLedger');
const JobPayment = require('../models/JobPayment');
const Withdrawal = require('../models/Withdrawal');
const DuesPayment = require('../models/DuesPayment');

const router = express.Router();

function toRupees(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 100) / 100;
}

async function getOrCreateWallet(userId) {
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) wallet = await Wallet.create({ user: userId });
  return wallet;
}

async function creditWalletFromJobPayment({ jobPayment, job, clientUser }) {
  if (jobPayment.processedToWallet) return { alreadyProcessed: true };

  const freelancerId = jobPayment.freelancer;
  const amount = toRupees(jobPayment.amount);

  // Commission logic: reuse your existing CommissionTransaction model (10% default is calculated elsewhere in app)
  const platformCommission = toRupees(amount * 0.1);
  const amountReceived = toRupees(Math.max(0, amount - platformCommission));

  const wallet = await getOrCreateWallet(freelancerId);

  // Ledger entries
  await WalletLedger.create({
    walletUser: freelancerId,
    type: 'CREDIT_JOB_PAYMENT',
    amount: amountReceived,
    refType: 'JobPayment',
    refId: jobPayment._id.toString(),
    meta: { jobId: job._id.toString(), cfOrderId: jobPayment.cfOrderId },
  });
  await WalletLedger.create({
    walletUser: freelancerId,
    type: 'DEBIT_COMMISSION',
    amount: -platformCommission,
    refType: 'JobPayment',
    refId: jobPayment._id.toString(),
    meta: { jobId: job._id.toString(), cfOrderId: jobPayment.cfOrderId },
  });

  wallet.availableBalance = toRupees(wallet.availableBalance + amountReceived);
  wallet.lifetimeEarnings = toRupees(wallet.lifetimeEarnings + amountReceived);
  await wallet.save();

  // Keep an explicit CommissionTransaction row too (keeps your existing reporting compatible)
  await CommissionTransaction.create({
    freelancer: freelancerId,
    job: job._id,
    jobTitle: job.title,
    clientName: clientUser?.fullName || null,
    clientId: clientUser?._id || null,
    jobAmount: amount,
    platformCommission,
    amountReceived,
    // In real-wallet flow, commission is collected automatically, so mark as paid.
    duesPaid: true,
    duesPaidAt: new Date(),
    duesPaymentOrderId: `CF_${jobPayment.cfOrderId}`,
  });

  jobPayment.processedToWallet = true;
  await jobPayment.save();

  return { alreadyProcessed: false, amountReceived, platformCommission };
}

// ============================================================================
// PAYMENTS (Cashfree Orders + Payment Session)
// ============================================================================

/**
 * Create an order & payment session for a job payment
 * POST /api/cashfree/payments/create-order
 * client-only
 */
router.post('/payments/create-order', authenticate, requireRole('client'), async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ success: false, error: 'jobId is required' });

    const job = await Job.findById(jobId).lean();
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
    if (job.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not your job' });
    }
    if (!job.assignedFreelancer) {
      return res.status(400).json({ success: false, error: 'No freelancer assigned' });
    }

    const amount = toRupees(job.budget);
    if (!(amount > 0)) return res.status(400).json({ success: false, error: 'Invalid amount' });

    const clientUser = await User.findById(req.user._id).lean();
    const customerPhone = (clientUser?.phone || '').replace(/\s/g, '');

    const cfOrderId = `CFJOB_${job._id.toString().slice(-8)}_${Date.now()}`;
    const payments = createPaymentsClient();

    const createResp = await payments.post('/orders', {
      order_id: cfOrderId,
      order_amount: amount,
      order_currency: 'INR',
      customer_details: {
        customer_id: req.user._id.toString(),
        customer_name: clientUser?.fullName || 'Customer',
        customer_email: clientUser?.email || 'na@example.com',
        customer_phone: customerPhone || '+910000000000',
      },
      order_meta: {
        // Webhook can be wired later; leaving optional here.
        return_url: process.env.CASHFREE_PAYMENTS_RETURN_URL || undefined,
      },
      order_note: `Job payment for ${job.title}`,
    });

    const paymentSessionId = createResp?.data?.payment_session_id || null;
    if (!paymentSessionId) {
      return res.status(500).json({ success: false, error: 'Failed to create payment session' });
    }

    await JobPayment.create({
      job: job._id,
      client: req.user._id,
      freelancer: job.assignedFreelancer,
      amount,
      cfOrderId,
      cfPaymentSessionId: paymentSessionId,
      status: 'CREATED',
      providerPayload: createResp.data || {},
    });

    res.json({
      success: true,
      orderId: cfOrderId,
      paymentSessionId,
      amount,
      currency: 'INR',
    });
  } catch (e) {
    const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Failed to create order';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * Confirm an order was paid and credit freelancer wallet
 * POST /api/cashfree/payments/confirm
 * client-only
 */
router.post('/payments/confirm', authenticate, requireRole('client'), async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ success: false, error: 'orderId is required' });

    const jobPayment = await JobPayment.findOne({ cfOrderId: orderId });
    if (!jobPayment) return res.status(404).json({ success: false, error: 'Payment record not found' });
    if (jobPayment.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not your payment' });
    }

    const payments = createPaymentsClient();

    // Cashfree PG: fetch order status
    const orderResp = await payments.get(`/orders/${encodeURIComponent(orderId)}`);
    const orderStatus = orderResp?.data?.order_status || null;

    // Consider PAID when order_status is PAID (Cashfree)
    const isPaid = String(orderStatus || '').toUpperCase() === 'PAID';

    jobPayment.providerPayload = orderResp?.data || jobPayment.providerPayload;
    jobPayment.status = isPaid ? 'PAID' : 'PENDING';
    await jobPayment.save();

    if (!isPaid) {
      return res.json({ success: true, paid: false, orderStatus });
    }

    const job = await Job.findById(jobPayment.job);
    const clientUser = await User.findById(jobPayment.client).lean();

    const creditResult = await creditWalletFromJobPayment({ jobPayment, job, clientUser });

    res.json({
      success: true,
      paid: true,
      orderStatus,
      credited: !creditResult.alreadyProcessed,
      amountReceived: creditResult.amountReceived,
      platformCommission: creditResult.platformCommission,
    });
  } catch (e) {
    const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Failed to confirm payment';
    res.status(500).json({ success: false, error: msg });
  }
});

// ============================================================================
// WALLET (freelancer)
// ============================================================================

router.get('/wallet', authenticate, requireRole('freelancer'), async (req, res) => {
  try {
    const wallet = await getOrCreateWallet(req.user._id);
    res.json({ success: true, wallet });
  } catch (e) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to fetch wallet' });
  }
});

router.get('/wallet/ledger', authenticate, requireRole('freelancer'), async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const rows = await WalletLedger.find({ walletUser: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({ success: true, ledger: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to fetch ledger' });
  }
});

// ============================================================================
// PAYOUTS (Cashfree Transfers)
// ============================================================================

/**
 * Create a payout transfer to a beneficiary (beneId must exist in your Cashfree payouts account)
 * POST /api/cashfree/payouts/withdraw
 */
router.post('/payouts/withdraw', authenticate, requireRole('freelancer'), async (req, res) => {
  try {
    const { amount, beneId, beneficiaryName, bankAccount, ifsc } = req.body;
    const amt = toRupees(amount);
    if (!(amt > 0)) return res.status(400).json({ success: false, error: 'Invalid amount' });
    if (!beneId) return res.status(400).json({ success: false, error: 'beneId is required' });

    const wallet = await getOrCreateWallet(req.user._id);
    if (wallet.availableBalance < amt) {
      return res.status(400).json({ success: false, error: 'Insufficient wallet balance' });
    }

    // Move available -> locked for processing
    wallet.availableBalance = toRupees(wallet.availableBalance - amt);
    wallet.lockedBalance = toRupees(wallet.lockedBalance + amt);
    await wallet.save();

    const transferId = `W_${req.user._id.toString().slice(-6)}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    const withdrawal = await Withdrawal.create({
      freelancer: req.user._id,
      amount: amt,
      status: 'PROCESSING',
      transferId,
      beneficiary: {
        beneId,
        name: beneficiaryName || null,
        bankAccount: bankAccount || null,
        ifsc: ifsc || null,
      },
    });

    await WalletLedger.create({
      walletUser: req.user._id,
      type: 'WITHDRAW_REQUESTED',
      amount: -amt,
      refType: 'Withdrawal',
      refId: withdrawal._id.toString(),
      meta: { transferId, beneId },
    });

    const payouts = await createPayoutsClient();

    // Standard transfer endpoint (Cashfree Payouts)
    const transferResp = await payouts.post('/payout/v1/requestTransfer', {
      beneId,
      amount: amt,
      transferId,
      // Optional: remarks / purpose
    });

    withdrawal.providerPayload = transferResp.data || {};
    withdrawal.cfReferenceId = transferResp?.data?.data?.referenceId || transferResp?.data?.referenceId || null;
    await withdrawal.save();

    res.json({ success: true, withdrawalId: withdrawal._id.toString(), transferId });
  } catch (e) {
    const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Withdrawal failed';
    res.status(500).json({ success: false, error: msg });
  }
});

// ============================================================================
// DUES PAYMENTS (Cashfree Orders + Payment Session)
// ============================================================================

/**
 * Create Cashfree order + payment session for freelancer dues
 * POST /api/cashfree/dues/create-order
 * Requires authentication as freelancer
 *
 * NOTE: This is an interim MVP to replace PhonePe. Once you fully move to
 * "client paid -> wallet credit -> withdraw", dues clearing can be removed.
 */
router.post('/dues/create-order', authenticate, requireRole('freelancer'), async (req, res) => {
  try {
    const freelancerId = req.user._id || req.user.id;

    const unpaidTransactions = await CommissionTransaction.find({
      freelancer: freelancerId,
      duesPaid: false,
    }).lean();

    const totalDues = unpaidTransactions.reduce((sum, t) => sum + (t.platformCommission || 0), 0);
    if (!(totalDues > 0)) {
      return res.status(400).json({ success: false, error: 'No dues to pay' });
    }

    const cfOrderId = `CF_DUES_${freelancerId.toString().slice(-6)}_${Date.now()}`;
    const amount = toRupees(totalDues);

    const freelancer = await User.findById(freelancerId).lean();
    const customerPhone = (freelancer?.phone || '').replace(/\s/g, '');

    const payments = createPaymentsClient();

    const returnUrl = `people-app://payment/callback?orderId=${encodeURIComponent(cfOrderId)}`;
    const createResp = await payments.post('/orders', {
      order_id: cfOrderId,
      order_amount: amount,
      order_currency: 'INR',
      customer_details: {
        customer_id: freelancerId.toString(),
        customer_name: freelancer?.fullName || 'Freelancer',
        customer_email: freelancer?.email || 'na@example.com',
        customer_phone: customerPhone || '+910000000000',
      },
      order_meta: {
        return_url: returnUrl,
      },
      order_note: 'Dues payment',
    });

    const paymentSessionId = createResp?.data?.payment_session_id;
    if (!paymentSessionId) {
      return res.status(500).json({ success: false, error: 'Failed to create payment session' });
    }

    await DuesPayment.create({
      freelancer: freelancerId,
      amount,
      currency: 'INR',
      cfOrderId,
      cfPaymentSessionId: paymentSessionId,
      status: 'CREATED',
      providerPayload: createResp.data || {},
    });

    res.json({
      success: true,
      orderId: cfOrderId,
      paymentSessionId,
      amount,
      currency: 'INR',
    });
  } catch (e) {
    const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Failed to create dues order';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * Confirm dues payment after user returns to app
 * POST /api/cashfree/dues/confirm
 *
 * Poll-friendly: returns paid:false until provider marks order as PAID.
 */
router.post('/dues/confirm', authenticate, requireRole('freelancer'), async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ success: false, error: 'orderId is required' });

    const freelancerId = req.user._id || req.user.id;
    const duesPayment = await DuesPayment.findOne({ cfOrderId: orderId, freelancer: freelancerId });
    if (!duesPayment) return res.status(404).json({ success: false, error: 'Dues payment not found' });

    const payments = createPaymentsClient();
    const orderResp = await payments.get(`/orders/${encodeURIComponent(orderId)}`);

    const orderStatus = orderResp?.data?.order_status || orderResp?.data?.orderStatus || null;
    const isPaid = String(orderStatus || '').toUpperCase() === 'PAID';

    duesPayment.providerPayload = orderResp?.data || duesPayment.providerPayload;
    duesPayment.status = isPaid ? 'PAID' : duesPayment.status;
    await duesPayment.save();

    if (!isPaid) {
      return res.json({
        success: true,
        paid: false,
        orderStatus,
      });
    }

    // Mark all unpaid commission transactions as paid (idempotent: after first paid,
    // subsequent calls will match zero rows because duesPaid is already true).
    await CommissionTransaction.updateMany(
      { freelancer: freelancerId, duesPaid: false },
      {
        $set: {
          duesPaid: true,
          duesPaidAt: new Date(),
          duesPaymentOrderId: orderId,
        },
      }
    );

    // Return updated wallet summary (same shape Wallet.js expects)
    const transactions = await CommissionTransaction.find({ freelancer: freelancerId })
      .sort({ createdAt: -1 })
      .lean();

    const totalDues = transactions.filter((t) => !t.duesPaid).reduce((sum, t) => sum + (t.platformCommission || 0), 0);
    const DUES_THRESHOLD = 450;
    const canWork = totalDues < DUES_THRESHOLD;

    const mappedTransactions = transactions.map((t) => ({
      id: t._id.toString(),
      jobId: t.job,
      jobTitle: t.jobTitle,
      clientName: t.clientName || null,
      jobAmount: t.jobAmount,
      platformCommission: t.platformCommission,
      amountReceived: t.amountReceived,
      duesPaid: t.duesPaid,
      duesPaidAt: t.duesPaidAt,
      duesPaymentOrderId: t.duesPaymentOrderId,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      status: t.duesPaid ? 'paid' : 'pending',
    }));

    // Group payment history by duesPaymentOrderId
    const paymentTransactionsMap = new Map();
    transactions
      .filter((t) => t.duesPaid && t.duesPaymentOrderId)
      .forEach((t) => {
        const existing = paymentTransactionsMap.get(t.duesPaymentOrderId) || {
          id: t.duesPaymentOrderId,
          orderId: t.duesPaymentOrderId,
          paymentDate: t.duesPaidAt || t.updatedAt,
          amount: 0,
          transactionCount: 0,
          createdAt: t.duesPaidAt || t.updatedAt,
        };
        existing.amount += t.platformCommission || 0;
        existing.transactionCount += 1;
        paymentTransactionsMap.set(t.duesPaymentOrderId, existing);
      });

    const paymentTransactions = Array.from(paymentTransactionsMap.values()).sort(
      (a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)
    );

    res.json({
      success: true,
      paid: true,
      orderStatus,
      wallet: {
        totalDues,
        canWork,
        transactions: mappedTransactions,
        paymentTransactions,
      },
    });
  } catch (e) {
    const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Failed to confirm dues payment';
    res.status(500).json({ success: false, error: msg });
  }
});

module.exports = router;

