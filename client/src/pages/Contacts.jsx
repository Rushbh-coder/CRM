import { useMemo, useRef, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../context/DataContext.jsx';
import Icon from '../components/Icon.jsx';
import AiAssist from '../components/AiAssist.jsx';
import { ActIcon, Avatar, EmptyRow, Kpi, SearchBox, StagePill, StatusPill, Trend, usePaged } from '../components/ui.jsx';
import { contactLast } from '../lib/crm.js';
import { CSTATUS, OPEN, SEGMENTS, addDays, downloadFile, fmtDate, fmtTime, inr, lastMonth, matches, nowTime, parseCSV, pct, relDay, thisMonth, toCSV, ym } from '../lib/utils.js';

export function exportContacts(D) {
  downloadFile('contacts.csv', toCSV([
    ['name', 'Name'], ['title', 'Title'], ['company', 'Company'], ['email', 'Email'], ['phone', 'Phone'], ['city', 'City'],
    ['industry', 'Industry'], ['segment', 'Segment'], ['status', 'Status'], ['revenue', 'Revenue'], ['notes', 'Notes']
  ], D.contacts));
  D.toast('Exported ' + D.contacts.length + ' contacts');
}

export async function importContactsFile(D, file) {
  const rows = parseCSV(await file.text());
  if (rows.length < 2) return D.toast('That file has no rows to import.');
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (...ks) => head.findIndex((h) => ks.includes(h));
  const m = {
    name: col('name', 'full name', 'contact', 'contact name'), title: col('title', 'job title'), company: col('company', 'account', 'organisation', 'organization'),
    email: col('email', 'email address'), phone: col('phone', 'mobile', 'phone number'), city: col('city', 'location'), industry: col('industry'),
    segment: col('segment'), status: col('status'), revenue: col('revenue', 'value'), notes: col('notes')
  };
  if (m.name < 0) return D.toast('Add a “name” column to your CSV and try again.');
  const items = rows.slice(1).map((r) => Object.fromEntries(Object.entries(m).map(([k, i]) => [k, i >= 0 ? (r[i] || '').trim() : '']))).filter((r) => r.name);
  const n = await D.importContacts(items);
  if (n) D.toast(`Imported ${n} contact${n === 1 ? '' : 's'}`);
}

export default function Contacts() {
  const D = useData();
  const C = D.contacts;
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const [selId, setSelId] = useState(params.get('id'));
  const fileRef = useRef(null);

  useEffect(() => {
    const id = params.get('id');
    const company = params.get('company');
    if (id) setSelId(id);
    if (company) { setQ(company); setSelId(null); }
  }, [params]);

  const list = useMemo(() => C.filter((c) => (status === 'All' || (c.status || 'Active') === status) && matches(q, c, ['name', 'company', 'email', 'phone', 'city', 'title', 'notes'])), [C, q, status]);
  const { rows, pager } = usePaged(list, [q, status]);
  const tm = thisMonth(), lm = lastMonth();
  const active = C.filter((c) => c.status !== 'Inactive');
  const fuDue = D.leads.filter((l) => OPEN.includes(l.stage) && l.followUp && l.followUp <= addDays(7)).length;
  const sel = C.find((c) => c.id === selId);

  const pick = (id) => { setSelId(id); setParams(id ? { id } : {}, { replace: true }); };

  return (
    <>
      <div className="kpis">
        <Kpi title="Total Contacts" value={C.length} trend={<Trend cur={C.filter((c) => ym(c.createdAt) === tm).length} prev={C.filter((c) => ym(c.createdAt) === lm).length} />} sub="vs last month" icon="users" color="var(--purple)" />
        <Kpi title="Active Contacts" value={active.length} sub={`${pct(active.length, C.length)}% of all contacts`} icon="user" color="var(--good)" />
        <Kpi title="New This Month" value={C.filter((c) => ym(c.createdAt) === tm).length} sub="Added since the 1st" icon="plus" color="var(--accent)" />
        <Kpi title="Follow-ups Due" value={fuDue} sub="In the next 7 days" icon="clock" color="var(--gold)" />
      </div>

      <div className="split">
        <section className="card">
          <div className="card-head">
            <h2>All Contacts <span className="pill tn">{C.length}</span></h2>
            <div className="toolbar">
              <button className="btn" onClick={() => fileRef.current.click()}><Icon name="upload" />Import</button>
              <button className="btn" onClick={() => exportContacts(D)}><Icon name="download" />Export</button>
              <button className="btn primary" onClick={() => D.openForm('contacts')}><Icon name="plus" />Add Contact</button>
              <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => { const f = e.target.files[0]; e.target.value = ''; if (f) importContactsFile(D, f); }} />
            </div>
          </div>
          <div className="toolbar" style={{ marginBottom: 14 }}>
            <SearchBox value={q} onChange={setQ} placeholder="Search name, company, phone, city…" />
            <div className="seg" role="group" aria-label="Filter by status">
              {['All', ...CSTATUS].map((s) => <button key={s} aria-pressed={status === s} onClick={() => setStatus(s)}>{s}</button>)}
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Contact</th><th>Title</th><th>Company</th><th>Email</th><th>Phone</th><th>Tags</th><th>Last Interaction</th></tr></thead>
              <tbody>
                {rows.length ? rows.map((c) => {
                  const la = contactLast(c, D.activities);
                  return (
                    <tr key={c.id} className={'click' + (sel && sel.id === c.id ? ' sel' : '')} onClick={() => pick(c.id)}>
                      <td><span className="who-cell"><Avatar name={c.name} size="sm" /><span className="nm">{c.name}</span></span></td>
                      <td>{c.title || '—'}</td>
                      <td className="acc">{c.company || '—'}</td>
                      <td>{c.email || '—'}</td>
                      <td className="tn">{c.phone || '—'}</td>
                      <td><StatusPill s={c.status} /></td>
                      <td className="tn">{la ? relDay(la.date) : '—'}</td>
                    </tr>
                  );
                }) : <EmptyRow cols={7}>{C.length ? 'No contacts match this search.' : 'No contacts yet. Click “Add Contact” to create your first one.'}</EmptyRow>}
              </tbody>
            </table>
          </div>
          {pager}
        </section>
        <div className="side-col"><ContactPanel c={sel} onClose={() => pick(null)} /></div>
      </div>
    </>
  );
}

