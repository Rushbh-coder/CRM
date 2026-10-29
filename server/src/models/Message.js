const mongoose = require('mongoose');
const { toJSONPlugin } = require('./plugins');

// One WhatsApp message. A conversation = all messages with the same org + phone.
const messageSchema = new mongoose.Schema(
  {
    org: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    phone: { type: String, required: true, index: true }, // digits only, with country code (WhatsApp "wa_id")
    profileName: { type: String, default: '' },
    direction: { type: String, enum: ['in', 'out'], required: true },
    text: { type: String, default: '', maxlength: 4096 },
    waId: { type: String, index: true, sparse: true }, // WhatsApp message id
    status: { type: String, enum: ['received', 'sent', 'delivered', 'read', 'failed'], default: 'sent' },
    read: { type: Boolean, default: false }, // for inbound: has staff opened it
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);
messageSchema.index({ org: 1, phone: 1, createdAt: -1 });
messageSchema.plugin(toJSONPlugin);
module.exports = mongoose.model('Message', messageSchema);
