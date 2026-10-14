import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import { ActIcon, Avatar } from './ui.jsx';
import { RecordModal, ConfirmModal, Toast } from './Modals.jsx';
import { useData } from '../context/DataContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { dueItems } from '../lib/crm.js';
import { fmtTime, relDay, stageOf, today, nowTime } from '../lib/utils.js';

export const NAV = [
  ['/', 'Dashboard', 'home'], ['/leads', 'Leads', 'shield'], ['/contacts', 'Contacts', 'users'], ['/accounts', 'Accounts', 'building'],
  ['/deals', 'Deals', 'deal'], ['/activities', 'Activities', 'activity'], ['/tasks', 'Tasks', 'task'], ['/calendar', 'Calendar', 'cal'],
  ['/reports', 'Reports', 'bars'], null, ['/automation', 'Email Automation', 'mail'], ['/settings', 'Settings', 'cog']
];

export default function Layout() {
  const D = useData();
  const { logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const [pop, setPop] = useState(null); // 'plus' | 'bell' | 'search'
  const [q, setQ] = useState('');

  const due = useMemo(() => dueItems(D.activities, D.tasks, D.leads), [D.activities, D.tasks, D.leads]);
  const badges = {
    '/leads': D.leads.filter((l) => l.stage === 'new').length,
    '/tasks': D.tasks.filter((t) => t.status !== 'done' && t.due && t.due <= today()).length
  };
  const current = NAV.find((n) => n && (n[0] === '/' ? loc.pathname === '/' : loc.pathname.startsWith(n[0])));
  const title = current ? current[1] : 'LeadBook';
  const sidebar = (D.appearance && D.appearance.sidebar) || 'navy';
  const brand = (D.settings && D.settings.businessName) || 'LeadBook';

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const hit = (r, ks) => ks.some((k) => String(r[k] || '').toLowerCase().includes(s));
    return [
      ...D.contacts.filter((c) => hit(c, ['name', 'company', 'email', 'phone', 'city'])).slice(0, 4).map((c) => ({ key: 'c' + c.id, name: c.name, sub: 'Contact' + (c.company ? ' · ' + c.company : ''), go: () => nav('/contacts?id=' + c.id) })),
      ...D.leads.filter((l) => hit(l, ['name', 'company', 'deal', 'email', 'phone'])).slice(0, 4).map((l) => ({ key: 'l' + l.id, name: l.name, sub: 'Deal · ' + stageOf(l.stage).l + (l.company ? ' · ' + l.company : ''), go: () => D.openForm('leads', l) })),
      ...D.tasks.filter((t) => hit(t, ['title', 'account'])).slice(0, 3).map((t) => ({ key: 't' + t.id, name: t.title, sub: 'Task' + (t.account ? ' · ' + t.account : ''), go: () => D.openForm('tasks', t) }))
    ];
  }, [q, D.contacts, D.leads, D.tasks, D, nav]);

  const go = (path) => { setOpen(false); nav(path); };
  const toggleMenu = () => (window.matchMedia('(max-width:900px)').matches ? setOpen((o) => !o) : setCollapsed((c) => !c));

  return (
    <div className={'app' + (collapsed ? ' collapsed' : '') + (open ? ' open' : '')} data-side={sidebar}>
      <aside className="side" aria-label="Main navigation">
        <div className="brand"><div className="logo"><Icon name="logo" /></div><span>{brand}</span></div>
        <nav className="nav">
          {NAV.map((n, i) => n === null ? <div key={'s' + i} className="sep" /> : (
            <NavLink key={n[0]} to={n[0]} end={n[0] === '/'} onClick={() => setOpen(false)}>
              <Icon name={n[2]} /><span>{n[1]}</span>{badges[n[0]] ? <span className="badge">{badges[n[0]]}</span> : null}
            </NavLink>
          ))}
        </nav>
        <div className="me" style={{ cursor: 'default' }}>
          <Avatar name={D.me ? D.me.name : ''} />
          <div className="who" style={{ flex: 1 }}><b>{D.me && D.me.name}</b><span>{D.me && D.me.email}</span></div>
          <button className="btn icon" style={{ color: 'var(--side-muted)' }} onClick={logout} title="Log out" aria-label="Log out"><Icon name="logout" /></button>
        </div>
      </aside>
      <div className="scrim" onClick={() => setOpen(false)} />
      <main>
        <header className="topbar">
          <button className="icon-btn" onClick={toggleMenu} aria-label="Toggle menu"><Icon name="menu" /></button>
          <h1>{title}</h1>
          <div className="gsearch">
            <Icon name="search" />
            <input type="search" placeholder="Search..." value={q} autoComplete="off" aria-label="Search contacts, deals and tasks"
              onChange={(e) => { setQ(e.target.value); setPop('search'); }} onFocus={() => setPop('search')} />
            {pop === 'search' && q.trim() && (
              <div className="pop">
                {results.length ? results.map((r) => (
                  <button key={r.key} onClick={() => { setPop(null); setQ(''); r.go(); }}>
                    <Avatar name={r.name} size="sm" /><span className="r"><b>{r.name}</b><span>{r.sub}</span></span>
                  </button>
                )) : <div className="none">Nothing matches that search.</div>}
              </div>
            )}
          </div>
          <div className="tools">
            <button className="icon-btn plus" onClick={() => setPop(pop === 'plus' ? null : 'plus')} aria-label="Add new"><Icon name="plus" /></button>
            {pop === 'plus' && (
              <div className="pop">
                <button onClick={() => { setPop(null); D.openForm('leads'); }}><Icon name="target" />New lead / deal</button>
                <button onClick={() => { setPop(null); D.openForm('contacts'); }}><Icon name="user" />New contact</button>
                <button onClick={() => { setPop(null); D.openForm('tasks'); }}><Icon name="task" />New task</button>
                <button onClick={() => { setPop(null); D.openForm('activities', null, { done: 'true', time: nowTime() }); }}><Icon name="activity" />Log activity</button>
                <button onClick={() => { setPop(null); D.openForm('activities', null, { type: 'Meeting' }); }}><Icon name="cal" />New calendar event</button>
              </div>
            )}
            <button className="icon-btn" onClick={() => setPop(pop === 'bell' ? null : 'bell')} aria-label="Notifications">
              <Icon name="bell" />{due.length > 0 && <span className="dot">{due.length > 9 ? '9+' : due.length}</span>}
            </button>
            {pop === 'bell' && (
              <div className="pop">
                <h4>Due now</h4>
                {due.length ? due.slice(0, 8).map((x, i) => (
                  <button key={i} onClick={() => { setPop(null); go(x.view); }}>
                    <ActIcon type={x.t === 'Task' ? 'Deadline' : x.t} />
                    <span className="r"><b>{x.title}</b><span style={x.over ? { color: 'var(--bad)' } : undefined}>{x.over ? 'Overdue · ' : ''}{relDay(x.date)}{x.time ? ', ' + fmtTime(x.time) : ''}</span></span>
                  </button>
                )) : <div className="none">You’re all caught up.</div>}
              </div>
            )}
            <button className="icon-btn hide-sm" onClick={() => go('/automation')} aria-label="Email automation"><Icon name="mail" /></button>
          </div>
        </header>
        {pop && <div style={{ position: 'fixed', inset: 0, zIndex: 25 }} onClick={() => setPop(null)} />}
        <div className="content">
          {D.loading ? <div className="card"><h2>Loading your CRM…</h2><p className="empty">Fetching contacts, deals, tasks and activities.</p></div>
            : D.loadError ? <div className="card"><h2>Couldn’t load your data</h2><p className="empty">{D.loadError}</p><button className="btn primary" onClick={D.reload}>Try again</button></div>
            : <Outlet />}
        </div>
      </main>
      <RecordModal />
      <ConfirmModal />
      <Toast />
    </div>
  );
}
