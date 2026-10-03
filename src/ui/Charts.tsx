import { useState } from 'react';
import { formatYen } from '../domain/stats';

/** 1系列の棒グラフ。棒を押すとその値を上に出す(凡例は無し・題名で示す) */
export function BarChart(p: { title: string; values: number[]; labels: string[]; tickEvery?: number; unit: string; className?: string }) {
  const [sel, setSel] = useState<number | null>(null);
  const W = 340, H = 150, padL = 26, padB = 22, padT = 10;
  const max = Math.max(1, ...p.values);
  const n = p.values.length;
  const bw = (W - padL) / n;
  const gap = Math.min(4, bw * 0.25);
  const yOf = (v: number) => padT + (H - padT - padB) * (1 - v / max);
  const ticks = [0, Math.ceil(max / 2), max].filter((v, i, a) => a.indexOf(v) === i);
  const total = p.values.reduce((a, b) => a + b, 0);
  return (
    <figure className={`chart ${p.className ?? ''}`}>
      <figcaption>
        <span>{p.title}</span>
        <span className="chart-val">{sel !== null ? `${p.labels[sel]} ${p.values[sel]}${p.unit}` : `合計 ${total}${p.unit}`}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${p.title}。${p.labels.map((l, i) => `${l} ${p.values[i]}${p.unit}`).join('、')}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W} y1={yOf(t)} y2={yOf(t)} className="grid" />
            <text x={padL - 4} y={yOf(t) + 4} className="axis" textAnchor="end">{t}</text>
          </g>
        ))}
        {p.values.map((v, i) => {
          const x = padL + i * bw + gap / 2;
          const y = yOf(v);
          const h = H - padB - y;
          return (
            <g key={i} onClick={() => setSel(sel === i ? null : i)}>
              <rect x={padL + i * bw} y={padT} width={bw} height={H - padT - padB} fill="transparent" />
              {v > 0 && <path d={barPath(x, y, bw - gap, h, Math.min(4, (bw - gap) / 2))} className={`bar-mark ${sel === i ? 'sel' : ''}`} />}
              {(p.tickEvery ? i % p.tickEvery === 0 : true) && <text x={x + (bw - gap) / 2} y={H - 6} className="axis" textAnchor="middle">{p.labels[i]}</text>}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

/** 上の角だけ丸い棒(下は基準線に付ける) */
function barPath(x: number, y: number, w: number, h: number, r: number) {
  if (h <= r) return `M${x},${y + h}V${y}H${x + w}V${y + h}Z`;
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** 浮いたお金の積み上がり(1本の線)。押した所の値を出す */
export function SavingsChart(p: { series: { t: number; yen: number }[] }) {
  const [sel, setSel] = useState<number | null>(null);
  const W = 340, H = 150, padL = 8, padR = 8, padB = 22, padT = 12;
  const s = p.series;
  const max = Math.max(1, ...s.map((x) => x.yen));
  const t0 = s[0]?.t ?? 0, t1 = s[s.length - 1]?.t ?? 1;
  const xOf = (t: number) => padL + (W - padL - padR) * (t1 === t0 ? 1 : (t - t0) / (t1 - t0));
  const yOf = (v: number) => padT + (H - padT - padB) * (1 - v / max);
  const d = s.map((x, i) => `${i ? 'L' : 'M'}${xOf(x.t).toFixed(1)},${yOf(x.yen).toFixed(1)}`).join('');
  const area = `${d}L${xOf(t1)},${H - padB}L${xOf(t0)},${H - padB}Z`;
  const pick = (clientX: number, el: SVGSVGElement) => {
    const r = el.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * W;
    let best = 0;
    s.forEach((pt, i) => { if (Math.abs(xOf(pt.t) - x) < Math.abs(xOf(s[best].t) - x)) best = i; });
    setSel(best);
  };
  const cur = sel !== null ? s[sel] : s[s.length - 1];
  const fd = (t: number) => { const dd = new Date(t); return `${dd.getMonth() + 1}/${dd.getDate()}`; };
  return (
    <figure className="chart">
      <figcaption>
        <span>浮いたお金の積み上がり</span>
        <span className="chart-val">{cur ? `${fd(cur.t)} ${formatYen(cur.yen)}` : ''}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`浮いたお金の積み上がり。今 ${formatYen(s[s.length - 1]?.yen ?? 0)}`}
        onPointerDown={(e) => pick(e.clientX, e.currentTarget)} onPointerMove={(e) => e.buttons && pick(e.clientX, e.currentTarget)}>
        <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} className="grid" />
        <path d={area} className="area-mark" />
        <path d={d} className="line-mark" />
        {cur && <>
          <line x1={xOf(cur.t)} x2={xOf(cur.t)} y1={padT} y2={H - padB} className="cross" />
          <circle cx={xOf(cur.t)} cy={yOf(cur.yen)} r={5} className="dot-mark" />
        </>}
        <text x={padL} y={H - 6} className="axis">{fd(t0)}</text>
        <text x={W - padR} y={H - 6} className="axis" textAnchor="end">{fd(t1)}</text>
      </svg>
    </figure>
  );
}
