/**
 * Freelancer Routes - People App Backend
 * Routes for freelancer-specific features
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');
const FreelancerVerification = require('../models/FreelancerVerification');
const Job = require('../models/Job');
const CommissionTransaction = require('../models/CommissionTransaction');
const { getStateFromCoords, getCoordsFromPincode, haversineDistanceKm } = require('../services/locationService');
const multer = require('multer');
const streamifier = require('streamifier');
const cloudinary = require('../config/cloudinary');
const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');
const {
  notifyOfferReceived,
  notifyJobAssigned,
  notifyWorkDone,
  notifyJobPickedUp,
  notifyApplicationReceived,
} = require('../services/notificationService');
const { afterApplicationSubmitted } = require('../services/autoPickApplications');

function isDeliveryCategory(category) {
  return String(category || '').trim().toLowerCase() === 'delivery';
}

/** Normalize verification/profile gender to Job schema values. */
function normalizeFreelancerProfileGender(genderRaw) {
  if (genderRaw == null) return null;
  const s = String(genderRaw).trim().toLowerCase();
  if (!s) return null;
  if (s === 'm' || s === 'male' || s.startsWith('male')) return 'male';
  if (s === 'f' || s === 'female' || s.startsWith('female')) return 'female';
  return null;
}

/**
 * Jobs visible to this freelancer by job.gender (client "any" = all).
 * If freelancer gender unknown, only jobs with gender "any" are shown.
 */
function jobGenderMatchQuery(freelancerGenderNorm) {
  if (freelancerGenderNorm === 'male') return { $in: ['male', 'any'] };
  if (freelancerGenderNorm === 'female') return { $in: ['female', 'any'] };
  return 'any';
}

/** Enforce same rules as available-jobs list when acting on a specific job. */
async function assertFreelancerMatchesJobGender(freelancerId, job) {
  const jg = (job.gender || '').toString().trim().toLowerCase();
  if (jg === 'any' || jg === '') return { ok: true };

  const verificationDoc = await FreelancerVerification.findOne({ user: freelancerId })
    .sort({ updatedAt: -1 })
    .select('gender')
    .lean();
  const fg = normalizeFreelancerProfileGender(verificationDoc?.gender);
  if (!fg) {
    return {
      ok: false,
      status: 403,
      error:
        'This job is limited by gender. Add your gender in freelancer verification to continue, or choose a job open to everyone.',
    };
  }
  if (fg !== jg) {
    return {
      ok: false,
      status: 403,
      error: 'This job is not available for your profile gender.',
    };
  }
  return { ok: true };
}

// Use memory storage; we'll stream buffers to Cloudinary
const upload = multer({ storage: multer.memoryStorage() });

async function uploadToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

async function fetchImageBuffer(url) {
  const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 });
  return Buffer.from(resp.data);
}

function getCashfreeVerificationBaseUrl() {
  const env = (process.env.CASHFREE_ENV || process.env.CASHFREE_VRS_ENV || '').toLowerCase();
  return env === 'sandbox' || env === 'test'
    ? 'https://sandbox.cashfree.com/verification'
    : 'https://api.cashfree.com/verification';
}

function getCashfreeVrsHeaders(extra = {}) {
  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
  const apiVersion = process.env.CASHFREE_VRS_API_VERSION || '2023-12-18';
  if (!clientId || !clientSecret) {
    throw new Error('Cashfree SecureID credentials not configured');
  }
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'x-client-id': clientId,
    'x-client-secret': clientSecret,
    'x-api-version': apiVersion,
    ...extra,
  };
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function generateReferralCode(length = 16) {
  // 15–18 chars as requested; keep it user-typeable while still including special chars.
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789-@_';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += charset[bytes[i] % charset.length];
  }
  return out;
}

async function ensureUserReferralCode(userId) {
  const user = await User.findById(userId).select('referralCode role').lean();
  if (!user) throw new Error('User not found');
  if (user.role !== 'freelancer') throw new Error('This endpoint is only for freelancers');
  if (user.referralCode) return user.referralCode;

  // Try a few times in case of rare unique collision.
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateReferralCode(16);
    try {
      const updated = await User.findOneAndUpdate(
        { _id: userId, referralCode: { $in: [null, ''] } },
        { referralCode: code },
        { new: true }
      ).select('referralCode');
      if (updated?.referralCode) return updated.referralCode;
      // Someone else set it concurrently; re-read.
      const reread = await User.findById(userId).select('referralCode').lean();
      if (reread?.referralCode) return reread.referralCode;
    } catch (e) {
      // Duplicate key -> retry
      if (String(e?.code) === '11000') continue;
      throw e;
    }
  }
  throw new Error('Failed to generate a unique referral code');
}

function last4Digits(value) {
  const d = digitsOnly(value);
  return d.length >= 4 ? d.slice(-4) : null;
}

function mobileLast4IfLooksLikeMobile(value) {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;

  // If the field contains a real mobile number, it should be exactly 10 digits (after stripping non-digits).
  // This prevents accidental matches on Aadhaar (12 digits) / reference ids / pincodes etc.
  const digits = digitsOnly(s);
  if (digits.length === 10) return digits.slice(-4);

  // Masked mobile commonly looks like xxxxxx1234 / ******1234. In that case we only see last 4 digits.
  const hasMask = /[xX\*]{2,}/.test(s);
  if (hasMask && digits.length === 4) return digits;

  return null;
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
  // Intersection over larger set (order independent)
  const denom = Math.max(at.length, bt.length);
  return Math.round((hits / denom) * 100);
}

function buildAddressFromSplitAddress(split = {}) {
  const parts = [
    split.house,
    split.street,
    split.landmark,
    split.vtc,
    split.subdist,
    split.dist,
    split.state,
    split.pincode,
    split.country,
  ].filter(Boolean);
  return parts.join(', ');
}

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

    // Get verification details from FreelancerVerification collection
    // Use .lean() to get plain JavaScript object (faster and ensures all fields are accessible)
    let verification = await FreelancerVerification.findOne({ user: user._id })
      .select('fullName dob gender address status rejectionReason createdAt updatedAt')
      .lean() // Convert to plain object
      .sort({ createdAt: -1 }); // Get the most recent verification
    
    // If not found, try with string ID as fallback
    if (!verification) {
      verification = await FreelancerVerification.findOne({ user: user._id.toString() })
        .select('fullName dob gender address status rejectionReason createdAt updatedAt')
        .lean() // Convert to plain object
        .sort({ createdAt: -1 });
    }
    
    // Log detailed query info for debugging
    if (!verification) {
      const allVerifications = await FreelancerVerification.find({}).select('user fullName dob gender address status').limit(5).sort({ createdAt: -1 });
      console.log('⚠️ Verification not found. Sample verifications in DB:', allVerifications.map(v => ({
        id: v._id,
        userId: v.user,
        userIdType: typeof v.user,
        fullName: v.fullName,
        dob: v.dob,
        gender: v.gender,
        address: v.address,
        status: v.status,
      })));
    } else {
      // Also check if there are other verification records for this user
      const allUserVerifications = await FreelancerVerification.find({
        $or: [
          { user: user._id },
          { user: user._id.toString() }
        ]
      }).select('_id fullName dob gender address status createdAt').sort({ createdAt: -1 });
      console.log('📋 All verification records for this user:', allUserVerifications.map(v => ({
        id: v._id,
        fullName: v.fullName,
        dob: v.dob,
        gender: v.gender,
        address: v.address,
        status: v.status,
        createdAt: v.createdAt,
      })));
    }
    
    const verificationStatus = verification?.status || user.verificationStatus || null;

    console.log('📋 Freelancer verification data:', {
      userId: user._id,
      userIdString: user._id.toString(),
      userIdFromReq: userId,
      hasVerification: !!verification,
      verificationData: verification ? {
        fullName: verification.fullName,
        dob: verification.dob,
        gender: verification.gender,
        address: verification.address,
        status: verification.status,
      } : null,
    });
    
    // Log the full verification object to see what's actually in the database
    if (verification) {
      console.log('📋 Full verification object from DB:', JSON.stringify(verification.toObject ? verification.toObject() : verification, null, 2));
    }

    // Ensure we always return all fields, even if null
    const verificationResponse = {
      success: true,
      status: verificationStatus,
      verification: {
        status: verificationStatus,
        rejectionReason: verification?.rejectionReason || user.verificationRejectionReason || null,
        fullName: verification?.fullName ?? null,
        dob: verification?.dob ?? null,
        gender: verification?.gender ?? null,
        address: verification?.address ?? null,
      }
    };
    
    // Log what we're actually sending
    console.log('📤 Sending verification response:', JSON.stringify(verificationResponse, null, 2));
    console.log('📤 Verification object fields check:', {
      hasVerification: !!verification,
      fullName: verification?.fullName,
      dob: verification?.dob,
      gender: verification?.gender,
      address: verification?.address,
      allKeys: verification ? Object.keys(verification.toObject ? verification.toObject() : verification) : [],
    });
    
    // Log the actual response being sent with explicit field values
    console.log('📤 Response verification object contains:', {
      fullName: verificationResponse.verification.fullName,
      dob: verificationResponse.verification.dob,
      gender: verificationResponse.verification.gender,
      address: verificationResponse.verification.address,
      status: verificationResponse.verification.status,
    });
    
    res.json(verificationResponse);

  } catch (error) {
    console.error('Error getting verification status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get verification status'
    });
  }
});

