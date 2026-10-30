import { useState } from 'react';
import api, { errMsg } from '../api.js';
import { useData } from '../context/DataContext.jsx';

// WhatsApp wants the country code; a bare 10-digit number is treated as Indian.
function waLink(phone, text) {
  const d = String(phone || '').replace(/\D/g, '');
  const n = d.length === 10 ? '91' + d : d;
  return n.length >= 11 ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : '';
}

// AI helper for one contact or lead: summary, a WhatsApp message or an email, plus one-tap send buttons.
// Nothing is sent automatically: the buttons open WhatsApp / your mail app with the text already typed in.
export default function AiAssist({ type, id, phone, email }) {
  const D = useData();
  const [busy, setBusy] = useState('');
  const [kind, setKind] = useState('');
  const [out, setOut] = useState('');
  const [err, setErr] = useState('');

  const run = async (k) => {
    setBusy(k); setErr(''); setOut(''); setKind(k);
    try {
      const { data } = await api.post('/ai/assist', { kind: k, type, id });
      setOut(data.text);
    } catch (e) { setErr(errMsg(e)); }
    setBusy('');
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(out); D.toast('Copied'); } catch { D.toast('Select the text and copy it'); }
  };

  // For an email draft the first line is "Subject: ..."; split it so the mail app gets a proper subject.
  const sub = kind === 'email' ? out.match(/^Subject:\s*(.+)\r?\n+([\s\S]*)$/i) : null;
  const mailto = email ? `mailto:${email}?subject=${encodeURIComponent(sub ? sub[1] : 'Following up')}&body=${encodeURIComponent(sub ? sub[2] : out)}` : '';
  const wa = waLink(phone, kind === 'email' && sub ? sub[2] : out);

  return (
    <div className="ai-box">
      <div className="ai-head"><b>AI assistant</b><span>Review before you send</span></div>
      <div className="ai-actions">
        <button type="button" className="btn sm" disabled={!!busy} onClick={() => run('summary')}>{busy === 'summary' ? 'Thinking…' : 'Summarise'}</button>
        <button type="button" className="btn sm" disabled={!!busy} onClick={() => run('whatsapp')}>{busy === 'whatsapp' ? 'Writing…' : 'WhatsApp message'}</button>
        <button type="button" className="btn sm" disabled={!!busy} onClick={() => run('email')}>{busy === 'email' ? 'Writing…' : 'Draft email'}</button>
      </div>
      {err && <p className="err">{err}</p>}
      {out && (
        <>
          <textarea className="ai-out" value={out} onChange={(e) => setOut(e.target.value)} rows={8} aria-label="AI result" />
          <div className="ai-actions">
            {kind !== 'summary' && wa && <a className="btn sm primary" href={wa} target="_blank" rel="noreferrer">Open in WhatsApp</a>}
            {kind !== 'summary' && mailto && <a className="btn sm primary" href={mailto}>Open in email</a>}
            <button type="button" className="btn sm" onClick={copy}>Copy</button>
          </div>
          {kind !== 'summary' && !wa && <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>Add a phone number with country code to send on WhatsApp.</p>}
        </>
      )}
    </div>
  );
}
