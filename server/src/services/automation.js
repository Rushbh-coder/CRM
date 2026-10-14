const Organization = require('../models/Organization');
const Automation = require('../models/Automation');
const EmailLog = require('../models/EmailLog');
const Contact = require('../models/Contact');
const Lead = require('../models/Lead');
const Activity = require('../models/Activity');
const Task = require('../models/Task');
const User = require('../models/User');
const { sendMail } = require('./mailer');
const { todayIn, addDays, dateOf } = require('../utils/dates');

const OPEN = ['new', 'contacted', 'qualified', 'proposal'];

const RULES = [
  {
    key: 'followup_reminder', name: 'Follow-up email to leads', when: 'Every day, to leads whose next follow-up date is today', defaultOn: true,
    subject: 'Following up on {{deal}}',
    body: 'Hi {{first_name}},\n\nI hope you are doing well. I wanted to follow up on {{deal}} for {{company}} and check if you had any questions.\n\nWould a quick call this week work for you?\n\nRegards,\n{{sender}}\n{{business}}'
  },
  {
    key: 'welcome_customer', name: 'Welcome email to new contacts', when: 'Once, the day after a contact is added', defaultOn: true,
    subject: 'Welcome to {{business}}, {{first_name}}!',
    body: 'Hi {{first_name}},\n\nThank you for choosing {{business}}. We are glad to have {{company}} with us.\n\nIf you need anything, just reply to this email and we will help you right away.\n\nWarm regards,\n{{sender}}\n{{business}}'
  },
  {
    key: 'won_thanks', name: 'Thank-you email when a deal is won', when: 'Once, the day after a deal moves to Won', defaultOn: true,
    subject: 'Thank you for your business, {{first_name}}',
    body: 'Hi {{first_name}},\n\nThank you for confirming {{deal}}. Our team will be in touch shortly with the next steps.\n\nWe look forward to working with {{company}}.\n\nRegards,\n{{sender}}\n{{business}}'
  },
  {
    key: 'inactive_checkin', name: 'Check-in with inactive contacts', when: 'Every 30 days, to contacts marked Inactive', defaultOn: false,
    subject: 'It has been a while, {{first_name}}',
    body: 'Hi {{first_name}},\n\nWe have not heard from {{company}} in a while and wanted to check in. Is there anything we can help you with this month?\n\nRegards,\n{{sender}}\n{{business}}'
  },
  {
    key: 'daily_summary', name: 'Daily summary to me', when: "Every day, to your own email: today's follow-ups, tasks and activities", defaultOn: true,
    subject: 'Your CRM plan for today',
    body: 'Good morning {{sender}},\n\nHere is your plan for today:\n\n{{today_list}}\n\nHave a great day!'
  }
];

const inr = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const fill = (tpl, v) => String(tpl || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (v[k] != null ? String(v[k]) : ''));

async function ensureAutomations(orgId) {
  for (const r of RULES) {
    await Automation.updateOne({ org: orgId, key: r.key }, { $setOnInsert: { enabled: r.defaultOn } }, { upsert: true });
  }
}

async function getRules(orgId) {
  await ensureAutomations(orgId);
  const docs = await Automation.find({ org: orgId });
  return RULES.map((r) => {
    const d = docs.find((x) => x.key === r.key) || {};
    return { key: r.key, name: r.name, when: r.when, enabled: !!d.enabled, subject: d.subject || r.subject, body: d.body || r.body, customized: !!(d.subject || d.body), defaultSubject: r.subject, defaultBody: r.body };
  });
}