/**
 * DigiLocker - Create consent URL (Aadhaar + PAN)
 * POST /api/freelancer/verification/digilocker/initiate
 * body: { userFlow?: 'signin'|'signup' }
 */
router.post('/verification/digilocker/initiate', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (user.role !== 'freelancer') {
      return res.status(403).json({ success: false, error: 'This endpoint is only for freelancers' });
    }

    const { userFlow } = req.body || {};
    const verificationId = `DL_${user._id.toString()}_${Date.now()}`.slice(0, 50);
    const baseUrl = getCashfreeVerificationBaseUrl();

    // Must be https. Use BACKEND_URL if configured; otherwise fall back to Cashfree docs suggestion.
    const redirectUrl =
      (process.env.BACKEND_URL && process.env.BACKEND_URL.startsWith('https://'))
        ? `${process.env.BACKEND_URL.replace(/\/$/, '')}/digilocker/return`
        : 'https://www.cashfree.com';

    const payload = {
      verification_id: verificationId,
      document_requested: ['AADHAAR', 'PAN'],
      redirect_url: redirectUrl,
      user_flow: userFlow === 'signin' ? 'signin' : 'signup',
    };

    const resp = await axios.post(`${baseUrl}/digilocker`, payload, {
      headers: getCashfreeVrsHeaders(),
      timeout: 15000,
    });

    const data = resp.data || {};

    // Save "pending" verification state tied to this freelancer
    await FreelancerVerification.findOneAndUpdate(
      { user: user._id },
      {
        source: 'cashfree_secure_id',
        status: 'pending',
        rejectionReason: null,
        secureIdReferenceId: data.reference_id != null ? String(data.reference_id) : null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    user.verificationStatus = 'pending';
    user.verificationRejectionReason = null;
    await user.save();

    return res.json({
      success: true,
      verificationId: data.verification_id || verificationId,
      referenceId: data.reference_id,
      url: data.url,
      status: data.status,
      documentRequested: data.document_requested,
      redirectUrl: data.redirect_url,
      userFlow: data.user_flow,
    });
  } catch (error) {
    console.error('Cashfree DigiLocker initiate error:', error?.response?.data || error.message || error);
    return res.status(500).json({
      success: false,
      error: error?.response?.data?.message || error.message || 'Failed to initiate DigiLocker verification',
    });
  }
});

/**
 * DigiLocker - Check status
 * GET /api/freelancer/verification/digilocker/status?verificationId=...
 */
router.get('/verification/digilocker/status', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (user.role !== 'freelancer') {
      return res.status(403).json({ success: false, error: 'This endpoint is only for freelancers' });
    }

    const verificationId = String(req.query?.verificationId || '').trim();
    if (!verificationId) {
      return res.status(400).json({ success: false, error: 'verificationId is required' });
    }

    const baseUrl = getCashfreeVerificationBaseUrl();
    const resp = await axios.get(`${baseUrl}/digilocker`, {
      headers: getCashfreeVrsHeaders(),
      params: { verification_id: verificationId },
      timeout: 15000,
    });

    return res.json({ success: true, ...resp.data });
  } catch (error) {
    console.error('Cashfree DigiLocker status error:', error?.response?.data || error.message || error);
    return res.status(500).json({
      success: false,
      error: error?.response?.data?.message || error.message || 'Failed to get DigiLocker status',
    });
  }
});

/**
 * DigiLocker - Fetch documents and approve freelancer
 * POST /api/freelancer/verification/digilocker/fetch
 * body: { verificationId: string }
 */
