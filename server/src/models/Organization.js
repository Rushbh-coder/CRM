const mongoose = require('mongoose');
const { toJSONPlugin } = require('./plugins');

const appearanceSchema = new mongoose.Schema(
  {
    theme: { type: String, enum: ['system', 'light', 'dark'], default: 'system' },
    color: { type: String, match: /^(#[0-9a-fA-F]{6})?$/, default: '' },
    sidebar: { type: String, enum: ['navy', 'midnight', 'brand', 'light'], default: 'navy' },
    dateFormat: { type: String, enum: ['DD MMM YYYY', 'DD/MM/YYYY', 'MMM DD, YYYY'], default: 'DD MMM YYYY' }
  },
  { _id: false }
);

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    settings: {
      businessName: { type: String, trim: true, default: '' },
      senderName: { type: String, trim: true, default: '' },
      summaryEmail: { type: String, trim: true, lowercase: true, default: '' },
      appearance: { type: appearanceSchema, default: () => ({}) },
      sendingActive: { type: Boolean, default: false },
      lastRun: { type: Date }
    }
  },
  { timestamps: true }
);

organizationSchema.plugin(toJSONPlugin);
module.exports = mongoose.model('Organization', organizationSchema);
