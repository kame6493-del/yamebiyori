import type { ReactNode } from 'react';
import type { Quote, Source } from '../domain/health';
import { openUrl } from '../platform/native';

export function TopBar(p: { title: string; onClose?: () => void; right?: ReactNode; closeLabel?: string }) {
  return (
    <header className="topbar">
      {p.onClose ? <button className="icon" aria-label={p.closeLabel ?? '戻る'} onClick={p.onClose}>‹</button> : <span />}
      <h1>{p.title}</h1>
      <div className="topbar-right">{p.right}</div>
    </header>
  );
}

export function Cite(p: { s: Source }) {
  return (
    <p className="cite">
      出典:「{p.s.title}」({p.s.site}){p.s.author ? ` 執筆 ${p.s.author}` : ''}・{p.s.date}
      <br />
      <button className="link cite-url" onClick={() => openUrl(p.s.url)}>{p.s.url}</button>
    </p>
  );
}

export function QuoteCard(p: { q: Quote; className?: string }) {
  return (
    <figure className={`quote ${p.className ?? ''}`}>
      <figcaption className="quote-h">{p.q.heading}</figcaption>
      <blockquote>{p.q.text}</blockquote>
      <Cite s={p.q.source} />
    </figure>
  );
}

export type Tab = 'home' | 'log' | 'body' | 'settings';

export function TabBar(p: { tab: Tab; onTab: (t: Tab) => void; bodyLabel: string }) {
  const items: [Tab, string, string][] = [
    ['home', 'きょう', '◎'],
    ['log', '記録', '▦'],
    ['body', p.bodyLabel, '♡'],
    ['settings', '設定', '≡'],
  ];
  return (
    <nav className="tabbar">
      {items.map(([k, label, ic]) => (
        <button key={k} className={`tab ${p.tab === k ? 'on' : ''}`} onClick={() => p.onTab(k)} aria-current={p.tab === k}>
          <span className="tab-ic" aria-hidden>{ic}</span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

export function Locked(p: { title: string; text: string; onOpen: () => void }) {
  return (
    <div className="locked">
      <p className="locked-h">{p.title}</p>
      <p className="muted small">{p.text}</p>
      <button className="btn small" onClick={p.onOpen}>完全版でひらく</button>
    </div>
  );
}

/** datetime-local の値 ⇔ ISO */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
}

export function fromLocalInput(v: string): string | null {
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

export function fmtDate(t: number, withTime = false): string {
  const d = new Date(t);
  const base = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  return withTime ? `${base} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}` : base;
}