router.post('/verification/digilocker/fetch', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (user.role !== 'freelancer') {
      return res.status(403).json({ success: false, error: 'This endpoint is only for freelancers' });
    }

    const { verificationId } = req.body || {};
    const vId = String(verificationId || '').trim();
    if (!vId) return res.status(400).json({ success: false, error: 'verificationId is required' });

    const baseUrl = getCashfreeVerificationBaseUrl();

    // 1) Ensure AUTHENTICATED
    const statusResp = await axios.get(`${baseUrl}/digilocker`, {
      headers: getCashfreeVrsHeaders(),
      params: { verification_id: vId },
      timeout: 15000,
    });
    const statusData = statusResp.data || {};
    if (statusData.status !== 'AUTHENTICATED') {
      return res.status(400).json({
        success: false,
        error: `DigiLocker not ready. Current status: ${statusData.status || 'UNKNOWN'}`,
        status: statusData.status,
        details: statusData,
      });
    }

    // 2) Fetch Aadhaar and PAN docs
    const [aadhaarResp, panResp] = await Promise.all([
      axios.get(`${baseUrl}/digilocker/document/AADHAAR`, {
        headers: getCashfreeVrsHeaders(),
        params: { verification_id: vId },
        timeout: 20000,
      }),
      axios.get(`${baseUrl}/digilocker/document/PAN`, {
        headers: getCashfreeVrsHeaders(),
        params: { verification_id: vId },
        timeout: 20000,
      }),
    ]);

    const aadhaar = aadhaarResp.data || {};
    const pan = panResp.data || {};

    if (aadhaar.status !== 'SUCCESS') {
      return res.status(400).json({
        success: false,
        error: `Failed to fetch Aadhaar from DigiLocker. Status: ${aadhaar.status || 'UNKNOWN'}`,
        aadhaar,
      });
    }
    if (pan.status !== 'SUCCESS') {
      return res.status(400).json({
        success: false,
        error: `Failed to fetch PAN from DigiLocker. Status: ${pan.status || 'UNKNOWN'}`,
        pan,
      });
    }

    const fullName = aadhaar.name || pan.name_pan_card || null;
    const dob = aadhaar.dob || pan.dob || null;
    const gender =
      (aadhaar.gender === 'M' ? 'Male' : aadhaar.gender === 'F' ? 'Female' : aadhaar.gender) ||
      pan.gender ||
      null;
    const address = aadhaar.split_address ? buildAddressFromSplitAddress(aadhaar.split_address) : null;

    const aadhaarMasked = aadhaar.uid ? String(aadhaar.uid) : null; // already masked like xxxxxxxx5647
    const panNumber = pan.pan ? String(pan.pan).toUpperCase() : null;

    // Aadhaar photo is Base64 in "photo_link" (per docs). Use it as profile photo if present.
    let profilePhotoUrl = null;
    if (aadhaar.photo_link) {
      try {
        const base64 = String(aadhaar.photo_link);
        const buf = Buffer.from(base64, 'base64');
        const folderBase = `people-app/freelancers/${user._id.toString()}`;
        profilePhotoUrl = await uploadToCloudinary(buf, `${folderBase}/profile`);
      } catch (e) {
        console.warn('Failed to upload DigiLocker Aadhaar photo to Cloudinary:', e?.message || e);
      }
    }

    // Save verification + approve
    const verification = await FreelancerVerification.findOneAndUpdate(
      { user: user._id },
      {
        source: 'cashfree_secure_id',
        fullName,
        dob,
        gender,
        address,
        profilePhoto: profilePhotoUrl || null,
        aadhaarMasked,
        panNumber,
        status: 'approved',
        rejectionReason: null,
        secureIdReferenceId: pan.reference_id != null ? String(pan.reference_id) : null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    user.verificationStatus = 'approved';
    user.verificationRejectionReason = null;
    if (fullName) user.fullName = fullName;
    if (profilePhotoUrl) user.profilePhoto = profilePhotoUrl;
    await user.save();

    return res.json({
      success: true,
      status: 'approved',
      verification,
      digilocker: {
        verificationId: vId,
        aadhaar: {
          uid: aadhaar.uid,
          name: aadhaar.name,
          dob: aadhaar.dob,
          gender: aadhaar.gender,
        },
        pan: {
          pan: pan.pan,
          name_pan_card: pan.name_pan_card,
          dob: pan.dob,
          gender: pan.gender,
        },
      },
    });
  } catch (error) {
    console.error('Cashfree DigiLocker fetch error:', error?.response?.data || error.message || error);
    return res.status(500).json({
      success: false,
      error: error?.response?.data?.message || error.message || 'Failed to fetch DigiLocker documents',
    });
  }
});

/**
 * Offline Aadhaar OTP - Generate OTP
 * POST /api/freelancer/verification/aadhaar/otp
 * body: { aadhaarNumber: string }
 */
router.post('/verification/aadhaar/otp', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (user.role !== 'freelancer') {
      return res.status(403).json({ success: false, error: 'This endpoint is only for freelancers' });
    }

    const aadhaarNumber = digitsOnly(req.body?.aadhaarNumber);
    if (!aadhaarNumber || aadhaarNumber.length !== 12) {
      return res.status(400).json({ success: false, error: 'Enter a valid 12-digit Aadhaar number.' });
    }

    const baseUrl = getCashfreeVerificationBaseUrl();
    const resp = await axios.post(
      `${baseUrl}/offline-aadhaar/otp`,
      { aadhaar_number: aadhaarNumber },
      { headers: getCashfreeVrsHeaders(), timeout: 15000 }
    );

    const data = resp.data || {};
    const refId = data.ref_id != null ? String(data.ref_id) : null;
    if (!refId) {
      return res.status(500).json({ success: false, error: 'Failed to generate Aadhaar OTP. Please try again.' });
    }

    await FreelancerVerification.findOneAndUpdate(
      { user: user._id },
      {
        source: 'cashfree_secure_id',
        status: 'pending',
        rejectionReason: null,
        aadhaarOtpRefId: refId,
        panVerified: false,
        panRegisteredName: null,
        termsAccepted: false,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    user.verificationStatus = 'pending';
    user.verificationRejectionReason = null;
    await user.save();

    return res.json({
      success: true,
      status: data.status || 'SUCCESS',
      message: data.message || 'OTP sent successfully',
      refId,
    });
  } catch (error) {
    console.error('Cashfree Aadhaar OTP error:', error?.response?.data || error.message || error);
    return res.status(500).json({
      success: false,
      error: error?.response?.data?.message || error?.response?.data?.error?.message || error.message || 'Failed to send Aadhaar OTP',
    });
  }
});

/**
 * Offline Aadhaar OTP - Submit OTP and fetch Aadhaar details
 * POST /api/freelancer/verification/aadhaar/verify
 * body: { otp: string, refId?: string }
 */
