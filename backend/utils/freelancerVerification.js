/**
 * Freelancer verification helpers — single source of truth for approved status.
 */

const FreelancerVerification = require('../models/FreelancerVerification');

function isCompleteApprovedVerification(doc) {
  if (!doc || doc.status !== 'approved') return false;
  if (!doc.fullName || !doc.address || !doc.dob) return false;
  if (doc.panVerified !== true) return false;
  if (doc.faceMatchOk !== true) return false;
  if (doc.panNameMatchOk !== false && doc.panNameMatchOk !== true) return false;
  if (doc.panNameMatchOk === false) return false;
  if (doc.aadhaarMobileMatchesSignup === false) return false;
  return true;
}

async function findLatestFreelancerVerification(userId) {
  const uid = userId?._id || userId;
  if (!uid) return null;
  let doc = await FreelancerVerification.findOne({ user: uid }).sort({ createdAt: -1 }).lean();
  if (!doc) {
    doc = await FreelancerVerification.findOne({ user: String(uid) }).sort({ createdAt: -1 }).lean();
  }
  return doc;
}

async function isUserApprovedFreelancer(userId) {
  const doc = await findLatestFreelancerVerification(userId);
  return isCompleteApprovedVerification(doc);
}

/**
 * Approved only when a complete FreelancerVerification record exists — never trust User.verificationStatus alone.
 */
async function resolveFreelancerVerificationStatus(userId) {
  const doc = await findLatestFreelancerVerification(userId);
  if (isCompleteApprovedVerification(doc)) return 'approved';
  if (doc?.status) return doc.status;
  return null;
}

async function syncUserFreelancerVerificationStatus(user) {
  if (!user || user.role !== 'freelancer') return null;
  const status = await resolveFreelancerVerificationStatus(user._id);
  const next = status || null;
  if (user.verificationStatus !== next) {
    user.verificationStatus = next;
    user.updatedAt = new Date();
    await user.save();
  }
  return next;
}

async function requireVerifiedFreelancer(req, res, next) {
  try {
    const user = req.user;
    if (!user || user.role !== 'freelancer') {
      return res.status(403).json({
        success: false,
        error: 'A verified freelancer account is required',
        code: 'FREELANCER_ACCOUNT_REQUIRED',
      });
    }

    const approved = await isUserApprovedFreelancer(user._id);
    if (!approved) {
      return res.status(403).json({
        success: false,
        error: 'Freelancer verification required',
        code: 'FREELANCER_VERIFICATION_REQUIRED',
      });
    }

    return next();
  } catch (err) {
    console.error('requireVerifiedFreelancer error:', err.message);
    return res.status(500).json({ success: false, error: 'Verification check failed' });
  }
}

module.exports = {
  isCompleteApprovedVerification,
  findLatestFreelancerVerification,
  isUserApprovedFreelancer,
  resolveFreelancerVerificationStatus,
  syncUserFreelancerVerificationStatus,
  requireVerifiedFreelancer,
};
