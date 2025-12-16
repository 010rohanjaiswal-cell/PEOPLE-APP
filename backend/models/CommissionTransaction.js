/**
 * CommissionTransaction Model - People App Backend
 *
 * Tracks commission and dues for freelancers per completed job.
 * This powers the freelancer Wallet screen (total dues, history, ledger).
 */

const mongoose = require('mongoose');

const commissionTransactionSchema = new mongoose.Schema(
  {
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    jobTitle: {
      type: String,
      required: true,
      trim: true,
    },
    clientName: {
      type: String,
      default: null,
      trim: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    jobAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    platformCommission: {
      // 10% of jobAmount by default
      type: Number,
      required: true,
      min: 0,
    },
    amountReceived: {
      // What freelancer should receive after commission
      type: Number,
      required: true,
      min: 0,
    },
    duesPaid: {
      type: Boolean,
      default: false,
      index: true,
    },
    duesPaidAt: {
      type: Date,
      default: null,
    },
    duesPaymentOrderId: {
      // When integrated with PhonePe, this will store the dues order id
      type: String,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

commissionTransactionSchema.index({ freelancer: 1, createdAt: -1 });

module.exports = mongoose.model('CommissionTransaction', commissionTransactionSchema);


