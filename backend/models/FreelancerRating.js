/**
 * FreelancerRating Model - People App Backend
 *
 * Stores one rating per (client, freelancer) so repeat ratings replace previous.
 */

const mongoose = require('mongoose');

const freelancerRatingSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
    },
  },
  { timestamps: true }
);

freelancerRatingSchema.index({ client: 1, freelancer: 1 }, { unique: true });

module.exports = mongoose.model('FreelancerRating', freelancerRatingSchema);

