// Add/edit forms for every record type, plus the confirm dialog and toast.
import { useEffect, useRef, useState } from 'react';
import AiAssist from './AiAssist.jsx';
import { useData } from '../context/DataContext.jsx';
import { ATYPES, CSTATUS, INDUSTRIES, PRIOS, SEGMENTS, SOURCES, STAGES, TSTAT, today } from '../lib/utils.js';

function fieldsFor(coll, team) {
  const people = team.map((u) => [u.id, u.name]);
  if (coll === 'contacts') return [
    { k: 'name', l: 'Full name', req: 1 }, { k: 'title', l: 'Job title' }, { k: 'company', l: 'Company' },
    { k: 'industry', l: 'Industry', opts: INDUSTRIES }, { k: 'phone', l: 'Phone', type: 'tel', ph: '+91 98xxx xxxxx' },
    { k: 'email', l: 'Email', type: 'email' }, { k: 'city', l: 'City' }, { k: 'segment', l: 'Segment', opts: SEGMENTS },
    { k: 'status', l: 'Status', opts: CSTATUS }, { k: 'revenue', l: 'Total revenue (₹)', type: 'number' },
    { k: 'owner', l: 'Owner', opts: people }, { k: 'notes', l: 'Notes', area: 1 }
  ];
  if (coll === 'leads') return [
    { k: 'deal', l: 'Deal name', ph: 'e.g. Website redesign' }, { k: 'name', l: 'Contact name', req: 1 },
    { k: 'company', l: 'Company / account' }, { k: 'email', l: 'Email', type: 'email' },
    { k: 'phone', l: 'Phone', type: 'tel', ph: '+91 98xxx xxxxx' }, { k: 'source', l: 'Source', opts: SOURCES },
    { k: 'stage', l: 'Stage', opts: STAGES.map((s) => [s.k, s.l]) }, { k: 'value', l: 'Deal value (₹)', type: 'number', ph: '50000' },
    { k: 'followUp', l: 'Next follow-up', type: 'date' }, { k: 'closeDate', l: 'Expected close', type: 'date' },
    { k: 'owner', l: 'Owner', opts: people }, { k: 'notes', l: 'Notes', area: 1 }
  ];
  if (coll === 'activities') return [
    { k: 'title', l: 'What', req: 1, full: 1, ph: 'e.g. Call with Rohan about the quote' }, { k: 'type', l: 'Type', opts: ATYPES },
    { k: 'related', l: 'Contact or company' }, { k: 'date', l: 'Date', type: 'date', req: 1 }, { k: 'time', l: 'Time', type: 'time' },
    { k: 'owner', l: 'Owner', opts: people }, { k: 'done', l: 'Status', opts: [['false', 'Scheduled'], ['true', 'Completed']] },
    { k: 'notes', l: 'Notes', area: 1 }
  ];
  return [
    { k: 'title', l: 'Task', req: 1, full: 1 }, { k: 'account', l: 'Account' }, { k: 'assignee', l: 'Assignee', opts: people },
    { k: 'priority', l: 'Priority', opts: PRIOS }, { k: 'status', l: 'Status', opts: TSTAT.map((s) => [s.k, s.l]) },
    { k: 'due', l: 'Due date', type: 'date' }, { k: 'notes', l: 'Notes', area: 1 }
  ];
}

const TITLES = { contacts: 'contact', leads: 'deal', activities: 'activity', tasks: 'task' };

