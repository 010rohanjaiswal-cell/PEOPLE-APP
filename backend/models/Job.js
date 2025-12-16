/**
 * Job Model - People App Backend
 *
 * Basic job schema for client postings
 */

const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
    },
    budget: {
      type: Number,
      required: true,
      min: 0,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'any'],
      required: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    status: {
      type: String,
      enum: ['open', 'assigned', 'work_done', 'completed', 'cancelled'],
      default: 'open',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

jobSchema.index({ client: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Job', jobSchema);


