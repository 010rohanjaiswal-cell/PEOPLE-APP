const express = require('express');
const crypto = require('crypto');
const { authenticate, requireRole } = require('../middleware/auth');
const { createPaymentsClient, createPayoutsClient, createVerificationClient } = require('../config/cashfree');

const Job = require('../models/Job');
const User = require('../models/User');
const CommissionTransaction = require('../models/CommissionTransaction');
const Wallet = require('../models/Wallet');
const WalletLedger = require('../models/WalletLedger');
const JobPayment = require('../models/JobPayment');
const Withdrawal = require('../models/Withdrawal');
const DuesPayment = require('../models/DuesPayment');
const FreelancerBankAccount = require('../models/FreelancerBankAccount');

const router = express.Router();

/** Bank holder vs profile name; score stored in DB but not exposed in API responses. */
const MIN_BANK_NAME_MATCH_PERCENT = 80;

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

function normalizeNameTokens(name) {
  const s = String(name || '')
    .toUpperCase()
    .replace(/[^A-Z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return [];
  const stop = new Set(['S', 'O', 'D', 'O', 'W', 'O', 'C', 'O', 'MR', 'MRS', 'MS']);
  return s
    .split(' ')
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => !stop.has(t))
    .filter((t) => t.length >= 2);
}

function nameMatchScorePercent(a, b) {
  const at = normalizeNameTokens(a);
  const bt = normalizeNameTokens(b);
  if (!at.length || !bt.length) return 0;
  const bset = new Set(bt);
  let hits = 0;
  for (const t of at) {
    if (bset.has(t)) hits += 1;
  }
  const denom = Math.max(at.length, bt.length);
  return Math.round((hits / denom) * 100);
}

/**
 * Cashfree SecureID / VRS: synchronous bank account verification
 * POST {base}/bank-account/sync
 */
function unwrapVerificationBody(respData) {
  if (!respData || typeof respData !== 'object') return {};
  if (respData.data && typeof respData.data === 'object' && !Array.isArray(respData.data)) {
    return respData.data;
  }
  return respData;
}

function isVrsAccountValid(body) {
  const status = String(body?.account_status || '').toUpperCase();
  const code = String(body?.account_status_code || '').toUpperCase();
  if (status === 'VALID') return true;
  if (code === 'ACCOUNT_IS_VALID') return true;
  if (code.includes('VALID') && !code.includes('INVALID')) return true;
  return false;
}

/**
 * Cashfree may return HTTP 401 for bad client id/secret. Our API must NOT forward that as 401,
 * or the mobile app treats it as an invalid JWT and logs the user out.
 */
function httpStatusForCashfreeUpstreamError(err) {
  const s = err?.response?.status;
  if (s == null || Number.isNaN(s)) return 500;
  if (s === 401 || s === 403) return 400;
  if (s >= 400 && s < 500) return 400;
  if (s >= 500) return 502;
  return 500;
}

async function verifyBankWithVrs({ bankAccount, ifsc, fullName, phone }) {
  const vrs = createVerificationClient();
  const phone10 = String(phone || '').replace(/\D/g, '').slice(-10) || '9999999999';
  const name = String(fullName || '').trim() || 'Account Holder';

  const syncResp = await vrs.post('/bank-account/sync', {
    bank_account: String(bankAccount).replace(/\s/g, ''),
    ifsc: String(ifsc).toUpperCase().trim(),
    name,
    phone: phone10,
  });

  const body = unwrapVerificationBody(syncResp?.data);
  const nameAtBank = body?.name_at_bank || body?.nameAtBank || null;
  const bankName = body?.bank_name || body?.bankName || null;
  const providerScore =
    typeof body?.name_match_score === 'number' && !Number.isNaN(body.name_match_score)
      ? body.name_match_score
      : null;
  const freelancerName = String(fullName || '').trim();
  const computedScore = nameMatchScorePercent(nameAtBank || '', freelancerName);
  const nameMatchScore = providerScore != null ? providerScore : computedScore;
  const valid = isVrsAccountValid(body);

  return {
    body,
    nameAtBank,
    bankName,
    nameMatchScore,
    valid,
    referenceId: body?.reference_id ?? body?.referenceId ?? null,
    rawResponse: syncResp?.data,
  };
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

  // Payment confirmed -> job completed (replaces old "Paid" manual confirmation)
  if (job && job.status === 'work_done') {
    job.status = 'completed';
    await job.save();
  }

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
    const bank = await FreelancerBankAccount.findOne({ freelancer: req.user._id }).lean();
    res.json({
      success: true,
      wallet,
      bankAccount: bank
        ? {
            added: !!bank.verified,
            ifsc: bank.ifsc,
            last4: bank.bankAccountLast4,
            nameMatchOk:
              typeof bank.nameMatchScore === 'number' && bank.nameMatchScore >= MIN_BANK_NAME_MATCH_PERCENT,
          }
        : { added: false },
    });
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

/**
 * Withdrawal history (status updated via Cashfree payout webhook)
 * GET /api/cashfree/wallet/withdrawals
 */
router.get('/wallet/withdrawals', authenticate, requireRole('freelancer'), async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 25)));
    const rows = await Withdrawal.find({ freelancer: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    const withdrawals = rows.map((w) => ({
      id: w._id.toString(),
      amount: w.amount,
      status: w.status,
      transferId: w.transferId,
      createdAt: w.createdAt,
      failureReason: w.failureReason || null,
    }));
    res.json({ success: true, withdrawals });
  } catch (e) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to fetch withdrawals' });
  }
});

