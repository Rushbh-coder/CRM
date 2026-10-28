import { useState } from 'react';
import api, { errMsg } from '../api.js';
import { useData } from '../context/DataContext.jsx';

// "Summarise" and "Draft follow-up email" for one contact or lead, powered by the server's /ai/assist route.
export default function AiAssist({ type, id }) {
  const D = useData();
  const [busy, setBusy] = useState('');
  const [out, setOut] = useState('');
  const [err, setErr] = useState('');

  const run = async (kind) => {
    setBusy(kind); setErr(''); setOut('');
    try {
      const { data } = await api.post('/ai/assist', { kind, type, id });
      setOut(data.text);
    } catch (e) { setErr(errMsg(e)); }
    setBusy('');
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(out); D.toast('Copied'); } catch { D.toast('Select the text and copy it'); }
  };

  return (
    <div className="ai-box">
      <div className="ai-head"><b>AI assistant</b><span>Review before you use it</span></div>
      <div className="ai-actions">
        <button type="button" className="btn sm" disabled={!!busy} onClick={() => run('summary')}>{busy === 'summary' ? 'Thinking…' : 'Summarise'}</button>
        <button type="button" className="btn sm" disabled={!!busy} onClick={() => run('email')}>{busy === 'email' ? 'Writing…' : 'Draft follow-up email'}</button>
      </div>
      {err && <p className="err">{err}</p>}
      {out && (
        <>
          <textarea className="ai-out" value={out} onChange={(e) => setOut(e.target.value)} rows={8} aria-label="AI result" />
          <button type="button" className="btn sm" onClick={copy}>Copy</button>
        </>
      )}
    </div>
  );
}
