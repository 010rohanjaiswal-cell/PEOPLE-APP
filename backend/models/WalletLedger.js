const mongoose = require('mongoose');

const walletLedgerSchema = new mongoose.Schema(
  {
    walletUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        'CREDIT_JOB_PAYMENT',
        'DEBIT_COMMISSION',
        'WITHDRAW_REQUESTED',
        'WITHDRAW_PAID',
        'WITHDRAW_FAILED_REVERSAL',
      ],
    },
    amount: { type: Number, required: true }, // positive credit, negative debit OR keep sign-free and use type
    currency: { type: String, default: 'INR' },
    refType: { type: String, default: null },
    refId: { type: String, default: null, index: true },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

walletLedgerSchema.index({ walletUser: 1, createdAt: -1 });

module.exports = mongoose.model('WalletLedger', walletLedgerSchema);

