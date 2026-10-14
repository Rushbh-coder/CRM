import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import { useData } from '../context/DataContext.jsx';
import Icon from '../components/Icon.jsx';
import { Avatar } from '../components/ui.jsx';
import { COLORS, downloadFile, tstatOf, toCSV, stageOf } from '../lib/utils.js';
import { exportContacts, importContactsFile } from './Contacts.jsx';

const TABS = [['profile', 'Profile', 'user'], ['team', 'Team', 'users'], ['appearance', 'Appearance', 'palette'], ['email', 'Email & Business', 'mail'], ['security', 'Security', 'lock'], ['data', 'Data & System', 'db']];

export default function Settings() {
  const D = useData();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t[0] === params.get('tab')) ? params.get('tab') : 'profile';
  const setTab = (t) => setParams({ tab: t }, { replace: true });

  return (
    <div className="set-grid">
      <section className="card set-nav" aria-label="Settings sections">
        {TABS.map(([k, l, i]) => <button key={k} aria-current={tab === k ? 'page' : undefined} onClick={() => setTab(k)}><Icon name={i} />{l}</button>)}
      </section>
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {tab === 'profile' && <Profile />}
        {tab === 'team' && <Team />}
        {tab === 'appearance' && <Appearance />}
        {tab === 'email' && <Business />}
        {tab === 'security' && <Security />}
        {tab === 'data' && <DataSystem />}
      </div>
      <div className="side-col">
        <section className="card">
          <h2>Connected Apps</h2>
          <p className="desc">Services your CRM uses.</p>
          <div className="app-row"><div className="lg" style={{ background: '#EA4335' }}>M</div><div className="tx"><b>Email (SMTP)</b><span>{D.settings.sendingActive ? 'Sends your automated emails' : 'Set up in server/.env'}</span></div><span className={'pill ' + (D.settings.sendingActive ? 'p-good' : 'p-warn')}>{D.settings.sendingActive ? 'Active' : 'Off'}</span></div>
          <div className="app-row"><div className="lg" style={{ background: '#13AA52' }}><Icon name="db" /></div><div className="tx"><b>MongoDB</b><span>Your data is saved in your database</span></div><span className="pill p-good">Connected</span></div>
        </section>
        <section className="card">
          <h2>Your CRM</h2>
          <div className="kv">
            <div><span>Contacts</span><span className="tn">{D.contacts.length}</span></div>
            <div><span>Leads & deals</span><span className="tn">{D.leads.length}</span></div>
            <div><span>Tasks</span><span className="tn">{D.tasks.length}</span></div>
            <div><span>Activities</span><span className="tn">{D.activities.length}</span></div>
            <div><span>Team members</span><span className="tn">{D.team.length}</span></div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Profile() {
  const D = useData();
  const [f, setF] = useState({ name: D.me.name || '', email: D.me.email || '', phone: D.me.phone || '', title: D.me.title || 'Owner' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const save = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) return setErr('Enter your name.');
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setErr('That email address looks incomplete.');
    try {
      const { data } = await api.put('/auth/me', f);
      D.setMe(data.user);
      D.setTeam(D.team.map((u) => (u.id === data.user.id ? data.user : u)));
      setErr('');
      D.toast('Profile saved');
    } catch (e2) { setErr(errMsg(e2)); }
  };
  return (
    <section className="card">
      <form onSubmit={save} noValidate>
        <div className="card-head"><div><h2 style={{ margin: 0 }}>Profile Settings</h2><p className="hint" style={{ margin: '2px 0 0' }}>Your details appear as the owner of deals and in emails.</p></div><button className="btn primary" type="submit">Save Changes</button></div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Avatar name={f.name} size="lg" />
          <div className="form" style={{ flex: 1, minWidth: 240 }}>
            <div className="field"><label htmlFor="p-name">Full Name</label><input id="p-name" value={f.name} onChange={set('name')} /></div>
            <div className="field"><label htmlFor="p-email">Email Address</label><input id="p-email" type="email" value={f.email} onChange={set('email')} /></div>
            <div className="field"><label htmlFor="p-phone">Phone Number</label><input id="p-phone" type="tel" value={f.phone} onChange={set('phone')} placeholder="+91 98xxx xxxxx" /></div>
            <div className="field"><label htmlFor="p-title">Job Title</label>
              <select id="p-title" value={f.title} onChange={set('title')}>{['Owner', 'Founder', 'Sales Manager', 'Sales Executive', 'Account Manager', 'Marketing'].map((t) => <option key={t}>{t}</option>)}</select></div>
          </div>
        </div>
        {err && <p className="err" style={{ marginTop: 12 }}>{err}</p>}
      </form>
    </section>
  );
}

function Team() {
  const D = useData();
  const blank = { name: '', email: '', password: '', role: 'member', title: '' };
  const [f, setF] = useState(blank);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const add = async (e) => {
    e.preventDefault();
    if (!f.name || !f.email || !f.password) return setErr('Enter a name, email and a starting password.');
    if (f.password.length < 6) return setErr('Use a password with at least 6 characters.');
    try {
      const { data } = await api.post('/team', f);
      D.setTeam([...D.team, data]);
      setF(blank);
      setErr('');
      D.toast(data.name + ' added. They can log in with the email and password you set.');
    } catch (e2) { setErr(errMsg(e2)); }
  };
  const remove = (u) => D.confirm(`Remove ${u.name} from the team?`, 'Remove member', async () => {
    try { await api.delete('/team/' + u.id); D.setTeam(D.team.filter((x) => x.id !== u.id)); await D.reload(); D.toast(u.name + ' removed. Their records were moved to you.'); }
    catch (e2) { D.toast(errMsg(e2)); }
  });
  const setRole = async (u, role) => {
    try { const { data } = await api.put('/team/' + u.id, { role }); D.setTeam(D.team.map((x) => (x.id === u.id ? data : x))); D.toast('Role updated'); } catch (e2) { D.toast(errMsg(e2)); }
  };
  return (
    <section className="card">
      <h2>Team</h2>
      <p className="desc">Each team member gets their own login. They appear in Owner and Assignee lists and in the Reports team table.</p>
      <div>
        {D.team.map((u) => (
          <div className="team-row" key={u.id}>
            <Avatar name={u.name} />
            <div className="tx"><b style={{ fontWeight: 600 }}>{u.name}</b> {u.id === D.me.id && <span className="pill p-blue">You</span>}<div className="hint">{u.email}{u.title ? ' · ' + u.title : ''}</div></div>
            {u.role === 'owner' || !D.isAdmin || u.id === D.me.id
              ? <span className="pill role-badge">{u.role}</span>
              : <>
                <select className="sel-in" value={u.role} onChange={(e) => setRole(u, e.target.value)} aria-label={'Role for ' + u.name}><option value="member">Member</option><option value="admin">Admin</option></select>
                <button className="btn ghost sm" onClick={() => remove(u)}>Remove</button>
              </>}
          </div>
        ))}
      </div>
      {D.isAdmin && (
        <form onSubmit={add} noValidate style={{ marginTop: 18, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
          <h4 style={{ margin: '0 0 10px' }}>Add a team member</h4>
          <div className="form">
            <div className="field"><label htmlFor="t-name">Name</label><input id="t-name" value={f.name} onChange={set('name')} /></div>
            <div className="field"><label htmlFor="t-title">Job title</label><input id="t-title" value={f.title} onChange={set('title')} placeholder="e.g. Sales Executive" /></div>
            <div className="field"><label htmlFor="t-email">Email (their login)</label><input id="t-email" type="email" value={f.email} onChange={set('email')} /></div>
            <div className="field"><label htmlFor="t-pass">Starting password</label><input id="t-pass" type="text" value={f.password} onChange={set('password')} placeholder="At least 6 characters" /></div>
            <div className="field"><label htmlFor="t-role">Role</label><select id="t-role" value={f.role} onChange={set('role')}><option value="member">Member: works with records</option><option value="admin">Admin: can also change settings</option></select></div>
          </div>
          {err && <p className="err" style={{ marginTop: 10 }}>{err}</p>}
          <div className="modal-foot" style={{ justifyContent: 'flex-start', marginTop: 12 }}><button className="btn primary" type="submit"><Icon name="plus" />Add member</button></div>
        </form>
      )}
    </section>
  );
}

function Appearance() {
  const D = useData();
  const a = D.appearance || {};
  const cur = (a.color || '#2563EB').toUpperCase();
  const [custom, setCustom] = useState(a.color || '#2563EB');
  const saveA = async (patch, msg) => { if (await D.saveSettings({ appearance: { ...a, ...patch } })) D.toast(msg); };
  return (
    <section className="card">
      <h2>Appearance</h2>
      <p className="desc">Customize how your CRM looks. Changes are saved for everyone in your business.</p>
      {!D.isAdmin && <div className="notice" style={{ marginBottom: 12 }}>Only an owner or admin can change the appearance.</div>}
      <div className="pref"><div><b>Theme</b><span>Light, dark, or follow your device.</span></div>
        <div className="seg">{[['system', 'System'], ['light', 'Light'], ['dark', 'Dark']].map(([k, l]) => <button key={k} aria-pressed={(a.theme || 'system') === k} onClick={() => saveA({ theme: k }, 'Theme updated')}>{l}</button>)}</div></div>
      <div className="pref" style={{ flexWrap: 'wrap' }}><div><b>Primary Color</b><span>Used for buttons, links and the active menu item.</span></div>
        <div className="swatches">
          {COLORS.map(([n, c]) => <button key={c} className="sw" style={{ background: c }} aria-pressed={cur === c.toUpperCase()} title={n} aria-label={n} onClick={() => { setCustom(c); saveA({ color: c }, 'Color updated'); }} />)}
          <label className="color-in"><input type="color" value={custom} onChange={(e) => { setCustom(e.target.value); document.documentElement.style.setProperty('--accent', e.target.value); }} onBlur={() => custom !== a.color && saveA({ color: custom }, 'Color updated')} aria-label="Custom color" /><span className="tn">{custom.toUpperCase()}</span></label>
        </div></div>
      <div className="pref" style={{ flexDirection: 'column', alignItems: 'stretch' }}><div><b>Sidebar Style</b><span>Choose the menu color.</span></div>
        <div className="side-opts">{[['navy', 'Navy', '#0F1E3D'], ['midnight', 'Midnight', '#111827'], ['brand', 'Brand color', 'color-mix(in srgb,var(--accent) 62%,#050814)'], ['light', 'Light', 'var(--card)']].map(([k, l, c]) => (
          <button key={k} className="side-opt" aria-pressed={(a.sidebar || 'navy') === k} onClick={() => saveA({ sidebar: k }, 'Sidebar updated')}><span className="pv"><i style={{ background: c }} /><i style={{ background: 'var(--bg)' }} /></span>{l}</button>
        ))}</div></div>
      <div className="pref"><div><b>Date Format</b><span>How dates appear in tables and cards.</span></div>
        <select className="sel-in" value={a.dateFormat || 'DD MMM YYYY'} onChange={(e) => saveA({ dateFormat: e.target.value }, 'Date format updated')} aria-label="Date format">{['DD MMM YYYY', 'DD/MM/YYYY', 'MMM DD, YYYY'].map((f) => <option key={f}>{f}</option>)}</select></div>
      <div className="pref"><div><b>Reset</b><span>Go back to the default look.</span></div><button className="btn" onClick={() => { setCustom('#2563EB'); D.saveSettings({ appearance: { theme: 'system', color: '', sidebar: 'navy', dateFormat: 'DD MMM YYYY' } }).then((ok) => ok && D.toast('Appearance reset')); }}>Reset appearance</button></div>
    </section>
  );
}

function Business() {
  const D = useData();
  const s = D.settings;
  const [f, setF] = useState({ businessName: s.businessName || '', senderName: s.senderName || '', summaryEmail: s.summaryEmail || '' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = async (e) => {
    e.preventDefault();
    if (f.summaryEmail && !/^\S+@\S+\.\S+$/.test(f.summaryEmail)) return setErr('That email address looks incomplete. Check it and try again.');
    setErr('');
    if (await D.saveSettings(f)) D.toast('Settings saved');
  };
  return (
    <section className="card">
      <h2>Email & Business</h2>
      <p className="desc">Used in automated emails and shown at the top of the menu.</p>
      <form className="form" onSubmit={save} noValidate>
        <div className="field"><label htmlFor="s-biz">Business name</label><input id="s-biz" value={f.businessName} onChange={set('businessName')} placeholder="e.g. Acme Solutions" /></div>
        <div className="field"><label htmlFor="s-snd">Email signature name</label><input id="s-snd" value={f.senderName} onChange={set('senderName')} placeholder="e.g. Ravi Kumar" /></div>
        <div className="field full"><label htmlFor="s-em">Your email for the daily summary</label><input id="s-em" type="email" value={f.summaryEmail} onChange={set('summaryEmail')} placeholder="you@yourbusiness.com" /></div>
        {err && <p className="err full">{err}</p>}
        <div className="modal-foot full" style={{ justifyContent: 'flex-start' }}><button className="btn primary" type="submit" disabled={!D.isAdmin}>Save settings</button></div>
      </form>
    </section>
  );
}

function Security() {
  const D = useData();
  const [f, setF] = useState({ currentPassword: '', newPassword: '' });
  const [err, setErr] = useState('');
  const save = async (e) => {
    e.preventDefault();
    if (f.newPassword.length < 6) return setErr('Use a new password with at least 6 characters.');
    try { await api.put('/auth/password', f); setF({ currentPassword: '', newPassword: '' }); setErr(''); D.toast('Password changed'); } catch (e2) { setErr(errMsg(e2)); }
  };
  return (
    <section className="card">
      <h2>Change password</h2>
      <form className="form" onSubmit={save} noValidate>
        <div className="field"><label htmlFor="pw-cur">Current password</label><input id="pw-cur" type="password" autoComplete="current-password" value={f.currentPassword} onChange={(e) => setF((s) => ({ ...s, currentPassword: e.target.value }))} /></div>
        <div className="field"><label htmlFor="pw-new">New password</label><input id="pw-new" type="password" autoComplete="new-password" value={f.newPassword} onChange={(e) => setF((s) => ({ ...s, newPassword: e.target.value }))} /></div>
        {err && <p className="err full">{err}</p>}
        <div className="modal-foot full" style={{ justifyContent: 'flex-start' }}><button className="btn primary" type="submit">Change password</button></div>
      </form>
    </section>
  );
}

function DataSystem() {
  const D = useData();
  const fileRef = useRef(null);
  const exportLeads = () => {
    downloadFile('leads-and-deals.csv', toCSV([['deal', 'Deal'], ['name', 'Contact'], ['company', 'Company'], ['email', 'Email'], ['phone', 'Phone'], ['source', 'Source'], [(r) => stageOf(r.stage).l, 'Stage'], ['value', 'Value'], [(r) => D.userName(r.owner), 'Owner'], ['followUp', 'Follow-up'], ['closeDate', 'Expected close']], D.leads));
    D.toast('Exported ' + D.leads.length + ' leads');
  };
  const exportTasks = () => {
    downloadFile('tasks.csv', toCSV([['title', 'Task'], ['account', 'Account'], [(r) => D.userName(r.assignee), 'Assignee'], ['priority', 'Priority'], [(r) => tstatOf(r.status).l, 'Status'], ['due', 'Due']], D.tasks));
    D.toast('Exported ' + D.tasks.length + ' tasks');
  };
  return (
    <section className="card">
      <h2>Data & System</h2>
      <p className="desc">Move your data in and out of the CRM.</p>
      <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => { const f = e.target.files[0]; e.target.value = ''; if (f) importContactsFile(D, f); }} />
      <button className="data-row" onClick={() => fileRef.current.click()}><Icon name="upload" /><div className="tx"><b>Import Contacts</b><span>Upload a CSV with columns like name, company, email, phone, city.</span></div><Icon name="right" /></button>
      <button className="data-row" onClick={() => exportContacts(D)}><Icon name="download" /><div className="tx"><b>Export Contacts</b><span>Download all contacts as a CSV file.</span></div><Icon name="right" /></button>
      <button className="data-row" onClick={exportLeads}><Icon name="download" /><div className="tx"><b>Export Leads & Deals</b><span>Download all leads and deals as a CSV file.</span></div><Icon name="right" /></button>
      <button className="data-row" onClick={exportTasks}><Icon name="download" /><div className="tx"><b>Export Tasks</b><span>Download all tasks as a CSV file.</span></div><Icon name="right" /></button>
    </section>
  );
}
