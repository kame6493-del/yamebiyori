import { ALCOHOL_TIPS, APP_NOTE, CAUTION, quotesFor, timelineProgress, TOBACCO_ALTERNATIVES, TOBACCO_TIMELINE } from '../domain/health';
import { computeStats, formatDuration } from '../domain/stats';
import type { Habit } from '../domain/types';
import { Cite, HabitSwitch, QuoteCard, TopBar } from './common';

export function BodyPage(p: { habit: Habit; habits: Habit[]; now: number; onSwitch: (id: string) => void }) {
  const h = p.habit;
  const s = computeStats(h, p.now);
  const tl = timelineProgress(s.streakMs);

  return (
    <div className="page body">
      <TopBar title="体の変化の目安" />
      <HabitSwitch habits={p.habits} activeId={h.id} onSwitch={p.onSwitch} />
      <p className="note">{APP_NOTE}</p>

      {h.kind === 'smoke' && (
        <section className="card">
          <p className="card-h">禁煙の効果(最後に吸ってから {formatDuration(s.streakMs)})</p>
          <p className="small">{TOBACCO_TIMELINE.intro}</p>
          <table className="tl">
            <tbody>
              {TOBACCO_TIMELINE.rows.map((r, i) => (
                <tr key={r.time} className={i < tl.reached ? 'got' : i === tl.reached ? 'next' : ''}>
                  <th>{r.time}</th>
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
          <QuoteCard q={CAUTION[h.kind]} className={h.kind === 'alcohol' ? 'caution' : ''} />
          {quotesFor(h.kind).map((q) => <QuoteCard key={q.heading} q={q} />)}
        </>
      )}

      {h.kind === 'smoke' && (
        <section className="card">
          <p className="card-h">吸いたくなる場面と、代わりになる行動の例</p>
          <table className="alt-table">
            <thead><tr><th>たばこを吸いたくなる場面</th><th>代わりになる行動</th></tr></thead>
            <tbody>{TOBACCO_ALTERNATIVES.rows.map(([a, b]) => <tr key={a}><td>{a}</td><td>{b}</td></tr>)}</tbody>
          </table>
          <Cite s={TOBACCO_ALTERNATIVES.source} />
        </section>
      )}

      {h.kind === 'alcohol' && (
        <section className="card">
          <p className="card-h">飲むときに考えられる配慮</p>
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
