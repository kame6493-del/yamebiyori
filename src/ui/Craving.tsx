import { useEffect, useState } from 'react';
import { defaultScenes } from '../domain/data';
import { wordsFor } from '../domain/flavor';
import { CRAVE_LENGTH, TOBACCO_ALTERNATIVES } from '../domain/health';
import type { CravingOutcome, Habit } from '../domain/types';
import { Cite, QuoteCard, TopBar } from './common';

const TOTAL = 5 * 60;

export function Craving(p: {
  habit: Habit;
  onDone: (c: { strength: number; scene: string; coping: string; outcome: CravingOutcome; note?: string }) => void;
  onClose: () => void;
  onAddCoping: (text: string) => void;
}) {
  const h = p.habit;
  const w = wordsFor(h.kind, h.name);
  const [left, setLeft] = useState(TOTAL);
  const [strength, setStrength] = useState(3);
  const [scene, setScene] = useState('');
  const [coping, setCoping] = useState('');
  const [adding, setAdding] = useState('');
  const [showAlt, setShowAlt] = useState(false);

  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => setLeft(Math.max(0, TOTAL - Math.floor((Date.now() - started) / 1000))), 250);
    return () => window.clearInterval(id);
  }, []);

  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, '0');
  const r = 54;
  const C = 2 * Math.PI * r;
  const done = (outcome: CravingOutcome) => p.onDone({ strength, scene, coping, outcome });

  return (
    <div className="page craving">
      <TopBar title={w.verbCrave} onClose={p.onClose} closeLabel="閉じる" />

      <section className="timer">
        <svg viewBox="0 0 128 128" width="168" height="168" aria-hidden>
          <circle cx="64" cy="64" r={r} className="t-bg" />
          <circle cx="64" cy="64" r={r} className="t-fg" strokeDasharray={C} strokeDashoffset={C * (left / TOTAL)} transform="rotate(-90 64 64)" />
        </svg>
        <p className="timer-num" aria-live="polite">{left > 0 ? `${mm}:${ss}` : 'おつかれさま'}</p>
        <p className="timer-lead">{left > 0 ? '5分だけ、別のことをしてみましょう。' : '5分たちました。気持ちはどうですか。'}</p>
      </section>

      {h.kind === 'smoke' && <QuoteCard q={CRAVE_LENGTH} />}

      {h.reason && (
        <section className="card reason">
          <p className="card-h">やめたい理由</p>
          <p className="reason-text">{h.reason}</p>
        </section>
      )}

      <section className="field">
        <p className="legend">いま試すこと</p>
        <div className="chips">
          {h.copings.map((c) => (
            <button key={c} className={`chip-btn ${coping === c ? 'on' : ''}`} onClick={() => setCoping(coping === c ? '' : c)}>{c}</button>
          ))}
        </div>
        <div className="add-row">
          <input className="input" placeholder="自分の方法を足す" value={adding} maxLength={24} onChange={(e) => setAdding(e.target.value)} />
          <button className="btn small" disabled={!adding.trim()} onClick={() => { p.onAddCoping(adding.trim()); setCoping(adding.trim()); setAdding(''); }}>足す</button>
        </div>
        {h.kind === 'smoke' && (
          <>
            <button className="link" onClick={() => setShowAlt(!showAlt)}>{showAlt ? '例をしまう' : '吸いたくなる場面と、代わりになる行動の例'}</button>
            {showAlt && (
              <div className="alt">
                <table className="alt-table">
                  <thead><tr><th>たばこを吸いたくなる場面</th><th>代わりになる行動</th></tr></thead>
                  <tbody>{TOBACCO_ALTERNATIVES.rows.map(([a, b]) => <tr key={a}><td>{a}</td><td>{b}</td></tr>)}</tbody>
                </table>
                <Cite s={TOBACCO_ALTERNATIVES.source} />
              </div>
            )}
          </>
        )}
      </section>

      <section className="field">
        <p className="legend">気持ちの強さ</p>
        <div className="seg strength" role="radiogroup" aria-label="気持ちの強さ">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} role="radio" aria-checked={strength === n} className={strength === n ? 'on' : ''} onClick={() => setStrength(n)}>{n}</button>
          ))}
        </div>
        <p className="muted small scale"><span>弱い</span><span>強い</span></p>
      </section>

      <section className="field">
        <p className="legend">どんな場面でしたか</p>
        <div className="chips">
          {defaultScenes(h.kind).map((c) => (
            <button key={c} className={`chip-btn ${scene === c ? 'on' : ''}`} onClick={() => setScene(scene === c ? '' : c)}>{c}</button>
          ))}
        </div>
      </section>

      <div className="bottom-bar two">
        <button className="btn wide" onClick={() => done('used')}>{w.verbUse}</button>
        <button className="btn primary wide" onClick={() => done('passed')}>乗り切れた</button>
      </div>
    </div>
  );
}
