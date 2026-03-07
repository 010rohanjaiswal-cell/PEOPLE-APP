/**
 * PushToken Model - People App Backend
 * Stores Expo push tokens for sending push notifications when app is in background/closed
 */

const mongoose = require('mongoose');

const pushTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    expoPushToken: {
      type: String,
      required: true,
      trim: true,
    },
    platform: {
      type: String,
      enum: ['android', 'ios'],
      default: null,
    },
  },
  { timestamps: true }
);

pushTokenSchema.index({ user: 1, expoPushToken: 1 }, { unique: true });

module.exports = mongoose.model('PushToken', pushTokenSchema);
