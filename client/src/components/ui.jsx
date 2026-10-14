// Small shared building blocks used across the pages.
import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { ACOL, ATIC, initials, stageOf } from '../lib/utils.js';

const AVC = [
  ['var(--accent-soft)', 'var(--accent)'], ['var(--good-soft)', 'var(--good)'], ['var(--gold-soft)', 'var(--warn)'],
  ['var(--purple-soft)', 'var(--purple)'], ['var(--bad-soft)', 'var(--bad)'], ['var(--teal-soft)', 'var(--teal)']
];

export function Avatar({ name, size = '' }) {
  let h = 0;
  for (const ch of String(name || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [bg, fg] = AVC[h % AVC.length];
  return <span className={'av ' + size} style={{ background: bg, color: fg }} title={name}>{initials(name)}</span>;
}

export function Person({ name }) {
  return <span className="who-cell"><Avatar name={name} size="sm" />{name}</span>;
}

export function ActIcon({ type, cls = 'ic' }) {
  const c = ACOL[type] || 'var(--c-grey)';
  return <div className={cls} style={{ background: `color-mix(in srgb,${c} 14%,var(--card))`, color: c }}><Icon name={ATIC[type] || 'task'} /></div>;
}

export const StagePill = ({ k }) => <span className={'pill p-' + k}>{stageOf(k).l}</span>;
export const StatusPill = ({ s }) => <span className={'pill ' + (s === 'Active' ? 'p-good' : s === 'VIP' ? 'p-gold' : '')}>{s || 'Active'}</span>;
export const PrioPill = ({ p }) => <span className={'pill prio-' + (p || 'Medium')}>{p || 'Medium'}</span>;

export function Trend({ cur, prev }) {
  if (!prev && !cur) return <span className="trend flat">—</span>;
  if (!prev) return <span className="trend up">New</span>;
  const p = Math.round(((cur - prev) / prev) * 1000) / 10;
  return <span className={'trend ' + (p >= 0 ? 'up' : 'down')}><Icon name={p >= 0 ? 'up' : 'down'} />{Math.abs(p)}%</span>;
}

export function Kpi({ title, value, trend, sub, icon, color, valueTitle }) {
  return (
    <div className="card kpi">
      <div className="kbadge" style={{ background: `color-mix(in srgb,${color} 14%,var(--card))`, color }}><Icon name={icon} /></div>
      <div style={{ minWidth: 0 }}>
        <div className="t">{title}</div>
        <div className="v tn"><span title={valueTitle}>{value}</span>{trend}</div>
        <div className="h">{sub}</div>
      </div>
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder }) {
  return (
    <label className="search">
      <Icon name="search" />
      <input type="search" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} aria-label={placeholder} />
    </label>
  );
}

export function Select({ value, onChange, options, label, className = 'sel-in' }) {
  return (
    <select className={className} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      {options.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{o}</option>))}
    </select>
  );
}

// Pagination for long tables.
export function usePaged(list, deps = []) {
  const [page, setPage] = useState(1);
  const [per, setPer] = useState(10);
  const pages = Math.max(1, Math.ceil(list.length / per));
  const p = Math.min(page, pages);
  // Go back to page 1 when the search or filters change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setPage(1), deps);
  const rows = list.slice((p - 1) * per, p * per);
  const from = list.length ? (p - 1) * per + 1 : 0;
  const nums = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - p) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  const pager = (
    <div className="pager">
      <span>Showing {from} to {(p - 1) * per + rows.length} of {list.length}</span>
      <div className="pages">
        <button disabled={p <= 1} onClick={() => setPage(p - 1)} aria-label="Previous page"><Icon name="left" /></button>
        {nums.map((n, i) => (n === '…' ? <span key={'e' + i}>…</span> : <button key={n} aria-current={n === p ? 'true' : undefined} onClick={() => setPage(n)}>{n}</button>))}
        <button disabled={p >= pages} onClick={() => setPage(p + 1)} aria-label="Next page"><Icon name="right" /></button>
      </div>
      <select value={per} onChange={(e) => { setPer(Number(e.target.value)); setPage(1); }} aria-label="Rows per page">
        {[10, 25, 50].map((n) => <option key={n} value={n}>{n} / page</option>)}
      </select>
    </div>
  );
  return { rows, pager };
}

export function EmptyRow({ cols, children }) {
  return <tr><td colSpan={cols} className="empty" style={{ textAlign: 'center', padding: 32 }}>{children}</td></tr>;
}

// A "⋮" button with a small menu.
export function RowMenu({ items }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: 'relative' }}>
      <button className="btn icon" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} aria-label="Actions"><Icon name="dots" /></button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 45 }} onClick={() => setOpen(false)} />
          <div className="pop">
            {items.map((it) => (
              <button key={it.label} className={it.danger ? 'danger' : ''} onClick={(e) => { e.stopPropagation(); setOpen(false); it.onClick(); }}>
                <Icon name={it.icon} />{it.label}
              </button>
            ))}
          </div>
        </>
      )}
    </span>
  );
}