// Works out which emails are due today. Same logic the Email Automation page previews.
async function buildQueue(orgId) {
  const org = await Organization.findById(orgId);
  const s = org.settings || {};
  const tz = process.env.TZ_NAME || 'Asia/Kolkata';
  const today = todayIn(tz);
  const [rules, contacts, leads, activities, tasks, logs, owner] = await Promise.all([
    getRules(orgId),
    Contact.find({ org: orgId }),
    Lead.find({ org: orgId }),
    Activity.find({ org: orgId, done: false, date: today }),
    Task.find({ org: orgId, status: { $ne: 'done' }, due: { $ne: '', $lte: today } }),
    EmailLog.find({ org: orgId, date: { $gte: addDays(today, -31) } }),
    User.findOne({ org: orgId, role: 'owner' })
  ]);
  const allLogs = await EmailLog.find({ org: orgId, rule: { $in: ['welcome_customer', 'won_thanks'] } }, 'rule recordId');
  const on = (k) => (rules.find((r) => r.key === k) || {}).enabled;
  const rule = (k) => rules.find((r) => r.key === k);
  const loggedToday = (k, id) => logs.some((l) => l.rule === k && l.recordId === id && l.date === today);
  const loggedEver = (k, id) => allLogs.some((l) => l.rule === k && l.recordId === id);
  const loggedSince = (k, id, days) => logs.some((l) => l.rule === k && l.recordId === id && l.date >= addDays(today, -days));
  const sender = s.senderName || (owner && owner.name) || s.businessName || 'Team';
  const business = s.businessName || org.name || 'our team';

  const lines = [];
  leads.filter((l) => OPEN.includes(l.stage) && l.followUp && l.followUp <= today)
    .forEach((l) => lines.push(`• Follow up: ${l.name}${l.company ? ' (' + l.company + ')' : ''}${l.followUp < today ? ' — overdue' : ''}`));
  activities.forEach((a) => lines.push(`• ${a.time || ''} ${a.type}: ${a.title}`.replace('•  ', '• ')));
  tasks.forEach((t) => lines.push(`• Task: ${t.title}${t.due < today ? ' — overdue' : ''}`));
  const todayList = lines.length ? lines.join('\n') : 'Nothing scheduled today.';

  const queue = [];
  const add = (key, rec, to) => {
    const r = rule(key);
    const v = {
      name: rec.name || '', first_name: String(rec.name || '').split(' ')[0], company: rec.company || 'your company',
      deal: rec.deal || 'our proposal', value: rec.value ? inr(rec.value) : '', follow_up: rec.followUp || '',
      business, sender, today_list: todayList
    };
    queue.push({ rule: key, ruleName: r.name, recordId: String(rec._id || rec.id), to, name: rec.name, subject: fill(r.subject, v), body: fill(r.body, v) });
  };

  if (on('followup_reminder')) leads.filter((l) => OPEN.includes(l.stage) && l.email && l.followUp === today && !loggedToday('followup_reminder', String(l._id))).forEach((l) => add('followup_reminder', l, l.email));
  if (on('welcome_customer')) contacts.filter((c) => c.email && dateOf(c.createdAt, tz) >= addDays(today, -1) && !loggedEver('welcome_customer', String(c._id))).forEach((c) => add('welcome_customer', c, c.email));
  if (on('won_thanks')) leads.filter((l) => l.stage === 'won' && l.email && l.wonAt && dateOf(l.wonAt, tz) >= addDays(today, -2) && !loggedEver('won_thanks', String(l._id))).forEach((l) => add('won_thanks', l, l.email));
  if (on('inactive_checkin')) contacts.filter((c) => c.status === 'Inactive' && c.email && !loggedSince('inactive_checkin', String(c._id), 30)).forEach((c) => add('inactive_checkin', c, c.email));
  if (on('daily_summary') && s.summaryEmail && !loggedToday('daily_summary', 'me')) add('daily_summary', { _id: 'me', name: sender }, s.summaryEmail);

  return { today, queue };
}

// Sends everything in today's queue and records each email in the log.
async function runForOrg(orgId) {
  const { today, queue } = await buildQueue(orgId);
  const org = await Organization.findById(orgId);
  const fromName = (org.settings && org.settings.businessName) || org.name;
  const result = { sent: 0, skipped: 0, failed: 0 };
  for (const m of queue) {
    let status = 'sent';
    let note = '';
    if (/\.(example|test|invalid)$/i.test(m.to) || !/^\S+@\S+\.\S+$/.test(m.to)) {
      status = 'skipped';
      note = 'Sample or invalid address';
    } else {
      try {
        await sendMail({ to: m.to, subject: m.subject, text: m.body, fromName });
      } catch (e) {
        status = 'failed';
        note = e.message.slice(0, 200);
      }
    }
    result[status]++;
    await EmailLog.updateOne(
      { org: orgId, rule: m.rule, recordId: m.recordId, date: today },
      { $set: { to: m.to, subject: m.subject, status, note, sentAt: new Date() } },
      { upsert: true }
    );
  }
  org.settings.lastRun = new Date();
  org.markModified('settings');
  await org.save();
  return result;
}

async function runAll() {
  const orgs = await Organization.find({ 'settings.sendingActive': true }, '_id name');
  for (const o of orgs) {
    try {
      const r = await runForOrg(o._id);
      console.log(`[automation] ${o.name}: ${r.sent} sent, ${r.skipped} skipped, ${r.failed} failed`);
    } catch (e) {
      console.error(`[automation] ${o.name} failed:`, e.message);
    }
  }
}

module.exports = { RULES, ensureAutomations, getRules, buildQueue, runForOrg, runAll };
