const Anthropic = require('@anthropic-ai/sdk');

const MODEL = process.env.AI_MODEL || 'claude-haiku-5-5';

const SYSTEM = 'You write short WhatsApp follow-up messages for a sales person. Using only the details given, write ONE friendly, professional message (max 50 words, no subject line, no placeholders, at most one emoji). Do not invent prices, dates or promises. Sign off with the sender first name. Reply with the message text only.';

// The fallback used when AI is not set up or fails.
function defaultMessage(l, sender, business) {
  const first = String(l.name || '').trim().split(' ')[0] || 'there';
  const about = l.deal ? ` about ${l.deal}` : '';
  return `Hi ${first}, this is ${sender} from ${business}. I'm following up${about}. Do you have a few minutes this week for a quick call? Please let me know a time that suits you.`;
}

async function one(client, l, sender, business) {
  const facts = [
    ['Customer', l.name], ['Company', l.company], ['Deal', l.deal], ['Stage', 'Contacted (we have spoken before)'],
    ['Next follow-up', l.followUp], ['Notes', String(l.notes || '').slice(0, 300)], ['Sender', sender], ['Business', business]
  ].filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n');
  const msg = await client.messages.create({ model: MODEL, max_tokens: 200, system: SYSTEM, messages: [{ role: 'user', content: facts }] }, { timeout: 7000 });
  const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  return text || defaultMessage(l, sender, business);
}

// One message per lead, written in parallel. Any lead the AI can't handle gets the default message.
async function leadMessages(leads, { sender, business }) {
  const out = new Map();
  const client = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
  await Promise.all(leads.map(async (l) => {
    let text = defaultMessage(l, sender, business);
    let ai = false;
    if (client) {
      try { text = await one(client, l, sender, business); ai = true; } catch (e) { console.error('[ai] message failed for', l.name, e.message); }
    }
    out.set(String(l._id), { text, ai });
  }));
  return out;
}

module.exports = { leadMessages, defaultMessage };
