// Lightweight SVG charts that follow the theme colors.
import { inrShort, inr, niceMax } from '../lib/utils.js';

export function Donut({ parts, center, sub }) {
  const total = parts.reduce((s, p) => s + p.n, 0);
  const r = 60;
  const C = 2 * Math.PI * r;
  let off = 0;
  return (
    <svg viewBox="0 0 180 180" role="img" aria-label={sub || 'chart'}>
      <circle cx="90" cy="90" r={r} fill="none" stroke="var(--sunk)" strokeWidth="30" />
      {total > 0 && parts.map((p) => {
        const len = (p.n / total) * C;
        const el = (
          <circle key={p.l} cx="90" cy="90" r={r} fill="none" stroke={p.c} strokeWidth="30"
            strokeDasharray={`${Math.max(0, len - (parts.length > 1 ? 2 : 0))} ${C}`} strokeDashoffset={-off} transform="rotate(-90 90 90)">
            <title>{p.l}: {p.n}</title>
          </circle>
        );
        off += len;
        return el;
      })}
      {center != null && <text x="90" y={sub ? 86 : 96} textAnchor="middle" fontSize={String(center).length > 6 ? 17 : 22} fontWeight="700" fill="var(--ink)">{center}</text>}
      {sub && <text x="90" y="105" textAnchor="middle" fontSize="11" fill="var(--muted)">{sub}</text>}
    </svg>
  );
}

export function DonutBlock({ parts, center, sub, fmt }) {
  const tot = parts.reduce((s, p) => s + p.n, 0) || 1;
  return (
    <div className="donut">
      <Donut parts={parts} center={center} sub={sub} />
      <ul className="legend">
        {parts.map((p) => (
          <li key={p.l}><i style={{ background: p.c }} /><span>{p.l}</span><span className="lv tn">{fmt ? fmt(p) : Math.round((p.n / tot) * 100) + '%'}</span></li>
        ))}
      </ul>
    </div>
  );
}

export function Funnel({ rows }) {
  const max = Math.max(1, rows[0].n);
  const W = 280, H = 250, gap = 6;
  const h = (H - gap * (rows.length - 1)) / rows.length;
  const w = (n) => Math.max(0.24, n / max) * W;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Sales funnel">
      {rows.map((r, i) => {
        const a = w(r.n);
        const b = i < rows.length - 1 ? w(rows[i + 1].n) : a * 0.72;
        const y = i * (h + gap), x1 = (W - a) / 2, x2 = (W - b) / 2;
        return <path key={r.k} d={`M${x1} ${y}H${x1 + a}L${x2 + b} ${y + h}H${x2}Z`} fill={r.c}><title>{r.l}: {r.n}</title></path>;
      })}
    </svg>
  );
}

export function LineChart({ labels, series, money = true, area = false, h = 240 }) {
  const W = 600, H = h, L = 58, R = 14, T = 14, B = 30, n = labels.length;
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.v)));
  const x = (i) => L + (n <= 1 ? 0 : (i / (n - 1)) * (W - L - R));
  const y = (v) => T + (1 - v / max) * (H - T - B);
  const step = Math.max(1, Math.ceil(n / 6));
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Line chart">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={L} x2={W - R} y1={y(max * f)} y2={y(max * f)} stroke="var(--line)" />
            <text x={L - 8} y={y(max * f) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{money ? inrShort(max * f) : Math.round(max * f)}</text>
          </g>
        ))}
        {labels.map((l, i) => (i % step === 0 || i === n - 1 ? <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--muted)">{l}</text> : null))}
        {series.map((s, si) => {
          const d = s.v.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
          return (
            <g key={si}>
              {area && !s.dash && n > 0 && <path d={`${d} L${x(n - 1)} ${y(0)} L${x(0)} ${y(0)}Z`} fill={s.c} opacity=".12" />}
              <path d={d} fill="none" stroke={s.c} strokeWidth="2.2" strokeDasharray={s.dash ? '5 5' : undefined} opacity={s.dash ? 0.55 : 1} strokeLinejoin="round" />
              {!s.dash && n > 0 && <circle cx={x(n - 1)} cy={y(s.v[n - 1])} r="4" fill={s.c} />}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function BarChart({ items }) {
  const W = 600, H = 250, L = 58, R = 10, T = 26, B = 40;
  const max = niceMax(Math.max(1, ...items.map((i) => i.v)));
  const y = (v) => T + (1 - v / max) * (H - T - B);
  const bw = (W - L - R) / items.length;
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Bar chart">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={L} x2={W - R} y1={y(max * f)} y2={y(max * f)} stroke="var(--line)" />
            <text x={L - 8} y={y(max * f) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{inrShort(max * f)}</text>
          </g>
        ))}
        {items.map((it, i) => {
          const cx = L + bw * i + bw / 2, w = Math.min(46, bw * 0.5), top = y(it.v);
          return (
            <g key={it.l}>
              <rect x={cx - w / 2} y={top} width={w} height={Math.max(0, y(0) - top)} rx="4" fill={it.c || 'var(--accent)'}><title>{it.l}: {inr(it.v)}</title></rect>
              <text x={cx} y={top - 7} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--ink)">{inrShort(it.v)}</text>
              <text x={cx} y={H - 20} textAnchor="middle" fontSize="11.5" fill="var(--muted)">{it.l}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function Spark({ vals, color }) {
  let v = vals.length < 2 ? [0, ...vals, 0] : vals;
  const W = 90, H = 30, max = Math.max(1, ...v), min = Math.min(...v);
  const x = (i) => (i / (v.length - 1)) * W;
  const y = (n) => H - 3 - ((n - min) / (max - min || 1)) * (H - 6);
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <path d={v.map((n, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(n).toFixed(1)).join(' ')} fill="none" stroke={color} strokeWidth="1.8" />
    </svg>
  );
}
