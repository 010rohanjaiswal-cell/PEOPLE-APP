/**
 * FreelancerVerification Model - People App Backend
 *
 * Stores freelancer KYC/verification details for admin review
 */

const mongoose = require('mongoose');

const freelancerVerificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fullName: {
      type: String,
      trim: true,
    },
    dob: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    profilePhoto: {
      type: String,
      default: null,
    },
    aadhaarFront: {
      type: String,
      default: null,
    },
    aadhaarBack: {
      type: String,
      default: null,
    },
    panCard: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    rejectionReason: {
      type: String,
      default: null,
      trim: true,
    },
    // Optional: metadata when verification is done via Cashfree SecureID
    source: {
      type: String,
      enum: ['manual', 'cashfree_secure_id'],
      default: 'manual',
      index: true,
    },
    aadhaarMasked: {
      type: String,
      default: null,
      trim: true,
    },
    panNumber: {
      type: String,
      default: null,
      trim: true,
    },
    secureIdReferenceId: {
      type: String,
      default: null,
      trim: true,
    },

    // Offline Aadhaar OTP verification (Cashfree VRS)
    aadhaarOtpRefId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    aadhaarLast4: {
      type: String,
      default: null,
      trim: true,
    },
    aadhaarMobileLast4: {
      type: String,
      default: null,
      trim: true,
    },
    aadhaarMobileHash: {
      type: String,
      default: null,
      trim: true,
    },
    aadhaarMobileMatchesSignup: {
      type: Boolean,
      default: null,
      index: true,
    },

    // PAN verification (Cashfree VRS)
    panVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    panRegisteredName: {
      type: String,
      default: null,
      trim: true,
    },
    panNameMatchScore: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    panNameMatchOk: {
      type: Boolean,
      default: null,
      index: true,
    },

    // UX gating
    termsAccepted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Speed up common queries
freelancerVerificationSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('FreelancerVerification', freelancerVerificationSchema);


