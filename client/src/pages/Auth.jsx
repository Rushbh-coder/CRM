import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../api.js';

function Shell({ children }) {
  return (
    <div className="auth-page">
      <section className="auth-side">
        <div className="brand" style={{ padding: 0, border: 0 }}><div className="logo"><Icon name="logo" /></div>LeadBook <span>CRM</span></div>
        <div>
          <h1>Every customer, lead and follow-up in one place.</h1>
          <p>Track your pipeline, plan your day and let follow-up emails go out on their own.</p>
        </div>
        <ul>
          <li><Icon name="target" />Leads, deals and a visual sales pipeline</li>
          <li><Icon name="cal" />Calendar, tasks and activity timeline</li>
          <li><Icon name="mail" />Automatic follow-up and welcome emails</li>
          <li><Icon name="bars" />Reports and team performance</li>
        </ul>
      </section>
      <main className="auth-main">{children}</main>
    </div>
  );
}

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try { await login(email, password); } catch (e2) { setErr(errMsg(e2)); setBusy(false); }
  };
  return (
    <Shell>
      <form className="auth-card" onSubmit={submit} noValidate>
        <h2>Log in</h2>
        <div className="field"><label htmlFor="l-email">Email</label><input id="l-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div className="field"><label htmlFor="l-pass">Password</label><input id="l-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
        {err && <p className="err">{err}</p>}
        <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        <p className="hint" style={{ margin: 0 }}>New here? <Link to="/register">Create your CRM account</Link></p>
        <div className="demo-hint">Ran <code>npm run seed</code>? Log in with <b>demo@leadbook.test</b> / <b>demo1234</b>.</div>
      </form>
    </Shell>
  );
}

export function Register() {
  const { register } = useAuth();
  const [f, setF] = useState({ name: '', businessName: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    if (!f.name || !f.email || !f.password) return setErr('Fill in your name, email and a password.');
    if (f.password.length < 6) return setErr('Use a password with at least 6 characters.');
    setErr('');
    setBusy(true);
    try { await register(f); } catch (e2) { setErr(errMsg(e2)); setBusy(false); }
  };
  return (
    <Shell>
      <form className="auth-card" onSubmit={submit} noValidate>
        <h2>Create your CRM</h2>
        <div className="field"><label htmlFor="r-name">Your name</label><input id="r-name" value={f.name} onChange={set('name')} autoComplete="name" /></div>
        <div className="field"><label htmlFor="r-biz">Business name</label><input id="r-biz" value={f.businessName} onChange={set('businessName')} placeholder="e.g. Acme Solutions" /></div>
        <div className="field"><label htmlFor="r-email">Email</label><input id="r-email" type="email" value={f.email} onChange={set('email')} autoComplete="email" /></div>
        <div className="field"><label htmlFor="r-pass">Password</label><input id="r-pass" type="password" value={f.password} onChange={set('password')} autoComplete="new-password" /></div>
        {err && <p className="err">{err}</p>}
        <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        <p className="hint" style={{ margin: 0 }}>Already have an account? <Link to="/login">Log in</Link></p>
      </form>
    </Shell>
  );
}
