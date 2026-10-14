const mongoose = require('mongoose');
const { toJSONPlugin } = require('./plugins');
const { DATE_RE } = require('../utils/dates');

const STAGES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];

// A lead and its deal live in one record: contact person + deal details + pipeline stage.
const leadSchema = new mongoose.Schema(
  {
    org: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    deal: { type: String, trim: true, default: '' },
    name: { type: String, required: [true, 'Contact name is required'], trim: true, maxlength: 120 },
    company: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '', match: [/^(\S+@\S+\.\S+)?$/, 'Enter a valid email address'] },
    phone: { type: String, trim: true, default: '' },
    source: { type: String, trim: true, default: 'Website' },
    stage: { type: String, enum: STAGES, default: 'new' },
    value: { type: Number, min: 0, default: 0 },
    followUp: { type: String, default: '', match: [DATE_RE, 'Use the YYYY-MM-DD date format'] },
    closeDate: { type: String, default: '', match: [DATE_RE, 'Use the YYYY-MM-DD date format'] },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, default: '', maxlength: 5000 },
    wonAt: { type: Date },
    lastContacted: { type: Date }
  },
  { timestamps: true }
);

leadSchema.index({ org: 1, stage: 1 });
leadSchema.plugin(toJSONPlugin);
module.exports = mongoose.model('Lead', leadSchema);
module.exports.STAGES = STAGES;
