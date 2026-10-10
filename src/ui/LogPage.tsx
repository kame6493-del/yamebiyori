import { useState } from 'react';
import { wordsFor } from '../domain/flavor';
import { MILESTONES, milestoneTime } from '../domain/milestones';
import { computeStats, savingsSeries, summarizeCravings } from '../domain/stats';
import type { Habit } from '../domain/types';
import { art, copingIcon, milestoneIcon, slipIcon } from './art';
import { BarChart, SavingsChart } from './Charts';
import { Empty, fmtShort, fmtTime, HabitSwitch, Locked, TopBar, WD } from './common';

/** 見本の「記念日・マイルストーン」の添え書き(日数の節目だけ) */
const MS_NOTE: Record<number, string> = {
  1: 'はじめの一歩', 3: '3日目の壁をこえて', 7: '1週間おめでとう!', 14: '2週間おめでとう!', 30: '1ヶ月の節目', 100: '100日おめでとう!', 365: '1年の節目',
};

/** 気持ちが来やすい時間帯(いちばん多い3時間)。記録が少ないうちは出さない */
function peakHours(byHour: number[]): string | null {
  if (byHour.reduce((a, b) => a + b, 0) < 5) return null;
  let best = 0;
  let at = 0;
  for (let i = 0; i < 24; i++) {
    const v = byHour[i] + byHour[(i + 1) % 24] + byHour[(i + 2) % 24];
    if (v > best) { best = v; at = i; }
  }
  return `${at}時〜${(at + 3) % 24}時`;
}

