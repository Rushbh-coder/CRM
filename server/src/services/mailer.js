const nodemailer = require('nodemailer');

let transport = null;

function isConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransport() {
  if (!isConfigured()) return null;
  if (!transport) {
    const port = Number(process.env.SMTP_PORT || 465);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  return transport;
}

async function sendMail({ to, subject, text, html, fromName }) {
  const t = getTransport();
  if (!t) throw new Error('Email is not set up. Add SMTP settings to server/.env.');
  const from = process.env.MAIL_FROM || (fromName ? `"${fromName}" <${process.env.SMTP_USER}>` : process.env.SMTP_USER);
  return t.sendMail({ from, to, subject, text, ...(html ? { html } : {}) });
}

async function verify() {
  const t = getTransport();
  if (!t) return { ok: false, message: 'SMTP settings are missing in server/.env.' };
  try {
    await t.verify();
    return { ok: true, message: 'Email connection works.' };
  } catch (e) {
    return { ok: false, message: 'Could not connect to the email server: ' + e.message };
  }
}

module.exports = { sendMail, verify, isConfigured };
