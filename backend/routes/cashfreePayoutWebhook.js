/**
 * Cashfree Payouts — transfer status webhooks.
 * Must be registered in server.js BEFORE express.json() so the raw body is available for signature verification.
 *
 * Dashboard: Payouts → Developers → Webhooks → Add Webhook URL → select **Webhook version V2**
 *   https://YOUR_BACKEND/api/cashfree/webhooks/payout
 * Signature: same as Cashfree docs — HMAC-SHA256(clientSecret, timestamp + rawBody).digest('base64')
 * Use the **oldest active** client secret if you rotated keys.
 */

const crypto = require('crypto');
const Withdrawal = require('../models/Withdrawal');
const Wallet = require('../models/Wallet');
const WalletLedger = require('../models/WalletLedger');

function cleanEnv(v) {
  if (v == null) return '';
  let s = String(v).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

/**
 * Cashfree Payouts V2: HMAC-SHA256(secret, timestamp + rawBody) → base64
 * Docs: use the *oldest active* client secret if you have rotated secrets.
 * Optional: CASHFREE_PAYOUT_WEBHOOK_SECRET overrides CASHFREE_PAYOUTS_CLIENT_SECRET.
 */
function collectWebhookSecrets() {
  const keys = [
    cleanEnv(process.env.CASHFREE_PAYOUT_WEBHOOK_SECRET),
    cleanEnv(process.env.CASHFREE_PAYOUTS_CLIENT_SECRET),
    cleanEnv(process.env.CASHFREE_CLIENT_SECRET),
  ].filter(Boolean);
  return [...new Set(keys)];
}

function getHeader(req, name) {
  const lower = name.toLowerCase();
  if (typeof req.get === 'function') {
    const v = req.get(name);
    if (v != null && v !== '') return v;
  }
  return req.headers[lower] ?? req.headers[name];
}

function normalizeSignatureHeader(sigHeader) {
  let received = String(sigHeader).trim();
  if (/^sha256=/i.test(received)) received = received.replace(/^sha256=/i, '').trim();
  if (/^v1=/i.test(received)) received = received.replace(/^v1=/i, '').trim();
  // Some proxies send multiple values; Cashfree sends one base64 blob
  if (received.includes(',')) received = received.split(',')[0].trim();
  return received;
}

/** Base64 (standard) compare; optional base64url (replace - _ and pad) */
function signaturesEqual(expectedB64, received) {
  if (expectedB64 === received) return true;
  try {
    const a = Buffer.from(expectedB64, 'utf8');
    const b = Buffer.from(received, 'utf8');
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
  } catch {
    /* length mismatch */
  }
  const urlNorm = received.replace(/-/g, '+').replace(/_/g, '/');
  const pad = urlNorm.length % 4;
  const padded = pad ? urlNorm + '='.repeat(4 - pad) : urlNorm;
  if (expectedB64 === padded) return true;
  return false;
}

/**
 * Cashfree signs: HMAC-SHA256(secret, UTF8(timestamp) + rawBodyBytes).
 * Use timestamp + raw buffer (not re-stringified JSON) so bytes match exactly.
 */
function verifySignature(req, rawBuffer) {
  const secrets = collectWebhookSecrets();
  const ts = getHeader(req, 'x-webhook-timestamp');
  const sigHeader = getHeader(req, 'x-webhook-signature');
  if (!secrets.length) {
    console.warn('Cashfree webhook: no CASHFREE_PAYOUTS_CLIENT_SECRET / CASHFREE_PAYOUT_WEBHOOK_SECRET set');
    return false;
  }
  if (!ts || !sigHeader) {
    console.warn('Cashfree webhook: missing x-webhook-timestamp or x-webhook-signature');
    return false;
  }
  if (!Buffer.isBuffer(rawBuffer)) {
    console.warn('Cashfree webhook: body was not raw Buffer (middleware order / type mismatch?)');
    return false;
  }

  const tsStr = String(ts).trim();
  const received = normalizeSignatureHeader(sigHeader);

  for (const secret of secrets) {
    const expectedB64 = crypto.createHmac('sha256', secret).update(tsStr, 'utf8').update(rawBuffer).digest('base64');
    if (signaturesEqual(expectedB64, received)) return true;

    const expectedHex = crypto.createHmac('sha256', secret).update(tsStr, 'utf8').update(rawBuffer).digest('hex');
    if (expectedHex.toLowerCase() === received.toLowerCase()) return true;
  }
  return false;
}

function toRupees(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 100) / 100;
}

