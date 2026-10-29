const mongoose = require('mongoose');
const { toJSONPlugin } = require('./plugins');

const chatMessageSchema = new mongoose.Schema(
  {
    org: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatConversation', required: true, index: true },
    from: { type: String, enum: ['visitor', 'staff'], required: true },
    text: { type: String, required: true, maxlength: 2000 },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    staffName: { type: String, default: '' }
  },
  { timestamps: true }
);
chatMessageSchema.index({ conversation: 1, createdAt: 1 });
chatMessageSchema.plugin(toJSONPlugin);
module.exports = mongoose.model('ChatMessage', chatMessageSchema);
