const express = require('express');
const ChatConversation = require('../models/ChatConversation');
const ChatMessage = require('../models/ChatMessage');
const { asyncHandler } = require('../middleware/error');
const { addMessage } = require('../services/chat');
const { pusher, channelFor, enabled } = require('../services/realtime');

// Staff side of the live chat: inbox, reading, replying.
const router = express.Router();

router.get('/config', (req, res) => {
  res.json({ realtime: enabled(), pusherKey: process.env.PUSHER_KEY || '', cluster: process.env.PUSHER_CLUSTER || 'ap2', channel: channelFor(req.org), orgId: String(req.org) });
});

// Pusher calls this (with our JWT header) before letting staff join the business's private channel.
router.post('/pusher-auth', (req, res) => {
  const p = pusher();
  const { socket_id: socketId, channel_name: channel } = req.body || {};
  if (!p || channel !== channelFor(req.org)) return res.status(403).json({ message: 'Not allowed.' });
  res.send(p.authorizeChannel(socketId, channel));
});

router.get('/conversations', asyncHandler(async (req, res) => {
  res.json(await ChatConversation.find({ org: req.org }).sort({ lastAt: -1 }).limit(200));
}));

async function mine(req) {
  return ChatConversation.findOne({ _id: req.params.id, org: req.org });
}

router.get('/conversations/:id/messages', asyncHandler(async (req, res) => {
  const conv = await mine(req);
  if (!conv) return res.status(404).json({ message: 'That chat was not found.' });
  const messages = await ChatMessage.find({ conversation: conv._id }).sort({ createdAt: 1 }).limit(500);
  if (conv.unreadStaff) await ChatConversation.updateOne({ _id: conv._id }, { unreadStaff: 0 });
  res.json({ messages, conversation: conv });
}));

router.post('/conversations/:id/messages', asyncHandler(async (req, res) => {
  const conv = await mine(req);
  if (!conv) return res.status(404).json({ message: 'That chat was not found.' });
  const text = String((req.body && req.body.text) || '').trim().slice(0, 2000);
  if (!text) return res.status(400).json({ message: 'Type a message first.' });
  res.status(201).json(await addMessage(conv, 'staff', text, req.user));
}));

router.put('/conversations/:id', asyncHandler(async (req, res) => {
  const conv = await mine(req);
  if (!conv) return res.status(404).json({ message: 'That chat was not found.' });
  if (['open', 'closed'].includes(req.body && req.body.status)) conv.status = req.body.status;
  await conv.save();
  res.json(conv);
}));

module.exports = router;
