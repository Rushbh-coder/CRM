// Designed HTML email (plus plain-text fallback) listing every lead in the Contacted stage,
// each with its deal details, a ready-to-send message, and one-tap WhatsApp / call / email buttons.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const inr = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const digits = (s) => String(s || '').replace(/\D/g, '');

// WhatsApp wants the country code; a bare 10-digit number is treated as Indian.
function waNumber(phone) {
  const d = digits(phone);
  if (d.length === 10) return '91' + d;
  return d.length >= 11 ? d : '';
}

function messageFor(l, sender, business) {
  const first = String(l.name || '').trim().split(' ')[0] || 'there';
  const about = l.deal ? ` about ${l.deal}` : '';
  return `Hi ${first}, this is ${sender} from ${business}. I'm following up${about}. Do you have a few minutes this week for a quick call? Please let me know a time that suits you.`;
}

function details(l) {
  return [
    ['Company', l.company], ['Deal', l.deal], ['Value', l.value ? inr(l.value) : ''], ['Source', l.source],
    ['Phone', l.phone], ['Email', l.email], ['Next follow-up', l.followUp], ['Expected close', l.closeDate]
  ].filter(([, v]) => v);
}

// messages: optional Map(leadId -> { text, ai }) from services/aiMessage; ownerPhone: for the "send to my WhatsApp" button.
function buildContactedEmail({ leads, sender, business, appUrl, today, messages, ownerPhone }) {
  const total = leads.reduce((n, l) => n + (Number(l.value) || 0), 0);
  const pick = (l) => (messages && messages.get(String(l._id))) || { text: messageFor(l, sender, business), ai: false };
  const ownerWa = waNumber(ownerPhone);
  // Whole list as one WhatsApp message to yourself (kept short so the link stays valid).
  const ownerText = `${leads.length} contacted leads to follow up:\n` + leads.map((l, i) => `${i + 1}. ${l.name}${l.company ? ' (' + l.company + ')' : ''}${l.phone ? ' - ' + l.phone : ''}${l.deal ? ' - ' + l.deal : ''}`).join('\n');
  const btn = (href, label, bg) => `<a href="${esc(href)}" style="display:inline-block;background:${bg};color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:8px 14px;border-radius:8px;margin:0 6px 6px 0">${label}</a>`;

  const cards = leads.map((l) => {
    const { text: msg, ai } = pick(l);
    const wa = waNumber(l.phone);
    const rows = details(l).map(([k, v]) => `<tr><td style="padding:3px 12px 3px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top">${esc(k)}</td><td style="padding:3px 0;color:#111827;font-size:13px">${esc(v)}</td></tr>`).join('');
    const notes = l.notes ? `<p style="margin:10px 0 0;font-size:12.5px;color:#6b7280">Notes: ${esc(String(l.notes).replace(/\s+/g, ' ').slice(0, 220))}</p>` : '';
    const buttons = [
      wa ? btn(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, 'Send on WhatsApp', '#16a34a') : '',
      l.phone ? btn(`tel:${digits(l.phone)}`, 'Call', '#4f46e5') : '',
      l.email ? btn(`mailto:${l.email}?subject=${encodeURIComponent('Following up' + (l.deal ? ' on ' + l.deal : ''))}&body=${encodeURIComponent(msg)}`, 'Email', '#0ea5e9') : ''
    ].join('');
    return `
    <tr><td style="padding:0 24px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;background:#ffffff">
        <tr><td style="padding:16px 18px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="font-size:16px;font-weight:700;color:#111827">${esc(l.name)}</td>
            <td align="right"><span style="background:#dcfce7;color:#166534;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px">CONTACTED</span></td>
          </tr></table>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px">${rows}</table>
          ${notes}
          <div style="margin-top:12px;background:#f5f3ff;border-left:3px solid #4f46e5;border-radius:6px;padding:10px 12px">
            <div style="font-size:11px;font-weight:700;color:#4f46e5;letter-spacing:.04em;margin-bottom:4px">${ai ? 'AI-WRITTEN MESSAGE' : 'SUGGESTED MESSAGE'}</div>
            <div style="font-size:13px;color:#1f2937;line-height:1.5">${esc(msg)}</div>
          </div>
          <div style="margin-top:12px">${buttons}</div>
        </td></tr>
      </table>
    </td></tr>`;
  }).join('');

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0"><tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
    <tr><td style="background:#4f46e5;border-radius:14px 14px 0 0;padding:26px 24px">
      <div style="color:#c7d2fe;font-size:12px;font-weight:600;letter-spacing:.06em">${esc(business).toUpperCase()} · ${esc(today)}</div>
      <div style="color:#ffffff;font-size:22px;font-weight:700;margin-top:6px">${leads.length} contacted lead${leads.length === 1 ? '' : 's'} waiting on you</div>
      <div style="color:#e0e7ff;font-size:14px;margin-top:6px">Hi ${esc(sender)}, these deals are in the Contacted stage. A quick message today keeps them moving${total ? ` — ${inr(total)} in total value` : ''}.</div>
    </td></tr>
    <tr><td style="background:#f3f4f6;padding:18px 0 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cards}</table></td></tr>
    <tr><td align="center" style="padding:8px 24px 28px">
      ${ownerWa ? `<a href="https://wa.me/${ownerWa}?text=${encodeURIComponent(ownerText)}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 22px;border-radius:10px;margin:0 6px 8px 0">Send this list to my WhatsApp</a>` : ''}
      ${appUrl ? `<a href="${esc(appUrl)}/leads" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 22px;border-radius:10px;margin:0 0 8px">Open my CRM</a>` : ''}
      <p style="margin:16px 0 0;font-size:12px;color:#9ca3af">You get this reminder every 2 days while leads are in the Contacted stage. Turn it off under Email Automation.</p>
    </td></tr>
  </table>
</td></tr></table></body></html>`;

  const text = leads.map((l) => {
    const d = details(l).map(([k, v]) => `   ${k}: ${v}`).join('\n');
    return `• ${l.name}\n${d}\n   Message: ${pick(l).text}`;
  }).join('\n\n');

  return { html, text };
}

module.exports = { buildContactedEmail };
