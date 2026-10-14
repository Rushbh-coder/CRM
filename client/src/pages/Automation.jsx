import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import { useData } from '../context/DataContext.jsx';
import Icon from '../components/Icon.jsx';
import { fmtDate, today } from '../lib/utils.js';

const PLACEHOLDERS = ['first_name', 'name', 'company', 'deal', 'value', 'follow_up', 'business', 'sender'];

export default function Automation() {
  const D = useData();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const [edit, setEdit] = useState(null);

  const load = useCallback(async () => {
    try { const { data: d } = await api.get('/automation'); setData(d); setErr(''); } catch (e) { setErr(errMsg(e)); }
  }, []);
  useEffect(() => { load(); }, [load, D.leads, D.contacts, D.activities, D.tasks]);

  if (err) return <div className="card"><h2>Couldn’t load email automation</h2><p className="empty">{err}</p><button className="btn primary" onClick={load}>Try again</button></div>;
  if (!data) return <div className="card"><p className="empty">Loading…</p></div>;

  const st = data.status;
  const active = !!D.settings.sendingActive;
  const sentToday = data.log.filter((l) => l.date === today() &&l.status === 'sent').length;

  const toggleRule = async (r) => {
    try { const { data: rules } = await api.put('/automation/rules/' + r.key, { enabled: !r.enabled }); setData((d) => ({ ...d, rules })); D.toast(r.enabled ? 'Rule switched off' : 'Rule switched on'); load(); }
    catch (e) { D.toast(errMsg(e)); }
  };
  const toggleSending = async () => {
    if (await D.saveSettings({ sendingActive: !active })) D.toast(active ? 'Daily sending switched off' : 'Daily sending switched on');
  };
  const runNow = async () => {
    setBusy('run');
    try { const { data: r } = await api.post('/automation/run'); D.toast(`${r.sent} sent, ${r.skipped} skipped, ${r.failed} failed`); load(); }
    catch (e) { D.toast(errMsg(e)); }
    setBusy('');
  };
  const testEmail = async () => {
    setBusy('test');
    try { const { data: r } = await api.post('/automation/test', {}); D.toast(r.message); } catch (e) { D.toast(errMsg(e)); }
    setBusy('');
  };

  return (
    <>
      {!st.smtpConfigured && <div className="notice"><span><b>Email isn’t set up on the server yet.</b> Add your Gmail SMTP settings to <code>server/.env</code> and restart the server. The setup guide explains how.</span></div>}
      {active
        ? <div className="notice ok"><span><b>Daily sending is on.</b> Emails in “Today’s queue” go out automatically on schedule ({st.schedule}, {st.timezone}).</span><button className="btn sm" onClick={toggleSending} disabled={!D.isAdmin}>Turn off</button></div>
        : <div className="notice info"><span><b>Daily sending is off.</b> Turn it on to send the queued emails automatically every day.</span><button className="btn primary sm" onClick={toggleSending} disabled={!D.isAdmin}>Turn on</button></div>}
      {!D.settings.summaryEmail && <div className="notice"><span>Add your email in Settings to get the daily summary.</span><button className="btn sm" onClick={() => nav('/settings?tab=email')}>Open Settings</button></div>}

      <div className="status">
        <div className="s"><div className="l">Daily sending</div><div className="v" style={{ color: active ? 'var(--good)' : 'var(--warn)' }}>{active ? 'On' : 'Off'}</div></div>
        <div className="s"><div className="l">In today’s queue</div><div className="v tn">{data.queue.length} email{data.queue.length === 1 ? '' : 's'}</div></div>
        <div className="s"><div className="l">Last run</div><div className="v tn" style={{ fontSize: 15 }}>{st.lastRun ? new Date(st.lastRun).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) + ' · ' + sentToday + ' sent today' : 'Not run yet'}</div></div>
      </div>

      <section className="card">
        <div className="card-head"><h2>Automation rules</h2>
          {D.isAdmin && <div className="toolbar"><button className="btn" onClick={testEmail} disabled={busy === 'test'}><Icon name="mail" />{busy === 'test' ? 'Sending…' : 'Send test email'}</button><button className="btn primary" onClick={runNow} disabled={busy === 'run' || !data.queue.length}><Icon name="send" />{busy === 'run' ? 'Sending…' : 'Send today’s queue now'}</button></div>}
        </div>
        <div className="rules">
          {data.rules.map((r) => (
            <div className="rule" key={r.key}>
              <button className="switch" role="switch" aria-checked={r.enabled} aria-label={r.name} onClick={() => toggleRule(r)} disabled={!D.isAdmin} />
              <div><b>{r.name}</b><p>{r.when}</p></div>
              <button className="btn sm" onClick={() => setEdit(r)} disabled={!D.isAdmin}>Edit email</button>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="card-head"><h2>Today’s queue</h2><span className="hint">Click an email to preview it</span></div>
        {data.queue.length ? data.queue.map((m) => (
          <details className="mail" key={m.rule + m.recordId}>
            <summary><span className="to">{m.to}</span><span className="pill">{m.ruleName}</span><span className="subj">{m.subject}</span></summary>
            <div className="body">{m.body}</div>
          </details>
        )) : <p className="empty">No emails are due today with the rules that are switched on.</p>}
      </section>

      <section className="card">
        <h2>Sent log</h2>
        {data.log.length ? (
          <div className="table-wrap" style={{ marginBottom: -20 }}>
            <table style={{ minWidth: 620 }}>
              <thead><tr><th>Date</th><th>To</th><th>Email</th><th>Status</th></tr></thead>
              <tbody>
                {data.log.map((l) => (
                  <tr key={l.id}>
                    <td className="tn">{fmtDate(l.date)}</td><td>{l.to}</td>
                    <td>{l.subject}<div className="sub">{(data.rules.find((r) => r.key === l.rule) || {}).name || l.rule}</div></td>
                    <td><span className={'pill ' + (l.status === 'sent' ? 'p-good' : l.status === 'failed' ? 'p-bad' : '')}>{l.status === 'sent' ? 'Sent' : l.status === 'failed' ? 'Failed' : 'Skipped'}</span>{l.note && <div className="sub">{l.note}</div>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="empty">Nothing has been sent yet. Sent emails will be listed here.</p>}
      </section>

      {edit && <RuleEditor rule={edit} onClose={() => setEdit(null)} onSaved={(rules) => { setData((d) => ({ ...d, rules })); setEdit(null); load(); }} />}
    </>
  );
}

function RuleEditor({ rule, onClose, onSaved }) {
  const D = useData();
  const [subject, setSubject] = useState(rule.subject);
  const [body, setBody] = useState(rule.body);
  const ph = rule.key === 'daily_summary' ? ['sender', 'business', 'today_list'] : PLACEHOLDERS;
  const save = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return D.toast('Add a subject and some email text before saving.');
    try { const { data } = await api.put('/automation/rules/' + rule.key, { subject, body }); D.toast('Email saved'); onSaved(data); } catch (e2) { D.toast(errMsg(e2)); }
  };
  const reset = async () => {
    try { const { data } = await api.post('/automation/rules/' + rule.key + '/reset'); D.toast('Email reset to the default text'); onSaved(data); } catch (e2) { D.toast(errMsg(e2)); }
  };
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={save} noValidate>
        <h2>{rule.name}</h2>
        <p className="hint" style={{ margin: 0 }}>{rule.when}</p>
        <div className="form">
          <div className="field full"><label htmlFor="r-subj">Subject</label><input id="r-subj" value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
          <div className="field full"><label htmlFor="r-body">Email text</label><textarea id="r-body" className="tall" value={body} onChange={(e) => setBody(e.target.value)} />
            <span className="hint">Placeholders: {ph.map((p) => <span key={p} className="ph" style={{ marginRight: 4 }}>{`{{${p}}}`}</span>)}</span></div>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn ghost" onClick={reset}>Reset to default</button>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary">Save email</button>
        </div>
      </form>
    </div>
  );
}
