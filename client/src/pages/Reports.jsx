import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext.jsx';
import Icon from '../components/Icon.jsx';
import { Person, Select, Trend } from '../components/ui.jsx';
import { BarChart, DonutBlock, LineChart, Spark } from '../components/Charts.jsx';
import { PAL, STAGES, addDays, d10, downloadFile, fmtDate, inR, inr, inrShort, pct, prevRange, rangeDates, sum, today, toCSV } from '../lib/utils.js';

export default function Reports() {
  const D = useData();
  const [rk, setRk] = useState('month');
  const L = D.leads, C = D.contacts;
  const R = rangeDates(rk), P = prevRange(R);

  const wonIn = (r) => L.filter((l) => l.stage === 'won' && inR(l.wonAt || l.closeDate, r));
  const createdIn = (r) => L.filter((l) => inR(l.createdAt, r));
  const revC = sum(wonIn(R)), revP = sum(wonIn(P));
  const convC = pct(wonIn(R).length, createdIn(R).length || L.length), convP = pct(wonIn(P).length, createdIn(P).length);
  const avgC = wonIn(R).length ? revC / wonIn(R).length : 0, avgP = wonIn(P).length ? revP / wonIn(P).length : 0;
  const ret = pct(C.filter((c) => c.status !== 'Inactive').length, C.length);
  const weeks = (fn) => [...Array(8)].map((_, i) => fn([addDays(-7 * (8 - i) + 1), addDays(-7 * (7 - i))]));

  const chart = useMemo(() => {
    const nd = Math.round((new Date(R[1]) - new Date(R[0])) / 864e5) + 1;
    const step = nd > 62 ? 7 : 1, N = Math.ceil(nd / step);
    const lbl = [], cur = [], prev = [];
    let ac = 0, ap = 0;
    for (let i = 0; i < N; i++) {
      const a = addDays(i * step, R[0]), b = addDays(Math.min(nd - 1, i * step + step - 1), R[0]);
      const pa = addDays(i * step, P[0]), pb = addDays(i * step + step - 1, P[0]);
      ac += sum(wonIn([a, b])); ap += sum(wonIn([pa, pb]));
      lbl.push(new Date(a + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
      cur.push(ac); prev.push(ap);
    }
    return { lbl, cur, prev };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L, rk]);

  const bars = STAGES.filter((s) => s.k !== 'lost').map((s) => ({ l: s.l, c: s.c, v: sum(L.filter((l) => l.stage === s.k)) }));
  const src = {};
  L.forEach((l) => { const k = l.source || 'Other'; src[k] = (src[k] || 0) + 1; });
  const parts = Object.entries(src).sort((a, b) => b[1] - a[1]).map(([l, n], i) => ({ l, n, c: PAL[i % PAL.length] }));

  const perf = D.team.map((u) => {
    const mine = L.filter((l) => l.owner === u.id);
    const w = mine.filter((l) => l.stage === 'won'), lo = mine.filter((l) => l.stage === 'lost');
    const rev = sum(w);
    const acts = D.activities.filter((a) => a.owner === u.id).length + D.tasks.filter((x) => x.assignee === u.id && x.status === 'done').length;
    const wk = weeks((r) => sum(mine.filter((l) => inR(l.createdAt, r))));
    return { u, won: w.length, rev, rate: pct(w.length, w.length + lo.length), avg: w.length ? rev / w.length : 0, acts, wk, any: mine.length || acts };
  }).filter((p) => p.any).sort((a, b) => b.rev - a.rev);

  const topStage = [...bars].sort((a, b) => b.v - a.v)[0];
  const ins = [];
  const rp = revP ? Math.round(((revC - revP) / revP) * 1000) / 10 : null;
  ins.push(['trend', 'var(--accent)', rp == null ? `Revenue this period is ${inr(revC)}.` : `Revenue is ${rp >= 0 ? 'up' : 'down'} ${Math.abs(rp)}% compared to the previous period.`]);
  ins.push(['users', 'var(--good)', `${convC}% of leads converted to won deals in this period.`]);
  if (topStage && topStage.v) ins.push(['trophy', 'var(--gold)', `The “${topStage.l}” stage holds the most value at ${inr(topStage.v)}.`]);
  if (perf[0] && perf[0].won) ins.push(['star', 'var(--purple)', `${perf[0].u.name} closed the most revenue (${inr(perf[0].rev)}).`]);
  const od = D.tasks.filter((x) => x.status !== 'done' && x.due && x.due < today()).length;
  if (od) ins.push(['alert', 'var(--bad)', `${od} task${od > 1 ? 's are' : ' is'} overdue. Check the Tasks page.`]);

  const cmp = `vs ${fmtDate(P[0])} – ${fmtDate(P[1])}`;
  const Card = ({ label, value, title, cur, prev, icon, color, spark, flat }) => (
    <div className="card">
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div className="kbadge" style={{ background: `color-mix(in srgb,${color} 14%,var(--card))`, color }}><Icon name={icon} /></div>
        <div><div style={{ fontWeight: 500 }}>{label}</div><div style={{ fontSize: 26, fontWeight: 700 }} className="tn" title={title}>{value}</div></div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8, marginTop: 10 }}>
        <div>{flat ? <span className="trend flat">{flat}</span> : <Trend cur={cur} prev={prev} />}<div className="hint">{flat ? 'Current' : cmp}</div></div>
        <Spark vals={spark} color={color} />
      </div>
    </div>
  );

  const exportReport = () => {
    downloadFile('sales-report.csv', toCSV([['l', 'Stage'], [(r) => r.n, 'Deals'], [(r) => r.v, 'Value']],
      STAGES.map((s) => ({ l: s.l, n: L.filter((l) => l.stage === s.k).length, v: sum(L.filter((l) => l.stage === s.k)) }))));
    D.toast('Report exported');
  };

  return (
    <>
      <div className="toolbar">
        <Select value={rk} onChange={setRk} label="Report period" options={[['month', 'This Month'], ['last30', 'Last 30 days'], ['quarter', 'This Quarter'], ['year', 'This Year']]} />
        <span className="hint">{fmtDate(R[0])} – {fmtDate(R[1])}</span>
        <span style={{ flex: 1 }} />
        <button className="btn" onClick={exportReport}><Icon name="download" />Export Report</button>
      </div>
      <div className="kpis">
        <Card label="Revenue" value={inrShort(revC)} title={inr(revC)} cur={revC} prev={revP} icon="rupee" color="var(--purple)" spark={weeks((r) => sum(wonIn(r)))} />
        <Card label="Lead Conversion" value={convC + '%'} cur={convC} prev={convP} icon="users" color="var(--good)" spark={weeks((r) => wonIn(r).length)} />
        <Card label="Avg Deal Size" value={inrShort(avgC)} title={inr(avgC)} cur={avgC} prev={avgP} icon="trend" color="var(--accent)" spark={weeks((r) => sum(createdIn(r)))} />
        <Card label="Customer Retention" value={ret + '%'} icon="user" color="var(--gold)" flat="Active contacts" spark={weeks((r) => C.filter((c) => inR(d10(c.createdAt), r)).length)} />
      </div>
      <div className="row3">
        <section className="card">
          <h2>Revenue Over Time</h2>
          <div className="chart-legend"><span><i />This period</span><span><i className="dash" />Previous period</span></div>
          <LineChart labels={chart.lbl} series={[{ v: chart.prev, c: 'var(--accent)', dash: true }, { v: chart.cur, c: 'var(--accent)' }]} />
          <p className="hint" style={{ margin: '6px 0 0' }}>Cumulative won revenue.</p>
        </section>
        <section className="card"><h2>Pipeline Value by Stage</h2><BarChart items={bars} /></section>
        <section className="card"><h2>Deals by Source</h2>{parts.length ? <DonutBlock parts={parts} center={L.length} sub="total" /> : <p className="empty">No deals yet.</p>}</section>
      </div>
      <div className="row2">
        <section className="card">
          <h2>Sales Team Performance</h2>
          <div className="table-wrap" style={{ marginBottom: -20 }}>
            <table>
              <thead><tr><th>Sales Rep</th><th>Deals Won</th><th>Revenue</th><th>Win Rate</th><th>Avg. Deal Size</th><th>Activities</th><th>Trend</th></tr></thead>
              <tbody>
                {perf.length ? perf.map((p) => (
                  <tr key={p.u.id}>
                    <td><Person name={p.u.name} /></td><td className="tn">{p.won}</td><td className="tn">{inr(p.rev)}</td><td className="tn">{p.rate}%</td>
                    <td className="tn">{inr(p.avg)}</td><td className="tn">{p.acts}</td><td><Spark vals={p.wk} color={p.wk[7] >= p.wk[0] ? 'var(--good)' : 'var(--bad)'} /></td>
                  </tr>
                )) : <tr><td colSpan={7} className="empty" style={{ textAlign: 'center', padding: 24 }}>Add team members in Settings and assign deals to see performance.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card">
          <h2><Icon name="bulb" />Insights</h2>
          <div className="acts">
            {ins.map(([i, c, tx]) => (
              <div className="act" key={tx}><div className="ic" style={{ background: `color-mix(in srgb,${c} 14%,var(--card))`, color: c, borderRadius: '50%' }}><Icon name={i} /></div><div className="tx" style={{ fontSize: 14 }}>{tx}</div></div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
