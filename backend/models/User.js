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

const User = mongoose.model('User', userSchema);

module.exports = User;