function ContactPanel({ c, onClose }) {
  const D = useData();
  if (!c) return <section className="card"><h2>Contact details</h2><p className="empty">Select a contact in the table to see their details, last interaction and notes.</p></section>;
  const la = contactLast(c, D.activities);
  const deals = D.leads.filter((l) => l.company && l.company === c.company);
  const copy = async () => {
    if (!c.email) return D.toast('This contact has no email address yet.');
    try { await navigator.clipboard.writeText(c.email); D.toast('Email copied: ' + c.email); } catch { D.toast(c.email); }
  };
  return (
    <section className="card detail" style={{ position: 'relative' }}>
      <button className="btn icon close-x" onClick={onClose} aria-label="Close details"><Icon name="x" /></button>
      <div className="top"><Avatar name={c.name} size="lg" /><div><h3>{c.name} <StatusPill s={c.status} /></h3><p>{c.title || 'Contact'}{c.company ? <> at <span className="acc">{c.company}</span></> : null}</p></div></div>
      <div className="qa">
        <button onClick={copy} title="Copy email" aria-label="Copy email"><Icon name="mail" /></button>
        <button onClick={() => D.openForm('activities', null, { type: 'Call', done: 'true', title: 'Call with ' + c.name, related: c.company || c.name, time: nowTime() })} title="Log a call" aria-label="Log a call"><Icon name="phone" /></button>
        <button onClick={() => D.openForm('activities', null, { type: 'Meeting', title: 'Meeting with ' + c.name, related: c.company || c.name, date: addDays(1), time: '11:00' })} title="Schedule a meeting" aria-label="Schedule a meeting"><Icon name="cal" /></button>
        <button onClick={() => D.openForm('contacts', c)} title="Edit contact" aria-label="Edit contact"><Icon name="edit" /></button>
        <button onClick={() => D.confirm(`Delete ${c.name}?`, 'Delete contact', async () => { if (await D.remove('contacts', c.id)) { onClose(); D.toast('Contact deleted'); } })} title="Delete contact" aria-label="Delete contact"><Icon name="trash" /></button>
      </div>
      <h4>About</h4>
      <div className="about">
        <span>Email</span><span>{c.email || '—'}</span><span>Phone</span><span className="tn">{c.phone || '—'}</span>
        <span>Location</span><span>{c.city || '—'}</span><span>Industry</span><span>{c.industry || '—'}</span>
        <span>Segment</span><span>{c.segment || '—'}</span><span>Revenue</span><span className="tn">{inr(c.revenue)}</span>
        <span>Owner</span><span>{D.userName(c.owner)}</span><span>Added</span><span>{fmtDate(c.createdAt)}</span>
      </div>
      <h4>Tags</h4>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <StatusPill s={c.status} />
        {c.segment && SEGMENTS.includes(c.segment) && <span className="pill p-purple">{c.segment}</span>}
        {c.industry && <span className="pill p-blue">{c.industry}</span>}
        {deals.some((d) => OPEN.includes(d.stage)) && <span className="pill p-gold">Open deal</span>}
      </div>
      <h4>Last Interaction</h4>
      {la ? <div className="act"><ActIcon type={la.type} /><div className="tx"><b>{la.title}</b><span>{relDay(la.date)}{la.time ? ' at ' + fmtTime(la.time) : ''} · {la.done ? 'Done' : 'Scheduled'}</span></div></div> : <p className="empty">No calls or meetings logged yet.</p>}
      {deals.length > 0 && <><h4>Deals</h4><div className="kv">{deals.map((d) => <div key={d.id}><span>{d.deal || d.name} <StagePill k={d.stage} /></span><span className="tn">{inr(d.value)}</span></div>)}</div></>}
      <h4>Notes</h4>
      <p style={{ margin: 0, fontSize: 13.5, whiteSpace: 'pre-wrap', color: c.notes ? 'var(--ink)' : 'var(--muted)' }}>{c.notes || 'No notes yet. Click the pencil to add some.'}</p>
      <AiAssist key={c.id} type="contact" id={c.id} />
    </section>
  );
}
