import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext.jsx';
import Icon from '../components/Icon.jsx';
import { ActIcon, Avatar, EmptyRow, Kpi, SearchBox, Select, usePaged } from '../components/ui.jsx';
import { DonutBlock } from '../components/Charts.jsx';
import { buildAccounts } from '../lib/crm.js';
import { PAL, d10, downloadFile, inr, inrShort, isoTime, matches, relDay, toCSV } from '../lib/utils.js';

const HEALTH = { Excellent: 'p-good', Good: 'p-blue', 'At Risk': 'p-warn', Neutral: '' };

export default function Accounts() {
  const D = useData();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('value');
  const A = useMemo(() => buildAccounts(D.contacts, D.leads), [D.contacts, D.leads]);
  const list = useMemo(() => A.filter((a) => matches(q, a, ['name', 'industry', 'segment'])).sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : b.value - a.value)), [A, q, sort]);
  const { rows, pager } = usePaged(list, [q, sort]);

  const key = A.filter((a) => a.health === 'Excellent' || a.segment === 'Enterprise');
  const opps = A.reduce((s, a) => s + a.open, 0);
  const potential = A.reduce((s, a) => s + a.value + a.openVal, 0);
  const seg = {};
  A.forEach((a) => { seg[a.segment] = (seg[a.segment] || 0) + 1; });
  const parts = Object.entries(seg).sort((a, b) => b[1] - a[1]).map(([l, n], i) => ({ l, n, c: PAL[i % PAL.length] }));
  const tot = A.length || 1;

  const recent = useMemo(() => {
    const out = [];
    D.activities.forEach((x) => {
      const txt = ((x.related || '') + ' ' + x.title).toLowerCase();
      const acc = A.find((a) => txt.includes(a.name.toLowerCase()));
      if (acc) out.push({ title: acc.name, sub: x.title, date: x.date, time: x.time, type: x.type });
    });
    D.contacts.filter((c) => c.company).forEach((c) => out.push({ title: c.company, sub: 'New contact added: ' + c.name, date: d10(c.createdAt), time: isoTime(c.createdAt), type: 'Note' }));
    return out.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 5);
  }, [D.activities, D.contacts, A]);

  const exportCSV = () => {
    downloadFile('accounts.csv', toCSV([['name', 'Account'], ['industry', 'Industry'], ['segment', 'Segment'], [(r) => r.contacts.length, 'Contacts'], ['open', 'Open deals'], ['value', 'Annual value'], ['health', 'Health']], list));
    D.toast('Exported ' + list.length + ' accounts');
  };

  return (
    <>
      <div className="kpis">
        <Kpi title="Total Accounts" value={A.length} sub="Companies in your CRM" icon="building" color="var(--purple)" />
        <Kpi title="Key Accounts" value={key.length} sub="VIP or Enterprise" icon="star" color="var(--accent)" />
        <Kpi title="Active Opportunities" value={opps} sub="Open deals" icon="target" color="var(--good)" />
        <Kpi title="Revenue Potential" value={inrShort(potential)} valueTitle={inr(potential)} sub="Revenue + open pipeline" icon="rupee" color="var(--gold)" />
      </div>
      <div className="split">
        <section className="card">
          <div className="card-head">
            <h2>All Accounts</h2>
            <div className="toolbar">
              <SearchBox value={q} onChange={setQ} placeholder="Search accounts…" />
              <Select value={sort} onChange={setSort} label="Sort accounts" options={[['value', 'Sort by value'], ['name', 'Sort by name']]} />
              <button className="btn" onClick={exportCSV}><Icon name="download" />Export</button>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Account Name</th><th>Industry</th><th>Owner</th><th>Contacts</th><th>Open Deals</th><th>Annual Value</th><th>Health</th></tr></thead>
              <tbody>
                {rows.length ? rows.map((a) => (
                  <tr key={a.name} className="click" onClick={() => nav('/contacts?company=' + encodeURIComponent(a.name))}>
                    <td><span className="who-cell"><Icon name="building" style={{ color: 'var(--muted)' }} /><span className="acc">{a.name}</span></span></td>
                    <td>{a.industry || '—'}</td>
                    <td><Avatar name={D.userName(a.owner)} size="sm" /></td>
                    <td className="tn">{a.contacts.length}</td>
                    <td className="tn acc">{a.open}</td>
                    <td className="tn">{inr(a.value)}</td>
                    <td><span className={'pill ' + HEALTH[a.health]}>{a.health}</span></td>
                  </tr>
                )) : <EmptyRow cols={7}>{A.length ? 'No accounts match this search.' : 'Accounts appear here automatically when you add a company name to a contact or deal.'}</EmptyRow>}
              </tbody>
            </table>
          </div>
          {pager}
        </section>
        <div className="side-col">
          <section className="card"><h2>Accounts by Segment</h2>{parts.length ? <DonutBlock parts={parts} center={A.length} sub="accounts" fmt={(p) => <>{Math.round((p.n / tot) * 100)}% <small>({p.n})</small></>} /> : <p className="empty">No accounts yet.</p>}</section>
          <section className="card">
            <h2>Recent Account Activity</h2>
            <div className="acts">
              {recent.length ? recent.map((r, i) => (
                <div className="act" key={i}><ActIcon type={r.type} /><div className="tx"><b>{r.title}</b><span>{r.sub}</span></div><span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{relDay(r.date)}</span></div>
              )) : <p className="empty">No activity yet.</p>}
            </div>
            <div className="foot-link"><button className="link" onClick={() => nav('/activities')}>View All Activities</button></div>
          </section>
        </div>
      </div>
    </>
  );
}