export function RecordModal() {
  const D = useData();
  const { form } = D;
  const [vals, setVals] = useState({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const firstRef = useRef(null);

  useEffect(() => {
    if (!form) return;
    const meId = D.me && D.me.id;
    const dflt = {
      stage: 'new', status: form.coll === 'tasks' ? 'todo' : 'Active', owner: meId, assignee: meId, type: 'Call',
      date: today(), source: 'Website', priority: 'Medium', done: 'false', segment: 'SMB', industry: 'Technology', ...form.preset
    };
    const v = {};
    for (const f of fieldsFor(form.coll, D.team)) {
      let x = form.record ? form.record[f.k] : dflt[f.k];
      if (f.k === 'done') x = String(form.record ? !!form.record.done : dflt.done === 'true' || dflt.done === true);
      if ((f.k === 'owner' || f.k === 'assignee') && !x) x = meId;
      v[f.k] = x ?? '';
    }
    setVals(v);
    setErr('');
    setBusy(false);
    setTimeout(() => firstRef.current && firstRef.current.focus(), 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  if (!form) return null;
  const fields = fieldsFor(form.coll, D.team);
  const word = TITLES[form.coll];

  const submit = async (e) => {
    e.preventDefault();
    const data = {};
    for (const f of fields) {
      let x = vals[f.k];
      if (f.type === 'number') x = x === '' ? 0 : Math.max(0, Number(x) || 0);
      else if (f.k === 'done') x = x === 'true';
      else x = typeof x === 'string' ? x.trim() : x;
      data[f.k] = x;
    }
    const missing = fields.find((f) => f.req && !data[f.k]);
    if (missing) return setErr(`Fill in “${missing.l}” to save.`);
    if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) return setErr('That email address looks incomplete. Check it and try again.');
    setBusy(true);
    const rec = await D.save(form.coll, form.record && form.record.id, data);
    setBusy(false);
    if (rec) {
      D.closeForm();
      D.toast(form.record ? 'Changes saved' : word[0].toUpperCase() + word.slice(1) + ' added');
    }
  };

  const del = () => {
    const rec = form.record;
    D.closeForm();
    D.confirm(`Delete ${rec.name || rec.title || 'this ' + word}?`, 'Delete ' + word, async () => {
      if (await D.remove(form.coll, rec.id)) D.toast(word[0].toUpperCase() + word.slice(1) + ' deleted');
    });
  };

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && D.closeForm()}>
      <form className="modal" onSubmit={submit} noValidate>
        <h2>{form.record ? 'Edit' : 'New'} {form.coll === 'leads' && !form.record ? 'lead / deal' : word}</h2>
        <div className="form">
          {fields.map((f, i) => {
            const id = 'f-' + f.k;
            const set = (x) => setVals((s) => ({ ...s, [f.k]: x }));
            let input;
            if (f.opts) {
              input = (
                <select id={id} ref={i === 0 ? firstRef : undefined} value={vals[f.k] ?? ''} onChange={(e) => set(e.target.value)}>
                  {f.opts.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{o}</option>))}
                </select>
              );
            } else if (f.area) {
              input = <textarea id={id} value={vals[f.k] ?? ''} onChange={(e) => set(e.target.value)} />;
            } else {
              input = (
                <input id={id} ref={i === 0 ? firstRef : undefined} type={f.type || 'text'} value={vals[f.k] ?? ''} placeholder={f.ph}
                  min={f.type === 'number' ? 0 : undefined} step={f.type === 'number' ? 1 : undefined} onChange={(e) => set(e.target.value)} />
              );
            }
            return (
              <div key={f.k} className={'field' + (f.area || f.full ? ' full' : '')}>
                <label htmlFor={id}>{f.l}{f.req ? ' *' : ''}</label>
                {input}
              </div>
            );
          })}
        </div>
        {form.record && form.coll === 'leads' && <AiAssist key={form.record.id} type="lead" id={form.record.id} />}
        {err && <p className="err">{err}</p>}
        <div className="modal-foot">
          {form.record && <button type="button" className="btn ghost" style={{ marginRight: 'auto', color: 'var(--bad)' }} onClick={del}>Delete</button>}
          <button type="button" className="btn" onClick={D.closeForm}>Cancel</button>
          <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Saving…' : form.record ? 'Save changes' : 'Add ' + word}</button>
        </div>
      </form>
    </div>
  );
}

export function ConfirmModal() {
  const D = useData();
  const [busy, setBusy] = useState(false);
  const c = D.confirmBox;
  if (!c) return null;
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && D.closeConfirm()}>
      <div className="modal" role="alertdialog" aria-labelledby="cft">
        <h2 id="cft">{c.text}</h2>
        <p className="hint" style={{ margin: 0 }}>This can’t be undone.</p>
        <div className="modal-foot">
          <button className="btn" onClick={D.closeConfirm}>Cancel</button>
          <button className="btn danger" autoFocus disabled={busy} onClick={async () => { setBusy(true); await c.onYes(); setBusy(false); D.closeConfirm(); }}>{c.label}</button>
        </div>
      </div>
    </div>
  );
}

export function Toast() {
  const { toastMsg } = useData();
  if (!toastMsg) return null;
  return <div className="toast" role="status">{toastMsg}</div>;
}
