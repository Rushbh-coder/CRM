const Pusher = require('pusher');

// Realtime push to the browser via Pusher Channels (Vercel can't hold WebSocket connections itself).
let client;
function pusher() {
  const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = process.env;
  if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET) return null;
  if (!client) client = new Pusher({ appId: PUSHER_APP_ID, key: PUSHER_KEY, secret: PUSHER_SECRET, cluster: PUSHER_CLUSTER || 'ap2', useTLS: true });
  return client;
}

const channelFor = (org) => `private-org-${org}`;

async function publish(org, event, data) {
  const p = pusher();
  if (!p) return;
  try { await p.trigger(channelFor(org), event, data); } catch (e) { console.error('[realtime] push failed:', e.message); }
}

module.exports = { pusher, publish, channelFor, enabled: () => !!pusher() };
