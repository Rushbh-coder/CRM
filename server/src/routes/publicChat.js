const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const ChatConversation = require('../models/ChatConversation');
const ChatMessage = require('../models/ChatMessage');
const { asyncHandler } = require('../middleware/error');
const { addMessage, visitorChannel } = require('../services/chat');
const { pusher, enabled } = require('../services/realtime');

// Public endpoints used by the customer-facing chat box. No CRM login: a visitor gets a signed token
// that only ever opens their own conversation.
const router = express.Router();

// Best-effort abuse limits (per server instance).
const buckets = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  const recent = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (recent.length >= max) return true;
  recent.push(now);
  buckets.set(key, recent);
  return false;
}
const ip = (req) => String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();

const sign = (conv) => jwt.sign({ role: 'visitor', cid: String(conv._id), org: String(conv.org) }, process.env.JWT_SECRET, { expiresIn: '30d' });

async function visitor(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    const p = jwt.verify(h.startsWith('Bearer ') ? h.slice(7) : '', process.env.JWT_SECRET);
    if (p.role !== 'visitor') throw new Error('not a visitor');
    const conv = await ChatConversation.findOne({ _id: p.cid, org: p.org });
    if (!conv) return res.status(401).json({ message: 'This chat has ended. Start a new one.' });
    req.conv = conv;
    next();
  } catch (e) {
    res.status(401).json({ message: 'This chat has ended. Start a new one.' });
  }
}

// Name of the business for the chat header (also confirms the link is valid).
router.get('/org/:orgId', asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.orgId)) return res.status(404).json({ message: 'Chat is not available.' });
  const org = await Organization.findById(req.params.orgId);
  if (!org) return res.status(404).json({ message: 'Chat is not available.' });
  res.json({ name: (org.settings && org.settings.businessName) || org.name, realtime: enabled(), pusherKey: process.env.PUSHER_KEY || '', cluster: process.env.PUSHER_CLUSTER || 'ap2' });
}));

router.post('/start', asyncHandler(async (req, res) => {
  const { orgId, name, email, website } = req.body || {};
  if (website) return res.status(400).json({ message: 'Could not start chat.' }); // honeypot field bots fill in
  if (limited('start:' + ip(req), 5, 60 * 60 * 1000)) return res.status(429).json({ message: 'Too many chats started. Try again later.' });
  if (!mongoose.isValidObjectId(orgId) || !(await Organization.exists({ _id: orgId }))) return res.status(404).json({ message: 'Chat is not available.' });
  const cleanName = String(name || '').trim().slice(0, 80);
  const cleanEmail = String(email || '').trim().toLowerCase().slice(0, 120);
  if (!cleanName) return res.status(400).json({ message: 'Please enter your name.' });
  if (cleanEmail && !/^\S+@\S+\.\S+$/.test(cleanEmail)) return res.status(400).json({ message: 'Enter a valid email address or leave it blank.' });
  const conv = await ChatConversation.create({ org: orgId, name: cleanName, email: cleanEmail });
  res.status(201).json({ token: sign(conv), conversation: conv.id });
}));

router.get('/messages', visitor, asyncHandler(async (req, res) => {
  const messages = await ChatMessage.find({ conversation: req.conv._id }).sort({ createdAt: 1 }).limit(300);
  if (req.conv.unreadVisitor) await ChatConversation.updateOne({ _id: req.conv._id }, { unreadVisitor: 0 });
  res.json({ messages, name: req.conv.name, status: req.conv.status });
}));

router.post('/messages', visitor, asyncHandler(async (req, res) => {
  const text = String((req.body && req.body.text) || '').trim().slice(0, 1000);
  if (!text) return res.status(400).json({ message: 'Type a message first.' });
  if (limited('msg:' + req.conv.id, 20, 60 * 1000)) return res.status(429).json({ message: 'You’re sending messages too fast. Wait a moment.' });
  const msg = await addMessage(req.conv, 'visitor', text);
  res.status(201).json(msg);
}));

// Lets the visitor's browser join only their own realtime channel.
router.post('/pusher-auth', visitor, (req, res) => {
  const p = pusher();
  const { socket_id: socketId, channel_name: channel } = req.body || {};
  if (!p || channel !== visitorChannel(req.conv.id)) return res.status(403).json({ message: 'Not allowed.' });
  res.send(p.authorizeChannel(socketId, channel));
});

module.exports = router;
