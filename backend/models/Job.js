/**
 * Job Model - People App Backend
 *
 * Basic job schema for client postings
 */

const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    // External job id used by original web app schema
    // Note: MongoDB already has _id; this is an additional id field
    id: {
      type: String,
      required: true,
      unique: true,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
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
    assignedFreelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    offers: [
      {
        freelancer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        message: {
          type: String,
          trim: true,
          default: null,
        },
        status: {
          type: String,
          enum: ['pending', 'accepted', 'rejected'],
          default: 'pending',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

jobSchema.index({ client: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Job', jobSchema);


