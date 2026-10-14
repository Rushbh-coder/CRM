import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext.jsx';
import Icon from '../components/Icon.jsx';
import { Kpi } from '../components/ui.jsx';
import { calEvents } from '../lib/crm.js';
import { ACOL, addDays, fmtDate, fmtTime, nowTime, today, ymd } from '../lib/utils.js';

const weekStartOf = (d) => { const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() - x.getDay()); return ymd(x); };

export default function Calendar() {
  const D = useData();
  const nav = useNavigate();
  const t = today();
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [sel, setSel] = useState(t);
  const [mode, setMode] = useState('month');

  const E = useMemo(() => calEvents(D.activities, D.tasks, D.leads), [D.activities, D.tasks, D.leads]);
  const byDay = useMemo(() => { const m = {}; E.forEach((e) => (m[e.date] = m[e.date] || []).push(e)); return m; }, [E]);

  const ws = weekStartOf(t), we = addDays(6, ws);
  const wkE = E.filter((e) => e.date >= ws && e.date <= we);
  const meetToday = E.filter((e) => e.date === t && ['Meeting', 'Demo', 'Call'].includes(e.type) && !e.done);
  const next = meetToday.find((e) => e.time && e.time >= nowTime());

  const openEvent = (e) => {
    const [coll, id] = e.ref;
    const rec = D[coll].find((r) => r.id === id);
    if (rec) D.openForm(coll, rec);
  };
  const pickDay = (d) => { setSel(d); const x = new Date(d + 'T00:00:00'); setYm({ y: x.getFullYear(), m: x.getMonth() }); };
  const step = (dir) => {
    if (mode === 'month') { let m = ym.m + dir, y = ym.y; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } setYm({ y, m }); }
    else pickDay(addDays(7 * dir, sel));
  };
  const Ev = ({ e, asButton }) => {
    const inner = <><span className="et"><i />{e.time ? fmtTime(e.time) : e.type}</span><span className="en">{e.title}</span></>;
    return asButton
      ? <button className="ev" style={{ '--ec': ACOL[e.type], border: 0, textAlign: 'left', cursor: 'pointer', font: 'inherit', fontSize: 11.5 }} onClick={() => openEvent(e)}>{inner}</button>
      : <span className="ev" style={{ '--ec': ACOL[e.type] || 'var(--c-grey)' }}>{inner}</span>;
  };

  let grid;
  if (mode === 'month') {
    const first = new Date(ym.y, ym.m, 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    grid = (
      <div className="cal-wrap"><div className="cal">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div className="dow" key={d}>{d}</div>)}
        {[...Array(42)].map((_, i) => {
          const d = new Date(start); d.setDate(start.getDate() + i);
          const k = ymd(d), evs = byDay[k] || [];
          return (
            <button key={k} className={'day' + (d.getMonth() !== ym.m ? ' out' : '') + (k === t ? ' today' : '') + (k === sel ? ' sel' : '')} onClick={() => pickDay(k)}>
              <span className="n">{d.getDate()}</span>
              {evs.slice(0, 2).map((e, j) => <Ev key={j} e={e} />)}
              {evs.length > 2 && <span className="more">+{evs.length - 2} more</span>}
            </button>
          );
        })}
      </div></div>
    );
  } else {
    const s = weekStartOf(sel);
    grid = (
      <div className="cal-wrap"><div className="week">
        {[...Array(7)].map((_, i) => {
          const k = addDays(i, s), d = new Date(k + 'T00:00:00'), evs = byDay[k] || [];
          return (
            <div className="wd" key={k}>
              <div className="wh"><span>{d.toLocaleDateString('en-IN', { weekday: 'short' })}</span><b style={k === t ? { color: 'var(--accent)' } : undefined}>{d.getDate()}</b></div>
              {evs.length ? evs.map((e, j) => <Ev key={j} e={e} asButton />) : <span className="hint">—</span>}
              <button className="add-tile" style={{ fontSize: 12.5, padding: 2 }} onClick={() => D.openForm('activities', null, { date: k, type: 'Meeting' })}>+ Add</button>
            </div>
          );
        })}
      </div></div>
    );
  }
  const title = mode === 'month' ? new Date(ym.y, ym.m, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'Week of ' + fmtDate(weekStartOf(sel));
  const agenda = byDay[sel] || [];

  return (
    <>
      <div className="kpis">
        <Kpi title="Events This Week" value={wkE.length} sub={`${fmtDate(ws)} – ${fmtDate(we)}`} icon="cal" color="var(--accent)" />
        <Kpi title="Meetings Today" value={meetToday.length} sub={next ? 'Next: ' + fmtTime(next.time) : 'No more today'} icon="users" color="var(--good)" />
        <Kpi title="Demos Scheduled" value={wkE.filter((e) => e.type === 'Demo').length} sub="This week" icon="video" color="var(--purple)" />
        <Kpi title="Follow-ups" value={wkE.filter((e) => e.type === 'Reminder').length} sub={<span style={{ color: 'var(--warn)' }}>Due this week</span>} icon="checkc" color="var(--gold)" />
      </div>
      <div className="split">
        <section className="card">
          <div className="cal-head">
            <div className="cal-nav">
              <button className="btn icon" onClick={() => step(-1)} aria-label="Previous"><Icon name="left" /></button>
              <button className="btn icon" onClick={() => step(1)} aria-label="Next"><Icon name="right" /></button>
              <button className="btn sm" onClick={() => pickDay(t)}>Today</button>
            </div>
            <div className="t">{title}</div>
            <div className="toolbar">
              <div className="seg">
                <button aria-pressed={mode === 'month'} onClick={() => setMode('month')}>Month</button>
                <button aria-pressed={mode === 'week'} onClick={() => setMode('week')}>Week</button>
              </div>
              <button className="btn primary sm" onClick={() => D.openForm('activities', null, { date: sel, type: 'Meeting' })}><Icon name="plus" />Event</button>
            </div>
          </div>
          {grid}
        </section>
        <div className="side-col">
          <section className="card">
            <div className="card-head"><h2>Agenda</h2><button className="link" onClick={() => nav('/activities')}>View Full Agenda</button></div>
            <div className="hint" style={{ margin: '-8px 0 8px' }}>{new Date(sel + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
            <div className="agenda">
              {agenda.length ? agenda.map((e, i) => (
                <div className="ag" key={i}>
                  <span className="tm">{e.time ? fmtTime(e.time) : 'All day'}</span>
                  <i style={{ background: ACOL[e.type] }} />
                  <div>
                    <button className="link" style={{ color: 'var(--ink)', fontWeight: 500, textAlign: 'left' }} onClick={() => openEvent(e)}>{e.title}</button>
                    <span style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>{e.sub} <span className="pill" style={{ fontSize: 11 }}>{e.type}</span></span>
                  </div>
                </div>
              )) : <p className="empty">Nothing on this day.</p>}
            </div>
            <div className="foot-link"><button className="link" onClick={() => D.openForm('activities', null, { date: sel, type: 'Meeting' })}>+ Add New Event</button></div>
          </section>
          <section className="card">
            <h2>Event Types</h2>
            <div className="types">{['Call', 'Meeting', 'Demo', 'Email', 'Reminder', 'Deadline'].map((k) => <span key={k}><i style={{ background: ACOL[k] }} />{k}</span>)}</div>
            <p className="hint" style={{ margin: '12px 0 0' }}>Reminders are lead follow-up dates. Deadlines are task due dates.</p>
          </section>
        </div>
      </div>
    </>
  );
}
