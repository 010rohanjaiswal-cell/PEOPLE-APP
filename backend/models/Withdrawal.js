const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema(
  {
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['REQUESTED', 'PROCESSING', 'PAID', 'FAILED'], default: 'REQUESTED', index: true },

    transferId: { type: String, required: true, unique: true, index: true }, // your idempotency id
    cfReferenceId: { type: String, default: null, index: true }, // cashfree referenceId

    beneficiary: {
      beneId: { type: String, required: true },
      name: { type: String, default: null },
      bankAccount: { type: String, default: null }, // masked
      ifsc: { type: String, default: null },
    },

    providerPayload: { type: Object, default: {} },
    failureReason: { type: String, default: null },
  },
  { timestamps: true }
);

withdrawalSchema.index({ freelancer: 1, createdAt: -1 });

module.exports = mongoose.model('Withdrawal', withdrawalSchema);

