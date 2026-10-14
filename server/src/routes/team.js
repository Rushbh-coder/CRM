const express = require('express');
const User = require('../models/User');
const Lead = require('../models/Lead');
const Task = require('../models/Task');
const Activity = require('../models/Activity');
const Contact = require('../models/Contact');
const { requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const users = await User.find({ org: req.org }).sort({ createdAt: 1 });
  res.json(users);
}));

// Owners and admins add team members. Each member gets their own login.
router.post('/', requireRole('owner', 'admin'), asyncHandler(async (req, res) => {
  const { name, email, password, role = 'member', title = '' } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and a starting password are required.' });
  if (!['admin', 'member'].includes(role)) return res.status(400).json({ message: 'Role must be admin or member.' });
  const user = await User.create({ org: req.org, name, email, password, role, title });
  res.status(201).json(user);
}));

router.put('/:id', requireRole('owner', 'admin'), asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, org: req.org });
  if (!user) return res.status(404).json({ message: 'That team member was not found.' });
  const { name, title, phone, role } = req.body || {};
  if (name !== undefined) user.name = name;
  if (title !== undefined) user.title = title;
  if (phone !== undefined) user.phone = phone;
  if (role !== undefined && user.role !== 'owner') {
    if (!['admin', 'member'].includes(role)) return res.status(400).json({ message: 'Role must be admin or member.' });
    user.role = role;
  }
  await user.save();
  res.json(user);
}));

// Removing a member hands their records back to the person removing them.
router.delete('/:id', requireRole('owner', 'admin'), asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, org: req.org });
  if (!user) return res.status(404).json({ message: 'That team member was not found.' });
  if (user.role === 'owner') return res.status(400).json({ message: 'The account owner can’t be removed.' });
  if (String(user._id) === String(req.user._id)) return res.status(400).json({ message: 'You can’t remove yourself.' });
  const me = req.user._id;
  await Promise.all([
    Lead.updateMany({ org: req.org, owner: user._id }, { owner: me }),
    Contact.updateMany({ org: req.org, owner: user._id }, { owner: me }),
    Activity.updateMany({ org: req.org, owner: user._id }, { owner: me }),
    Task.updateMany({ org: req.org, assignee: user._id }, { assignee: me })
  ]);
  await user.deleteOne();
  res.json({ ok: true, id: req.params.id });
}));

module.exports = router;
