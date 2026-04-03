/**
 * SupportTicket Model - People App Backend
 * Persists Support chatbot sessions as "tickets".
 */

const mongoose = require('mongoose');

const supportTicketMessageSchema = new mongoose.Schema(
  {
    sender: { type: String, enum: ['bot', 'user', 'system'], required: true },
    /** Human-readable text (legacy). Prefer textKey + params for i18n. */
    text: { type: String, default: null, trim: true },
    /** i18n key to render in app (e.g. supportBot.root.text). */
    textKey: { type: String, default: null, trim: true },
    /** Optional interpolation params for textKey. */
    params: { type: mongoose.Schema.Types.Mixed, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const supportTicketSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['open', 'completed'], default: 'open', index: true },
    currentNodeId: { type: String, default: 'root' },
    messages: { type: [supportTicketMessageSchema], default: [] },
    // Optional: store side effects for audit
    effects: {
      unassignedJobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
      pickupBlockedUntil: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

supportTicketSchema.index({ user: 1, status: 1, updatedAt: -1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);

