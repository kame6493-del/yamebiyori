import { useState } from 'react';
import { wordsFor } from '../domain/flavor';
import { computeStats, dateKey, dayMarks, slipsAfterStart } from '../domain/stats';
import type { Habit } from '../domain/types';
import { art, slipIcon, yen } from './art';
import { Banner, Empty, fmtTime, HabitSwitch, TopBar, WD } from './common';

/** その日に気持ちを記録した日(dateKey の集まり) */
function cravingDays(h: Habit): Set<string> {
  return new Set(h.cravings.map((c) => dateKey(new Date(c.at))));
}

/** カレンダー。やめられた日=双葉、気持ちを記録した日=炎、飲んでしまった日=グラス(たばこは印をコーラルの丸に)。日付を押すと日別の記録 */
export function CalendarPage(p: { habit: Habit; habits: Habit[]; now: number; onSwitch: (id: string) => void; onDay: (y: number, m: number, d: number) => void }) {
  const h = p.habit;
  const w = wordsFor(h.kind, h.name);
  const today = new Date(p.now);
  const [ym, setYm] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const marks = dayMarks(h, ym.y, ym.m, p.now);
  const lead = (new Date(ym.y, ym.m, 1).getDay() + 6) % 7; // 見本どおり月曜はじまり
  const cdays = cravingDays(h);
  const keyOf = (d: number) => dateKey(new Date(ym.y, ym.m, d));
  const free = marks.filter((m) => m === 'free').length;
  const slip = marks.filter((m) => m === 'slip').length;
  const crave = marks.filter((m, i) => m !== 'none' && cdays.has(keyOf(i + 1))).length;
  const isThisMonth = ym.y === today.getFullYear() && ym.m === today.getMonth();
  const move = (d: number) => setYm(({ y, m }) => { const nd = new Date(y, m + d, 1); return { y: nd.getFullYear(), m: nd.getMonth() }; });

  return (
    <div className="page cal-page">
      <TopBar title="カレンダー" />
      <HabitSwitch habits={p.habits} activeId={h.id} onSwitch={p.onSwitch} now={p.now} />
      <section className="card cal">
        <div className="cal-head">
          <button className="icon round" aria-label="前の月" onClick={() => move(-1)}>‹</button>
          <p>{ym.y}年{ym.m + 1}月</p>
          <button className="icon round" aria-label="次の月" onClick={() => move(1)}>›</button>
        </div>
        <Banner name="cal_hero" className="cal-banner" />
        <div className="cal-sum">
          <img src={art('ic_leaf')} alt="" />
          <div>
            <p className="cal-sum-h">{isThisMonth ? '今月は' : `${ym.m + 1}月は`} <b>{free}</b>日 続いています</p>
            <p className="small muted">一歩ずつ、よくがんばっています</p>
          </div>
        </div>
        <div className="cal-grid">
          {['月', '火', '水', '木', '金', '土', '日'].map((d) => <span key={d} className={`cal-wd ${d === '日' ? 'sun' : ''}`}>{d}</span>)}
          {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
          {marks.map((m, i) => {
            const k = keyOf(i + 1);
            const isToday = k === dateKey(today);
            const c = m === 'free' && cdays.has(k);
            return (
              <button key={i} className={`cal-day ${m} ${c ? 'crave' : ''} ${isToday ? 'today' : ''}`} onClick={() => p.onDay(ym.y, ym.m, i + 1)}
                aria-label={`${i + 1}日 ${m === 'free' ? (c ? '気持ちを記録した日' : 'やめられた日') : m === 'slip' ? `${w.te}しまった日` : ''}`}>
                {m === 'none' || isToday ? <span>{i + 1}</span> : (
                  <img className={m === 'slip' && h.kind !== 'alcohol' ? 'warm-bg' : ''} src={m === 'slip' ? slipIcon(h.kind) : art(c ? 'mk_crave' : 'mk_free')} alt="" />
                )}
                {(m !== 'none' && !isToday) && <small>{i + 1}</small>}
              </button>
            );
          })}
        </div>
        <p className="small muted center">日付をタップして、その日の記録を確認できます</p>
      </section>

      <section className="card month">
        <p className="card-h">{isThisMonth ? '今月' : `${ym.m + 1}月`}の記録</p>
        <ul className="month-list">
          <li><img src={art('mk_free')} alt="" /><span>続けられた日</span><b>{free}<small>日</small></b></li>
          <li><img src={art('mk_crave')} alt="" /><span>気持ちを記録した日</span><b>{crave}<small>日</small></b></li>
          <li><img className={h.kind !== 'alcohol' ? 'warm-bg' : ''} src={slipIcon(h.kind)} alt="" /><span>{w.te}しまった日</span><b>{slip}<small>日</small></b></li>
        </ul>
      </section>

      <section className="card legend-card">
        <p className="small"><img src={art('mk_free')} alt="" />やめられた日</p>
        <p className="small"><img src={art('mk_crave')} alt="" />気持ちを記録した日</p>
        <p className="small"><img className={h.kind !== 'alcohol' ? 'warm-bg' : ''} src={slipIcon(h.kind)} alt="" />{w.te}しまった日(今回のみ数え直し)</p>
      </section>
    </div>
  );
}

/** 日別の記録 */
export function DayPage(p: { habit: Habit; now: number; y: number; m: number; d: number; onClose: () => void }) {
  const h = p.habit;
  const w = wordsFor(h.kind, h.name);
  const from = new Date(p.y, p.m, p.d).getTime();
  const to = new Date(p.y, p.m, p.d + 1).getTime();
  const key = dateKey(new Date(from));
  const start = Date.parse(h.startAt);
  const inRange = to > start && from <= p.now;
  const slips = slipsAfterStart(h).filter((s) => dateKey(new Date(s.at)) === key);
  const cravings = h.cravings.filter((c) => dateKey(new Date(c.at)) === key).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const saved = inRange ? computeStats(h, Math.min(to, p.now)).savedYen - computeStats(h, Math.max(from, start)).savedYen : 0;
  const title = `${p.m + 1}月${p.d}日(${WD[new Date(from).getDay()]})`;

  if (!inRange) {
    return (
      <div className="page day">
        <TopBar title={title} onClose={p.onClose} />
        <Empty title="この日の記録はありません" text={from > p.now ? 'まだ来ていない日です。' : `${w.thing}をやめ始める前の日です。`} />
      </div>
    );
  }
  const slipped = slips.length > 0;
  return (
    <div className="page day">
      <TopBar title={title} onClose={p.onClose} />
      <Banner name={slipped ? 'sprout_soil' : 'day_hero'} />
      <section className="day-head">
        <h2>{slipped ? `${w.te}しまった日` : 'やめられました!'}</h2>
        <p className="muted">{slipped ? '記録してくれて、ありがとう。今回だけ数え直して、また今日から。' : '今日も一歩、よくがんばりました。'}</p>
      </section>
      <section className="card day-row">
        <img src={art('ic_leaf')} alt="" /><b>{w.thing}</b>
        <span className={`pill ${slipped ? 'warm' : ''}`}>{slipped ? `${w.te}しまった` : 'やめられた'}</span>
      </section>
      <section className="card">
        <p className="card-h"><img className="inline-ic" src={art('ic_flame')} alt="" />気持ちの記録 <small className="muted">{cravings.length}回</small></p>
        {cravings.length === 0 ? <p className="small muted">この日は記録がありません。</p> : (
          <ul className="day-list">
            {cravings.map((c) => (
              <li key={c.id}>
                <span className="t">{fmtTime(Date.parse(c.at))}</span>
                <span className="dots" aria-label={`強さ${c.strength}`}>{[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= c.strength ? 'on' : ''} />)}</span>
                <span className="small">{c.scene || '場面の記録なし'}{c.coping ? ` → ${c.coping}` : ''}({c.outcome === 'passed' ? '乗り切れた' : `${w.te}しまった`})</span>
                {c.note && <span className="small muted">「{c.note}」</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
      {slipped && (
        <section className="card">
          <p className="card-h"><img className="inline-ic" src={art('ic_memo')} alt="" />メモ</p>
          {slips.map((s) => <p key={s.id} className="small">{fmtTime(Date.parse(s.at))} {s.amount ? `${s.amount}${w.unit} ` : ''}{s.note ?? 'メモなし'}</p>)}
        </section>
      )}
      <section className="card saved">
        <img src={art('ic_coins')} alt="" />
        <div><p className="small muted">この日に浮いたお金</p><p className="saved-v">+ {yen(saved)}</p></div>
      </section>
    </div>
  );
}
