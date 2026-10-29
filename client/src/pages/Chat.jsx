import { useCallback, useEffect, useRef, useState } from 'react';
import Pusher from 'pusher-js';
import api, { errMsg, getToken } from '../api.js';
import { useData } from '../context/DataContext.jsx';
import Icon from '../components/Icon.jsx';
import { Avatar } from '../components/ui.jsx';

const hhmm = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const dayLabel = (d) => new Date(d).toLocaleDateString([], { day: 'numeric', month: 'short' });

// Staff inbox for the website chat box.
export default function Chat() {
  const D = useData();
  const [cfg, setCfg] = useState(null);
  const [convos, setConvos] = useState([]);
  const [active, setActive] = useState(null); // conversation id
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const activeRef = useRef(null);
  const endRef = useRef(null);
  activeRef.current = active;

  const loadConvos = useCallback(async () => {
    try { setConvos((await api.get('/chat/conversations')).data); } catch (e) { D.toast(errMsg(e)); }
  }, [D]);

  const openChat = useCallback(async (id) => {
    setActive(id);
    try {
      const { data } = await api.get(`/chat/conversations/${id}/messages`);
      setMsgs(data.messages);
      setConvos((c) => c.map((x) => (x.id === id ? { ...x, unreadStaff: 0 } : x)));
    } catch (e) { D.toast(errMsg(e)); }
  }, [D]);

  useEffect(() => {
    loadConvos();
    api.get('/chat/config').then((r) => setCfg(r.data)).catch(() => setCfg({ realtime: false }));
  }, [loadConvos]);

  // Live updates: Pusher when configured, otherwise check every 4 seconds.
  useEffect(() => {
    if (!cfg) return undefined;
    const onMessage = (m) => {
      if (m.conversation === activeRef.current) {
        setMsgs((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]));
        if (m.from === 'visitor') api.get(`/chat/conversations/${m.conversation}/messages`).catch(() => {});
      }
      loadConvos();
    };
    if (cfg.realtime && cfg.pusherKey) {
      const base = import.meta.env.VITE_API_URL || '/api';
      const pusher = new Pusher(cfg.pusherKey, {
        cluster: cfg.cluster,
        channelAuthorization: { endpoint: base + '/chat/pusher-auth', headers: { Authorization: 'Bearer ' + getToken() } }
      });
      const ch = pusher.subscribe(cfg.channel);
      ch.bind('chat-message', onMessage);
      return () => { ch.unbind_all(); pusher.unsubscribe(cfg.channel); pusher.disconnect(); };
    }
    const t = setInterval(() => {
      loadConvos();
      if (activeRef.current) api.get(`/chat/conversations/${activeRef.current}/messages`).then((r) => setMsgs(r.data.messages)).catch(() => {});
    }, 4000);
    return () => clearInterval(t);
  }, [cfg, loadConvos]);

  useEffect(() => { endRef.current && endRef.current.scrollIntoView({ block: 'end' }); }, [msgs, active]);

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const { data } = await api.post(`/chat/conversations/${active}/messages`, { text: body });
      setMsgs((list) => (list.some((x) => x.id === data.id) ? list : [...list, data]));
      setText('');
      loadConvos();
    } catch (er) { D.toast(errMsg(er)); }
    setSending(false);
  };

  const setStatus = async (status) => {
    try {
      await api.put('/chat/conversations/' + active, { status });
      setConvos((c) => c.map((x) => (x.id === active ? { ...x, status } : x)));
    } catch (er) { D.toast(errMsg(er)); }
  };

  const link = cfg ? `${window.location.origin}/talk/${cfg.orgId}` : '';
  const snippet = `<iframe src="${link}" title="Chat with us" style="position:fixed;bottom:16px;right:16px;width:360px;height:520px;max-width:calc(100vw - 32px);border:0;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.25);z-index:9999"></iframe>`;
  const copy = async (v) => { try { await navigator.clipboard.writeText(v); D.toast('Copied'); } catch { D.toast('Select the text and copy it'); } };

  const cur = convos.find((c) => c.id === active);

  return (
    <div className="chat">
      <section className={'card chat-list' + (active ? ' has-active' : '')}>
        <h2>Live chat {cfg && !cfg.realtime && <small className="muted"> · refreshing every 4s</small>}</h2>
        <div style={{ padding: '0 16px 10px' }}>
          <button className="btn sm" onClick={() => setShowShare((s) => !s)}>{showShare ? 'Hide' : 'Get the chat box for your website'}</button>
          {showShare && cfg && (
            <div className="share-box">
              <p>Customer chat link</p>
              <input readOnly value={link} onFocus={(e) => e.target.select()} />
              <button className="btn sm" onClick={() => copy(link)}>Copy link</button>
              <p>Or paste this on your website to show a chat box in the corner:</p>
              <textarea readOnly rows={4} value={snippet} onFocus={(e) => e.target.select()} />
              <button className="btn sm" onClick={() => copy(snippet)}>Copy code</button>
            </div>
          )}
        </div>
        {convos.length === 0 && <p className="empty">No chats yet. When a visitor starts a chat, it appears here instantly.</p>}
        {convos.map((c) => (
          <button key={c.id} className={'chat-row' + (c.id === active ? ' on' : '')} onClick={() => openChat(c.id)}>
            <Avatar name={c.name} />
            <span className="chat-meta">
              <b>{c.name}{c.status === 'closed' ? ' (closed)' : ''}</b>
              <span>{c.lastFrom === 'staff' ? 'You: ' : ''}{c.lastText || 'New chat'}</span>
            </span>
            <span className="chat-side">
              <small>{hhmm(c.lastAt)}</small>
              {c.unreadStaff > 0 && <i className="chat-badge">{c.unreadStaff}</i>}
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
              <div><b>{cur ? cur.name : 'Visitor'}</b><small>{cur && cur.email ? cur.email : 'No email given'}</small></div>
              {cur && <button className="btn sm" style={{ marginLeft: 'auto' }} onClick={() => setStatus(cur.status === 'closed' ? 'open' : 'closed')}>{cur.status === 'closed' ? 'Reopen' : 'Close chat'}</button>}
            </div>
            <div className="chat-msgs">
              {msgs.map((m, i) => (
                <div key={m.id}>
                  {(i === 0 || dayLabel(msgs[i - 1].createdAt) !== dayLabel(m.createdAt)) && <div className="chat-day">{dayLabel(m.createdAt)}</div>}
                  <div className={'bubble ' + (m.from === 'staff' ? 'out' : 'in')}>
                    <span>{m.text}</span>
                    <small>{m.from === 'staff' && m.staffName ? m.staffName + ' · ' : ''}{hhmm(m.createdAt)}</small>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <form className="chat-compose" onSubmit={send}>
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a reply" aria-label="Message" />
              <button className="btn primary" disabled={sending || !text.trim()}><Icon name="send" /> Send</button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