router.post('/verification/aadhaar/verify', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (user.role !== 'freelancer') {
      return res.status(403).json({ success: false, error: 'This endpoint is only for freelancers' });
    }

    const otp = digitsOnly(req.body?.otp);
    if (!otp || otp.length !== 6) {
      return res.status(400).json({ success: false, error: 'Enter the 6-digit OTP.' });
    }

    const verification = await FreelancerVerification.findOne({ user: user._id }).sort({ createdAt: -1 });
    const refId = String(req.body?.refId || verification?.aadhaarOtpRefId || '').trim();
    if (!refId) {
      return res.status(400).json({ success: false, error: 'Aadhaar OTP session expired. Please request OTP again.' });
    }

    const baseUrl = getCashfreeVerificationBaseUrl();
    const resp = await axios.post(
      `${baseUrl}/offline-aadhaar/verify`,
      { otp, ref_id: refId },
      { headers: getCashfreeVrsHeaders(), timeout: 35000 }
    );

    const data = resp.data || {};
    const status = data.status || data?.qr_details?.status || null;
    if (status && String(status).toUpperCase() !== 'VALID') {
      return res.status(400).json({ success: false, error: data.message || 'Aadhaar verification failed', details: data });
    }

    const qr = data.qr_details || data;
    const fullName = qr.name || null;
    const dob = qr.dob || data.dob || null;
    const genderRaw = qr.gender || data.gender || null;
    const gender = genderRaw === 'M' ? 'Male' : genderRaw === 'F' ? 'Female' : genderRaw;
    const split = qr.split_address || data.split_address || null;
    const address = split ? buildAddressFromSplitAddress(split) : (qr.address || data.address || null);
    const aadhaarLast4 = digitsOnly(qr.aadhaar_last_four_digit || data.aadhaar_last_four_digit || '').slice(-4) || null;
    const aadhaarMasked = aadhaarLast4 ? `XXXXXXXX${aadhaarLast4}` : null;

    // Try to infer Aadhaar-linked mobile (often masked) and compare last-4 with signup phone
    const signupPhoneLast4 = last4Digits(user.phone);
    let aadhaarMobileLast4 = null;
    let aadhaarMobileSource = null;
    const candidates = [
      ['qr.masked_mobile', qr.masked_mobile],
      ['qr.masked_mobile_number', qr.masked_mobile_number],
      ['qr.masked_mobile_no', qr.masked_mobile_no],
      ['qr.mobile', qr.mobile],
      ['qr.mobile_number', qr.mobile_number],
      ['data.masked_mobile', data.masked_mobile],
      ['data.masked_mobile_number', data.masked_mobile_number],
      ['data.mobile', data.mobile],
      ['data.mobile_number', data.mobile_number],
    ];
    for (const [key, val] of candidates) {
      const l4 = mobileLast4IfLooksLikeMobile(val);
      if (l4) {
        aadhaarMobileLast4 = l4;
        aadhaarMobileSource = key;
        break;
      }
    }
    const aadhaarMobileHash =
      (qr.mobile_hash != null ? String(qr.mobile_hash) : null) ||
      (data.mobile_hash != null ? String(data.mobile_hash) : null) ||
      null;
    const aadhaarMobileMatchesSignup =
      (signupPhoneLast4 && aadhaarMobileLast4) ? (signupPhoneLast4 === aadhaarMobileLast4) : null;

    // If we can determine mismatch, block verification to prevent fraud.
    if (aadhaarMobileMatchesSignup === false) {
      console.warn('Aadhaar mobile mismatch', {
        userId: String(user._id),
        signupLast4: signupPhoneLast4,
        aadhaarLast4: aadhaarMobileLast4,
        source: aadhaarMobileSource,
      });
      return res.status(400).json({
        success: false,
        error: 'Mobile number mismatch with Aadhaar.',
        meta: {
          signupLast4: signupPhoneLast4,
          aadhaarLast4: aadhaarMobileLast4,
          source: aadhaarMobileSource,
        },
      });
    }

    // Aadhaar photo is Base64 in photo_link. We'll store it for face-match reference (not as profile photo).
    let aadhaarFaceImageUrl = null;
    const photoBase64 = qr.photo_link || data.photo_link || null;
    if (photoBase64) {
      try {
        const buf = Buffer.from(String(photoBase64), 'base64');
        const folderBase = `people-app/freelancers/${user._id.toString()}`;
        aadhaarFaceImageUrl = await uploadToCloudinary(buf, `${folderBase}/kyc/aadhaar-face`);
      } catch (e) {
        console.warn('Failed to upload Aadhaar face image to Cloudinary:', e?.message || e);
      }
    }

    const updated = await FreelancerVerification.findOneAndUpdate(
      { user: user._id },
      {
        source: 'cashfree_secure_id',
        status: 'pending',
        rejectionReason: null,
        aadhaarOtpRefId: refId,
        fullName,
        dob,
        gender,
        address,
        aadhaarFaceImageUrl,
        aadhaarLast4,
        aadhaarMasked: aadhaarMasked || undefined,
        aadhaarMobileLast4,
        aadhaarMobileHash,
        aadhaarMobileMatchesSignup,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Prefill User as well (final approval happens after face match + completion)
    if (fullName) user.fullName = fullName;
    user.verificationStatus = 'pending';
    user.verificationRejectionReason = null;
    await user.save();

    return res.json({
      success: true,
      status: 'VALID',
      verification: {
        fullName: updated.fullName || null,
        dob: updated.dob || null,
        gender: updated.gender || null,
        address: updated.address || null,
        aadhaarMasked: updated.aadhaarMasked || null,
        profilePhoto: updated.profilePhoto || null,
        aadhaarMobileMatchesSignup: updated.aadhaarMobileMatchesSignup ?? null,
        aadhaarMobileLast4: updated.aadhaarMobileLast4 || null,
        aadhaarFaceImageUrl: updated.aadhaarFaceImageUrl || null,
      },
    });
  } catch (error) {
    console.error('Cashfree Aadhaar verify error:', error?.response?.data || error.message || error);
    if (error?.code === 'ECONNABORTED' || String(error?.message || '').includes('timeout')) {
      return res.status(504).json({
        success: false,
        error: 'Aadhaar verification is taking longer than usual. Please try again.',
      });
    }
    return res.status(500).json({
      success: false,
      error: error?.response?.data?.message || error?.response?.data?.error?.message || error.message || 'Failed to verify Aadhaar OTP',
    });
  }
});

/**
 * Face match selfie with Aadhaar photo (>=65% required)
 * POST /api/freelancer/verification/face-match
 * multipart/form-data: image=<selfie file>
 */
router.post('/verification/face-match', authenticate, upload.single('image'), async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (user.role !== 'freelancer') {
      return res.status(403).json({ success: false, error: 'This endpoint is only for freelancers' });
    }
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, error: 'Selfie image is required.' });
    }

    const verification = await FreelancerVerification.findOne({ user: user._id }).sort({ createdAt: -1 });
    if (!verification?.aadhaarFaceImageUrl) {
      return res.status(400).json({ success: false, error: 'Aadhaar photo not available for face match. Verify Aadhaar again.' });
    }

    // Upload selfie to Cloudinary (use as profile photo if match passes)
    const folderBase = `people-app/freelancers/${user._id.toString()}`;
    const selfieUrl = await uploadToCloudinary(req.file.buffer, `${folderBase}/kyc/selfie`);

    const aadhaarBuf = await fetchImageBuffer(verification.aadhaarFaceImageUrl);
    const selfieBuf = req.file.buffer;

    const baseUrl = getCashfreeVerificationBaseUrl();
    const verificationId = `FM_${user._id.toString()}_${Date.now()}`.slice(0, 50);
    const threshold = 0.65;

    const form = new FormData();
    form.append('verification_id', verificationId);
    form.append('first_image', aadhaarBuf, { filename: 'aadhaar.jpg', contentType: 'image/jpeg' });
    form.append('second_image', selfieBuf, { filename: 'selfie.jpg', contentType: req.file.mimetype || 'image/jpeg' });
    form.append('threshold', String(threshold));

    const resp = await axios.post(`${baseUrl}/face-match`, form, {
      headers: {
        ...getCashfreeVrsHeaders(),
        ...form.getHeaders(),
      },
      timeout: 25000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    const data = resp.data || {};
    const score01 = data.face_match_score != null ? Number(data.face_match_score) : null;
    const scorePct = score01 != null && !Number.isNaN(score01) ? Math.round(score01 * 100) : null;
    const ok = scorePct != null ? scorePct >= 65 : false;

    await FreelancerVerification.findOneAndUpdate(
      { user: user._id },
      {
        selfieImageUrl: selfieUrl,
        faceMatchScore: scorePct,
        faceMatchOk: ok,
        ...(ok ? { profilePhoto: selfieUrl } : {}),
      },
      { new: true }
    );

    if (!ok) {
      return res.status(400).json({
        success: false,
        error: 'Face is not matching with aadhar.',
        score: scorePct,
      });
    }

    // Use selfie as profile photo
    user.profilePhoto = selfieUrl;
    // Lock referral binding after face verification succeeds (one-time binding milestone).
    if (user.referredBy && !user.referralLockedAt) {
      user.referralLockedAt = new Date();
    }
    await user.save();

    return res.json({ success: true, score: scorePct, selfieUrl });
  } catch (error) {
    console.error('Face match error:', error?.response?.data || error.message || error);
    return res.status(500).json({
      success: false,
      error: error?.response?.data?.message || error.message || 'Failed to run face match',
    });
  }
});

/**
 * Get (or generate) my referral code
 * GET /api/freelancer/referral/my-code
 */
router.get('/referral/my-code', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('role referralCode referredBy referralLockedAt').lean();
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (user.role !== 'freelancer') return res.status(403).json({ success: false, error: 'This endpoint is only for freelancers' });

    const code = await ensureUserReferralCode(user._id);
    return res.json({
      success: true,
      referral: {
        code,
        referredBy: user.referredBy ? String(user.referredBy) : null,
        lockedAt: user.referralLockedAt || null,
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e?.message || 'Failed to get referral code' });
  }
});

/**
 * Validate a referral code (does not bind)
 * POST /api/freelancer/referral/validate
 * body: { code: string }
 */
