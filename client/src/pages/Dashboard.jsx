import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext.jsx';
import { Kpi, Trend, ActIcon, Avatar, StagePill } from '../components/ui.jsx';
import { DonutBlock, Funnel } from '../components/Charts.jsx';
import { buildAccounts, calEvents } from '../lib/crm.js';
import { OPEN, PAL, STAGES, addDays, fmtDate, fmtTime, inr, inrShort, lastMonth, relDay, sum, thisMonth, today, ym } from '../lib/utils.js';

export default function Dashboard() {
  const D = useData();
  const nav = useNavigate();
  const L = D.leads;
  const tm = thisMonth(), lm = lastMonth(), t = today();
  const open = L.filter((l) => OPEN.includes(l.stage));
  const won = L.filter((l) => l.stage === 'won');
  const rev = sum(won);
  const cnt = (a, f, m) => a.filter((x) => ym(x[f]) === m).length;
  const vsum = (a, f, m) => sum(a.filter((x) => ym(x[f]) === m));
  const idx = (k) => STAGES.findIndex((s) => s.k === k);
  const fRows = STAGES.slice(0, 5).map((s, i) => ({ ...s, n: L.filter((l) => (l.stage === 'lost' ? i === 0 : idx(l.stage) >= i)).length }));

  const parts = useMemo(() => {
    const src = {};
    L.forEach((l) => { const k = l.source || 'Other'; src[k] = (src[k] || 0) + 1; });
    return Object.entries(src).sort((a, b) => b[1] - a[1]).map(([l, n], i) => ({ l, n, c: PAL[i % PAL.length] }));
  }, [L]);
  const ups = calEvents(D.activities, D.tasks, L).filter((e) => !e.done && e.date >= addDays(-14)).slice(0, 5);
  const top = buildAccounts(D.contacts, L).sort((a, b) => b.value - a.value).slice(0, 5);

  return (
    <>
      <div className="kpis">
        <Kpi title="Total Leads" value={L.length} trend={<Trend cur={cnt(L, 'createdAt', tm)} prev={cnt(L, 'createdAt', lm)} />} sub="vs last month" icon="users" color="var(--purple)" />
        <Kpi title="Open Deals" value={open.length} trend={<Trend cur={cnt(open, 'createdAt', tm)} prev={cnt(open, 'createdAt', lm)} />} sub="vs last month" icon="brief" color="var(--accent)" />
        <Kpi title="Total Revenue" value={inrShort(rev)} valueTitle={inr(rev)} trend={<Trend cur={vsum(won, 'wonAt', tm)} prev={vsum(won, 'wonAt', lm)} />} sub="vs last month" icon="rupee" color="var(--good)" />
        <Kpi title="Won Deals" value={won.length} trend={<Trend cur={cnt(won, 'wonAt', tm)} prev={cnt(won, 'wonAt', lm)} />} sub="vs last month" icon="trophy" color="var(--gold)" />
      </div>

      <div className="row3">
        <section className="card">
          <div className="card-head"><h2>Sales Pipeline</h2><button className="link" onClick={() => nav('/deals')}>Open deals</button></div>
          <div className="funnel">
            <Funnel rows={fRows} />
            <ol>{fRows.map((r, i) => <li key={r.k}><span>{i + 1}. {r.l}</span><span className="tn">({r.n})</span></li>)}</ol>
          </div>
        </section>
        <section className="card">
          <h2>Deals by Source</h2>
          {parts.length ? <DonutBlock parts={parts} center={L.length} sub="leads" /> : <p className="empty">Add leads to see where they come from.</p>}
        </section>
        <section className="card">
          <h2>Upcoming Activities</h2>
          <div className="acts">
            {ups.length ? ups.map((a, i) => (
              <div className="act" key={i}>
                <ActIcon type={a.type} />
                <div className="tx"><b>{a.title}</b><span style={a.date < t ? { color: 'var(--bad)' } : undefined}>{a.date < t ? 'Overdue · ' : ''}{relDay(a.date)}{a.time ? ', ' + fmtTime(a.time) : ''}</span></div>
              </div>
            )) : <p className="empty">Nothing scheduled. Add an activity with the + button.</p>}
          </div>
          <div className="foot-link"><button className="link" onClick={() => nav('/calendar')}>View Calendar</button></div>
        </section>
      </div>

      <div className="row2">
        <section className="card">
          <h2>Recent Deals</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Deal Name</th><th>Account</th><th>Amount</th><th>Stage</th><th>Expected Close</th><th>Owner</th></tr></thead>
              <tbody>
                {L.length ? L.slice(0, 6).map((l) => (
                  <tr key={l.id} className="click" onClick={() => D.openForm('leads', l)}>
                    <td><span className="nm">{l.deal || '—'}</span><div className="sub">{l.name}</div></td>
                    <td className="acc">{l.company || '—'}</td>
                    <td className="tn">{inr(l.value)}</td>
                    <td><StagePill k={l.stage} /></td>
                    <td className="tn">{fmtDate(l.closeDate)}</td>
                    <td><Avatar name={D.userName(l.owner)} size="sm" /></td>
                  </tr>
                )) : <tr><td colSpan={6} className="empty" style={{ textAlign: 'center', padding: 28 }}>No deals yet. Add a lead to start your pipeline.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card">
          <h2>Top Customers</h2>
          {top.length ? <div className="kv">{top.map((a) => <div key={a.name}><span>{a.name}</span><span className="tn">{inr(a.value)}</span></div>)}</div> : <p className="empty">No customers yet.</p>}
          <div className="foot-link"><button className="link" onClick={() => nav('/accounts')}>View All Accounts</button></div>
        </section>
      </div>
    </>
  );
}
