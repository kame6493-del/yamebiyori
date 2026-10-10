import { useEffect, useState } from 'react';
import { defaultScenes } from '../domain/data';
import { wordsFor } from '../domain/flavor';
import { CRAVE_LENGTH, TOBACCO_ALTERNATIVES } from '../domain/health';
import { summarizeCravings } from '../domain/stats';
import type { CravingOutcome, Habit } from '../domain/types';
import { art, copingIcon, sceneIcon, thingIcon } from './art';
import { Banner, Cite, QuoteCard, TopBar } from './common';

const TOTAL = 5 * 60;
const FACES = ['ほとんどない', 'やや弱い', 'ふつう', '強い', 'とても強い'];
const STEPS = ['気持ちを記録', '5分やり過ごす', '方法を選ぶ', '振り返って保存'];

/**
 * 気持ちが来たときの流れ(見本どおり4つの段)。
 * 1 気持ちを記録(強さ・どの習慣・場面) → 2 5分タイマー(試してみる) → 3 効いた方法(これまでの記録の順) → 4 振り返って保存
 * タイマーは2の段に入ったときに動き出し、3・4の段に進んでも止めない。
 */
export function Craving(p: {
  habit: Habit;
  habits: Habit[];
  onDone: (habitId: string, c: { strength: number; scene: string; coping: string; outcome: CravingOutcome; note?: string }) => void;
  onClose: () => void;
  onAddCoping: (habitId: string, text: string) => void;
}) {
  const [hid, setHid] = useState(p.habit.id);
  const h = p.habits.find((x) => x.id === hid) ?? p.habit;
  const w = wordsFor(h.kind, h.name);
  const [step, setStep] = useState(1);
  const [started, setStarted] = useState<number | null>(null);
  const [left, setLeft] = useState(TOTAL);
  const [strength, setStrength] = useState(3);
  const [scenes, setScenes] = useState<string[]>([]);
  const [coping, setCoping] = useState('');
  const [adding, setAdding] = useState('');
  const [showAlt, setShowAlt] = useState(false);
  const [outcome, setOutcome] = useState<CravingOutcome>('passed');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (started === null) return;
    const tick = () => setLeft(Math.max(0, TOTAL - Math.floor((Date.now() - started) / 1000)));
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [started]);

  useEffect(() => { window.scrollTo(0, 0); }, [step]);

  const go = (n: number) => {
    if (n >= 2 && started === null) setStarted(Date.now());
    setStep(n);
  };
  const toggleScene = (c: string) => setScenes(scenes.includes(c) ? scenes.filter((x) => x !== c) : [...scenes, c]);
  const pickHabit = (id: string) => { setHid(id); setScenes([]); setCoping(''); };

  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  const r = 54;
  const C = 2 * Math.PI * r;
  const sum = summarizeCravings(h.cravings);
  const ranked = [
    ...sum.byCoping.filter((c) => h.copings.includes(c.coping)),
    ...h.copings.filter((c) => !sum.byCoping.some((x) => x.coping === c)).map((c) => ({ coping: c, tried: 0, passed: 0 })),
  ];

  const stepper = (
    <ol className="stepper" aria-label="気持ちが来たときの流れ">
      {STEPS.map((t, i) => <li key={t} className={i + 1 === step ? 'on' : i + 1 < step ? 'done' : ''}><b>{i + 1}</b><span>{t}</span></li>)}
    </ol>
  );

  if (step === 1) {
    return (
      <div className="page craving step1">
        <TopBar title="気持ちが来た" onClose={p.onClose} closeLabel="閉じる" />
        {stepper}
        <Banner name="feel_hero" className="tall" msg={<>大丈夫です。<br />気持ちに気づけたことが、<br />すでに一歩です。</>} />
        <section className="sheet-card">
          <p className="legend">今どれくらい強い?</p>
          <div className="faces strength" role="radiogroup" aria-label="気持ちの強さ">
            {FACES.map((label, i) => (
              <button key={label} role="radio" aria-checked={strength === i + 1} className={strength === i + 1 ? 'on' : ''} onClick={() => setStrength(i + 1)}>
                <img src={art(`face_${i + 1}`)} alt="" />
                <b>{i + 1}</b>
                <small>{label}</small>
              </button>
            ))}
          </div>

          {p.habits.length > 1 && (
            <>
              <p className="legend">どの習慣の気持ちですか?</p>
              <div className="habit-pick">
                {p.habits.map((x) => (
                  <button key={x.id} className={x.id === h.id ? 'on' : ''} aria-pressed={x.id === h.id} onClick={() => pickHabit(x.id)}>
                    <img src={thingIcon(x.kind)} alt="" />{wordsFor(x.kind, x.name).thing}
                  </button>
                ))}
              </div>
            </>
          )}

          <p className="legend">どんな場面ですか? <small className="muted">(いくつでも選べます)</small></p>
          <div className="scenes">
            {defaultScenes(h.kind).map((c) => {
              const ic = sceneIcon(c);
              return (
                <button key={c} className={`chip-btn scene ${scenes.includes(c) ? 'on' : ''}`} aria-pressed={scenes.includes(c)} onClick={() => toggleScene(c)}>
                  {ic && <img src={ic} alt="" />}<span>{c}</span>
                </button>
              );
            })}
          </div>
        </section>
        <div className="bottom-bar">
          <button className="btn coral wide big next-btn" onClick={() => go(2)}>次へ進む<span className="chev" aria-hidden>›</span></button>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="page craving step2">
        <TopBar title="5分タイマー" onClose={() => setStep(1)} />
        {stepper}
        <section className="timer-head">
          <h2>5分だけ<br />やり過ごしてみよう</h2>
          <p className="muted">この気持ちは、波のように、きっとやわらぎます。</p>
        </section>
        <section className="timer">
          <svg viewBox="0 0 128 128" width="220" height="220" aria-hidden>
            <circle cx="64" cy="64" r={r} className="t-bg" />
            <circle cx="64" cy="64" r={r} className="t-fg" strokeDasharray={C} strokeDashoffset={C * (1 - left / TOTAL)} transform="rotate(-90 64 64)" />
          </svg>
          <div className="timer-in">
            <img className="art" src={art('ic_leaf')} alt="" />
            <p className="timer-num" aria-live="polite">{left > 0 ? `${mm}:${ss}` : 'おつかれさま'}</p>
            <p className="timer-total">{left > 0 ? '5:00' : '5分たちました'}</p>
          </div>
        </section>
        <p className="soft-msg">{left > 0 ? <>今はただ、5分だけ。<br />それだけで、きっと変わります。</> : <>5分たちました。<br />気持ちはどうですか。</>}</p>

        {h.kind === 'smoke' && <QuoteCard q={CRAVE_LENGTH} />}

        {h.reason && (
          <section className="card reason">
            <p className="card-h">やめたい理由</p>
            <p className="reason-text">{h.reason}</p>
          </section>
        )}

        <section className="sheet-card">
          <p className="legend">試してみる</p>
          <div className="try-grid">
            {h.copings.map((c) => (
              <button key={c} className={`chip-btn try ${coping === c ? 'on' : ''}`} aria-pressed={coping === c} onClick={() => setCoping(coping === c ? '' : c)}>
                <img src={copingIcon(c)} alt="" /><span>{c}</span>
              </button>
            ))}
          </div>
          <div className="add-row">
            <input className="input" placeholder="自分の方法を足す" value={adding} maxLength={24} onChange={(e) => setAdding(e.target.value)} />
            <button className="btn small" disabled={!adding.trim()} onClick={() => { p.onAddCoping(h.id, adding.trim()); setCoping(adding.trim()); setAdding(''); }}>足す</button>
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
        <div className="bottom-bar two">
          <button className="btn wide" onClick={() => go(3)}>効いた方法を見る</button>
          <button className="btn coral wide to-save" onClick={() => go(4)}>次へ(振り返り)</button>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="page craving step3">
        <TopBar title="効いた方法" onClose={() => setStep(2)} />
        {stepper}
        <p className="lead-c muted">これまでの記録から、あなたによく効いた方法を表示しています。</p>
        <p className="tabs1"><span className="on">自分によく効いた順</span></p>
        <ul className="methods">
          {ranked.map((c) => (
            <li key={c.coping}>
              <button className={coping === c.coping ? 'on' : ''} aria-pressed={coping === c.coping} onClick={() => setCoping(c.coping)}>
                <img src={copingIcon(c.coping)} alt="" />
                <span className="m-name">{c.coping}</span>
                {c.tried > 0 ? (
                  <span className="m-rate"><b>{Math.round((c.passed / c.tried) * 100)}<small>%</small></b><small>{c.passed}回 乗り切れた</small></span>
                ) : <span className="m-rate"><small>まだ記録なし</small></span>}
              </button>
            </li>
          ))}
        </ul>
        <div className="bottom-bar stack">
          <button className="btn coral wide" disabled={!coping} onClick={() => { setOutcome('passed'); go(4); }}>これで乗り切れた</button>
          <button className="btn wide ghost" onClick={() => setStep(2)}>他の方法も見る</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page craving step4">
      <TopBar title="今回の記録を保存" onClose={() => setStep(2)} />
      {stepper}
      <Banner name="sprout_lake" msg={null} />
      <p className="soft-msg">{outcome === 'passed' ? 'よくやり過ごせました。' : '記録してくれて、ありがとう。'}<br />どんな結果でも、記録することが<br />次につながります。</p>
      <section className="sheet-card">
        <div className="sum-h"><p className="legend">今回の記録</p><button className="link small" onClick={() => setStep(1)}>編集する</button></div>
        <table className="sum">
          <tbody>
            <tr><th>強さ</th><td><img src={art(`face_${strength}`)} alt="" />{strength}({FACES[strength - 1]})</td></tr>
            <tr><th>習慣</th><td><img src={thingIcon(h.kind)} alt="" />{w.thing}</td></tr>
            <tr><th>場面</th><td>{scenes.length ? <>{sceneIcon(scenes[0]) && <img src={sceneIcon(scenes[0])} alt="" />}{scenes.join('・')}</> : <span className="muted">—</span>}</td></tr>
            <tr><th>乗り切り方</th><td>{coping ? <><img src={copingIcon(coping)} alt="" />{coping}</> : <span className="muted">—</span>}</td></tr>
          </tbody>
        </table>
        <p className="legend">ひとことメモ <small className="muted">(任意)</small></p>
        <textarea className="input" rows={3} maxLength={200} placeholder={'どんな気持ちだった?\n変化はありましたか?'} value={note} onChange={(e) => setNote(e.target.value)} />
        <p className="count small muted">{note.length}/200</p>
        <p className="legend">今回はどうでしたか?</p>
        <div className="outcome" role="radiogroup" aria-label="今回はどうでしたか">
          <button role="radio" aria-checked={outcome === 'passed'} className={`oc-pass ${outcome === 'passed' ? 'on' : ''}`} onClick={() => setOutcome('passed')}>
            <img src={art('ic_leaf')} alt="" /><b>乗り切れた</b><small>よくがんばりました<br />この調子でいきましょう</small>
          </button>
          <button role="radio" aria-checked={outcome === 'used'} className={`oc-used ${outcome === 'used' ? 'on' : ''}`} onClick={() => setOutcome('used')}>
            <span className="heart" aria-hidden><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></svg></span>
            <b>{w.te}しまった</b><small>それでも大丈夫です<br />また今日から</small>
          </button>
        </div>
        {outcome === 'used' && <p className="caution-note small">「今回」の日数だけを数え直します。通算・最長・浮いたお金は残ります。</p>}
      </section>
      <div className="bottom-bar">
        <button className="btn coral wide big save-btn" onClick={() => p.onDone(h.id, { strength, scene: scenes.join('・'), coping, outcome, ...(note.trim() ? { note: note.trim() } : {}) })}>記録を保存する</button>
      </div>
    </div>
  );
}
