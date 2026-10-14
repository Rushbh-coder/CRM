const express = require('express');
const User = require('../models/User');
const Organization = require('../models/Organization');
const { protect, signToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error');
const { ensureAutomations } = require('../services/automation');

const router = express.Router();

const authPayload = async (user) => {
  const org = await Organization.findById(user.org);
  return { token: signToken(user), user, org };
};

// Create a new business account. The first user becomes the owner.
router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password, businessName } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required.' });
  if (String(password).length < 6) return res.status(400).json({ message: 'Use a password with at least 6 characters.' });
  if (await User.exists({ email: String(email).toLowerCase().trim() })) {
    return res.status(409).json({ message: 'An account with this email already exists. Try logging in.' });
  }
  const biz = (businessName || `${name}'s Business`).trim();
  const org = await Organization.create({ name: biz, settings: { businessName: biz, senderName: name } });
  const user = await User.create({ org: org._id, name, email, password, role: 'owner', title: 'Owner' });
  await ensureAutomations(org._id);
  res.status(201).json(await authPayload(user));
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Enter your email and password.' });
  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
  if (!user || !(await user.checkPassword(password))) {
    return res.status(401).json({ message: 'That email and password don’t match. Check them and try again.' });
  }
  res.json(await authPayload(user));
}));

router.get('/me', protect, asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.org);
  res.json({ user: req.user, org });
}));

// Update your own profile.
router.put('/me', protect, asyncHandler(async (req, res) => {
  const { name, email, phone, title } = req.body || {};
  if (name !== undefined) req.user.name = name;
  if (email !== undefined) req.user.email = email;
  if (phone !== undefined) req.user.phone = phone;
  if (title !== undefined) req.user.title = title;
  await req.user.save();
  res.json({ user: req.user });
}));

router.put('/password', protect, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.checkPassword(currentPassword || ''))) return res.status(400).json({ message: 'Your current password is not correct.' });
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ message: 'Use a new password with at least 6 characters.' });
  user.password = newPassword;
  await user.save();
  res.json({ ok: true });
}));

module.exports = router;