router.post('/referral/validate', authenticate, async (req, res) => {
  try {
    const me = await User.findById(req.user.id).select('role _id').lean();
    if (!me) return res.status(404).json({ success: false, error: 'User not found' });
    if (me.role !== 'freelancer') return res.status(403).json({ success: false, error: 'This endpoint is only for freelancers' });

    const code = String(req.body?.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ success: false, error: 'Referral code is required' });

    const referrer = await User.findOne({ referralCode: code, role: 'freelancer' }).select('_id fullName').lean();
    if (!referrer) return res.json({ success: true, valid: false });
    if (String(referrer._id) === String(me._id)) return res.json({ success: true, valid: false });

    return res.json({
      success: true,
      valid: true,
      referrer: {
        id: String(referrer._id),
        name: referrer.fullName || null,
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e?.message || 'Failed to validate referral code' });
  }
});

/**
 * Apply a referral code (one-time binding; lock happens after face verification success)
 * POST /api/freelancer/referral/apply
 * body: { code: string }
 */
router.post('/referral/apply', authenticate, async (req, res) => {
  try {
    const me = await User.findById(req.user.id).select('role _id referredBy referralLockedAt').lean();
    if (!me) return res.status(404).json({ success: false, error: 'User not found' });
    if (me.role !== 'freelancer') return res.status(403).json({ success: false, error: 'This endpoint is only for freelancers' });
    if (me.referralLockedAt) return res.status(400).json({ success: false, error: 'Referral code is locked and cannot be changed' });
    if (me.referredBy) return res.status(400).json({ success: false, error: 'Referral code already applied' });

    const code = String(req.body?.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ success: false, error: 'Referral code is required' });

    const referrer = await User.findOne({ referralCode: code, role: 'freelancer' }).select('_id').lean();
    if (!referrer) return res.status(400).json({ success: false, error: 'Invalid referral code' });
    if (String(referrer._id) === String(me._id)) return res.status(400).json({ success: false, error: 'You cannot use your own referral code' });

    const updated = await User.findOneAndUpdate(
      { _id: me._id, referredBy: null, referralLockedAt: null },
      { referredBy: referrer._id },
      { new: true }
    ).select('referredBy referralLockedAt referralCode');

    return res.json({
      success: true,
      referral: {
        referredBy: updated?.referredBy ? String(updated.referredBy) : null,
        lockedAt: updated?.referralLockedAt || null,
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e?.message || 'Failed to apply referral code' });
  }
});

/**
 * PAN verify
 * POST /api/freelancer/verification/pan/verify
 * body: { panNumber: string }
 */
router.post('/verification/pan/verify', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (user.role !== 'freelancer') {
      return res.status(403).json({ success: false, error: 'This endpoint is only for freelancers' });
    }

    const pan = String(req.body?.panNumber || '').trim().toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      return res.status(400).json({ success: false, error: 'Enter a valid PAN number.' });
    }

    const baseUrl = getCashfreeVerificationBaseUrl();
    const resp = await axios.post(
      `${baseUrl}/pan`,
      { pan, name: user.fullName || undefined },
      { headers: getCashfreeVrsHeaders(), timeout: 15000 }
    );
    const data = resp.data || {};
    if (data.valid !== true) {
      return res.status(400).json({ success: false, error: data.message || 'PAN verification failed', details: data });
    }

    const existing = await FreelancerVerification.findOne({ user: user._id }).sort({ createdAt: -1 }).lean();
    const aadhaarName = existing?.fullName || user.fullName || null;
    const panName = data.registered_name || data.name_pan_card || null;
    const score = nameMatchScorePercent(aadhaarName, panName);
    const ok = score >= 75; // 70-80% threshold target; using 75% default

    const updated = await FreelancerVerification.findOneAndUpdate(
      { user: user._id },
      {
        source: 'cashfree_secure_id',
        status: 'pending',
        rejectionReason: null,
        panNumber: pan,
        panVerified: true,
        panRegisteredName: data.registered_name || data.name_pan_card || null,
        panNameMatchScore: score,
        panNameMatchOk: ok,
        secureIdReferenceId: data.reference_id != null ? String(data.reference_id) : undefined,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({
      success: true,
      valid: true,
      registeredName: updated.panRegisteredName || null,
      pan: updated.panNumber || pan,
      nameMatchScore: updated.panNameMatchScore ?? score,
      nameMatchOk: updated.panNameMatchOk ?? ok,
    });
  } catch (error) {
    console.error('Cashfree PAN verify error:', error?.response?.data || error.message || error);
    return res.status(500).json({
      success: false,
      error: error?.response?.data?.message || error?.response?.data?.error?.message || error.message || 'Failed to verify PAN',
    });
  }
});

/**
 * Complete verification (terms accepted) and approve freelancer
 * POST /api/freelancer/verification/complete
 * body: { termsAccepted: boolean }
 */
router.post('/verification/complete', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (user.role !== 'freelancer') {
      return res.status(403).json({ success: false, error: 'This endpoint is only for freelancers' });
    }

    const termsAccepted = req.body?.termsAccepted === true;
    if (!termsAccepted) {
      return res.status(400).json({ success: false, error: 'Please accept Terms & Conditions to continue.' });
    }

    const verification = await FreelancerVerification.findOne({ user: user._id }).sort({ createdAt: -1 });
    if (!verification) {
      return res.status(400).json({ success: false, error: 'Verification not started.' });
    }
    if (!verification.fullName || !verification.address || !verification.dob) {
      return res.status(400).json({ success: false, error: 'Please complete Aadhaar verification first.' });
    }
    if (!verification.panVerified) {
      return res.status(400).json({ success: false, error: 'Please verify PAN first.' });
    }
    if (verification.panNameMatchOk !== true) {
      return res.status(400).json({ success: false, error: 'PAN name does not match Aadhaar name.' });
    }
    if (verification.faceMatchOk !== true) {
      return res.status(400).json({ success: false, error: 'Please complete face verification.' });
    }
    // Enforce mismatch only when we can reliably compare.
    // Cashfree offline-aadhaar verify does not always return masked mobile/last-4, so this can be null.
    if (verification.aadhaarMobileMatchesSignup === false) {
      return res.status(400).json({ success: false, error: 'Mobile number mismatch with Aadhaar.' });
    }

    verification.termsAccepted = true;
    verification.status = 'approved';
    verification.rejectionReason = null;
    await verification.save();

    user.verificationStatus = 'approved';
    user.verificationRejectionReason = null;
    if (verification.fullName) user.fullName = verification.fullName;
    if (verification.profilePhoto) user.profilePhoto = verification.profilePhoto;
    await user.save();

    return res.json({
      success: true,
      status: 'approved',
      verification,
    });
  } catch (error) {
    console.error('Complete verification error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to complete verification' });
  }
});

/**
 * Get available jobs for freelancer (filtered by freelancer's current state when lat/lng provided)
 * GET /api/freelancer/jobs/available?lat=28.6139&lng=77.2090
 * Requires authentication as freelancer
 */
