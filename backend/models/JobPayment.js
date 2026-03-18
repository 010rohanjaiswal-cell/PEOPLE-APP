const mongoose = require('mongoose');

const jobPaymentSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },

    cfOrderId: { type: String, required: true, unique: true, index: true },
    cfPaymentSessionId: { type: String, default: null },

    status: {
      type: String,
      enum: ['CREATED', 'PENDING', 'PAID', 'FAILED'],
      default: 'CREATED',
      index: true,
    },
    processedToWallet: { type: Boolean, default: false, index: true },
    providerPayload: { type: Object, default: {} },
  },
  { timestamps: true }
);

jobPaymentSchema.index({ client: 1, createdAt: -1 });

module.exports = mongoose.model('JobPayment', jobPaymentSchema);

