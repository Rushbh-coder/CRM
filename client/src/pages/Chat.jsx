import { useCallback, useEffect, useRef, useState } from 'react';
import Pusher from 'pusher-js';
import api, { errMsg, getToken } from '../api.js';
import { useData } from '../context/DataContext.jsx';
import Icon from '../components/Icon.jsx';
import { Avatar } from '../components/ui.jsx';

const hhmm = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const dayLabel = (d) => new Date(d).toLocaleDateString([], { day: 'numeric', month: 'short' });
const TICKS = { sent: '✓', delivered: '✓✓', read: '✓✓', failed: '!' };

export default function Chat() {
  const D = useData();
  const [cfg, setCfg] = useState(null);
  const [convos, setConvos] = useState([]);
  const [active, setActive] = useState(null); // phone
  const [msgs, setMsgs] = useState([]);
  const [canReply, setCanReply] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const activeRef = useRef(null);
  const endRef = useRef(null);
  activeRef.current = active;

  const loadConvos = useCallback(async () => {
    try { setConvos((await api.get('/chat/conversations')).data); } catch (e) { D.toast(errMsg(e)); }
  }, [D]);

  const openChat = useCallback(async (phone) => {
    setActive(phone);
    try {
      const { data } = await api.get('/chat/messages/' + phone);
      setMsgs(data.messages);
      setCanReply(data.canReply);
      setConvos((c) => c.map((x) => (x.phone === phone ? { ...x, unread: 0 } : x)));
    } catch (e) { D.toast(errMsg(e)); }
  }, [D]);

  useEffect(() => {
    loadConvos();
    api.get('/chat/config').then((r) => setCfg(r.data)).catch(() => setCfg({ realtime: false }));
  }, [loadConvos]);

  // Live updates: Pusher when configured, otherwise check every 5 seconds.
  useEffect(() => {
    if (!cfg) return undefined;
    const onMessage = (m) => {
      if (m.phone === activeRef.current) {
        setMsgs((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]));
        if (m.direction === 'in') { setCanReply(true); api.get('/chat/messages/' + m.phone).catch(() => {}); }
      }
      loadConvos();
    };
    const onStatus = ({ id, status }) => setMsgs((list) => list.map((x) => (x.id === id ? { ...x, status } : x)));

    if (cfg.realtime && cfg.pusherKey) {
      const base = import.meta.env.VITE_API_URL || '/api';
      const pusher = new Pusher(cfg.pusherKey, {
        cluster: cfg.cluster,
        channelAuthorization: { endpoint: base + '/chat/pusher-auth', headers: { Authorization: 'Bearer ' + getToken() } }
      });
      const ch = pusher.subscribe(cfg.channel);
      ch.bind('message', onMessage);
      ch.bind('status', onStatus);
      return () => { ch.unbind_all(); pusher.unsubscribe(cfg.channel); pusher.disconnect(); };
    }
    const t = setInterval(() => {
      loadConvos();
      if (activeRef.current) api.get('/chat/messages/' + activeRef.current).then((r) => setMsgs(r.data.messages)).catch(() => {});
    }, 5000);
    return () => clearInterval(t);
  }, [cfg, loadConvos]);

  useEffect(() => { endRef.current && endRef.current.scrollIntoView({ block: 'end' }); }, [msgs, active]);

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const { data } = await api.post('/chat/send', { phone: active, text: body });
      setMsgs((list) => (list.some((x) => x.id === data.id) ? list : [...list, data]));
      setText('');
      loadConvos();
    } catch (er) { D.toast(errMsg(er)); }
    setSending(false);
  };

  const cur = convos.find((c) => c.phone === active);

  return (
    <div className="chat">
      <section className={'card chat-list' + (active ? ' has-active' : '')}>
        <h2>WhatsApp chats {cfg && !cfg.realtime && <small className="muted"> · refreshing every 5s</small>}</h2>
        {cfg && !cfg.whatsapp && <p className="empty">WhatsApp isn’t connected yet. Add the WhatsApp keys on the server to start receiving messages.</p>}
        {convos.length === 0 && cfg && cfg.whatsapp && <p className="empty">No chats yet. When a customer messages your WhatsApp number, it appears here.</p>}
        {convos.map((c) => (
          <button key={c.phone} className={'chat-row' + (c.phone === active ? ' on' : '')} onClick={() => openChat(c.phone)}>
            <Avatar name={c.name} />
            <span className="chat-meta">
              <b>{c.name}{c.company ? ' · ' + c.company : ''}</b>
              <span>{c.lastDir === 'out' ? 'You: ' : ''}{c.lastText}</span>
            </span>
            <span className="chat-side">
              <small>{hhmm(c.lastAt)}</small>
              {c.unread > 0 && <i className="chat-badge">{c.unread}</i>}
            </span>
          </button>
        ))}
      </section>

      <section className={'card chat-thread' + (active ? ' has-active' : '')}>
        {!active ? <p className="empty">Select a chat to read and reply.</p> : (
          <>
            <div className="chat-head">
              <button className="btn icon chat-back" onClick={() => setActive(null)} aria-label="Back to chats"><Icon name="left" /></button>
              <Avatar name={cur ? cur.name : ''} />
              <div><b>{cur ? cur.name : '+' + active}</b><small>+{active}{cur && !cur.inCrm ? ' · not in your contacts' : ''}</small></div>
            </div>
            <div className="chat-msgs">
              {msgs.map((m, i) => (
                <div key={m.id}>
                  {(i === 0 || dayLabel(msgs[i - 1].createdAt) !== dayLabel(m.createdAt)) && <div className="chat-day">{dayLabel(m.createdAt)}</div>}
                  <div className={'bubble ' + m.direction}>
                    <span>{m.text}</span>
                    <small>{hhmm(m.createdAt)}{m.direction === 'out' && <em className={'tick ' + m.status}> {TICKS[m.status]}</em>}</small>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            {!canReply && <p className="chat-note">The 24-hour reply window has closed. You can reply again once the customer messages you.</p>}
            <form className="chat-compose" onSubmit={send}>
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder={canReply ? 'Type a message' : 'Waiting for the customer to message first'} disabled={!canReply} aria-label="Message" />
              <button className="btn primary" disabled={!canReply || sending || !text.trim()}><Icon name="send" /> Send</button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