router.get('/jobs/available', authenticate, async (req, res) => {
  try {
    const user = req.user;

    if (!user || user.role !== 'freelancer') {
      return res.status(403).json({
        success: false,
        error: 'Only freelancers can view available jobs',
      });
    }

    const freelancerId = user._id || user.id;
    const { lat, lng, sort } = req.query || {};
    const flLat = lat != null ? Number(lat) : null;
    const flLng = lng != null ? Number(lng) : null;

    const verificationDoc = await FreelancerVerification.findOne({ user: freelancerId })
      .sort({ updatedAt: -1 })
      .select('gender')
      .lean();
    const freelancerGenderNorm = normalizeFreelancerProfileGender(verificationDoc?.gender);

    const filter = {
      status: 'open',
      assignedFreelancer: null,
      client: { $ne: freelancerId },
      gender: jobGenderMatchQuery(freelancerGenderNorm),
    };

    if (flLat != null && flLng != null && !Number.isNaN(flLat) && !Number.isNaN(flLng)) {
      const freelancerState = await getStateFromCoords(flLat, flLng);
      if (freelancerState) {
        filter.$or = [
          { state: freelancerState },
          { state: null },
          { state: '' },
        ];
      }
    }

    let jobs = await Job.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Attach distance (km) and sort when freelancer location provided
    if (flLat != null && flLng != null && !Number.isNaN(flLat) && !Number.isNaN(flLng)) {
      const pincodeCoordsCache = {};
      const getJobCoords = async (job) => {
        if (job.jobLat != null && job.jobLng != null) {
          return { lat: job.jobLat, lng: job.jobLng };
        }
        const raw = (job.pincode || '').toString().trim();
        const pin = raw.replace(/\D/g, '').slice(0, 6);
        if (pin.length !== 6) return null;
        if (pincodeCoordsCache[pin]) return pincodeCoordsCache[pin];
        const coords = await getCoordsFromPincode(pin);
        if (coords) pincodeCoordsCache[pin] = coords;
        return coords;
      };

      for (const job of jobs) {
        const coords = await getJobCoords(job);
        if (coords) {
          job.distanceKm = Math.round(haversineDistanceKm(flLat, flLng, coords.lat, coords.lng) * 10) / 10;
        } else {
          job.distanceKm = null;
        }
      }

      const nearestFirst = sort !== 'farthest_first';
      jobs.sort((a, b) => {
        const da = a.distanceKm != null ? a.distanceKm : Infinity;
        const db = b.distanceKm != null ? b.distanceKm : Infinity;
        return nearestFirst ? da - db : db - da;
      });
    }

    const fid = freelancerId.toString();
    for (const job of jobs) {
      const apps = job.applications || [];
      const mine = apps.filter(
        (a) => a.freelancer && a.freelancer.toString() === fid
      );
      const pendingApp = mine.find((a) => a.status === 'pending');
      if (pendingApp) {
        job.myApplication = {
          status: 'pending',
          applicationId: pendingApp._id,
        };
      } else if (mine.some((a) => a.status === 'accepted')) {
        job.myApplication = { status: 'accepted' };
      } else if (mine.some((a) => a.status === 'rejected')) {
        job.myApplication = { status: 'rejected' };
      } else {
        job.myApplication = null;
      }
    }

    res.json({
      success: true,
      jobs,
    });
  } catch (error) {
    console.error('Error getting available jobs for freelancer:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get available jobs',
    });
  }
});

/**
 * Get assigned jobs for freelancer
 * GET /api/freelancer/jobs/assigned
 * Requires authentication as freelancer
 */
router.get('/jobs/assigned', authenticate, async (req, res) => {
  try {
    const user = req.user;

    if (!user || user.role !== 'freelancer') {
      return res.status(403).json({
        success: false,
        error: 'Only freelancers can view assigned jobs',
      });
    }

    const freelancerId = user._id || user.id;

    // Jobs assigned to this freelancer and not fully completed from their side
    const jobs = await Job.find({
      assignedFreelancer: freelancerId,
      freelancerCompleted: false,
      status: { $in: ['assigned', 'work_done', 'completed'] },
    })
      .populate('client', 'fullName phone profilePhoto')
      .sort({ createdAt: -1 })
      .lean();

    // Attach commission summary for each job if exists
    const jobIds = jobs.map((job) => job._id);
    const commissions = await CommissionTransaction.find({
      freelancer: freelancerId,
      job: { $in: jobIds },
    }).lean();

    const commissionByJob = {};
    commissions.forEach((c) => {
      commissionByJob[c.job.toString()] = {
        jobAmount: c.jobAmount,
        platformCommission: c.platformCommission,
        amountReceived: c.amountReceived,
        duesPaid: c.duesPaid,
      };
    });

    // Ensure client profile photos are included
    const mappedJobs = await Promise.all(jobs.map(async (job) => {
      // If client exists but doesn't have profilePhoto, fetch it from User model
      if (job.client && !job.client.profilePhoto) {
        try {
          const clientUser = await User.findById(job.client._id || job.client).select('profilePhoto').lean();
          if (clientUser && clientUser.profilePhoto) {
            job.client.profilePhoto = clientUser.profilePhoto;
          }
        } catch (err) {
          console.error('Error fetching client profile photo:', err);
        }
      }
      
      return {
        ...job,
        commission: commissionByJob[job._id.toString()] || null,
      };
    }));

    res.json({
      success: true,
      jobs: mappedJobs,
    });
  } catch (error) {
    console.error('Error getting assigned jobs for freelancer:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get assigned jobs',
    });
  }
});

/**
 * Get completed orders for freelancer (order history)
 * GET /api/freelancer/orders
 * Requires authentication as freelancer
 */
router.get('/orders', authenticate, async (req, res) => {
  try {
    const user = req.user;

    if (!user || user.role !== 'freelancer') {
      return res.status(403).json({
        success: false,
        error: 'Only freelancers can view orders',
      });
    }

    const freelancerId = user._id || user.id;

    // Orders = jobs assigned to this freelancer that they've fully completed
    const jobs = await Job.find({
      assignedFreelancer: freelancerId,
      freelancerCompleted: true,
      status: 'completed',
    })
      .populate('client', 'fullName phone profilePhoto')
      .sort({ updatedAt: -1 })
      .lean();
    
    // Ensure client profile photos are included
    const jobsWithClientPhotos = await Promise.all(jobs.map(async (job) => {
      // If client exists but doesn't have profilePhoto, fetch it from User model
      if (job.client && !job.client.profilePhoto) {
        try {
          const clientUser = await User.findById(job.client._id || job.client).select('profilePhoto').lean();
          if (clientUser && clientUser.profilePhoto) {
            job.client.profilePhoto = clientUser.profilePhoto;
          }
        } catch (err) {
          console.error('Error fetching client profile photo:', err);
        }
      }
      return job;
    }));

    // Attach commission summary for each job if exists
    const jobIds = jobsWithClientPhotos.map((job) => job._id);
    const commissions = await CommissionTransaction.find({
      freelancer: freelancerId,
      job: { $in: jobIds },
    }).lean();

    const commissionByJob = {};
    commissions.forEach((c) => {
      commissionByJob[c.job.toString()] = {
        jobAmount: c.jobAmount,
        platformCommission: c.platformCommission,
        amountReceived: c.amountReceived,
        duesPaid: c.duesPaid,
      };
    });

    const mappedJobs = jobsWithClientPhotos.map((job) => ({
      ...job,
      commission: commissionByJob[job._id.toString()] || null,
    }));

    res.json({
      success: true,
      orders: mappedJobs,
    });
  } catch (error) {
    console.error('Error getting freelancer orders:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get orders',
    });
  }
});

/**
 * Pickup a job (assign job directly to freelancer)
 * POST /api/freelancer/jobs/:id/pickup
 * Requires authentication as freelancer
 */
