import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext.jsx';
import Icon from '../components/Icon.jsx';
import { ActIcon, Avatar, Kpi, RowMenu, SearchBox, Select } from '../components/ui.jsx';
import { calEvents } from '../lib/crm.js';
import { ACOL, ATYPES, addDays, fmtTime, matches, nowTime, pct, relDay, today } from '../lib/utils.js';

export default function Activities() {
  const D = useData();
  const nav = useNavigate();
  const [f, setF] = useState({ type: 'all', status: 'all', owner: 'all' });
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(10);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const t = today(), wk = addDays(-6);

  const A = useMemo(() => D.activities
    .filter((a) => (f.type === 'all' || a.type === f.type) && (f.status === 'all' || (f.status === 'done' ? a.done : !a.done)) && (f.owner === 'all' || a.owner === f.owner) && matches(q, a, ['title', 'related', 'notes', 'type']))
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)), [D.activities, f, q]);

  const week = D.activities.filter((a) => a.date >= wk && a.date <= t);
  const doneW = week.filter((a) => a.done).length;
  const ups = calEvents(D.activities, D.tasks, D.leads).filter((e) => !e.done && e.date >= t).slice(0, 5);
  const emailsSent = D.activities.filter((a) => a.type === 'Email' && a.done).length;

  const toggle = async (a) => { if (await D.save('activities', a.id, { done: !a.done })) D.toast(a.done ? 'Marked as scheduled' : 'Marked as completed'); };

  let lastDay = '';
  return (
    <>
      <div className="kpis">
        <Kpi title="Calls Today" value={D.activities.filter((a) => a.type === 'Call' && a.date === t).length} sub="Logged or scheduled" icon="phone" color="var(--good)" />
        <Kpi title="Meetings Scheduled" value={D.activities.filter((a) => ['Meeting', 'Demo'].includes(a.type) && !a.done && a.date >= t).length} sub="Upcoming meetings & demos" icon="cal" color="var(--purple)" />
        <Kpi title="Emails Sent" value={emailsSent} sub="Logged email activities" icon="mail" color="var(--accent)" />
        <Kpi title="Completed Activities" value={D.activities.filter((a) => a.done).length} sub={`${doneW} in the last 7 days`} icon="checkc" color="var(--good)" />
      </div>

      <div className="split">
        <section className="card">
          <div className="toolbar" style={{ marginBottom: 16 }}>
            <Select value={f.type} onChange={set('type')} label="Activity type" options={[['all', 'All Types'], ...ATYPES]} />
            <Select value={f.status} onChange={set('status')} label="Status" options={[['all', 'All Activities'], ['done', 'Completed'], ['open', 'Scheduled']]} />
            <Select value={f.owner} onChange={set('owner')} label="Owner" options={[['all', 'All Owners'], ...D.team.map((u) => [u.id, u.name])]} />
            <SearchBox value={q} onChange={setQ} placeholder="Search activities…" />
            <button className="btn primary" onClick={() => D.openForm('activities', null, { done: 'true', time: nowTime() })}><Icon name="plus" />Log Activity</button>
          </div>
          <div className="card-head" style={{ marginBottom: 8 }}><h2>Activity Timeline</h2><span className="hint">Newest first · {A.length} activities</span></div>
          <div className="timeline">
            {A.length ? A.slice(0, limit).map((a) => {
              const label = a.date !== lastDay ? <div className="daylabel">{relDay(a.date)}</div> : null;
              lastDay = a.date;
              return (
                <div key={a.id}>
                  {label}
                  <div className="tl">
                    <div className="time">{a.time ? fmtTime(a.time) : '—'}</div>
                    <i className="bullet" style={{ background: ACOL[a.type] }} />
                    <ActIcon type={a.type} />
                    <div className="box">
                      <div className="tx">
                        <b>{a.title}</b>{' '}
                        <span className={'pill ' + (a.done ? 'p-good' : a.date < t ? 'p-bad' : 'p-blue')}>{a.done ? 'Completed' : a.date < t ? 'Overdue' : 'Scheduled'}</span>
                        {a.notes && <p>{a.notes}</p>}
                        {a.related && <div className="acc" style={{ fontSize: 13.5, marginTop: 3 }}>{a.related}</div>}
                      </div>
                      <span className="owner"><Avatar name={D.userName(a.owner)} size="sm" />{D.userName(a.owner)}</span>
                      <RowMenu items={[
                        { label: 'Edit', icon: 'edit', onClick: () => D.openForm('activities', a) },
                        { label: a.done ? 'Mark as scheduled' : 'Mark as completed', icon: 'check', onClick: () => toggle(a) },
                        { label: 'Delete', icon: 'trash', danger: true, onClick: () => D.confirm(`Delete “${a.title}”?`, 'Delete activity', async () => { if (await D.remove('activities', a.id)) D.toast('Activity deleted'); }) }
                      ]} />
                    </div>
                  </div>
                </div>
              );
            }) : <p className="empty">No activities match. Click “Log Activity” to record a call, meeting or note.</p>}
          </div>
          {A.length > limit && <div style={{ textAlign: 'center', marginTop: 8 }}><button className="btn outline" onClick={() => setLimit((n) => n + 10)}>Load More Activities <Icon name="down" /></button></div>}
        </section>

        <div className="side-col">
          <section className="card">
            <h2>Upcoming Follow-ups</h2>
            <div className="acts">
              {ups.length ? ups.map((e, i) => (
                <div className="act" key={i}><ActIcon type={e.type} /><div className="tx"><b>{e.title}</b><span className="acc">{e.sub}</span><br /><span>{relDay(e.date)}{e.time ? ', ' + fmtTime(e.time) : ''}</span></div></div>
              )) : <p className="empty">Nothing coming up.</p>}
            </div>
            <div className="foot-link"><button className="link" onClick={() => nav('/calendar')}>View Calendar</button></div>
          </section>
          <section className="card">
            <h2>Activity Summary <span className="pill">Last 7 days</span></h2>
            <div className="kv">
              <div><span>Total Activities</span><span className="tn">{week.length}</span></div>
              <div><span>Completed</span><span className="tn" style={{ color: 'var(--good)' }}>{doneW} ({Math.round(pct(doneW, week.length))}%)</span></div>
              <div><span>Pending</span><span className="tn" style={{ color: 'var(--warn)' }}>{week.length - doneW}</span></div>
              {['Call', 'Email', 'Meeting', 'Demo', 'Note'].map((k) => <div key={k}><span>{k}s</span><span className="tn">{week.filter((a) => a.type === k).length}</span></div>)}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
