const express = require('express');
const Automation = require('../models/Automation');
const EmailLog = require('../models/EmailLog');
const Organization = require('../models/Organization');
const { requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error');
const { getRules, buildQueue, runForOrg, RULES } = require('../services/automation');
const { sendMail, verify, isConfigured } = require('../services/mailer');

const router = express.Router();

// Everything the Email Automation page needs in one call.
router.get('/', asyncHandler(async (req, res) => {
  const [rules, { queue }, log, org] = await Promise.all([
    getRules(req.org),
    buildQueue(req.org),
    EmailLog.find({ org: req.org }).sort({ sentAt: -1 }).limit(100),
    Organization.findById(req.org)
  ]);
  res.json({
    rules,
    queue,
    log,
    status: {
      sendingActive: !!org.settings.sendingActive,
      lastRun: org.settings.lastRun || null,
      smtpConfigured: isConfigured(),
      schedule: process.env.AUTOMATION_CRON || '0 9 * * *',
      timezone: process.env.TZ_NAME || 'Asia/Kolkata'
    }
  });
}));

router.put('/rules/:key', requireRole('owner', 'admin'), asyncHandler(async (req, res) => {
  if (!RULES.some((r) => r.key === req.params.key)) return res.status(404).json({ message: 'Unknown rule.' });
  const { enabled, subject, body } = req.body || {};
  const update = {};
  if (enabled !== undefined) update.enabled = !!enabled;
  if (subject !== undefined) update.subject = subject;
  if (body !== undefined) update.body = body;
  await Automation.updateOne({ org: req.org, key: req.params.key }, { $set: update }, { upsert: true });
  res.json(await getRules(req.org));
}));

router.post('/rules/:key/reset', requireRole('owner', 'admin'), asyncHandler(async (req, res) => {
  await Automation.updateOne({ org: req.org, key: req.params.key }, { $set: { subject: '', body: '' } });
  res.json(await getRules(req.org));
}));

// Send today's queue right now (instead of waiting for the daily schedule).
router.post('/run', requireRole('owner', 'admin'), asyncHandler(async (req, res) => {
  const result = await runForOrg(req.org);
  res.json(result);
}));

router.post('/test', requireRole('owner', 'admin'), asyncHandler(async (req, res) => {
  const to = (req.body && req.body.to) || req.user.email;
  const check = await verify();
  if (!check.ok) return res.status(400).json({ message: check.message });
  await sendMail({ to, subject: 'LeadBook CRM test email', text: 'Your CRM email settings work. Automated emails will be sent from this address.' });
  res.json({ ok: true, message: `Test email sent to ${to}.` });
}));

module.exports = router;
