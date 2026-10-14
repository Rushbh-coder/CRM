const mongoose = require('mongoose');
const { toJSONPlugin } = require('./plugins');

const contactSchema = new mongoose.Schema(
  {
    org: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 120 },
    title: { type: String, trim: true, default: '' },
    company: { type: String, trim: true, default: '' },
    industry: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '', match: [/^(\S+@\S+\.\S+)?$/, 'Enter a valid email address'] },
    phone: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    segment: { type: String, enum: ['Enterprise', 'SMB', 'Retail', 'Startup'], default: 'SMB' },
    status: { type: String, enum: ['Active', 'VIP', 'Inactive'], default: 'Active' },
    revenue: { type: Number, min: 0, default: 0 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, default: '', maxlength: 5000 }
  },
  { timestamps: true }
);

contactSchema.index({ org: 1, createdAt: -1 });
contactSchema.plugin(toJSONPlugin);
module.exports = mongoose.model('Contact', contactSchema);
