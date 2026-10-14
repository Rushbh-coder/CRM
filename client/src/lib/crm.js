// Business logic computed in the browser from the loaded records.
import { OPEN, today, addDays, d10 } from './utils.js';

// Most recent completed activity that mentions this person or company.
export function lastContact(l, activities) {
  let best = l.lastContacted || '';
  const n = (l.name || '').toLowerCase();
  const c = (l.company || '').toLowerCase();
  for (const a of activities) {
    if (!a.done) continue;
    const r = ((a.related || '') + ' ' + (a.title || '')).toLowerCase();
    if ((n && r.includes(n)) || (c && r.includes(c))) {
      const s = a.date + 'T' + (a.time || '00:00');
      if (s > best) best = s;
    }
  }
  return best || l.createdAt || '';
}

export function contactLast(c, activities) {
  let best = null;
  const n = (c.name || '').toLowerCase();
  const co = (c.company || '').toLowerCase();
  for (const a of activities) {
    const r = ((a.related || '') + ' ' + (a.title || '')).toLowerCase();
    if ((n && r.includes(n)) || (co && r.includes(co))) {
      if (!best || a.date + a.time > best.date + best.time) best = a;
    }
  }
  return best;
}

// Lead score 0–100 from stage, deal size, source and recent contact.
export function score(l, activities) {
  let s = { new: 30, contacted: 45, qualified: 65, proposal: 80, won: 100, lost: 10 }[l.stage] ?? 30;
  const v = Number(l.value) || 0;
  if (l.stage !== 'won' && l.stage !== 'lost') {
    s += v >= 200000 ? 10 : v >= 100000 ? 6 : v >= 50000 ? 3 : 0;
    if (l.source === 'Referral') s += 5;
    if (l.followUp && l.followUp < today()) s -= 8;
    const lc = d10(lastContact(l, activities));
    if (lc && lc >= addDays(-7)) s += 5;
  }
  return Math.max(0, Math.min(100, s));
}
export const scoreColor = (s) => (s >= 75 ? 'var(--good)' : s >= 60 ? 'var(--c-amber)' : s >= 45 ? 'var(--warn)' : 'var(--bad)');

// Accounts are built from the company names on contacts and deals.
export function buildAccounts(contacts, leads) {
  const m = new Map();
  const get = (n) => {
    const k = n.trim().toLowerCase();
    if (!m.has(k)) m.set(k, { name: n.trim(), industry: '', segment: '', contacts: [], open: 0, openVal: 0, value: 0, owner: '', status: new Set() });
    return m.get(k);
  };
  contacts.forEach((c) => {
    if (!c.company) return;
    const a = get(c.company);
    a.contacts.push(c);
    a.value += Number(c.revenue) || 0;
    a.industry = a.industry || c.industry || '';
    a.segment = a.segment || c.segment || '';
    a.owner = a.owner || c.owner || '';
    a.status.add(c.status || 'Active');
  });
  leads.forEach((l) => {
    if (!l.company) return;
    const a = get(l.company);
    if (OPEN.includes(l.stage)) { a.open++; a.openVal += Number(l.value) || 0; }
    if (l.stage === 'won' && !a.contacts.some((c) => c.name === l.name)) a.value += Number(l.value) || 0;
    a.owner = a.owner || l.owner || '';
  });
  return [...m.values()].map((a) => {
    const st = a.status;
    a.health = st.has('VIP') ? 'Excellent' : st.has('Inactive') && !a.open ? 'At Risk' : a.open || a.value ? 'Good' : 'Neutral';
    a.segment = a.segment || 'Other';
    return a;
  });
}

// Everything that belongs on the calendar.
export function calEvents(activities, tasks, leads) {
  const ev = [];
  activities.forEach((a) => ev.push({ date: a.date, time: a.time || '', type: a.type || 'Call', title: a.title, sub: a.related || '', done: !!a.done, ref: ['activities', a.id] }));
  tasks.filter((t) => t.due && t.status !== 'done').forEach((t) => ev.push({ date: t.due, time: '', type: 'Deadline', title: t.title, sub: t.account || '', done: false, ref: ['tasks', t.id] }));
  leads.filter((l) => OPEN.includes(l.stage) && l.followUp).forEach((l) => ev.push({ date: l.followUp, time: '', type: 'Reminder', title: 'Follow up: ' + l.name, sub: l.company || '', done: false, ref: ['leads', l.id] }));
  return ev.sort((a, b) => (a.date + (a.time || '99')).localeCompare(b.date + (b.time || '99')));
}

export function dueItems(activities, tasks, leads) {
  const t = today();
  const out = [];
  tasks.filter((x) => x.status !== 'done' && x.due && x.due <= t).forEach((x) => out.push({ t: 'Task', title: x.title, date: x.due, view: '/tasks', over: x.due < t }));
  activities.filter((a) => !a.done && a.date <= t).forEach((a) => out.push({ t: a.type, title: a.title, date: a.date, time: a.time, view: '/activities', over: a.date < t }));
  leads.filter((l) => OPEN.includes(l.stage) && l.followUp && l.followUp <= t).forEach((l) => out.push({ t: 'Follow-up', title: 'Follow up with ' + l.name, date: l.followUp, view: '/leads', over: l.followUp < t }));
  return out;
}
