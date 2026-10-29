const express = require('express');
const Message = require('../models/Message');
const Contact = require('../models/Contact');
const Lead = require('../models/Lead');
const { asyncHandler } = require('../middleware/error');
const { sendText, digits, isConfigured } = require('../services/whatsapp');
const { pusher, publish, channelFor, enabled } = require('../services/realtime');

const router = express.Router();
const last10 = (p) => digits(p).slice(-10);
const DAY = 24 * 60 * 60 * 1000;

// Match a WhatsApp number to a saved contact/lead by the last 10 digits.
async function nameMap(org) {
  const [contacts, leads] = await Promise.all([Contact.find({ org }).select('name phone company'), Lead.find({ org }).select('name phone company')]);
  const map = new Map();
  [...leads, ...contacts].forEach((r) => { const k = last10(r.phone); if (k.length === 10) map.set(k, { name: r.name, company: r.company }); });
  return map;
}

router.get('/config', (req, res) => {
  res.json({ realtime: enabled(), pusherKey: process.env.PUSHER_KEY || '', cluster: process.env.PUSHER_CLUSTER || 'ap2', channel: channelFor(req.org), whatsapp: isConfigured() });
});

// Pusher calls this (with our JWT header) before letting the browser join the business's private channel.
router.post('/pusher-auth', (req, res) => {
  const p = pusher();
  const { socket_id: socketId, channel_name: channel } = req.body || {};
  if (!p || channel !== channelFor(req.org)) return res.status(403).json({ message: 'Not allowed.' });
  res.send(p.authorizeChannel(socketId, channel));
});

router.get('/conversations', asyncHandler(async (req, res) => {
  const rows = await Message.aggregate([
    { $match: { org: req.org } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$phone',
        last: { $first: '$$ROOT' },
        unread: { $sum: { $cond: [{ $and: [{ $eq: ['$direction', 'in'] }, { $eq: ['$read', false] }] }, 1, 0] } },
        profileName: { $max: '$profileName' }
      }
    },
    { $sort: { 'last.createdAt': -1 } },
    { $limit: 200 }
  ]);
  const names = await nameMap(req.org);
  res.json(rows.map((r) => {
    const m = names.get(last10(r._id));
    return { phone: r._id, name: (m && m.name) || r.profileName || '+' + r._id, company: (m && m.company) || '', inCrm: !!m, unread: r.unread, lastText: r.last.text, lastAt: r.last.createdAt, lastDir: r.last.direction };
  }));
}));

router.get('/messages/:phone', asyncHandler(async (req, res) => {
  const phone = digits(req.params.phone);
  const messages = await Message.find({ org: req.org, phone }).sort({ createdAt: 1 }).limit(500);
  await Message.updateMany({ org: req.org, phone, direction: 'in', read: false }, { read: true });
  const lastIn = [...messages].reverse().find((m) => m.direction === 'in');
  res.json({ messages, canReply: !!lastIn && Date.now() - new Date(lastIn.createdAt).getTime() < DAY });
}));

router.post('/send', asyncHandler(async (req, res) => {
  const phone = digits(req.body && req.body.phone);
  const text = String((req.body && req.body.text) || '').trim().slice(0, 4096);
  if (!phone || !text) return res.status(400).json({ message: 'Choose a chat and type a message.' });
  // WhatsApp only allows free-form replies within 24 hours of the customer's last message.
  const lastIn = await Message.findOne({ org: req.org, phone, direction: 'in' }).sort({ createdAt: -1 });
  if (!lastIn || Date.now() - lastIn.createdAt.getTime() > DAY) {
    return res.status(400).json({ message: 'The 24-hour reply window has closed. Wait for the customer to message you, or send an approved template from WhatsApp Manager.' });
  }
  const waId = await sendText(phone, text);
  const msg = await Message.create({ org: req.org, phone, direction: 'out', text, waId, status: 'sent', read: true, sentBy: req.user._id });
  await publish(req.org, 'message', msg.toJSON());
  res.status(201).json(msg);
}));

module.exports = router;