function parseWebhookPayload(body) {
  const type = String(body.type || body.event || body.eventType || '').toUpperCase();
  const data = body.data || body.payload || body.transfer || body;
  const nested = data?.transfer || data?.transfer_details || data;
  const transferId =
    nested?.transferId ||
    nested?.transfer_id ||
    data?.transferId ||
    data?.transfer_id ||
    body.transferId;
  const statusRaw = String(nested?.status || data?.status || body.status || '').toUpperCase();
  const statusCode = String(nested?.status_code || data?.status_code || body.status_code || '').toUpperCase();
  const referenceId =
    nested?.referenceId ||
    nested?.reference_id ||
    data?.referenceId ||
    data?.cf_transfer_id ||
    nested?.cf_transfer_id;
  return { type, transferId, statusRaw, statusCode, referenceId, data: body };
}

/**
 * Cashfree Webhooks V2 — see docs (transfer_id in data, type at root).
 * Docs note: transfer is considered successful when status is SUCCESS and status_code is COMPLETED.
 * TRANSFER_SUCCESS also indicates beneficiary credit (sample may use status_code e.g. SENT_TO_BENEFICIARY).
 */
function inferOutcome({ type, statusRaw, statusCode }) {
  const t = String(type || '').toUpperCase();
  const s = String(statusRaw || '').toUpperCase();
  const sc = String(statusCode || '').toUpperCase();

  if (t === 'CREDIT_CONFIRMATION' || t === 'LOW_BALANCE_ALERT' || t === 'BENEFICIARY_INCIDENT') {
    return null;
  }

  if (
    t === 'TRANSFER_FAILED' ||
    t === 'TRANSFER_REJECTED' ||
    t === 'TRANSFER_REVERSED' ||
    t === 'BULK_TRANSFER_REJECTED'
  ) {
    return 'FAILED';
  }
  if (s === 'FAILED' || s === 'REVERSED' || s === 'REJECTED') {
    return 'FAILED';
  }

  const strictComplete = s === 'SUCCESS' && sc === 'COMPLETED';

  // ACK sample: SUCCESS + COMPLETED — end-to-end credited (docs table)
  if (t === 'TRANSFER_ACKNOWLEDGED' && strictComplete) {
    return 'PAID';
  }

  // SUCCESS event: amount deposited to beneficiary (per event description)
  if (t === 'TRANSFER_SUCCESS' && s === 'SUCCESS') {
    return 'PAID';
  }

  return null;
}

async function applyPayoutOutcome(withdrawal, outcome, extra) {
  const userId = withdrawal.freelancer;
  const amt = toRupees(withdrawal.amount);
  if (outcome === 'PAID') {
    withdrawal.status = 'PAID';
    withdrawal.failureReason = null;
    if (extra.referenceId) withdrawal.cfReferenceId = String(extra.referenceId);
    withdrawal.providerPayload = {
      ...(withdrawal.providerPayload || {}),
      lastWebhook: extra.raw,
      completedAt: new Date().toISOString(),
    };
    await withdrawal.save();

    const wallet = await Wallet.findOne({ user: userId });
    if (wallet) {
      wallet.lockedBalance = toRupees(Math.max(0, wallet.lockedBalance - amt));
      await wallet.save();
    }
    await WalletLedger.create({
      walletUser: userId,
      type: 'WITHDRAW_PAID',
      amount: 0,
      refType: 'Withdrawal',
      refId: withdrawal._id.toString(),
      meta: { transferId: withdrawal.transferId, cfReferenceId: withdrawal.cfReferenceId, note: 'Payout completed' },
    });
    return;
  }

  if (outcome === 'FAILED') {
    withdrawal.status = 'FAILED';
    withdrawal.failureReason = extra.reason || 'Transfer failed';
    withdrawal.providerPayload = { ...(withdrawal.providerPayload || {}), lastWebhook: extra.raw };
    await withdrawal.save();

    const wallet = await Wallet.findOne({ user: userId });
    if (wallet) {
      wallet.lockedBalance = toRupees(Math.max(0, wallet.lockedBalance - amt));
      wallet.availableBalance = toRupees(wallet.availableBalance + amt);
      await wallet.save();
    }
    await WalletLedger.create({
      walletUser: userId,
      type: 'WITHDRAW_FAILED_REVERSAL',
      amount: amt,
      refType: 'Withdrawal',
      refId: withdrawal._id.toString(),
      meta: { transferId: withdrawal.transferId, reason: withdrawal.failureReason },
    });
  }
}

