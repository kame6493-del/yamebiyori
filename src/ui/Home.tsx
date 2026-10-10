import { wordsFor } from '../domain/flavor';
import { CAUTION, quotesFor, timelineProgress, TOBACCO_TIMELINE } from '../domain/health';
import { nextMilestone, reachedMilestones, milestoneTime } from '../domain/milestones';
import { computeStats, DAY, formatDuration, HOUR } from '../domain/stats';
import type { Theme } from '../domain/themes';
import type { Habit } from '../domain/types';
import { art, thingIcon, yen } from './art';
import { Cite, fmtShort, QuoteCard } from './common';

export function Home(p: {
  habit: Habit; habits: Habit[]; now: number; premium: boolean; theme: Theme;
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
  // ホームは励みになる一文だけ(1年未満は脂肪肝、1年からは禁酒の年数)。ほかの引用は「読みもの」に
  const q = quotes.length ? quotes[s.streakMs >= 365 * DAY ? 1 : 0] : null;
  const tl = timelineProgress(s.streakMs);
  const smoke = h.kind === 'smoke';
  // 帯の絵: 若葉のときは、たばこは公園のベンチ・お酒は湖と朝日。ほかの色はその色の景色
  const banner = p.theme.id === 'base' ? (smoke ? 'hero_park' : 'hero_lake') : p.theme.art;
  const longestDays = Math.floor(s.longestMs / DAY);

  return (
    <div className="page home">
      <header className="home-head">
        {p.habits.length > 1 ? (
          <div className="pair-list" role="tablist" aria-label="やめていること">
            {p.habits.map((x) => {
              const xs = computeStats(x, p.now);
              return (
                <button key={x.id} role="tab" aria-selected={x.id === h.id} className={`pair-card ${x.id === h.id ? 'on' : ''}`} onClick={() => p.onSwitch(x.id)}>
                  <img className="pair-ic" src={thingIcon(x.kind)} alt="" />
                  <span className="pair-thing">{wordsFor(x.kind, x.name).thing}</span>
                  <span className="pair-days"><b>{xs.streakDays}</b>日</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="brand"><img src={art('logo_sprout')} alt="" /><span className="brand-name">やめ日和</span></div>
        )}
      </header>

      {fresh && (
        <section className="celebrate">
          <img className="art" src={art('ic_crown_big')} alt="" />
          <div>
            <p className="small muted">おめでとうございます</p>
            <p>通算<b>{fresh.label}</b>になりました。</p>
          </div>
          <button className="btn small coral" onClick={() => p.onCard(fresh.days)}>記念の画像をつくる</button>
        </section>
      )}

      <section className={`banner home-banner ${p.theme.id === 'yoru' ? 'on-dark' : ''}`}>
        <img className="art" src={art(banner)} alt="" />
        <p className="banner-msg">{smoke ? <>深呼吸で、<br />こころもからだも軽やかに</> : <>今日も一歩ずつ<br />よくがんばっています</>}</p>
      </section>

      <section className="hero">
        <img className="art hero-ic" src={art('logo_sprout')} alt="" />
        <div>
          <p className="hero-label">{w.thing}をやめて</p>
          <p className="hero-num"><b>{s.streakDays}</b><span>日</span><small>{hours}時間</small></p>
        </div>
      </section>

      <div className="stats">
        <div><img className="art" src={art('ic_sprout')} alt="" /><p><span>今回</span><b>{s.streakDays}<i>日</i></b><small>({fmtShort(s.lastUseAt)}〜)</small></p></div>
        <div><img className="art" src={art('ic_total')} alt="" /><p><span>通算</span><b>{s.totalDays}<i>日</i></b></p></div>
        <div><img className="art" src={art('ic_crown')} alt="" /><p><span>最長</span><b>{longestDays >= 1 ? <>{longestDays}<i>日</i></> : formatDuration(s.longestMs)}</b></p></div>
        <div><img className="art" src={art('ic_coins')} alt="" /><p><span>浮いたお金</span><b>{Math.floor(s.savedYen).toLocaleString('ja-JP')}<i>円</i></b></p></div>
      </div>
      {p.habits.length > 1 && (
        <p className="pair-total small">合わせて浮いたお金 <b>{yen(p.habits.reduce((a, x) => a + computeStats(x, p.now).savedYen, 0))}</b></p>
      )}

      <section className="note-card">
        <img className="art" src={art('ic_leaf')} alt="" />
        <p>もし{w.te}しまっても、通算の記録や最長記録、浮いたお金はそのまま残ります。</p>
      </section>

      <div className="actions">
        <button className="btn coral big wide crave-btn" onClick={p.onCrave}>
          <span className="heart" aria-hidden><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></svg></span>
          気持ちが来た
        </button>
        <button className="btn wide slip-btn" onClick={p.onSlip}>{w.te}しまった日を記録する</button>
      </div>

      {next && (
        <section className="next">
          <p className="small"><span>次の記念日 通算{next.label}まで</span><b>あと{next.days - s.totalDays}日</b></p>
          <div className="bar"><i style={{ width: `${pct}%` }} /></div>
        </section>
      )}

      {h.reason && (
        <section className="card reason">
          <p className="card-h">やめたい理由</p>
          <p className="reason-text">{h.reason}</p>
        </section>
      )}

      {smoke && s.streakMs < 14 * DAY && <QuoteCard q={CAUTION.smoke} />}
      {h.kind === 'alcohol' && s.streakMs < 7 * DAY && (
        <section className="card caution">
          <p className="card-h">{CAUTION.alcohol.heading}</p>
          <p className="small">手のふるえ・発汗・眠れないなどの症状が出たら、無理をせず医療機関に相談してください。</p>
          <button className="link" onClick={p.onBody}>出典の原文を読む</button>
        </section>
      )}

      {smoke && (
        <section className="card body-mini" onClick={p.onBody}>
          <p className="card-h"><img className="art" src={art('cat_body')} alt="" />体の変化の目安 {tl.reached}/{TOBACCO_TIMELINE.rows.length}</p>
          {tl.next ? (
            <p>次は「{tl.next.time}」 {tl.next.lines.join(' / ')}</p>
          ) : <p>表のすべての時期を過ぎました。</p>}
          <Cite s={TOBACCO_TIMELINE.source} />
        </section>
      )}
      {h.kind === 'alcohol' && q && <QuoteCard q={q} />}

      {!p.premium && (
        <button className="unlock" onClick={p.onUnlock}>
          <img className="art" src={art('ic_crown_big')} alt="" />
          <span className="unlock-t">
            <b>完全版 買い切り</b>
            <span>グラフ・記念日の画像・待ち受け画像・色の変更・お酒とたばこのほかのやめたいことも記録</span>
          </span>
          <span className="chev" aria-hidden>›</span>
        </button>
      )}
    </div>
  );
}
