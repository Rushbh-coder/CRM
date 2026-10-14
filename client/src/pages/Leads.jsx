import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext.jsx';
import Icon from '../components/Icon.jsx';
import { EmptyRow, Kpi, Person, RowMenu, SearchBox, Select, StagePill, Trend, usePaged } from '../components/ui.jsx';
import { DonutBlock } from '../components/Charts.jsx';
import { lastContact, score, scoreColor } from '../lib/crm.js';
import { SOURCES, STAGES, addDays, d10, downloadFile, fmtDate, fmtTime, isoTime, lastMonth, matches, nowTime, pct, stageOf, thisMonth, toCSV, ym } from '../lib/utils.js';

const SRC_IC = { Website: 'globe', Referral: 'user', 'Email Campaign': 'mail', LinkedIn: 'users', 'Trade Show': 'cal', WhatsApp: 'phone', 'Social Media': 'users', IndiaMART: 'building', 'Walk-in': 'user', Ads: 'trend' };
const NO_FILTER = { status: 'all', source: 'all', owner: 'all', range: 'all' };

export default function Leads() {
  const D = useData();
  const L = D.leads;
  const [q, setQ] = useState('');
  const [f, setF] = useState(NO_FILTER);
  const setFilter = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  const list = useMemo(() => L.filter((l) =>
    (f.status === 'all' || l.stage === f.status) &&
    (f.source === 'all' || (l.source || 'Other') === f.source) &&
    (f.owner === 'all' || l.owner === f.owner) &&
    (f.range === 'all' || d10(l.createdAt) >= addDays(-Number(f.range))) &&
    matches(q, l, ['name', 'company', 'email', 'phone', 'deal', 'notes'])
  ), [L, f, q]);
  const { rows, pager } = usePaged(list, [q, f]);

  const tm = thisMonth(), lm = lastMonth();
  const cnt = (arr, m) => arr.filter((x) => ym(x.createdAt) === m).length;
  const qual = L.filter((l) => ['qualified', 'proposal', 'won'].includes(l.stage));
  const won = L.filter((l) => l.stage === 'won');
  const sources = new Set(L.map((l) => l.source || 'Other'));
  const statusParts = STAGES.map((s) => ({ l: s.l, n: L.filter((l) => l.stage === s.k).length, c: s.c })).filter((p) => p.n);
  const tot = L.length || 1;

  const exportCSV = () => {
    downloadFile('leads.csv', toCSV([
      ['deal', 'Deal'], ['name', 'Contact'], ['company', 'Company'], ['email', 'Email'], ['phone', 'Phone'], ['source', 'Source'],
      [(r) => stageOf(r.stage).l, 'Stage'], ['value', 'Value'], [(r) => score(r, D.activities), 'Score'], [(r) => D.userName(r.owner), 'Owner'],
      ['followUp', 'Follow-up'], ['closeDate', 'Expected close']
    ], list));
    D.toast('Exported ' + list.length + ' leads');
  };

  return (
    <>
      <div className="kpis">
        <Kpi title="New Leads" value={cnt(L, tm)} trend={<Trend cur={cnt(L, tm)} prev={cnt(L, lm)} />} sub="vs last month" icon="users" color="var(--purple)" />
        <Kpi title="Qualified Leads" value={qual.length} trend={<Trend cur={cnt(qual, tm)} prev={cnt(qual, lm)} />} sub="vs last month" icon="checkc" color="var(--good)" />
        <Kpi title="Conversion Rate" value={pct(won.length, L.length) + '%'} sub={`${won.length} won of ${L.length} leads`} icon="trend" color="var(--accent)" />
        <Kpi title="Lead Sources" value={sources.size} sub="Active sources" icon="pie" color="var(--gold)" />
      </div>

      <div className="split wide">
        <section className="card">
          <div className="toolbar">
            <SearchBox value={q} onChange={setQ} placeholder="Search leads…" />
            <button className="btn" onClick={() => D.openForm('leads')}><Icon name="plus" />Add lead</button>
          </div>
          <div className="filters">
            <label>Status<Select value={f.status} onChange={setFilter('status')} options={[['all', 'All Statuses'], ...STAGES.map((s) => [s.k, s.l])]} /></label>
            <label>Source<Select value={f.source} onChange={setFilter('source')} options={[['all', 'All Sources'], ...SOURCES]} /></label>
            <label>Owner<Select value={f.owner} onChange={setFilter('owner')} options={[['all', 'All Owners'], ...D.team.map((u) => [u.id, u.name])]} /></label>
            <label>Date added<Select value={f.range} onChange={setFilter('range')} options={[['all', 'Any time'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days']]} /></label>
          </div>
          <div className="filter-foot">
            <button className="link" onClick={() => { setF(NO_FILTER); setQ(''); }}>Clear Filters</button>
            <div className="r"><span className="tn">{list.length} results</span><button className="btn" onClick={exportCSV}><Icon name="download" />Export</button></div>
          </div>
        </section>
        <section className="card">
          <h2>Lead Status Distribution</h2>
          {statusParts.length ? <DonutBlock parts={statusParts} center={L.length} sub="leads" fmt={(p) => <>{p.n} <small>({Math.round((p.n / tot) * 100)}%)</small></>} /> : <p className="empty">No leads yet.</p>}
        </section>
      </div>

      <section className="card" style={{ paddingTop: 6 }}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Lead Name</th><th>Company</th><th>Source</th><th title="0–100, based on stage, deal size, source and recent contact">Score</th><th>Status</th><th>Owner</th><th>Last Contacted</th><th className="right">Actions</th></tr></thead>
            <tbody>
              {rows.length ? rows.map((l) => {
                const sc = score(l, D.activities);
                const lc = lastContact(l, D.activities);
                return (
                  <tr key={l.id}>
                    <td><button className="link" style={{ fontWeight: 500 }} onClick={() => D.openForm('leads', l)}>{l.name}</button><div className="sub">{l.email || l.phone}</div></td>
                    <td>{l.company || '—'}</td>
                    <td><span className="who-cell"><Icon name={SRC_IC[l.source] || 'globe'} style={{ color: 'var(--muted)' }} />{l.source || 'Other'}</span></td>
                    <td><span className="score tn" style={{ color: scoreColor(sc) }} title={`Lead score ${sc}/100`}>{sc}</span></td>
                    <td><StagePill k={l.stage} /></td>
                    <td><Person name={D.userName(l.owner)} /></td>
                    <td className="tn">{fmtDate(lc)}<div className="sub">{fmtTime(lc.length > 10 && lc.includes('T') && lc.length <= 16 ? lc.slice(11, 16) : isoTime(lc))}</div></td>
                    <td className="right">
                      <RowMenu items={[
                        { label: 'Edit', icon: 'edit', onClick: () => D.openForm('leads', l) },
                        { label: 'Log a call', icon: 'phone', onClick: () => D.openForm('activities', null, { type: 'Call', done: 'true', title: 'Call with ' + l.name, related: l.company || l.name, time: nowTime() }) },
                        { label: 'Schedule meeting', icon: 'cal', onClick: () => D.openForm('activities', null, { type: 'Meeting', title: 'Meeting with ' + l.name, related: l.company || l.name, date: addDays(1), time: '11:00' }) },
                        { label: 'Delete', icon: 'trash', danger: true, onClick: () => D.confirm(`Delete ${l.name}?`, 'Delete lead', async () => { if (await D.remove('leads', l.id)) D.toast('Lead deleted'); }) }
                      ]} />
                    </td>
                  </tr>
                );
              }) : <EmptyRow cols={8}>{L.length ? 'No leads match these filters.' : 'No leads yet. Click “Add lead” to add your first one.'}</EmptyRow>}
            </tbody>
          </table>
        </div>
        {pager}
      </section>
    </>
  );
}
