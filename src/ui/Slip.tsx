import { useState } from 'react';
import { wordsFor } from '../domain/flavor';
import { ALCOHOL_TIPS } from '../domain/health';
import { slipOnDay } from '../domain/data';
import { computeStats } from '../domain/stats';
import type { Habit } from '../domain/types';
import { art } from './art';
import { Banner, Cite, fromLocalInput, toLocalInput, TopBar } from './common';

/** 飲んでしまった日・吸ってしまった日の記録。責めずに「今回だけ数え直す」ことを先に見せる */
export function SlipPage(p: { habit: Habit; now: number; onSave: (s: { at: string; amount?: number; note?: string }) => void; onClose: () => void }) {
  const h = p.habit;
  const w = wordsFor(h.kind, h.name);
  const s = computeStats(h, p.now);
  const [at, setAt] = useState(toLocalInput(new Date(p.now).toISOString()));
  const today = slipOnDay(h, new Date(p.now).toISOString());
  const [amount, setAmount] = useState(today?.amount ? String(today.amount) : '');
  const [note, setNote] = useState(today?.note ?? '');
  const iso0 = fromLocalInput(at);
  const same = iso0 ? slipOnDay(h, iso0) : undefined;
  const [err, setErr] = useState('');

  const save = () => {
    const iso = fromLocalInput(at);
    if (!iso) return setErr('日時を選んでください');
    if (Date.parse(iso) > Date.now() + 60_000) return setErr('これから先の日時は選べません');
    if (Date.parse(iso) < Date.parse(h.startAt)) return setErr('やめ始めた日時より前は選べません');
    p.onSave({ at: iso, amount: Number(amount) || undefined, note: note.trim() || undefined });
  };

  return (
    <div className="page slip">
      <TopBar title="記録する" onClose={p.onClose} closeLabel="閉じる" />
      <Banner name="sprout_soil" />
      <section className="gentle">
        <h2 className="gentle-h">{w.te}しまいましたか?</h2>
        <p>大丈夫です。誰にでも、そんな日があります。正直に記録して、また今日から始めましょう。</p>
        <p className="gentle-keep">ここまでの通算<b>{s.totalDays}日</b>は消えません。数え直すのは「今回」だけです。</p>
      </section>

      <section className="reflect">
        <p className="reflect-h">記録はこのように反映されます</p>
        <ul>
          <li><img src={art('ic_sprout')} alt="" /><span>今回の日数</span><b className="warm">0日から数え直し</b></li>
          <li><img src={art('ic_total')} alt="" /><span>通算の日数</span><b>これまで通り残ります</b></li>
          <li><img src={art('ic_crown')} alt="" /><span>最長記録</span><b>これまで通り残ります</b></li>
          <li><img src={art('ic_coins')} alt="" /><span>浮いたお金</span><b>これまで通り残ります</b></li>
        </ul>
      </section>

      <section className="sheet-card">
        <fieldset className="field">
          <legend>いつ</legend>
          <input className="input" type="datetime-local" aria-label="日時" value={at} max={toLocalInput(new Date(p.now).toISOString())} onChange={(e) => setAt(e.target.value)} />
        </fieldset>
        {same && <p className="caution-note small slip-same">この日の記録はもうあります。保存すると、1件のまま書き直します。</p>}
        <fieldset className="field">
          <legend>量(書かなくてもかまいません)</legend>
          <span className="unit-in"><input className="input" inputMode="numeric" aria-label="量" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} />{w.unit}</span>
        </fieldset>
        <fieldset className="field">
          <legend>きっかけのメモ(次の作戦に使います)</legend>
          <textarea className="input" rows={2} maxLength={120} placeholder="例: 送別会で断りにくかった" value={note} onChange={(e) => setNote(e.target.value)} />
        </fieldset>
      </section>

      {h.kind === 'alcohol' && (
        <section className="card tips">
          <p className="card-h">飲むときに考えられる配慮</p>
          <p className="small">{ALCOHOL_TIPS.lead}</p>
          <ol className="small">{ALCOHOL_TIPS.items.map((t) => <li key={t}>{t}</li>)}</ol>
          <Cite s={ALCOHOL_TIPS.source} />
        </section>
      )}

      <section className="bird-card">
        <img className="art" src={art('bird')} alt="" />
        <p>うまくいかない日があっても、それはダメなことではありません。気づいて、記録して、また今日から。それだけで、十分です。</p>
      </section>

      {err && <p className="err" role="alert">{err}</p>}
      <div className="bottom-bar stack">
        <button className="btn coral wide big" onClick={save}>{same ? '書き直して、また今日から' : '記録して、また今日から'}</button>
        <button className="btn wide ghost" onClick={p.onClose}>まだ{w.te}いない(記録を続ける)</button>
      </div>
    </div>
  );
}