router.post('/jobs/:id/pickup', authenticate, async (req, res) => {
  try {
    const user = req.user;

    if (!user || user.role !== 'freelancer') {
      return res.status(403).json({
        success: false,
        error: 'Only freelancers can pickup jobs',
      });
    }

    const freelancerId = user._id || user.id;

    // Check unpaid dues - cannot pickup jobs if dues > 450rs
    const unpaidCommissions = await CommissionTransaction.find({
      freelancer: freelancerId,
      duesPaid: false,
    }).lean();

    const totalDues = unpaidCommissions.reduce(
      (sum, c) => sum + (c.platformCommission || 0),
      0
    );

    const DUES_THRESHOLD = 450;
    if (totalDues >= DUES_THRESHOLD) {
      return res.status(400).json({
        success: false,
        error: `You have unpaid dues of ₹${totalDues}. Please pay dues in Wallet to pickup jobs.`,
      });
    }

    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    if (job.status !== 'open' || job.assignedFreelancer) {
      return res.status(400).json({
        success: false,
        error: 'Job is no longer available to pickup',
      });
    }

    const genderPickup = await assertFreelancerMatchesJobGender(freelancerId, job);
    if (!genderPickup.ok) {
      return res.status(genderPickup.status || 403).json({
        success: false,
        error: genderPickup.error,
      });
    }

    if (!isDeliveryCategory(job.category)) {
      return res.status(400).json({
        success: false,
        error: 'Pickup is only for Delivery jobs. Use Apply for other categories.',
      });
    }

    job.assignedFreelancer = freelancerId;
    job.status = 'assigned';
    await job.save();

    // Notify client about job pickup
    try {
      const freelancer = await User.findById(freelancerId).select('fullName').lean();
      await notifyJobPickedUp(
        job.client.toString(),
        freelancer?.fullName || 'A freelancer',
        job.title
      );
    } catch (notifError) {
      console.error('Error sending job pickup notification to client:', notifError);
      // Don't fail the request if notification fails
    }

    // Notify freelancer about job assignment
    try {
      const client = await User.findById(job.client).select('fullName').lean();
      await notifyJobAssigned(
        freelancerId,
        client?.fullName || 'The client',
        job.title
      );
    } catch (notifError) {
      console.error('Error sending job assignment notification to freelancer:', notifError);
      // Don't fail the request if notification fails
    }

    res.json({
      success: true,
      message: 'Job picked up successfully',
      job,
    });
  } catch (error) {
    console.error('Error picking up job:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to pickup job',
    });
  }
});

/**
 * Apply to a non-delivery job (client must accept; cannot re-apply while pending)
 * POST /api/freelancer/jobs/:id/apply
 */
router.post('/jobs/:id/apply', authenticate, async (req, res) => {
  try {
    const user = req.user;

    if (!user || user.role !== 'freelancer') {
      return res.status(403).json({
        success: false,
        error: 'Only freelancers can apply to jobs',
      });
    }

    const freelancerId = user._id || user.id;

    const unpaidCommissions = await CommissionTransaction.find({
      freelancer: freelancerId,
      duesPaid: false,
    }).lean();

    const totalDues = unpaidCommissions.reduce(
      (sum, c) => sum + (c.platformCommission || 0),
      0
    );

    const DUES_THRESHOLD = 450;
    if (totalDues >= DUES_THRESHOLD) {
      return res.status(400).json({
        success: false,
        error: `You have unpaid dues of ₹${totalDues}. Please pay dues in Wallet to apply for jobs.`,
      });
    }

    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    if (job.client && job.client.toString() === freelancerId.toString()) {
      return res.status(400).json({
        success: false,
        error: 'You cannot apply to your own job',
      });
    }

    if (job.status !== 'open' || job.assignedFreelancer) {
      return res.status(400).json({
        success: false,
        error: 'This job is no longer open for applications',
      });
    }

    if (isDeliveryCategory(job.category)) {
      return res.status(400).json({
        success: false,
        error: 'Use Pickup for delivery jobs',
      });
    }

    const genderApply = await assertFreelancerMatchesJobGender(freelancerId, job);
    if (!genderApply.ok) {
      return res.status(genderApply.status || 403).json({
        success: false,
        error: genderApply.error,
      });
    }

    if (!job.applications) job.applications = [];

    const mine = job.applications.filter(
      (a) => a.freelancer.toString() === freelancerId.toString()
    );
    const hasPending = mine.some((a) => a.status === 'pending');
    if (hasPending) {
      return res.status(400).json({
        success: false,
        error: 'You already have a pending application for this job',
      });
    }

    if (mine.some((a) => a.status === 'accepted')) {
      return res.status(400).json({
        success: false,
        error: 'You are already assigned to this job',
      });
    }

    job.applications.push({
      freelancer: freelancerId,
      status: 'pending',
      createdAt: new Date(),
    });

    await job.save();

    try {
      const freelancer = await User.findById(freelancerId).select('fullName').lean();
      await notifyApplicationReceived(
        job.client.toString(),
        freelancer?.fullName || 'A freelancer',
        job.title
      );
    } catch (notifError) {
      console.error('Error sending application notification:', notifError);
    }

    try {
      await afterApplicationSubmitted(job._id);
    } catch (e) {
      console.error('Auto pick after apply:', e);
    }

    const lastApp = job.applications[job.applications.length - 1];

    res.json({
      success: true,
      message: 'Application submitted successfully',
      jobId: job._id,
      myApplication: {
        status: 'pending',
        applicationId: lastApp?._id,
      },
    });
  } catch (error) {
    console.error('Error applying to job:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to apply',
    });
  }
});

/**
 * Make an offer on a job
 * POST /api/freelancer/jobs/:id/offer
 * Requires authentication as freelancer
 */
router.post('/jobs/:id/offer', authenticate, async (req, res) => {
  try {
    const user = req.user;

    if (!user || user.role !== 'freelancer') {
      return res.status(403).json({
        success: false,
        error: 'Only freelancers can make offers',
      });
    }

    const freelancerId = user._id || user.id;
    const { amount, message } = req.body || {};

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid offer amount is required',
      });
    }

    // Check unpaid dues - cannot make offers if dues > 450rs
    const unpaidCommissions = await CommissionTransaction.find({
      freelancer: freelancerId,
      duesPaid: false,
    }).lean();

    const totalDues = unpaidCommissions.reduce(
      (sum, c) => sum + (c.platformCommission || 0),
      0
    );

    const DUES_THRESHOLD = 450;
    if (totalDues >= DUES_THRESHOLD) {
      return res.status(400).json({
        success: false,
        error: `You have unpaid dues of ₹${totalDues}. Please pay dues in Wallet to make offers.`,
      });
    }

    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    if (job.status !== 'open' || job.assignedFreelancer) {
      return res.status(400).json({
        success: false,
        error: 'Cannot make offer on this job anymore',
      });
    }

    const genderOffer = await assertFreelancerMatchesJobGender(freelancerId, job);
    if (!genderOffer.ok) {
      return res.status(genderOffer.status || 403).json({
        success: false,
        error: genderOffer.error,
      });
    }

    // Cooldown: 5 minutes between offers on same job
    const FIVE_MINUTES = 5 * 60 * 1000;
    const now = new Date();
    const existingOffers = job.offers || [];
    const myOffers = existingOffers.filter(
      (o) => o.freelancer.toString() === freelancerId.toString()
    );

    if (myOffers.length > 0) {
      const lastOffer = myOffers.reduce((latest, current) =>
        (latest.createdAt || new Date(0)) > (current.createdAt || new Date(0))
          ? latest
          : current
      );

      if (lastOffer.createdAt && now - lastOffer.createdAt < FIVE_MINUTES) {
        const remainingMs = FIVE_MINUTES - (now - lastOffer.createdAt);
        const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
        return res.status(400).json({
          success: false,
          error: `You can make another offer on this job in ${remainingMinutes} minute(s).`,
        });
      }
    }

    // Add new offer
    job.offers.push({
      freelancer: freelancerId,
      amount: Number(amount),
      message: message || null,
      status: 'pending',
      createdAt: now,
    });

    await job.save();

    // Notify client about new offer
    try {
      const freelancer = await User.findById(freelancerId).select('fullName').lean();
      await notifyOfferReceived(
        job.client.toString(),
        freelancer?.fullName || 'A freelancer',
        job.title,
        Number(amount)
      );
    } catch (notifError) {
      console.error('Error sending offer notification:', notifError);
      // Don't fail the request if notification fails
    }

    res.json({
      success: true,
      message: 'Offer submitted successfully',
      jobId: job._id,
    });
  } catch (error) {
    console.error('Error making offer on job:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to make offer',
    });
  }
});

