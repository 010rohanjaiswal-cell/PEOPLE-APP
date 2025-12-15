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
  },
  {
    timestamps: true,
  }
);

// Speed up common queries
freelancerVerificationSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('FreelancerVerification', freelancerVerificationSchema);