// ============================================================================
// PAYOUTS (Cashfree Transfers)
// ============================================================================

/**
 * SecureID / VRS: verify bank account (sync) — preview in app before Save
 * POST /api/cashfree/vrs/bank-verify
 */
router.post('/vrs/bank-verify', authenticate, requireRole('freelancer'), async (req, res) => {
  try {
    const { bankAccount, ifsc } = req.body || {};
    const acct = String(bankAccount || '').replace(/\s/g, '');
    const ifscCode = String(ifsc || '').toUpperCase().trim();

    if (!/^[0-9A-Za-z]{6,40}$/.test(acct)) {
      return res.status(400).json({ success: false, error: 'Invalid bank account number' });
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
      return res.status(400).json({ success: false, error: 'Invalid IFSC code' });
    }

    const freelancer = await User.findById(req.user._id).lean();
    const v = await verifyBankWithVrs({
      bankAccount: acct,
      ifsc: ifscCode,
      fullName: freelancer?.fullName,
      phone: freelancer?.phone,
    });

    if (!v.valid) {
      const reason =
        v.body?.account_status ||
        v.body?.account_status_code ||
        v.body?.message ||
        'Bank account could not be verified';
      return res.status(400).json({
        success: false,
        error: String(reason),
        vrs: { account_status: v.body?.account_status, account_status_code: v.body?.account_status_code },
      });
    }

    // Account is valid; do not expose match % or bank name in JSON (fraud prevention).
    return res.json({
      success: true,
      nameMatchOk: v.nameMatchScore >= MIN_BANK_NAME_MATCH_PERCENT,
    });
  } catch (e) {
    const raw = e?.response?.data;
    console.error('Cashfree VRS bank-verify error:', raw || e?.message);
    const msg =
      raw?.message || raw?.error || e?.message || 'Bank verification failed';
    const status = httpStatusForCashfreeUpstreamError(e);
    return res.status(status).json({
      success: false,
      error: typeof msg === 'string' ? msg : JSON.stringify(msg),
      provider: raw || null,
      code: 'CASHFREE_UPSTREAM',
    });
  }
});

// PAYOUTS (Cashfree Transfers)
// ============================================================================
/**
 * Create a payout transfer to a beneficiary (beneId must exist in your Cashfree payouts account)
 * POST /api/cashfree/payouts/withdraw
 */
/** Cashfree Standard Transfer async — min/max per typical account limits (see payout docs). */
const PAYOUT_MIN_INR = Number(process.env.CASHFREE_PAYOUT_MIN_INR) || 100;
const PAYOUT_MAX_INR = Number(process.env.CASHFREE_PAYOUT_MAX_INR) || 100000;