/**
 * Mark work as done
 * POST /api/freelancer/jobs/:id/complete
 * Requires authentication as freelancer
 */
router.post('/jobs/:id/complete', authenticate, async (req, res) => {
  try {
    const user = req.user;

    if (!user || user.role !== 'freelancer') {
      return res.status(403).json({
        success: false,
        error: 'Only freelancers can mark work as done',
      });
    }

    const freelancerId = user._id || user.id;

    const job = await Job.findOne({
      _id: req.params.id,
      assignedFreelancer: freelancerId,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    if (job.status !== 'assigned') {
      return res.status(400).json({
        success: false,
        error: 'Only assigned jobs can be marked as work done',
      });
    }

    job.status = 'work_done';
    await job.save();

    // Notify client about work done
    try {
      const freelancer = await User.findById(freelancerId).select('fullName').lean();
      await notifyWorkDone(
        job.client.toString(),
        freelancer?.fullName || 'The freelancer',
        job.title
      );
    } catch (notifError) {
      console.error('Error sending work done notification:', notifError);
      // Don't fail the request if notification fails
    }

    res.json({
      success: true,
      message: 'Job marked as work done. Waiting for client payment.',
      job,
    });
  } catch (error) {
    console.error('Error marking work as done:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to mark work as done',
    });
  }
});

/**
 * Mark job as fully completed (remove from active list)
 * POST /api/freelancer/jobs/:id/fully-complete
 * Requires authentication as freelancer
 */
router.post('/jobs/:id/fully-complete', authenticate, async (req, res) => {
  try {
    const user = req.user;

    if (!user || user.role !== 'freelancer') {
      return res.status(403).json({
        success: false,
        error: 'Only freelancers can fully complete jobs',
      });
    }

    const freelancerId = user._id || user.id;

    const job = await Job.findOne({
      _id: req.params.id,
      assignedFreelancer: freelancerId,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Only completed jobs can be fully completed',
      });
    }

    // Mark job as fully completed (commission payment is separate and can be done anytime)
    job.freelancerCompleted = true;
    await job.save();

    res.json({
      success: true,
      message: 'Job marked as completed and removed from active list.',
      job,
    });
  } catch (error) {
    console.error('Error fully completing job:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fully complete job',
    });
  }
});

/**
 * Get freelancer wallet data
 * GET /api/freelancer/wallet
 * Requires authentication as freelancer
 */
router.get('/wallet', authenticate, async (req, res) => {
  try {
    const user = req.user;

    if (!user || user.role !== 'freelancer') {
      return res.status(403).json({
        success: false,
        error: 'Only freelancers can view wallet',
      });
    }

    const freelancerId = user._id || user.id;

    // Get all commission transactions for this freelancer
    const transactions = await CommissionTransaction.find({
      freelancer: freelancerId,
    })
      .sort({ createdAt: -1 })
      .populate('job', 'title')
      .lean();

    // Calculate total dues (sum of unpaid commission amounts)
    const totalDues = transactions
      .filter((t) => !t.duesPaid)
      .reduce((sum, t) => sum + (t.platformCommission || 0), 0);

    // Freelancers can work if dues are < 450rs
    const DUES_THRESHOLD = 450;
    const canWork = totalDues < DUES_THRESHOLD;
    
    // Debug log to verify calculation
    console.log(`[Wallet API] totalDues: ${totalDues}, DUES_THRESHOLD: ${DUES_THRESHOLD}, canWork: ${canWork} (${totalDues} < ${DUES_THRESHOLD} = ${totalDues < DUES_THRESHOLD})`);

    // Map transactions to a frontend-friendly shape
    const mappedTransactions = transactions.map((t) => ({
      id: t._id.toString(),
      jobId: t.job?._id || t.job,
      jobTitle: t.jobTitle || t.job?.title || 'Job',
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

    // Get payment transactions (grouped by duesPaymentOrderId)
    // Each payment transaction represents one dues payment made by the user
    const paymentTransactionsMap = new Map();
    
    transactions
      .filter((t) => t.duesPaid && t.duesPaymentOrderId)
      .forEach((t) => {
        const orderId = t.duesPaymentOrderId;
        if (!paymentTransactionsMap.has(orderId)) {
          // First transaction with this order ID - create payment transaction
          paymentTransactionsMap.set(orderId, {
            id: orderId,
            orderId: orderId,
            paymentDate: t.duesPaidAt || t.updatedAt,
            amount: 0, // Will sum up all commissions paid in this payment
            transactionCount: 0,
            createdAt: t.duesPaidAt || t.updatedAt,
          });
        }
        // Add to the payment amount
        const paymentTx = paymentTransactionsMap.get(orderId);
        paymentTx.amount += t.platformCommission || 0;
        paymentTx.transactionCount += 1;
      });

    // Convert map to array and sort by payment date (newest first)
    const paymentTransactions = Array.from(paymentTransactionsMap.values())
      .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

    res.json({
      success: true,
      wallet: {
        totalDues,
        canWork,
        transactions: mappedTransactions,
        paymentTransactions, // New: List of dues payments made
      },
    });
  } catch (error) {
    console.error('Error getting freelancer wallet:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get wallet data',
    });
  }
});

/**
 * Pay dues (mark all unpaid commission as paid)
 * POST /api/freelancer/pay-dues
 * NOTE: PhonePe integration will be added later.
 */
router.post('/pay-dues', authenticate, async (req, res) => {
  try {
    const user = req.user;

    if (!user || user.role !== 'freelancer') {
      return res.status(403).json({
        success: false,
        error: 'Only freelancers can pay dues',
      });
    }

    const freelancerId = user._id || user.id;

    // In production, this will be triggered by PhonePe callback with orderId
    const now = new Date();
    const duesPaymentOrderId =
      req.body?.orderId ||
      `DUES_${freelancerId.toString()}_${now.getTime()}`;

    // Mark all unpaid transactions as paid
    await CommissionTransaction.updateMany(
      {
        freelancer: freelancerId,
        duesPaid: false,
      },
      {
        $set: {
          duesPaid: true,
          duesPaidAt: now,
          duesPaymentOrderId,
        },
      }
    );

    // Return updated wallet data
    const transactions = await CommissionTransaction.find({
      freelancer: freelancerId,
    })
      .sort({ createdAt: -1 })
      .lean();

    const totalDues = transactions
      .filter((t) => !t.duesPaid)
      .reduce((sum, t) => sum + (t.platformCommission || 0), 0);

    // Freelancers can work if dues are < 450rs
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

    res.json({
      success: true,
      wallet: {
        totalDues,
        canWork,
        transactions: mappedTransactions,
        lastOrderId: duesPaymentOrderId,
      },
    });
  } catch (error) {
    console.error('Error paying freelancer dues:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to pay dues',
    });
  }
});

/**
 * NOTE: The pay-dues route above is kept for backward compatibility.
 * For PhonePe integration, use /api/payment/create-dues-order instead.
 */

module.exports = router;