export function LogPage(p: {
  habit: Habit; habits: Habit[]; now: number; premium: boolean;
  onSwitch: (id: string) => void;
  onUnlock: () => void; onCard: (days: number) => void; onWallpaper: () => void; onRemoveSlip: (id: string) => void; onRemoveCraving: (id: string) => void;
}) {
  const h = p.habit;
  const w = wordsFor(h.kind, h.name);
  const s = computeStats(h, p.now);
  const cs = summarizeCravings(h.cravings);
  const reached = MILESTONES.filter((m) => s.totalDays >= m.days);
  const [msTab, setMsTab] = useState<'got' | 'next'>(reached.length ? 'got' : 'next');
  const msList = msTab === 'got' ? reached.slice(-6).reverse() : MILESTONES.filter((m) => s.totalDays < m.days).slice(0, 6);
  const peak = peakHours(cs.byHour);

  const history = [
    ...h.slips.map((x) => ({ kind: 'slip' as const, id: x.id, at: Date.parse(x.at), title: `${w.te}しまった`, text: `${x.amount ? `${x.amount}${w.unit}` : ''}${x.note ? `「${x.note}」` : ''}` || 'また今日から' })),
    ...h.cravings.map((x) => ({
      kind: 'crave' as const, id: x.id, at: Date.parse(x.at),
      title: x.outcome === 'passed' ? '乗り切れた' : '気持ちを記録',
      text: `強さ${x.strength}${x.scene ? ` ${x.scene}` : ''}${x.coping ? ` → ${x.coping}` : ''}${x.note ? `「${x.note}」` : ''}`,
    })),
  ].sort((a, b) => b.at - a.at).slice(0, 40);

  return (
    <div className="page log">
      <TopBar title="記録" />
      <HabitSwitch habits={p.habits} activeId={h.id} onSwitch={p.onSwitch} now={p.now} />

      <section className="card ms-card">
        <p className="card-h">記念日・マイルストーン</p>
        <p className="small muted">続けるほど、新しい景色が見えてくる。記念日は通算の日数で数えます。</p>
        <div className="seg small" role="tablist">
          <button role="tab" aria-selected={msTab === 'next'} className={msTab === 'next' ? 'on' : ''} onClick={() => setMsTab('next')}>これからの記念日</button>
          <button role="tab" aria-selected={msTab === 'got'} className={msTab === 'got' ? 'on' : ''} onClick={() => setMsTab('got')}>達成した記念日</button>
        </div>
        {msList.length === 0 ? <p className="muted small">{msTab === 'got' ? 'まだありません。最初の記念日は通算1日です。' : 'すべての記念日に届きました。'}</p> : (
          <ul className="ms">
            {msList.map((m) => {
              const got = s.totalDays >= m.days;
              return (
                <li key={m.days} className={got ? 'got' : ''}>
                  <img className="art ms-ic" src={milestoneIcon(m.days)} alt="" />
                  <span className="ms-t">
                    <span className="ms-label">{m.label}</span>
                    {MS_NOTE[m.days] && <span className="ms-note small">{MS_NOTE[m.days]}</span>}
                    <span className="ms-date small muted">{got ? `${fmtShort(milestoneTime(h, m.days))} 到達` : `${fmtShort(milestoneTime(h, m.days))}ごろ`}</span>
                  </span>
                  {got && <button className="btn small ms-btn" onClick={() => (p.premium ? p.onCard(m.days) : p.onUnlock())}>画像{p.premium ? '' : '(完全版)'}</button>}
                </li>
              );
            })}
          </ul>
        )}
        <button className="btn small wide" onClick={() => (p.premium ? p.onWallpaper() : p.onUnlock())}>待ち受け画像をつくる{p.premium ? '' : '(完全版)'}</button>
        <p className="ms-foot small"><img src={art('ic_crown')} alt="" />記念日のお知らせは、設定からいつでも変更できます。</p>
      </section>

      <section className="card">
        <p className="card-h">{w.craveNoun}の記録</p>
        {cs.total === 0 ? <Empty title="まだ記録はありません" text="「気持ちが来た」を押すと、ここにたまります。" icon="sprout_soil" /> : (
          <>
            <p className="big-line"><b>{cs.passed}</b>回 乗り切れました <span className="muted small">(全{cs.total}回)</span></p>
            {cs.byCoping.length > 0 && (
              <>
                <p className="small muted">自分によく効いた順</p>
                <ol className="rank">
                  {cs.byCoping.slice(0, 5).map((c) => (
                    <li key={c.coping}>
                      <img src={copingIcon(c.coping)} alt="" />
                      <span>{c.coping}</span>
                      <span className="rank-v"><b>{Math.round((c.passed / c.tried) * 100)}%</b><small className="muted">{c.passed}/{c.tried}回</small></span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </>
        )}
      </section>

      <section className="card">
        <p className="card-h">気持ちの分析・浮いたお金</p>
        {p.premium ? (
          <>
            {peak && (
              <p className="peak"><img src={art('ic_leaf')} alt="" /><span>{peak}に、{w.craveNoun}が来やすいようです。</span></p>
            )}
            <BarChart title="気持ちが来やすい時間帯" values={cs.byHour} labels={cs.byHour.map((_, i) => `${i}時`)} tickEvery={6} unit="回" />
            <BarChart title="曜日ごとの傾向" values={cs.byWeekday} labels={WD} unit="回" />
            <SavingsChart series={savingsSeries(h, p.now, 40)} />
          </>
        ) : (
          <Locked title="時間帯・曜日・浮いたお金のグラフ" text={`${w.craveNoun}が来やすい時間と曜日が分かると、先回りできます。`} onOpen={p.onUnlock} />
        )}
      </section>

      <section className="card">
        <p className="card-h">記録履歴</p>
        {history.length === 0 ? <Empty title="まだ記録はありません" text="最初の1日を記録してみましょう。" icon="empty_art" /> : (
          <ul className="hist">
            {history.map((x) => {
              const d = new Date(x.at);
              return (
                <li key={x.kind + x.id} className={x.kind}>
                  <span className="hist-d"><b>{d.getDate()}</b><small>{d.getMonth() + 1}月({WD[d.getDay()]})</small></span>
                  <img className={`hist-ic ${x.kind === 'slip' && h.kind !== 'alcohol' ? 'warm-bg' : ''}`} src={x.kind === 'slip' ? slipIcon(h.kind) : art(x.title === '乗り切れた' ? 'mk_free' : 'mk_crave')} alt="" />
                  <span className="hist-t"><b>{x.title}</b><span className="small muted">{fmtTime(x.at)} {x.text}</span></span>
                  <button className="link small" aria-label="この記録を消す" onClick={() => { if (confirm('この記録を消しますか')) (x.kind === 'slip' ? p.onRemoveSlip : p.onRemoveCraving)(x.id); }}>消す</button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
