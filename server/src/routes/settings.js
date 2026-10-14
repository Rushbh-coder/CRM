const express = require('express');
const Organization = require('../models/Organization');
const { requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.org);
  res.json(org.settings);
}));

// Business details, appearance and the daily email switch. Owner/admin only.
router.put('/', requireRole('owner', 'admin'), asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.org);
  const b = req.body || {};
  const s = org.settings;
  if (b.businessName !== undefined) { s.businessName = b.businessName; if (b.businessName) org.name = b.businessName; }
  if (b.senderName !== undefined) s.senderName = b.senderName;
  if (b.summaryEmail !== undefined) {
    if (b.summaryEmail && !/^\S+@\S+\.\S+$/.test(b.summaryEmail)) return res.status(400).json({ message: 'That email address looks incomplete.' });
    s.summaryEmail = b.summaryEmail;
  }
  if (b.sendingActive !== undefined) s.sendingActive = !!b.sendingActive;
  if (b.appearance && typeof b.appearance === 'object') {
    const a = s.appearance || {};
    for (const k of ['theme', 'color', 'sidebar', 'dateFormat']) if (b.appearance[k] !== undefined) a[k] = b.appearance[k];
    s.appearance = a;
  }
  org.markModified('settings');
  await org.save();
  res.json(org.settings);
}));

module.exports = router;
