const mongoose = require('mongoose');
const { toJSONPlugin } = require('./plugins');

const emailLogSchema = new mongoose.Schema(
  {
    org: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    rule: { type: String, required: true },
    recordId: { type: String, required: true },
    to: { type: String, default: '' },
    subject: { type: String, default: '' },
    status: { type: String, enum: ['sent', 'skipped', 'failed'], required: true },
    note: { type: String, default: '' },
    date: { type: String, required: true },
    sentAt: { type: Date, default: Date.now }
  },
  { timestamps: false }
);

// The same rule never emails the same record twice on the same day.
emailLogSchema.index({ org: 1, rule: 1, recordId: 1, date: 1 }, { unique: true });
emailLogSchema.index({ org: 1, sentAt: -1 });
emailLogSchema.plugin(toJSONPlugin);
module.exports = mongoose.model('EmailLog', emailLogSchema);
