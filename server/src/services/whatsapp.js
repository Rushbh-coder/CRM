// WhatsApp Cloud API (Meta) helpers.
const GRAPH = 'https://graph.facebook.com/v21.0';

const isConfigured = () => !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
const digits = (s) => String(s || '').replace(/\D/g, '');

async function sendText(to, text) {
  if (!isConfigured()) {
    const e = new Error('WhatsApp is not set up yet. Ask the admin to add the WhatsApp keys.');
    e.status = 503;
    throw e;
  }
  const res = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text, preview_url: false } })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error((data.error && data.error.message) || 'WhatsApp could not send that message.');
    e.status = 502;
    throw e;
  }
  return data.messages && data.messages[0] && data.messages[0].id;
}

module.exports = { isConfigured, sendText, digits };
