import { ALCOHOL_TIPS, APP_NOTE, CAUTION, quotesFor, timelineProgress, TOBACCO_ALTERNATIVES, TOBACCO_TIMELINE } from '../domain/health';
import { computeStats, formatDuration } from '../domain/stats';
import type { Habit } from '../domain/types';
import { art } from './art';
import { Banner, Cite, HabitSwitch, QuoteCard, TopBar } from './common';

/** 時期ごとの色(見本のタイムラインの丸) */
const TL_COLORS = ['#e8896f', '#f2b350', '#7fb069', '#8fb6cf', '#8f86c0', '#7fb069', '#e8896f', '#8fb6cf'];
/** 行ごとの絵(心臓・肺)。言葉は出典の原文のまま */
const TL_ART = ['cat_heart', 'cat_body', 'cat_body', 'cat_body', 'cat_heart', 'cat_heart', 'cat_body', 'cat_heart'];

export function BodyPage(p: { habit: Habit; habits: Habit[]; now: number; onSwitch: (id: string) => void }) {
  const h = p.habit;
  const s = computeStats(h, p.now);
  const tl = timelineProgress(s.streakMs);
  const thumbs = h.kind === 'smoke' ? ['art_lungs', 'art_calm', 'art_tree'] : ['art_calm', 'art_tree', 'cat_grow'];

  return (
    <div className="page body">
      <TopBar title="読みもの" />
      <HabitSwitch habits={p.habits} activeId={h.id} onSwitch={p.onSwitch} now={p.now} />
      <Banner name="read_hero" className="read-banner" msg={<>からだのことを、<br />公的な出典の原文で。</>} />
      <p className="note">{APP_NOTE}</p>

      {h.kind === 'smoke' && (
        <section className="card">
          <p className="card-h">からだの変化の目安(最後に吸ってから {formatDuration(s.streakMs)})</p>
          <p className="small">{TOBACCO_TIMELINE.intro}</p>
          <table className="tl">
            <tbody>
              {TOBACCO_TIMELINE.rows.map((r, i) => (
                <tr key={r.time} className={i < tl.reached ? 'got' : i === tl.reached ? 'next' : ''}>
                  <th><span className="tl-dot" style={{ background: TL_COLORS[i] }}>{r.time}</span></th>
                  <td className="tl-art"><img src={art(TL_ART[i])} alt="" /></td>
                  <td>{r.lines.map((l) => <span key={l}>{l}</span>)}</td>
                  <td className="tl-mark" aria-label={i < tl.reached ? '過ぎた' : ''}>{i < tl.reached ? '✓' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Cite s={TOBACCO_TIMELINE.source} />
          <p className="small muted">✓は、最後に吸ってからの時間がその時期を過ぎた印です。体がそうなったという判定ではありません。</p>
        </section>
      )}

      {h.kind !== 'custom' && (
        <>
          <p className="sec-h">読みもの</p>
          <QuoteCard q={CAUTION[h.kind]} className={h.kind === 'alcohol' ? 'caution' : ''} thumb="cat_heart" tag="はじめの時期" />
          {quotesFor(h.kind).map((q, i) => <QuoteCard key={q.heading} q={q} thumb={thumbs[i % thumbs.length]} tag="からだ" />)}
        </>
      )}

      {h.kind === 'smoke' && (
        <section className="card">
          <p className="card-h"><img className="inline-ic" src={art('cat_grow')} alt="" />吸いたくなる場面と、代わりになる行動の例</p>
          <table className="alt-table">
            <thead><tr><th>たばこを吸いたくなる場面</th><th>代わりになる行動</th></tr></thead>
            <tbody>{TOBACCO_ALTERNATIVES.rows.map(([a, b]) => <tr key={a}><td>{a}</td><td>{b}</td></tr>)}</tbody>
          </table>
          <Cite s={TOBACCO_ALTERNATIVES.source} />
        </section>
      )}

      {h.kind === 'alcohol' && (
        <section className="card">
          <p className="card-h"><img className="inline-ic" src={art('cat_grow')} alt="" />飲むときに考えられる配慮</p>
          <p className="small">{ALCOHOL_TIPS.lead}</p>
          <ol className="small">{ALCOHOL_TIPS.items.map((t) => <li key={t}>{t}</li>)}</ol>
          <Cite s={ALCOHOL_TIPS.source} />
        </section>
      )}

      {h.kind === 'custom' && <p className="muted">この項目には、公的な出典のある体の変化の情報を載せていません。</p>}

      <section className="card">
        <p className="card-h">相談できる所</p>
        <p className="small">お酒やたばこをやめるのがつらいときは、かかりつけの医師、禁煙外来、お住まいの地域の保健所・精神保健福祉センターに相談できます。</p>
      </section>
    </div>
  );
}
