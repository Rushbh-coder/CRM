import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext.jsx';
import Icon from '../components/Icon.jsx';
import { ActIcon, Avatar, Kpi, Person, PrioPill, Select } from '../components/ui.jsx';
import { DonutBlock } from '../components/Charts.jsx';
import { PRIOS, TSTAT, addDays, d10, fmtDate, pct, relDay, today, tstatOf } from '../lib/utils.js';

export default function Tasks() {
  const D = useData();
  const nav = useNavigate();
  const [tab, setTab] = useState('board');
  const [who, setWho] = useState('all');
  const [prio, setPrio] = useState('all');
  const t = today();
  const all = D.tasks;
  const T = useMemo(() => all.filter((x) => (who === 'all' || x.assignee === who) && (prio === 'all' || x.priority === prio)), [all, who, prio]);

  const over = all.filter((x) => x.status !== 'done' && x.due && x.due < t);
  const done = all.filter((x) => x.status === 'done');
  const done7 = done.filter((x) => d10(x.doneAt || x.updatedAt) >= addDays(-6)).length;
  const parts = TSTAT.map((s) => ({ l: s.l, c: s.c, n: all.filter((x) => (x.status || 'todo') === s.k).length }));
  const tot = all.length || 1;
  const upcoming = all.filter((x) => x.status !== 'done' && x.due && x.due >= t).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 4);

  const move = async (x, status) => { if (await D.save('tasks', x.id, { status })) D.toast('Moved to ' + tstatOf(status).l); };
  const late = (x) => x.status !== 'done' && x.due && x.due < t;

  const card = (x) => (
    <div className="tile" key={x.id} role="button" tabIndex={0} onClick={() => D.openForm('tasks', x)} onKeyDown={(e) => e.key === 'Enter' && D.openForm('tasks', x)}>
      <div className="nm" style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>{x.title}{x.status === 'done' && <Icon name="checkc" style={{ color: 'var(--good)' }} />}</div>
      <div className="row" style={{ justifyContent: 'flex-start' }}><Icon name="building" style={{ width: 14, height: 14 }} />{x.account || '—'}</div>
      <div className="row"><span className="who-cell" style={{ color: 'var(--ink)' }}><Avatar name={D.userName(x.assignee)} size="sm" />{D.userName(x.assignee)}</span><PrioPill p={x.priority} /></div>
      <div className="row" style={{ justifyContent: 'flex-start', color: late(x) ? 'var(--bad)' : undefined }}><Icon name="cal" style={{ width: 14, height: 14 }} />{fmtDate(x.due)}</div>
      <select value={x.status} onClick={(e) => e.stopPropagation()} onChange={(e) => move(x, e.target.value)} aria-label="Move task">
        {TSTAT.map((s) => <option key={s.k} value={s.k}>{s.k === x.status ? 'Status: ' : 'Move to '}{s.l}</option>)}
      </select>
    </div>
  );

  return (
    <>
      <div className="kpis">
        <Kpi title="Tasks Due Today" value={all.filter((x) => x.status !== 'done' && x.due === t).length} sub="Not done yet" icon="cal" color="var(--accent)" />
        <Kpi title="Overdue Tasks" value={over.length} sub="Past their due date" icon="alert" color="var(--bad)" />
        <Kpi title="Completed Tasks" value={done.length} sub={`${done7} in the last 7 days`} icon="check" color="var(--good)" />
        <Kpi title="Team Productivity" value={Math.round(pct(done.length, all.length)) + '%'} sub="Tasks completed" icon="users" color="var(--purple)" />
      </div>
      <div className="split">
        <section className="card">
          <div className="card-head" style={{ marginBottom: 0 }}>
            <div className="tabs" role="tablist" style={{ margin: 0, border: 0 }}>
              <button role="tab" aria-selected={tab === 'board'} onClick={() => setTab('board')}>Board</button>
              <button role="tab" aria-selected={tab === 'list'} onClick={() => setTab('list')}>List</button>
              <button role="tab" aria-selected={false} onClick={() => nav('/calendar')}>Calendar</button>
            </div>
            <div className="toolbar">
              <Select value={who} onChange={setWho} label="Assignee" options={[['all', 'All Assignees'], ...D.team.map((u) => [u.id, u.name])]} />
              <Select value={prio} onChange={setPrio} label="Priority" options={[['all', 'All Priorities'], ...PRIOS]} />
              <button className="btn primary" onClick={() => D.openForm('tasks')}><Icon name="plus" />New Task</button>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--line)', margin: '12px -20px 16px' }} />
          {tab === 'board' ? (
            <div className="board-wrap">
              <div className="board">
                {TSTAT.map((s) => {
                  const ls = T.filter((x) => (x.status || 'todo') === s.k);
                  return (
                    <section className="col" key={s.k} style={{ '--c': s.c }}>
                      <div className="col-head"><b><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><i style={{ width: 9, height: 9, borderRadius: '50%', background: s.c }} />{s.l}</span><span className="tn" style={{ color: 'var(--muted)', fontWeight: 500 }}>{ls.length}</span></b></div>
                      {ls.length ? ls.map(card) : <p className="empty">No tasks</p>}
                      <button className="add-tile" onClick={() => D.openForm('tasks', null, { status: s.k })}>+ Add Task</button>
                    </section>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="table-wrap" style={{ marginBottom: -20 }}>
              <table>
                <thead><tr><th style={{ width: 40 }} /><th>Task</th><th>Account</th><th>Assignee</th><th>Priority</th><th>Status</th><th>Due</th></tr></thead>
                <tbody>
                  {T.length ? T.map((x) => (
                    <tr key={x.id}>
                      <td><button className="check" aria-pressed={x.status === 'done'} aria-label="Mark done" onClick={() => move(x, x.status === 'done' ? 'todo' : 'done')}>{x.status === 'done' && <Icon name="check" />}</button></td>
                      <td><button className="link" style={{ color: x.status === 'done' ? 'var(--muted)' : 'var(--ink)', fontWeight: 500, textDecoration: x.status === 'done' ? 'line-through' : undefined }} onClick={() => D.openForm('tasks', x)}>{x.title}</button></td>
                      <td>{x.account || '—'}</td>
                      <td><Person name={D.userName(x.assignee)} /></td>
                      <td><PrioPill p={x.priority} /></td>
                      <td><span className="pill">{tstatOf(x.status).l}</span></td>
                      <td className="tn" style={{ color: late(x) ? 'var(--bad)' : undefined }}>{fmtDate(x.due)}</td>
                    </tr>
                  )) : <tr><td colSpan={7} className="empty" style={{ textAlign: 'center', padding: 28 }}>No tasks match.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <div className="side-col">
          <section className="card"><h2>Task Overview</h2><DonutBlock parts={parts} center={all.length} sub="tasks" fmt={(p) => <>{p.n} <small>({Math.round((p.n / tot) * 100)}%)</small></>} /></section>
          <section className="card">
            <h2>Overdue Tasks</h2>
            <div className="acts">
              {over.length ? over.slice(0, 4).map((x) => (
                <div className="act" key={x.id}><Avatar name={D.userName(x.assignee)} size="sm" /><div className="tx"><b>{x.title}</b><span>{x.account}</span><br /><span style={{ color: 'var(--bad)' }}>{fmtDate(x.due)}</span></div><PrioPill p={x.priority} /></div>
              )) : <p className="empty">Nothing overdue. Nice work.</p>}
            </div>
          </section>
          <section className="card">
            <div className="card-head"><h2>Upcoming Tasks</h2><button className="link" onClick={() => nav('/calendar')}>View Calendar</button></div>
            <div className="acts">
              {upcoming.length ? upcoming.map((x) => <div className="act" key={x.id}><ActIcon type="Deadline" /><div className="tx"><b>{x.title}</b><span>{relDay(x.due)}</span></div></div>) : <p className="empty">No upcoming tasks.</p>}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
