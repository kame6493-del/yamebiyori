import type { ReactNode } from 'react';
import { wordsFor } from '../domain/flavor';
import type { Quote, Source } from '../domain/health';
import { computeStats } from '../domain/stats';
import type { Habit } from '../domain/types';
import { openUrl } from '../platform/native';
import { art, thingIcon } from './art';

export function TopBar(p: { title: string; onClose?: () => void; right?: ReactNode; closeLabel?: string }) {
  const x = p.closeLabel === '閉じる';
  return (
    <header className="topbar">
      {p.onClose ? <button className={`icon ${x ? 'x' : ''}`} aria-label={p.closeLabel ?? '戻る'} onClick={p.onClose}>{x ? '×' : '‹'}</button> : <span />}
      <h1>{p.title}</h1>
      <div className="topbar-right">{p.right}</div>
    </header>
  );
}

/** 絵の帯。msg は絵の上に重ねる言葉(見本の文字は消して、ここで書く) */
export function Banner(p: { name: string; msg?: ReactNode; className?: string; dark?: boolean }) {
  return (
    <section className={`banner ${p.className ?? ''} ${p.dark ? 'on-dark' : ''}`}>
      <img className="art" src={art(p.name)} alt="" />
      {p.msg && <p className="banner-msg">{p.msg}</p>}
    </section>
  );
}

/** 習慣の切り替え(2つ以上のときだけ出す)。お酒・たばこの印と、今回の日数も出す */
export function HabitSwitch(p: { habits: Habit[]; activeId: string; onSwitch: (id: string) => void; now?: number }) {
  if (p.habits.length < 2) return null;
  return (
    <div className="switch-row">
      <div className="switch" role="tablist">
        {p.habits.map((x) => (
          <button key={x.id} role="tab" aria-selected={x.id === p.activeId} className={x.id === p.activeId ? 'on' : ''} onClick={() => p.onSwitch(x.id)}>
            <img className="sw-ic" src={thingIcon(x.kind)} alt="" />
            <span>{wordsFor(x.kind, x.name).thing}</span>
            {p.now !== undefined && <small className="sw-days">{computeStats(x, p.now).streakDays}日</small>}
          </button>
        ))}
      </div>
    </div>
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

/** 出典の原文の一節。thumb を渡すと読みものの札(左に絵・上に札の印)にする */
export function QuoteCard(p: { q: Quote; className?: string; thumb?: string; tag?: string }) {
  return (
    <figure className={`quote ${p.thumb ? 'article' : ''} ${p.className ?? ''}`}>
      {p.thumb && <img className="art q-thumb" src={art(p.thumb)} alt="" />}
      <div className="q-body">
        {p.thumb && (
          <p className="q-tags"><span className="tag">{p.tag ?? 'からだ'}</span><span className="tag src">公的な出典つき</span></p>
        )}
        <figcaption className="quote-h">{p.q.heading}</figcaption>
        <blockquote>{p.q.text}</blockquote>
        <Cite s={p.q.source} />
      </div>
    </figure>
  );
}

export type Tab = 'home' | 'log' | 'cal' | 'body' | 'settings';

const TAB_ICONS: Record<Tab, ReactNode> = {
  home: <path d="M4 11.5 12 4.5l8 7M6.5 9.8V19.5h4v-5h3v5h4V9.8" />,
  log: <path d="M5 19.5V13M10 19.5V9M15 19.5v-7.5M20 19.5V5.5M3.5 19.5h17" />,
  cal: <><rect x="4" y="5.5" width="16" height="14" rx="2.5" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4M8 13.5h1M11.5 13.5h1M15 13.5h1M8 16.5h1M11.5 16.5h1" /></>,
  body: <path d="M12 7.5c-2-1.8-5-2.3-8-1.5v12c3-.8 6-.3 8 1.5 2-1.8 5-2.3 8-1.5V6c-3-.8-6-.3-8 1.5Zm0 0v12" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6" /></>,
};

export function TabBar(p: { tab: Tab; onTab: (t: Tab) => void }) {
  const items: [Tab, string][] = [
    ['home', 'ホーム'],
    ['log', '記録'],
    ['cal', 'カレンダー'],
    ['body', '読みもの'],
    ['settings', '設定'],
  ];
  return (
    <nav className="tabbar">
      {items.map(([k, label]) => (
        <button key={k} className={`tab ${p.tab === k ? 'on' : ''}`} onClick={() => p.onTab(k)} aria-current={p.tab === k}>
          <svg className="tab-ic" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth={p.tab === k ? 2.1 : 1.7} strokeLinecap="round" strokeLinejoin="round">{TAB_ICONS[k]}</svg>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

export function Locked(p: { title: string; text: string; onOpen: () => void }) {
  return (
    <div className="locked">
      <img className="art locked-ic" src={art('ic_crown')} alt="" />
      <p className="locked-h">{p.title}</p>
      <p className="muted small">{p.text}</p>
      <button className="btn small green" onClick={p.onOpen}>完全版でひらく</button>
    </div>
  );
}

/** まだ何もない所 */
export function Empty(p: { title: string; text?: string; icon?: string }) {
  return (
    <div className="empty">
      <img className="art" src={art(p.icon ?? 'empty_art')} alt="" />
      <p className="empty-h">{p.title}</p>
      {p.text && <p className="muted small">{p.text}</p>}
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

export const WD = ['日', '月', '火', '水', '木', '金', '土'];

export function fmtShort(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export function fmtTime(t: number): string {
  const d = new Date(t);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}
