import { useState } from 'react';
import { wordsFor } from '../domain/flavor';
import { ALCOHOL_TIPS } from '../domain/health';
import { computeStats } from '../domain/stats';
import type { Habit } from '../domain/types';
import { Cite, fromLocalInput, toLocalInput, TopBar } from './common';

export function SlipPage(p: { habit: Habit; now: number; onSave: (s: { at: string; amount?: number; note?: string }) => void; onClose: () => void }) {
  const h = p.habit;
  const w = wordsFor(h.kind, h.name);
  const s = computeStats(h, p.now);
  const [at, setAt] = useState(toLocalInput(new Date(p.now).toISOString()));
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
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
      <TopBar title={`${w.verbUse}日の記録`} onClose={p.onClose} />
      <section className="gentle">
        <p className="gentle-h">記録してくれて、ありがとう。</p>
        <p>ここまでの通算<b>{s.totalDays}日</b>は消えません。数え直すのは「今回」だけです。{w.verbUse}日も、次に活かせる大事な記録です。</p>
      </section>

      <fieldset className="field">
        <legend>いつ</legend>
        <input className="input" type="datetime-local" aria-label="日時" value={at} max={toLocalInput(new Date(p.now).toISOString())} onChange={(e) => setAt(e.target.value)} />
      </fieldset>
      <fieldset className="field">
        <legend>量(書かなくてもかまいません)</legend>
        <span className="unit-in"><input className="input" inputMode="numeric" aria-label="量" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} />{w.unit}</span>
      </fieldset>
      <fieldset className="field">
        <legend>きっかけのメモ(次の作戦に使います)</legend>
        <textarea className="input" rows={2} maxLength={120} placeholder="例: 送別会で断りにくかった" value={note} onChange={(e) => setNote(e.target.value)} />
      </fieldset>

      {h.kind === 'alcohol' && (
        <section className="card tips">
          <p className="card-h">飲むときに考えられる配慮</p>
          <p className="small">{ALCOHOL_TIPS.lead}</p>
          <ol className="small">{ALCOHOL_TIPS.items.map((t) => <li key={t}>{t}</li>)}</ol>
          <Cite s={ALCOHOL_TIPS.source} />
        </section>
      )}

      {err && <p className="err" role="alert">{err}</p>}
      <div className="bottom-bar">
        <button className="btn primary wide big" onClick={save}>記録して、また今日から</button>
      </div>
    </div>
  );
}
