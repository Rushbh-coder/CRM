const crypto = require('crypto');
const express = require('express');
const Message = require('../models/Message');
const Organization = require('../models/Organization');
const { asyncHandler } = require('../middleware/error');
const { publish } = require('../services/realtime');

const router = express.Router();

// Single-business setup: messages go to WHATSAPP_ORG_ID, or to the first business if not set.
async function targetOrg() {
  if (process.env.WHATSAPP_ORG_ID) return process.env.WHATSAPP_ORG_ID;
  const org = await Organization.findOne().sort({ createdAt: 1 });
  return org && org._id;
}

// Meta calls this once when you save the webhook URL in the app dashboard.
router.get('/webhook', (req, res) => {
  const ok = req.query['hub.mode'] === 'subscribe' && process.env.WHATSAPP_VERIFY_TOKEN && req.query['hub.verify_token'] === process.env.WHATSAPP_VERIFY_TOKEN;
  return ok ? res.status(200).send(req.query['hub.challenge']) : res.sendStatus(403);
});

function validSignature(req) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return false; // refuse unsigned traffic
  const sig = String(req.headers['x-hub-signature-256'] || '');
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(req.rawBody || '').digest('hex');
  return sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

const RANK = { sent: 1, delivered: 2, read: 3, failed: 4 };

router.post('/webhook', asyncHandler(async (req, res) => {
  if (!validSignature(req)) return res.sendStatus(401);
  const org = await targetOrg();
  if (!org) return res.sendStatus(200);

  for (const entry of req.body.entry || []) {
    for (const change of entry.changes || []) {
      const v = change.value || {};
      const names = {};
      (v.contacts || []).forEach((c) => { names[c.wa_id] = c.profile && c.profile.name; });

      for (const m of v.messages || []) {
        if (await Message.exists({ waId: m.id })) continue; // Meta may retry
        const text = m.type === 'text' ? m.text.body : `[${m.type} message - open WhatsApp to view]`;
        const msg = await Message.create({ org, phone: m.from, profileName: names[m.from] || '', direction: 'in', text, waId: m.id, status: 'received', read: false });
        await publish(org, 'message', msg.toJSON());
      }

      for (const s of v.statuses || []) {
        const msg = await Message.findOne({ waId: s.id });
        if (msg && (RANK[s.status] || 0) > (RANK[msg.status] || 0)) {
          msg.status = s.status;
          await msg.save();
          await publish(org, 'status', { id: msg.id, status: msg.status });
        }
      }
    }
  }
  res.sendStatus(200); // reply only after the work is done (serverless stops once we respond)
}));

module.exports = router;