router.post('/payouts/withdraw', authenticate, requireRole('freelancer'), async (req, res) => {
  const { amount } = req.body;
  const amt = toRupees(amount);
  let withdrawalDoc = null;
  let walletDebited = false;

  try {
    if (!(amt > 0)) return res.status(400).json({ success: false, error: 'Invalid amount' });
    if (amt < PAYOUT_MIN_INR) {
      return res.status(400).json({
        success: false,
        error: `Minimum withdrawal is ₹${PAYOUT_MIN_INR} (Cashfree payout limit).`,
      });
    }
    if (amt > PAYOUT_MAX_INR) {
      return res.status(400).json({
        success: false,
        error: `Maximum withdrawal per transfer is ₹${PAYOUT_MAX_INR}.`,
      });
    }

    const bank = await FreelancerBankAccount.findOne({ freelancer: req.user._id, verified: true }).lean();
    if (!bank) return res.status(400).json({ success: false, error: 'Add bank account to withdraw.' });

    const wallet = await getOrCreateWallet(req.user._id);
    if (wallet.availableBalance < amt) {
      return res.status(400).json({ success: false, error: 'Insufficient wallet balance' });
    }

    // Move available -> locked until Cashfree accepts the transfer (rollback on failure)
    wallet.availableBalance = toRupees(wallet.availableBalance - amt);
    wallet.lockedBalance = toRupees(wallet.lockedBalance + amt);
    await wallet.save();
    walletDebited = true;

    const transferId = `W_${req.user._id.toString().slice(-6)}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    withdrawalDoc = await Withdrawal.create({
      freelancer: req.user._id,
      amount: amt,
      status: 'PROCESSING',
      transferId,
      beneficiary: {
        beneId: bank.beneId,
        name: bank.nameAtBank || null,
        bankAccount: `xxxx${bank.bankAccountLast4}`,
        ifsc: bank.ifsc,
      },
    });

    await WalletLedger.create({
      walletUser: req.user._id,
      type: 'WITHDRAW_REQUESTED',
      amount: -amt,
      refType: 'Withdrawal',
      refId: withdrawalDoc._id.toString(),
      meta: { transferId, beneId: bank?.beneId },
    });

    const payouts = createPayoutsClient();

    // Standard Transfer V2 — POST /transfers (replaces deprecated /payout/v1/requestAsyncTransfer)
    const transferMode =
      String(process.env.CASHFREE_PAYOUTS_TRANSFER_MODE || 'banktransfer').toLowerCase() || 'banktransfer';
    const transferResp = await payouts.post('/transfers', {
      transfer_id: transferId,
      transfer_amount: amt,
      beneficiary_details: {
        beneficiary_id: bank.beneId,
      },
      transfer_mode: transferMode,
      transfer_remarks: 'PeopleApp wallet',
    });

    if (transferResp.status !== 200) {
      throw new Error('Cashfree did not accept the transfer');
    }
    const payload = transferResp?.data || {};
    const inner = payload?.data ?? payload;
    const st = String(inner?.status ?? payload?.status ?? '').toUpperCase();
    // Async: accepted for processing — only treat explicit ERROR/FAILED as failure
    if (st === 'ERROR' || st === 'FAILED') {
      throw new Error(inner?.message || payload?.message || 'Transfer rejected by Cashfree');
    }

    withdrawalDoc.providerPayload = payload;
    withdrawalDoc.cfReferenceId =
      inner?.cf_transfer_id ??
      inner?.referenceId ??
      payload?.cf_transfer_id ??
      payload?.referenceId ??
      null;
    await withdrawalDoc.save();

    return res.json({
      success: true,
      withdrawalId: withdrawalDoc._id.toString(),
      transferId,
      amount: amt,
      status: 'PROCESSING',
    });
  } catch (e) {
    // Roll back wallet + remove pending withdrawal rows if Cashfree failed
    try {
      if (walletDebited && amt > 0) {
        const w = await Wallet.findOne({ user: req.user._id });
        if (w) {
          w.availableBalance = toRupees(w.availableBalance + amt);
          w.lockedBalance = toRupees(Math.max(0, w.lockedBalance - amt));
          await w.save();
        }
      }
      if (withdrawalDoc?._id) {
        await WalletLedger.deleteOne({
          walletUser: req.user._id,
          refType: 'Withdrawal',
          refId: withdrawalDoc._id.toString(),
          type: 'WITHDRAW_REQUESTED',
        });
        await Withdrawal.deleteOne({ _id: withdrawalDoc._id });
      }
    } catch (rollbackErr) {
      console.error('Withdraw rollback failed:', rollbackErr);
    }

    const rawData = e?.response?.data;
    const msg =
      rawData?.message ||
      rawData?.data?.message ||
      rawData?.error ||
      e?.message ||
      'Withdrawal failed';
    let status = e?.response?.status >= 400 && e?.response?.status < 500 ? e.response.status : 500;
    if (status === 401 || status === 403) status = 400;
    return res.status(status).json({ success: false, error: typeof msg === 'string' ? msg : String(msg) });
  }
});

/**
 * Add / verify freelancer bank account and register beneficiary in Cashfree Payouts
 * POST /api/cashfree/payouts/bank-account
 */
router.post('/payouts/bank-account', authenticate, requireRole('freelancer'), async (req, res) => {
  try {
    const { bankAccount, ifsc } = req.body || {};
    const acct = String(bankAccount || '').replace(/\s/g, '');
    const ifscCode = String(ifsc || '').toUpperCase().trim();

    if (!/^[0-9A-Za-z]{6,40}$/.test(acct)) {
      return res.status(400).json({ success: false, error: 'Invalid bank account number' });
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
      return res.status(400).json({ success: false, error: 'Invalid IFSC code' });
    }

    const freelancer = await User.findById(req.user._id).lean();
    const freelancerName = freelancer?.fullName || '';

    // 1) SecureID / VRS synchronous bank verification (same as Cashfree dashboard curl)
    let vrsPayload = null;
    let nameAtBank = null;
    let score = null;
    try {
      const v = await verifyBankWithVrs({
        bankAccount: acct,
        ifsc: ifscCode,
        fullName: freelancerName,
        phone: freelancer?.phone,
      });
      vrsPayload = v.rawResponse;
      nameAtBank = v.nameAtBank;
      score = v.nameMatchScore;

      if (!v.valid) {
        const reason =
          v.body?.account_status ||
          v.body?.account_status_code ||
          'Bank account could not be verified';
        return res.status(400).json({
          success: false,
          error: String(reason),
          provider: v.body || null,
        });
      }
      if (score < MIN_BANK_NAME_MATCH_PERCENT) {
        return res.status(400).json({
          success: false,
          error: 'Account holder name does not match your profile. Update your profile or use a bank account in your name.',
          provider: v.body || null,
        });
      }
    } catch (err) {
      const raw = err?.response?.data;
      console.error('Cashfree VRS bank-account sync failed:', raw || err?.message);
      const msg = raw?.message || raw?.error || err?.message || 'Bank verification failed';
      const status = httpStatusForCashfreeUpstreamError(err);
      return res.status(status).json({
        success: false,
        error: typeof msg === 'string' ? msg : JSON.stringify(msg),
        provider: raw || null,
        code: 'CASHFREE_UPSTREAM',
      });
    }

    const payouts = createPayoutsClient();

    // 2) Register beneficiary — Payouts V2 POST /beneficiary (replaces /payout/v1/addBeneficiary)
    const beneId = `BENE_${req.user._id.toString().slice(-12)}`.replace(/[^A-Za-z0-9_]/g, '_').slice(0, 50);
    const phoneDigits = (freelancer?.phone || '').replace(/\D/g, '').slice(-10) || '9999999999';
    const addBeneResp = await payouts.post('/beneficiary', {
      beneficiary_id: beneId,
      beneficiary_name: nameAtBank || freelancerName,
      beneficiary_instrument_details: {
        bank_account_number: acct,
        bank_ifsc: ifscCode,
      },
      beneficiary_contact_details: {
        beneficiary_email: freelancer?.email || 'na@example.com',
        beneficiary_phone: phoneDigits,
        beneficiary_country_code: '+91',
        beneficiary_address: 'People App',
        beneficiary_city: 'Bengaluru',
        beneficiary_state: 'KA',
        beneficiary_postal_code: '560001',
      },
    });

    const raw = addBeneResp?.data ?? {};
    const beneData = raw.data ?? raw;
    const httpOk = addBeneResp.status >= 200 && addBeneResp.status < 300;
    const topStatus = String(raw.status || beneData.status || '').toUpperCase();
    const ok =
      httpOk &&
      topStatus !== 'ERROR' &&
      (beneData.beneficiary_status === 'VERIFIED' ||
        topStatus === 'SUCCESS' ||
        (beneData.beneficiary_id && topStatus !== 'FAILED'));
    if (!ok) {
      return res.status(500).json({
        success: false,
        error: beneData.message || raw.message || 'Failed to add beneficiary',
      });
    }

    const last4 = acct.slice(-4);
    await FreelancerBankAccount.findOneAndUpdate(
      { freelancer: req.user._id },
      {
        $set: {
          bankAccountLast4: last4,
          ifsc: ifscCode,
          nameAtBank,
          nameMatchScore: score,
          verified: true,
          beneId,
          providerPayload: {
            vrs: vrsPayload || {},
            addBene: addBeneResp?.data || {},
          },
        },
      },
      { upsert: true, new: true }
    );

    return res.json({
      success: true,
      bankAccount: { last4, ifsc: ifscCode },
      verificationMethod: 'vrs_sync',
    });
  } catch (e) {
    const raw = e?.response?.data;
    console.error('Cashfree payouts bank-account error:', raw || e);
    const msg =
      raw?.message ||
      raw?.error ||
      raw?.subCode ||
      e?.message ||
      'Failed to add bank account';
    return res.status(500).json({ success: false, error: msg, provider: raw || null });
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

