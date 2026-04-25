/**
 * User Model - People App Backend
 * 
 * User schema for MongoDB
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  role: {
    type: String,
    enum: ['client', 'freelancer', 'admin'],
    required: true,
    default: 'client',
  },
  fullName: {
    type: String,
    trim: true,
    default: null,
  },
  profilePhoto: {
    type: String,
    default: null,
  },
  // Verification status for freelancers
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: null,
  },
  verificationRejectionReason: {
    type: String,
    default: null,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    default: null,
  },
  currentDeviceId: {
    type: String,
    default: null,
    trim: true,
  },
  tokenVersion: {
    type: Number,
    default: 0,
  },
  /** Freelancer-only: used to sort job applications (high to low). */
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  ratingCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  /** Referral system: the referrer (freelancer) who invited this user (locked after verification milestone). */
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  /** Referral code owned by this user (shared with others). */
  referralCode: {
    type: String,
    default: null,
    trim: true,
    uppercase: true,
    index: true,
  },
  /** Once set, referral binding is immutable. */
  referralLockedAt: {
    type: Date,
    default: null,
  },
  /** Freelancer-only: block pickup/apply/offer until this time (set after Support cancel-order unassign). */
  freelancerPickupBlockedUntil: {
    type: Date,
    default: null,
    index: true,
  },
  /**
   * Freelancer-only: "bucket/lock" so one freelancer can only have one active assigned job at a time.
   * Set when a client accepts an application/offer; cleared when the job is completed/cancelled/unassigned.
   */
  activeAssignedJob: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    default: null,
    index: true,
  },
  activeAssignedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true, // Automatically manage createdAt and updatedAt
});

// Index for faster queries
userSchema.index({ phone: 1 });
userSchema.index({ role: 1 });
userSchema.index({ referralCode: 1 }, { unique: true, sparse: true });

const User = mongoose.model('User', userSchema);

module.exports = User;

