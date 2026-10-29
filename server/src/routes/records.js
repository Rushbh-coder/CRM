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

// CSV import: each row is { "<column header>": value }. Headers are matched loosely, so a sheet like
// "Lead ID, Company / Business Name, Project Name / Requirement, Contact Person, Mobile Number, ..." just works.
const STAGE_BY_STATUS = {
  'new': 'new', 'new lead': 'new', 'contacted': 'contacted', 'qualified': 'qualified', 'proposal': 'proposal', 'proposal sent': 'proposal',
  'quoted': 'proposal', 'won': 'won', 'closed won': 'won', 'lost': 'lost', 'closed lost': 'lost', 'on hold': 'contacted'
};
const norm = (h) => String(h || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const money = (v) => Number(String(v || '').replace(/[^\d.]/g, '')) || 0;
function isoDate(v) {
  const t = String(v || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/); // DD/MM/YYYY (India)
  if (!m) return '';
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}
leads.post('/import', asyncHandler(async (req, res) => {
  const rows = Array.isArray(req.body && req.body.rows) ? req.body.rows.slice(0, 2000) : [];
  if (!rows.length) return res.status(400).json({ message: 'There are no rows to import.' });

  const docs = [];
  for (const raw of rows) {
    const r = {};
    Object.entries(raw || {}).forEach(([k, v]) => { r[norm(k)] = String(v == null ? '' : v).trim(); });
    const pick = (...keys) => { for (const k of keys) if (r[k]) return r[k]; return ''; };
    const company = pick('company business name', 'company', 'business name', 'organization', 'organisation');
    const name = pick('contact person', 'name', 'contact name', 'full name', 'contact') || company;
    if (!name) continue;
    const status = pick('lead status', 'status', 'stage');
    const stage = STAGE_BY_STATUS[norm(status)] || 'new';
    const email = pick('email address', 'email');
    const lastContact = isoDate(pick('last contact date'));
    const extra = [
      ['Lead ID', pick('lead id', 'id')], ['Status', norm(status) === 'on hold' ? 'On Hold' : ''],
      ['Priority', pick('priority')], ['Service', pick('service category', 'service')], ['City', pick('city location', 'city', 'location')],
      ['WhatsApp', pick('whatsapp number', 'whatsapp')], ['Quoted', pick('quoted amount inr', 'quoted amount')],
      ['Advance received', pick('advance received inr', 'advance received')], ['Payment', pick('payment status')],
      ['Assigned to', pick('assigned to')], ['Website', pick('website social link', 'website')]
    ].filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`);
    docs.push({
      org: req.org,
      owner: req.user._id,
      name: name.slice(0, 120),
      company,
      deal: pick('project name requirement', 'deal', 'project name', 'requirement'),
      phone: pick('mobile number', 'phone', 'mobile', 'phone number', 'whatsapp number'),
      email: /^\S+@\S+\.\S+$/.test(email) ? email.toLowerCase() : '',
      source: pick('lead source', 'source') || 'Other',
      stage,
      value: money(pick('estimated project value inr', 'estimated project value', 'value', 'quoted amount inr')),
      followUp: isoDate(pick('next follow up date', 'follow up')),
      lastContacted: lastContact ? new Date(lastContact) : undefined,
      wonAt: stage === 'won' ? new Date() : undefined,
      notes: [pick('notes next action', 'notes'), extra.join(' | ')].filter(Boolean).join('\n').slice(0, 5000)
    });
  }
  if (!docs.length) return res.status(400).json({ message: 'No usable rows found. Each row needs a contact person or company.' });

  // Skip rows already imported (same person + project), so uploading the same file twice is safe.
  const existing = await Lead.find({ org: req.org }).select('name deal');
  const seen = new Set(existing.map((l) => `${l.name}|${l.deal}`.toLowerCase()));
  const fresh = docs.filter((d) => { const k = `${d.name}|${d.deal}`.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  const created = fresh.length ? await Lead.insertMany(fresh) : [];
  res.status(201).json({ imported: created.length, skipped: docs.length - fresh.length, items: created });
}));

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
