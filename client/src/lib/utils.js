// ---------- Constants shared by every screen ----------
export const STAGES = [
  { k: 'new', l: 'New', c: 'var(--c-blue)' },
  { k: 'contacted', l: 'Contacted', c: 'var(--c-green)' },
  { k: 'qualified', l: 'Qualified', c: 'var(--c-amber)' },
  { k: 'proposal', l: 'Proposal Sent', c: 'var(--c-purple)' },
  { k: 'won', l: 'Won', c: 'var(--c-red)' },
  { k: 'lost', l: 'Lost', c: 'var(--c-grey)' }
];
export const OPEN = ['new', 'contacted', 'qualified', 'proposal'];
export const SOURCES = ['Website', 'Referral', 'WhatsApp', 'IndiaMART', 'Social Media', 'Email Campaign', 'LinkedIn', 'Trade Show', 'Walk-in', 'Ads', 'Other'];
export const PAL = ['var(--c-blue)', 'var(--c-green)', 'var(--c-amber)', 'var(--c-purple)', 'var(--c-red)', 'var(--teal)', '#EC4899', 'var(--c-grey)'];
export const SEGMENTS = ['Enterprise', 'SMB', 'Retail', 'Startup'];
export const CSTATUS = ['Active', 'VIP', 'Inactive'];
export const INDUSTRIES = ['Technology', 'Manufacturing', 'Retail', 'Healthcare', 'Education', 'Real Estate', 'Financial Services', 'Logistics', 'Food & Beverage', 'Consulting', 'Other'];
export const ATYPES = ['Call', 'Meeting', 'Demo', 'Email', 'Note', 'Reminder', 'Deadline'];
export const ACOL = { Call: 'var(--c-blue)', Meeting: 'var(--c-green)', Demo: 'var(--c-purple)', Email: 'var(--teal)', Note: 'var(--c-amber)', Reminder: 'var(--c-amber)', Deadline: 'var(--c-red)', 'Follow-up': 'var(--c-amber)', Task: 'var(--c-red)' };
export const ATIC = { Call: 'phone', Meeting: 'cal', Demo: 'video', Email: 'mail', Note: 'note', Reminder: 'bell', Deadline: 'flag', 'Follow-up': 'refresh', Task: 'task' };
export const TSTAT = [
  { k: 'todo', l: 'To Do', c: 'var(--c-grey)' },
  { k: 'progress', l: 'In Progress', c: 'var(--c-blue)' },
  { k: 'review', l: 'Review', c: 'var(--c-amber)' },
  { k: 'done', l: 'Done', c: 'var(--c-green)' }
];
export const PRIOS = ['High', 'Medium', 'Low'];
export const COLORS = [['Blue', '#2563EB'], ['Indigo', '#4F46E5'], ['Violet', '#7C3AED'], ['Teal', '#0D9488'], ['Green', '#16A34A'], ['Orange', '#EA580C'], ['Rose', '#E11D48'], ['Slate', '#334155']];
export const stageOf = (k) => STAGES.find((s) => s.k === k) || { k, l: k, c: 'var(--c-grey)' };
export const tstatOf = (k) => TSTAT.find((s) => s.k === k) || TSTAT[0];

// ---------- Numbers ----------
export const inr = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
export const inrShort = (n) => {
  n = Number(n) || 0;
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2).replace(/\.?0+$/, '') + ' Cr';
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(2).replace(/\.?0+$/, '') + ' L';
  if (n >= 1e3) return '₹' + (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return inr(n);
};
export const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);

// ---------- Dates (date-only values are "YYYY-MM-DD" strings) ----------
export const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const today = () => ymd(new Date());
export const addDays = (n, from) => {
  const d = from ? new Date(from + 'T00:00:00') : new Date();
  d.setDate(d.getDate() + n);
  return ymd(d);
};
export const d10 = (v) => {
  if (!v) return '';
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  return isNaN(d) ? '' : ymd(d);
};
export const ym = (v) => d10(v).slice(0, 7);
export const isoTime = (iso) => {
  const d = new Date(iso);
  return isNaN(d) || /^\d{4}-\d{2}-\d{2}$/.test(String(iso)) ? '' : pad(d.getHours()) + ':' + pad(d.getMinutes());
};

let DATE_FORMAT = 'DD MMM YYYY';
export const setDateFormat = (f) => { DATE_FORMAT = f || 'DD MMM YYYY'; };
export const fmtDate = (v) => {
  const s = d10(v);
  if (!s) return '—';
  const d = new Date(s + 'T00:00:00');
  if (DATE_FORMAT === 'DD/MM/YYYY') return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
  if (DATE_FORMAT === 'MMM DD, YYYY') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
export const fmtTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return ((h % 12) || 12) + ':' + pad(m) + (h < 12 ? ' AM' : ' PM');
};
export const relDay = (s) => {
  s = d10(s);
  if (!s) return '—';
  if (s === today()) return 'Today';
  if (s === addDays(1)) return 'Tomorrow';
  if (s === addDays(-1)) return 'Yesterday';
  return fmtDate(s);
};
export const thisMonth = () => today().slice(0, 7);
export const lastMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return ymd(d).slice(0, 7);
};
export const nowTime = () => pad(new Date().getHours()) + ':' + pad(new Date().getMinutes());

export function rangeDates(k) {
  const t = today();
  if (k === 'month') return [t.slice(0, 8) + '01', t];
  if (k === 'last30') return [addDays(-29), t];
  if (k === 'quarter') {
    const d = new Date();
    const qm = Math.floor(d.getMonth() / 3) * 3;
    return [d.getFullYear() + '-' + pad(qm + 1) + '-01', t];
  }
  if (k === 'year') return [t.slice(0, 4) + '-01-01', t];
  return ['0000-01-01', t];
}
export function prevRange([a, b]) {
  const A = new Date(a + 'T00:00:00');
  const B = new Date(b + 'T00:00:00');
  const len = Math.round((B - A) / 864e5) + 1;
  return [addDays(-len, a), addDays(-1, a)];
}
export const inR = (v, [a, b]) => {
  const d = d10(v);
  return !!d && d >= a && d <= b;
};

// ---------- Text ----------
export const initials = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || '?';
export const matches = (q, r, keys) => {
  q = (q || '').trim().toLowerCase();
  return !q || keys.some((k) => String(r[k] || '').toLowerCase().includes(q));
};
export const sum = (arr, f = 'value') => arr.reduce((s, x) => s + (Number(x[f]) || 0), 0);
export const niceMax = (v) => {
  if (v <= 0) return 1;
  const e = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * e >= v) return m * e;
  return 10 * e;
};

// ---------- CSV ----------
const csvCell = (v) => {
  v = String(v ?? '');
  return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
};
export const toCSV = (cols, rows) =>
  [cols.map((c) => c[1]).join(','), ...rows.map((r) => cols.map((c) => csvCell(typeof c[0] === 'function' ? c[0](r) : r[c[0]])).join(','))].join('\n');
export function downloadFile(name, text) {
  const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function parseCSV(text) {
  const rows = [];
  let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); rows.push(row); row = []; cur = '';
    } else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}
