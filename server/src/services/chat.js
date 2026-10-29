const ChatConversation = require('../models/ChatConversation');
const ChatMessage = require('../models/ChatMessage');
const { publishTo, channelFor } = require('./realtime');

const visitorChannel = (cid) => `private-chat-${cid}`;

// Saves a message, updates the conversation summary and pushes it to both sides in real time.
async function addMessage(conv, from, text, staff) {
  const msg = await ChatMessage.create({
    org: conv.org, conversation: conv._id, from, text,
    sentBy: staff ? staff._id : undefined, staffName: staff ? staff.name : ''
  });
  const inc = from === 'visitor' ? { unreadStaff: 1 } : { unreadVisitor: 1 };
  const set = { lastText: text.slice(0, 120), lastFrom: from, lastAt: new Date() };
  if (from === 'visitor') set.status = 'open';
  await ChatConversation.updateOne({ _id: conv._id }, { $set: set, $inc: inc });
  const json = msg.toJSON();
  await Promise.all([
    publishTo(channelFor(conv.org), 'chat-message', { ...json, conversation: String(conv._id) }),
    publishTo(visitorChannel(conv._id), 'chat-message', { ...json, conversation: String(conv._id) })
  ]);
  return msg;
}

module.exports = { addMessage, visitorChannel };
