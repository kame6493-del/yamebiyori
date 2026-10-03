import { useState } from 'react';
import { wordsFor } from '../domain/flavor';
import { MILESTONES, milestoneTime } from '../domain/milestones';
import { computeStats, dayMarks, savingsSeries, summarizeCravings } from '../domain/stats';
import type { Habit } from '../domain/types';
import { BarChart, SavingsChart } from './Charts';
import { fmtDate, Locked, TopBar } from './common';

const WD = ['日', '月', '火', '水', '木', '金', '土'];

export function LogPage(p: {
  habit: Habit; now: number; premium: boolean;
  onUnlock: () => void; onCard: (days: number) => void; onWallpaper: () => void; onRemoveSlip: (id: string) => void; onRemoveCraving: (id: string) => void;
}) {
  const h = p.habit;
  const w = wordsFor(h.kind, h.name);
  const s = computeStats(h, p.now);
  const today = new Date(p.now);
  const [ym, setYm] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const marks = dayMarks(h, ym.y, ym.m, p.now);
  const lead = new Date(ym.y, ym.m, 1).getDay();
  const free = marks.filter((m) => m === 'free').length;
  const slip = marks.filter((m) => m === 'slip').length;
  const cs = summarizeCravings(h.cravings);
  const move = (d: number) => setYm(({ y, m }) => { const nd = new Date(y, m + d, 1); return { y: nd.getFullYear(), m: nd.getMonth() }; });

  const history = [
    ...h.slips.map((x) => ({ kind: 'slip' as const, id: x.id, at: Date.parse(x.at), text: `${w.verbUse}${x.amount ? ` ${x.amount}${w.unit}` : ''}${x.note ? `「${x.note}」` : ''}` })),
    ...h.cravings.map((x) => ({ kind: 'crave' as const, id: x.id, at: Date.parse(x.at), text: `${w.verbCrave}(強さ${x.strength})${x.scene ? ` ${x.scene}` : ''}${x.coping ? ` → ${x.coping}` : ''} ${x.outcome === 'passed' ? '乗り切れた' : ''}` })),
  ].sort((a, b) => b.at - a.at).slice(0, 40);

  return (
    <div className="page log">
      <TopBar title="記録" />

      <section className="card cal">
        <div className="cal-head">
          <button className="icon" aria-label="前の月" onClick={() => move(-1)}>‹</button>
          <p>{ym.y}年{ym.m + 1}月</p>
          <button className="icon" aria-label="次の月" onClick={() => move(1)}>›</button>
        </div>
        <div className="cal-grid">
          {WD.map((d) => <span key={d} className="cal-wd">{d}</span>)}
          {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
          {marks.map((m, i) => <span key={i} className={`cal-day ${m}`} aria-label={`${i + 1}日 ${m === 'free' ? 'やめられた日' : m === 'slip' ? `${w.verbUse}日` : ''}`}>{i + 1}</span>)}
        </div>
        <p className="small muted cal-legend"><i className="lg free" />やめられた日 {free}日　<i className="lg slip" />{w.verbUse}日 {slip}日</p>
      </section>

      <section className="card">
        <p className="card-h">記念日(通算の日数)</p>
        <ul className="ms">
          {MILESTONES.filter((m) => m.days <= Math.max(s.totalDays, 1) || m === MILESTONES.find((x) => x.days > s.totalDays)).slice(-6).map((m) => {
            const got = s.totalDays >= m.days;
            return (
              <li key={m.days} className={got ? 'got' : ''}>
                <span className="ms-label">{m.label}</span>
                <span className="ms-date small muted">{got ? `${fmtDate(milestoneTime(h, m.days))}に到達` : `${fmtDate(milestoneTime(h, m.days))}ごろ`}</span>
                {got && <button className="btn small" onClick={() => (p.premium ? p.onCard(m.days) : p.onUnlock())}>画像{p.premium ? '' : '(完全版)'}</button>}
              </li>
            );
          })}
        </ul>
        <button className="btn small wide" onClick={() => (p.premium ? p.onWallpaper() : p.onUnlock())}>待ち受け画像をつくる{p.premium ? '' : '(完全版)'}</button>
      </section>

      <section className="card">
        <p className="card-h">{w.craveNoun}の記録</p>
        {cs.total === 0 ? <p className="muted small">まだ記録がありません。「{w.verbCrave}」を押すと、ここにたまります。</p> : (
          <>
            <p className="big-line"><b>{cs.passed}</b>回 乗り切れました <span className="muted small">(全{cs.total}回)</span></p>
            {cs.byCoping.length > 0 && (
              <>
                <p className="small muted">よく効いた乗り切り方</p>
                <ol className="rank">
                  {cs.byCoping.slice(0, 5).map((c) => <li key={c.coping}><span>{c.coping}</span><span className="small muted">{c.passed}/{c.tried}回</span></li>)}
                </ol>
              </>
            )}
          </>
        )}
      </section>

      <section className="card">
        <p className="card-h">グラフ</p>
        {p.premium ? (
          <>
            <BarChart title={`${w.craveNoun}が来た時間帯`} values={cs.byHour} labels={cs.byHour.map((_, i) => `${i}時`)} tickEvery={3} unit="回" />
            <BarChart title="曜日ごと" values={cs.byWeekday} labels={WD} unit="回" />
            <SavingsChart series={savingsSeries(h, p.now, 40)} />
          </>
        ) : (
          <Locked title="時間帯・曜日・浮いたお金のグラフ" text={`${w.craveNoun}が来やすい時間と曜日が分かると、先回りできます。`} onOpen={p.onUnlock} />
        )}
      </section>

      <section className="card">
        <p className="card-h">これまでの記録</p>
        {history.length === 0 ? <p className="muted small">まだありません。</p> : (
          <ul className="hist">
            {history.map((x) => (
              <li key={x.kind + x.id} className={x.kind}>
                <span className="small muted">{fmtDate(x.at, true)}</span>
                <span>{x.text}</span>
                <button className="link small" aria-label="この記録を消す" onClick={() => { if (confirm('この記録を消しますか')) (x.kind === 'slip' ? p.onRemoveSlip : p.onRemoveCraving)(x.id); }}>消す</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