function nestedMessage(body) {
  const d = body?.data || body;
  return d?.message || body?.message || null;
}

module.exports = async function cashfreePayoutWebhook(req, res) {
  try {
    const skipVerify = cleanEnv(process.env.CASHFREE_PAYOUT_WEBHOOK_SKIP_VERIFY) === '1';
    const debug = cleanEnv(process.env.CASHFREE_PAYOUT_WEBHOOK_DEBUG) === '1';

    // Never use JSON.stringify(parsed body) for verification — breaks HMAC vs Cashfree (raw payload).
    const rawBuffer = Buffer.isBuffer(req.body) ? req.body : null;
    if (!rawBuffer) {
      console.warn('Cashfree payout webhook: body is not a Buffer — express.raw may not have run for this route');
      return res.status(400).json({
        success: false,
        error: 'Expected raw body',
        hint: 'Server must register express.raw() before this handler for POST /api/cashfree/webhooks/payout',
      });
    }

    if (debug) {
      const ct = req.headers['content-type'] || '';
      console.info(
        '[Cashfree webhook debug] content-type=%s bodyLen=%s hasTs=%s hasSig=%s',
        ct,
        rawBuffer.length,
        Boolean(getHeader(req, 'x-webhook-timestamp')),
        Boolean(getHeader(req, 'x-webhook-signature'))
      );
    }

    if (!skipVerify && !verifySignature(req, rawBuffer)) {
      console.warn('Cashfree payout webhook: signature verification failed (see docs: use oldest active Payouts client secret)');
      return res.status(401).json({
        success: false,
        error: 'Invalid signature',
        hint:
          'Set CASHFREE_PAYOUTS_CLIENT_SECRET to the same Payouts Client Secret as in Cashfree (oldest active secret if you rotated). Optional override: CASHFREE_PAYOUT_WEBHOOK_SECRET. Dev only: CASHFREE_PAYOUT_WEBHOOK_SKIP_VERIFY=1',
      });
    }

    let body;
    try {
      body = JSON.parse(rawBuffer.toString('utf8'));
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid JSON' });
    }

    const { type, transferId, statusRaw, statusCode, referenceId, data: fullBody } = parseWebhookPayload(body);
    const outcome = inferOutcome({ type, statusRaw, statusCode });
    if (!transferId) {
      console.log('Cashfree payout webhook: no transferId in payload', JSON.stringify(body).slice(0, 500));
      return res.json({ success: true, ignored: true });
    }

    const withdrawal = await Withdrawal.findOne({ transferId: String(transferId) });
    if (!withdrawal) {
      console.log('Cashfree payout webhook: unknown transferId', transferId);
      return res.json({ success: true, ignored: true });
    }

    if (withdrawal.status === 'PAID' || withdrawal.status === 'FAILED') {
      return res.json({ success: true, duplicate: true });
    }

    if (!outcome) {
      console.log('Cashfree payout webhook: unhandled event', type, statusRaw);
      withdrawal.providerPayload = { ...(withdrawal.providerPayload || {}), lastWebhookUnhandled: fullBody };
      await withdrawal.save();
      return res.json({ success: true, pending: true });
    }

    await applyPayoutOutcome(withdrawal, outcome, {
      referenceId,
      raw: fullBody,
      reason: body.message || nestedMessage(body),
    });

    return res.json({ success: true });
  } catch (e) {
    console.error('Cashfree payout webhook error:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
};
