import { wordsFor } from '../domain/flavor';
import { CAUTION, quotesFor, timelineProgress, TOBACCO_TIMELINE } from '../domain/health';
import { nextMilestone, reachedMilestones, milestoneTime } from '../domain/milestones';
import { computeStats, DAY, formatDuration, formatYen, HOUR } from '../domain/stats';
import type { Habit } from '../domain/types';
import { Cite, QuoteCard } from './common';

export function Home(p: {
  habit: Habit; habits: Habit[]; now: number; premium: boolean;
  onSwitch: (id: string) => void; onCrave: () => void; onSlip: () => void; onUnlock: () => void; onCard: (days: number) => void; onBody: () => void;
}) {
  const h = p.habit;
  const w = wordsFor(h.kind, h.name);
  const s = computeStats(h, p.now);
  const next = nextMilestone(s.totalDays);
  const reached = reachedMilestones(s.totalDays);
  const last = reached[reached.length - 1];
  // 今日届いた記念日(届いてから24時間はお祝いを出す)
  const fresh = last && p.now - milestoneTime(h, last.days) < DAY ? last : null;
  const prevDays = reached.length >= 1 ? reached[reached.length - 1].days : 0;
  const pct = next ? Math.min(100, Math.max(0, ((s.totalDays - prevDays) / (next.days - prevDays)) * 100)) : 100;
  const hours = Math.floor((s.streakMs % DAY) / HOUR);
  const quotes = quotesFor(h.kind);
  // ホームは励みになる一文だけ(1年未満は脂肪肝、1年からは禁酒の年数)。ほかの引用は「体のこと」に
  const q = quotes.length ? quotes[s.streakMs >= 365 * DAY ? 1 : 0] : null;
  const tl = timelineProgress(s.streakMs);

  return (
    <div className="page home">
      <header className="home-head">
        <div className="brand"><span className="brand-name">やめ日和</span></div>
        {p.habits.length > 1 && (
          <div className="switch" role="tablist">
            {p.habits.map((x) => (
              <button key={x.id} role="tab" aria-selected={x.id === h.id} className={x.id === h.id ? 'on' : ''} onClick={() => p.onSwitch(x.id)}>{wordsFor(x.kind, x.name).thing}</button>
            ))}
          </div>
        )}
      </header>

      {fresh && (
        <section className="celebrate">
          <p>通算<b>{fresh.label}</b>になりました。</p>
          <button className="btn small" onClick={() => p.onCard(fresh.days)}>記念の画像をつくる</button>
        </section>
      )}

      <section className="hero">
        <p className="hero-label">{w.thing}をやめて(今回)</p>
        <p className="hero-num"><b>{s.streakDays}</b><span>日</span><small>{hours}時間</small></p>
        <div className="stats">
          <div><span>通算</span><b>{s.totalDays}日</b></div>
          <div><span>浮いたお金</span><b>{formatYen(s.savedYen)}</b></div>
          <div><span>いちばん長く</span><b>{formatDuration(s.longestMs)}</b></div>
        </div>
        {next && (
          <div className="next">
            <div className="bar"><i style={{ width: `${pct}%` }} /></div>
            <p className="small">次の記念日 通算{next.label}まで あと{next.days - s.totalDays}日</p>
          </div>
        )}
      </section>

      <div className="actions">
        <button className="btn primary big wide crave-btn" onClick={p.onCrave}>{w.verbCrave}</button>
        <button className="btn wide slip-btn" onClick={p.onSlip}>{w.verbUse}日を記録する</button>
      </div>

      {h.reason && (
        <section className="card reason">
          <p className="card-h">やめたい理由</p>
          <p className="reason-text">{h.reason}</p>
        </section>
      )}

      {h.kind === 'smoke' && s.streakMs < 14 * DAY && <QuoteCard q={CAUTION.smoke} />}
      {h.kind === 'alcohol' && s.streakMs < 7 * DAY && (
        <section className="card caution">
          <p className="card-h">{CAUTION.alcohol.heading}</p>
          <p className="small">手のふるえ・発汗・眠れないなどの症状が出たら、無理をせず医療機関に相談してください。</p>
          <button className="link" onClick={p.onBody}>出典の原文を読む</button>
        </section>
      )}

      {h.kind === 'smoke' && (
        <section className="card body-mini" onClick={p.onBody}>
          <p className="card-h">体の変化の目安 {tl.reached}/{TOBACCO_TIMELINE.rows.length}</p>
          {tl.next ? (
            <p>次は「{tl.next.time}」 {tl.next.lines.join(' / ')}</p>
          ) : <p>表のすべての時期を過ぎました。</p>}
          <Cite s={TOBACCO_TIMELINE.source} />
        </section>
      )}
      {h.kind === 'alcohol' && q && <QuoteCard q={q} />}

      {!p.premium && (
        <button className="unlock" onClick={p.onUnlock}>
          <b>完全版 買い切り</b>
          <span>グラフ・記念日の画像・待ち受け画像・色の変更・お酒とたばこの両方の記録</span>
        </button>
      )}
    </div>
  );
}
