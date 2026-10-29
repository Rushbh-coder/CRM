const mongoose = require('mongoose');
const { toJSONPlugin } = require('./plugins');

// One website visitor's chat with the business.
const chatConversationSchema = new mongoose.Schema(
  {
    org: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, trim: true, required: true, maxlength: 80 },
    email: { type: String, trim: true, lowercase: true, default: '', maxlength: 120 },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    lastText: { type: String, default: '' },
    lastFrom: { type: String, enum: ['visitor', 'staff'], default: 'visitor' },
    lastAt: { type: Date, default: Date.now },
    unreadStaff: { type: Number, default: 0 }, // visitor messages staff haven't opened
    unreadVisitor: { type: Number, default: 0 }
  },
  { timestamps: true }
);
chatConversationSchema.index({ org: 1, lastAt: -1 });
chatConversationSchema.plugin(toJSONPlugin);
module.exports = mongoose.model('ChatConversation', chatConversationSchema);
