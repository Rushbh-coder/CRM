const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const Contact = require('../models/Contact');
const Lead = require('../models/Lead');
const Activity = require('../models/Activity');
const Task = require('../models/Task');
const Organization = require('../models/Organization');
const { asyncHandler } = require('../middleware/error');

const router = express.Router();
const MODEL = process.env.AI_MODEL || 'claude-haiku-5-5';

// Best-effort per-user limit (resets when the server instance restarts).
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = Number(process.env.AI_MAX_PER_HOUR || 30);
const hits = new Map();
function allowed(userId) {
  const now = Date.now();
  const recent = (hits.get(userId) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) return false;
  recent.push(now);
  hits.set(userId, recent);
  return true;
}

const line = (label, v) => (v ? `${label}: ${v}` : null);

// Loads one record plus its recent history. Only this business's data (org) is ever read.
async function loadContext(org, type, id) {
  const rec = type === 'lead' ? await Lead.findOne({ _id: id, org }) : await Contact.findOne({ _id: id, org });
  if (!rec) return null;
  const names = [rec.name, rec.company].filter(Boolean);
  const [acts, tasks] = await Promise.all([
    Activity.find({ org, related: { $in: names } }).sort({ date: -1 }).limit(10),
    Task.find({ org, account: { $in: names } }).sort({ due: 1 }).limit(10)
  ]);
  const facts = [
    line('Name', rec.name), line('Company', rec.company), line('Job title', rec.title),
    line('Deal', rec.deal), line('Stage', rec.stage), line('Deal value (INR)', rec.value),
    line('Source', rec.source), line('Next follow-up', rec.followUp), line('Expected close', rec.closeDate),
    line('Notes', rec.notes)
  ].filter(Boolean).join('\n');
  const history = acts.map((a) => `- ${a.date} ${a.type}${a.done ? '' : ' (scheduled)'}: ${a.title}${a.notes ? ' — ' + a.notes : ''}`).join('\n') || '(none logged)';
  const open = tasks.filter((t) => t.status !== 'done').map((t) => `- due ${t.due || 'n/a'}: ${t.title}`).join('\n') || '(none)';
  return { rec, text: `RECORD\n${facts}\n\nRECENT ACTIVITY\n${history}\n\nOPEN TASKS\n${open}` };
}

const PROMPTS = {
  whatsapp: 'You are a sales assistant inside a CRM. Write ONE friendly, professional WhatsApp message (max 50 words, no subject line, at most one emoji) following up with this person, using only the data given. Do not invent prices, dates or promises. Sign off with the sender first name. Reply with the message text only.',
  summary: 'You are a sales assistant inside a CRM. Using only the data given, write a short briefing: 1 sentence on where things stand, then 2-4 bullets of key facts, then "Next step:" with one concrete recommendation. Do not invent facts. Under 120 words.',
  email: 'You are a sales assistant inside a CRM. Draft a short, warm, professional follow-up email to this person using only the data given. Start with "Subject: ...", then a blank line, then the body (under 120 words). Do not invent prices, dates or promises that are not in the data. Sign off with the sender name provided.'
};

router.post('/assist', asyncHandler(async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ message: 'AI is not set up yet. Ask the admin to add the ANTHROPIC_API_KEY.' });
  const { kind, type, id, instruction } = req.body || {};
  if (!PROMPTS[kind] || !['lead', 'contact'].includes(type) || !id) return res.status(400).json({ message: 'Choose what to generate and which record.' });
  if (!allowed(String(req.user._id))) return res.status(429).json({ message: 'You have reached the hourly AI limit. Try again later.' });

  const ctx = await loadContext(req.org, type, id);
  if (!ctx) return res.status(404).json({ message: 'That record was not found.' });
  const org = await Organization.findById(req.org);
  const sender = req.user.name + (org && org.name ? ` (${org.name})` : '');

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const extra = kind === 'email' && instruction ? `\n\nExtra instruction from the sender: ${String(instruction).slice(0, 300)}` : '';
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: PROMPTS[kind],
    messages: [{ role: 'user', content: `Sender: ${sender}\n\n${ctx.text}${extra}` }]
  });
  const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
  res.json({ text });
}));

module.exports = router;
