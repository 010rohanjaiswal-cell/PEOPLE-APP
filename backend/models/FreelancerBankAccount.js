const mongoose = require('mongoose');

const freelancerBankAccountSchema = new mongoose.Schema(
  {
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    bankAccountLast4: { type: String, required: true },
    ifsc: { type: String, required: true },
    nameAtBank: { type: String, default: null },
    nameMatchScore: { type: Number, default: null },
    verified: { type: Boolean, default: false, index: true },
    beneId: { type: String, required: true, index: true },
    providerPayload: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FreelancerBankAccount', freelancerBankAccountSchema);

