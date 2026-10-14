import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext.jsx';
import Icon from '../components/Icon.jsx';
import { Avatar, Kpi, Select, Trend } from '../components/ui.jsx';
import { DonutBlock, LineChart } from '../components/Charts.jsx';
import { OPEN, STAGES, addDays, d10, fmtDate, inR, inr, inrShort, lastMonth, pct, rangeDates, sum, thisMonth, ym } from '../lib/utils.js';

export default function Deals() {
  const D = useData();
  const [owner, setOwner] = useState('all');
  const [range, setRange] = useState('all');
  const list = useMemo(() => D.leads.filter((l) => (owner === 'all' || l.owner === owner) && (range === 'all' || inR(l.createdAt, rangeDates(range)))), [D.leads, owner, range]);

  const open = list.filter((l) => OPEN.includes(l.stage));
  const won = list.filter((l) => l.stage === 'won');
  const lost = list.filter((l) => l.stage === 'lost');
  const pv = sum(open), wv = sum(won);
  const avg = won.length ? wv / won.length : open.length ? pv / open.length : 0;
  const tm = thisMonth(), lm = lastMonth();

  const moveStage = async (l, stage) => {
    if (await D.save('leads', l.id, { stage })) D.toast(`Moved to ${STAGES.find((s) => s.k === stage).l}`);
  };
  const convert = async (l) => {
    if (D.contacts.some((c) => c.name === l.name && (c.company || '') === (l.company || ''))) return D.toast(`${l.name} is already a contact.`);
    const rec = await D.save('contacts', null, { name: l.name, company: l.company, email: l.email, phone: l.phone, status: 'Active', segment: 'SMB', revenue: Number(l.value) || 0, notes: 'From deal: ' + (l.deal || '') });
    if (rec) D.toast(`${l.name} added to contacts`);
  };

  const sumParts = STAGES.filter((s) => s.k !== 'lost').map((s) => ({ l: s.l, c: s.c, n: sum(list.filter((l) => l.stage === s.k)) })).filter((p) => p.n);
  const totSum = sumParts.reduce((s, p) => s + p.n, 0) || 1;
  const days = [...Array(30)].map((_, i) => addDays(i - 29));
  const trendV = days.map((d) => sum(D.leads.filter((l) => OPEN.includes(l.stage) && d10(l.createdAt) <= d)));

  return (
    <>
      <div className="kpis">
        <Kpi title="Open Deals" value={open.length} trend={<Trend cur={open.filter((l) => ym(l.createdAt) === tm).length} prev={open.filter((l) => ym(l.createdAt) === lm).length} />} sub="vs last month" icon="brief" color="var(--accent)" />
        <Kpi title="Pipeline Value" value={inrShort(pv)} valueTitle={inr(pv)} sub="Open deals only" icon="rupee" color="var(--good)" />
        <Kpi title="Win Rate" value={pct(won.length, won.length + lost.length) + '%'} sub={`${won.length} won · ${lost.length} lost`} icon="trend" color="var(--purple)" />
        <Kpi title="Avg Deal Size" value={inrShort(avg)} valueTitle={inr(avg)} sub={won.length ? 'Won deals' : 'Open deals'} icon="bars" color="var(--gold)" />
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Sales Pipeline</h2>
          <div className="toolbar">
            <Select value={owner} onChange={setOwner} label="Owner" options={[['all', 'All Owners'], ...D.team.map((u) => [u.id, u.name])]} />
            <Select value={range} onChange={setRange} label="Period" options={[['all', 'All time'], ['month', 'This Month'], ['last30', 'Last 30 days'], ['quarter', 'This Quarter'], ['year', 'This Year']]} />
            <button className="btn primary" onClick={() => D.openForm('leads')}><Icon name="plus" />New Deal</button>
          </div>
        </div>
        <div className="board-wrap">
          <div className="board">
            {STAGES.map((s, i) => {
              const ls = list.filter((l) => l.stage === s.k);
              return (
                <section className="col" key={s.k} style={{ '--c': s.c }}>
                  <div className="col-head"><b>{i + 1}. {s.l}</b><span className="tn">{ls.length} deal{ls.length === 1 ? '' : 's'} • {inr(sum(ls))}</span></div>
                  {ls.length ? ls.map((l) => (
                    <div className="tile" key={l.id} role="button" tabIndex={0} onClick={() => D.openForm('leads', l)} onKeyDown={(e) => e.key === 'Enter' && D.openForm('leads', l)}>
                      <div className="nm">{l.deal || l.name}</div>
                      <div className="co">{l.company || l.name}</div>
                      <div className="row"><span className="val tn">{inr(l.value)}</span><span className="meta"><Icon name="cal" />{fmtDate(l.closeDate)}</span><Avatar name={D.userName(l.owner)} size="sm" /></div>
                      <select value={l.stage} onClick={(e) => e.stopPropagation()} onChange={(e) => moveStage(l, e.target.value)} aria-label="Move deal to stage">
                        {STAGES.map((x) => <option key={x.k} value={x.k}>{x.k === l.stage ? 'Stage: ' : 'Move to '}{x.l}</option>)}
                      </select>
                      {l.stage === 'won' && <button className="btn sm" onClick={(e) => { e.stopPropagation(); convert(l); }}>Add as contact</button>}
                    </div>
                  )) : <p className="empty">No deals</p>}
                  <button className="add-tile" onClick={() => D.openForm('leads', null, { stage: s.k })}>+ Add Deal</button>
                </section>
              );
            })}
          </div>
        </div>
      </section>

      <div className="grid2">
        <section className="card">
          <h2>Pipeline Summary</h2>
          {sumParts.length ? <DonutBlock parts={sumParts} center={inrShort(totSum)} sub="total value" fmt={(p) => <>{inrShort(p.n)} <small>{Math.round((p.n / totSum) * 100)}%</small></>} /> : <p className="empty">No deal value yet.</p>}
        </section>
        <section className="card">
          <h2>Pipeline Trend <span className="pill">Last 30 days</span></h2>
          <LineChart labels={days.map((d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }))} series={[{ v: trendV, c: 'var(--accent)' }]} area h={230} />
        </section>
      </div>
    </>
  );
}
