const mongoose = require('mongoose');
const { toJSONPlugin } = require('./plugins');
const { DATE_RE } = require('../utils/dates');

const taskSchema = new mongoose.Schema(
  {
    org: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    title: { type: String, required: [true, 'Task title is required'], trim: true, maxlength: 200 },
    account: { type: String, trim: true, default: '' },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    status: { type: String, enum: ['todo', 'progress', 'review', 'done'], default: 'todo' },
    due: { type: String, default: '', match: [DATE_RE, 'Use the YYYY-MM-DD date format'] },
    notes: { type: String, default: '', maxlength: 5000 },
    doneAt: { type: Date }
  },
  { timestamps: true }
);

taskSchema.plugin(toJSONPlugin);
module.exports = mongoose.model('Task', taskSchema);
