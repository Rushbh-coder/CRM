const mongoose = require('mongoose');
const { toJSONPlugin } = require('./plugins');

const activitySchema = new mongoose.Schema(
  {
    org: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    type: { type: String, enum: ['Call', 'Meeting', 'Demo', 'Email', 'Note', 'Reminder', 'Deadline'], default: 'Call' },
    title: { type: String, required: [true, 'Add a short description'], trim: true, maxlength: 200 },
    related: { type: String, trim: true, default: '' },
    date: { type: String, required: [true, 'Date is required'], match: [/^\d{4}-\d{2}-\d{2}$/, 'Use the YYYY-MM-DD date format'] },
    time: { type: String, default: '', match: [/^(\d{2}:\d{2})?$/, 'Use the HH:MM time format'] },
    done: { type: Boolean, default: false },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, default: '', maxlength: 5000 }
  },
  { timestamps: true }
);

activitySchema.index({ org: 1, date: 1 });
activitySchema.plugin(toJSONPlugin);
module.exports = mongoose.model('Activity', activitySchema);
