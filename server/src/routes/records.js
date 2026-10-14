const express = require('express');
const crudRouter = require('../utils/crudRouter');
const Contact = require('../models/Contact');
const Lead = require('../models/Lead');
const Activity = require('../models/Activity');
const Task = require('../models/Task');
const { asyncHandler } = require('../middleware/error');

// ---------- Contacts (+ CSV import) ----------
const contacts = express.Router();
contacts.post('/import', asyncHandler(async (req, res) => {
  const rows = Array.isArray(req.body && req.body.rows) ? req.body.rows.slice(0, 2000) : [];
  if (!rows.length) return res.status(400).json({ message: 'There are no rows to import.' });
  const docs = rows
    .filter((r) => r && String(r.name || '').trim())
    .map((r) => ({
      org: req.org,
      owner: req.user._id,
      name: String(r.name).trim(),
      title: r.title || '',
      company: r.company || '',
      industry: r.industry || '',
      email: /^\S+@\S+\.\S+$/.test(r.email || '') ? r.email : '',
      phone: r.phone || '',
      city: r.city || '',
      segment: ['Enterprise', 'SMB', 'Retail', 'Startup'].includes(r.segment) ? r.segment : 'SMB',
      status: ['Active', 'VIP', 'Inactive'].includes(r.status) ? r.status : 'Active',
      revenue: Number(String(r.revenue || '').replace(/[^\d.]/g, '')) || 0,
      notes: r.notes || ''
    }));
  const created = await Contact.insertMany(docs, { ordered: false });
  res.status(201).json({ imported: created.length, items: created });
}));
contacts.use('/', crudRouter(Contact, { refFields: ['owner'] }));

// ---------- Leads & deals ----------
const leads = crudRouter(Lead, {
  refFields: ['owner'],
  beforeSave(data, existing) {
    const stage = data.stage || (existing && existing.stage);
    if (stage === 'won' && !(existing && existing.wonAt) && !data.wonAt) data.wonAt = new Date();
    if (data.stage && data.stage !== 'won') data.wonAt = null;
  }
});

// ---------- Activities ----------
const activities = crudRouter(Activity, { refFields: ['owner'] });

// ---------- Tasks ----------
const tasks = crudRouter(Task, {
  refFields: ['assignee'],
  beforeSave(data, existing) {
    if (data.status === 'done' && !(existing && existing.doneAt)) data.doneAt = new Date();
    if (data.status && data.status !== 'done') data.doneAt = null;
  }
});

module.exports = { contacts, leads, activities, tasks };
