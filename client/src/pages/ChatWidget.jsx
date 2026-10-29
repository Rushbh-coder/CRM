import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Pusher from 'pusher-js';

// Public, no-login chat box for website visitors. Opened at /talk/<businessId>, or embedded as an iframe.
const BASE = import.meta.env.VITE_API_URL || '/api';
const http = axios.create({ baseURL: BASE + '/public-chat' });
const hhmm = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const msgOf = (e) => (e && e.response && e.response.data && e.response.data.message) || 'Something went wrong. Try again.';

export default function ChatWidget() {
  const { orgId } = useParams();
  const key = 'leadbook_visitor_' + orgId;
  const [org, setOrg] = useState(null);
  const [token, setToken] = useState(() => { try { return localStorage.getItem(key); } catch { return null; } });
  const [convId, setConvId] = useState(() => { try { return localStorage.getItem(key + '_cid'); } catch { return null; } });
  const [msgs, setMsgs] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', website: '' });
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  const auth = useCallback(() => ({ headers: { Authorization: 'Bearer ' + token } }), [token]);

  useEffect(() => { http.get('/org/' + orgId).then((r) => setOrg(r.data)).catch(() => setOrg({ missing: true })); }, [orgId]);

  const reset = useCallback(() => {
    try { localStorage.removeItem(key); localStorage.removeItem(key + '_cid'); } catch { /* storage unavailable */ }
    setToken(null); setConvId(null); setMsgs([]);
  }, [key]);

  const load = useCallback(() => http.get('/messages', auth()).then((r) => setMsgs(r.data.messages)).catch((e) => { if (e.response && e.response.status === 401) reset(); }), [auth, reset]);

  useEffect(() => { if (token) load(); }, [token, load]);

  // Live updates: Pusher if configured, otherwise poll every 3 seconds.
  useEffect(() => {
    if (!token || !org || org.missing) return undefined;
    if (org.realtime && org.pusherKey && convId) {
      const pusher = new Pusher(org.pusherKey, { cluster: org.cluster, channelAuthorization: { endpoint: BASE + '/public-chat/pusher-auth', headers: { Authorization: 'Bearer ' + token } } });
      const ch = pusher.subscribe('private-chat-' + convId);
      ch.bind('chat-message', (m) => setMsgs((l) => (l.some((x) => x.id === m.id) ? l : [...l, m])));
      return () => { ch.unbind_all(); pusher.disconnect(); };
    }
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [token, org, convId, load]);

  useEffect(() => { endRef.current && endRef.current.scrollIntoView({ block: 'end' }); }, [msgs]);

  const start = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const { data } = await http.post('/start', { orgId, ...form });
      try { localStorage.setItem(key, data.token); localStorage.setItem(key + '_cid', data.conversation); } catch { /* storage unavailable */ }
      setToken(data.token); setConvId(data.conversation);
    } catch (er) { setErr(msgOf(er)); }
    setBusy(false);
  };

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true); setErr('');
    try {
      const { data } = await http.post('/messages', { text: body }, auth());
      setMsgs((l) => (l.some((x) => x.id === data.id) ? l : [...l, data]));
      setText('');
    } catch (er) { setErr(msgOf(er)); }
    setBusy(false);
  };

  if (!org) return <div className="cw"><p className="cw-note">Loading…</p></div>;
  if (org.missing) return <div className="cw"><p className="cw-note">This chat isn’t available.</p></div>;

  return (
    <div className="cw">
      <header className="cw-head"><b>{org.name}</b><span>We usually reply within a few minutes</span></header>
      {!token ? (
        <form className="cw-start" onSubmit={start}>
          <p>Hi! Tell us who you are and ask us anything.</p>
          <input placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={80} aria-label="Your name" />
          <input placeholder="Email (optional)" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-label="Email" />
          <input className="cw-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          {err && <p className="err">{err}</p>}
          <button className="btn primary" disabled={busy || !form.name.trim()}>Start chat</button>
        </form>
      ) : (
        <>
          <div className="cw-msgs">
            {msgs.length === 0 && <p className="cw-note">Say hello — a team member will reply here.</p>}
            {msgs.map((m) => (
              <div key={m.id} className={'bubble ' + (m.from === 'visitor' ? 'out' : 'in')}>
                <span>{m.text}</span>
                <small>{m.from === 'staff' && m.staffName ? m.staffName + ' · ' : ''}{hhmm(m.createdAt)}</small>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          {err && <p className="err" style={{ margin: '0 12px' }}>{err}</p>}
          <form className="chat-compose" onSubmit={send}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" maxLength={1000} aria-label="Message" />
            <button className="btn primary" disabled={busy || !text.trim()}>Send</button>
          </form>
        </>
      )}
    </div>
  );
}
