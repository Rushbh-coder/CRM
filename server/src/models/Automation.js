const mongoose = require('mongoose');
const { toJSONPlugin } = require('./plugins');

const RULE_KEYS = ['followup_reminder', 'welcome_customer', 'won_thanks', 'inactive_checkin', 'daily_summary'];

// One document per automation rule per organization. Empty subject/body = use the default text.
const automationSchema = new mongoose.Schema(
  {
    org: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    key: { type: String, enum: RULE_KEYS, required: true },
    enabled: { type: Boolean, default: false },
    subject: { type: String, default: '', maxlength: 300 },
    body: { type: String, default: '', maxlength: 10000 }
  },
  { timestamps: true }
);

automationSchema.index({ org: 1, key: 1 }, { unique: true });
automationSchema.plugin(toJSONPlugin);
module.exports = mongoose.model('Automation', automationSchema);
module.exports.RULE_KEYS = RULE_KEYS;
