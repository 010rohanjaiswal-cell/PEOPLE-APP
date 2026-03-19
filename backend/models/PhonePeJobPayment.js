const mongoose = require('mongoose');

const phonePeJobPaymentSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },

    merchantOrderId: { type: String, required: true, unique: true, index: true },
    phonepeOrderId: { type: String, default: null },

    status: { type: String, enum: ['CREATED', 'PENDING', 'COMPLETED', 'FAILED'], default: 'CREATED', index: true },
    processedToWallet: { type: Boolean, default: false, index: true },
    providerPayload: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PhonePeJobPayment', phonePeJobPaymentSchema);

