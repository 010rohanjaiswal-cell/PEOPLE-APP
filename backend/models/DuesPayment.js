const mongoose = require('mongoose');

const duesPaymentSchema = new mongoose.Schema(
  {
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: 'INR' },

    cfOrderId: { type: String, required: true, unique: true, index: true },
    cfPaymentSessionId: { type: String, required: true },

    status: { type: String, enum: ['CREATED', 'PAID', 'FAILED'], default: 'CREATED', index: true },
    providerPayload: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DuesPayment', duesPaymentSchema);

