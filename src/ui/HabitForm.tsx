import { useState } from 'react';
import { BASE_KINDS, wordsFor } from '../domain/flavor';
import { CAUTION } from '../domain/health';
import { yenPerDayFromPack } from '../domain/stats';
import type { Habit, HabitKind } from '../domain/types';
import { fromLocalInput, QuoteCard, toLocalInput, TopBar } from './common';

export interface HabitFields {
  kind: HabitKind; name: string; startAt: string; yenPerDay: number; packYen?: number; perDay?: number; perPack?: number; reason: string;
}

export function HabitForm(p: {
  mode: 'first' | 'add' | 'edit';
  initial?: Habit;
  now: number;
  /** はじめの画面: 何をやめるかは前の画面で決めてある */
  kind?: HabitKind;
  /** はじめの画面で、アプリの紹介を上に出す(選ぶ画面が無いとき) */
  intro?: boolean;
  /** はじめの画面で、いくつ目か(例: 1/2) */
  step?: string;
  saveLabel?: string;
  /** 足す画面: 無料で足せる種類か。だめな物は完全版の案内へ */
  canUse?: (k: HabitKind) => boolean;
  onUnlock?: () => void;
  onSave: (f: HabitFields) => void;
  onCancel?: () => void;
  onDelete?: () => void;
}) {
  const init = p.initial;
  const canUse = p.canUse ?? (() => true);
  const firstAdd = (['alcohol', 'smoke', 'custom'] as HabitKind[]).find((k) => canUse(k)) ?? 'custom';
  const [kind, setKind] = useState<HabitKind>(init?.kind ?? p.kind ?? (p.mode === 'add' ? firstAdd : BASE_KINDS[0]));
  const [name, setName] = useState(init?.name ?? '');
  const [startMode, setStartMode] = useState<'now' | 'past'>(init ? 'past' : 'now');
  const [start, setStart] = useState(toLocalInput(init?.startAt ?? new Date(p.now).toISOString()));
  const [period, setPeriod] = useState<'day' | 'week'>('week');
  const [yen, setYen] = useState(init ? String(init.cost.yenPerDay) : '');
  const [packYen, setPackYen] = useState(String(init?.cost.packYen ?? 600));
  const [perDay, setPerDay] = useState(String(init?.cost.perDay ?? 20));
  const [perPack, setPerPack] = useState(String(init?.cost.perPack ?? 20));
  const [reason, setReason] = useState(init?.reason ?? '');
  const [err, setErr] = useState('');
  const w = wordsFor(kind, name);

  // 編集のときは保存してある1日あたりの値段をそのまま出す
  const usePeriod = !init && kind !== 'smoke';
  const yenPerDay = kind === 'smoke'
    ? yenPerDayFromPack(Number(packYen), Number(perDay), Number(perPack))
    : Math.round((Number(yen) || 0) / (usePeriod && period === 'week' ? 7 : 1));

  const locked = p.mode === 'add' && !canUse(kind);

  const save = () => {
    setErr('');
    if (locked) return p.onUnlock?.();
    if (kind === 'custom' && !name.trim()) return setErr('やめたいことの名前を入れてください');
    const startAt = startMode === 'now' && !init ? new Date().toISOString() : fromLocalInput(start);
    if (!startAt) return setErr('やめ始めた日時を選んでください');
    if (Date.parse(startAt) > Date.now() + 60_000) return setErr('やめ始めた日時は、今より前を選んでください');
    p.onSave({
      kind, name: kind === 'custom' ? name.trim() : w.thing, startAt, yenPerDay: Math.max(0, yenPerDay),
      ...(kind === 'smoke' ? { packYen: Number(packYen) || 0, perDay: Number(perDay) || 0, perPack: Number(perPack) || 20 } : {}),
      reason: reason.trim(),
    });
  };

  const title = p.mode === 'first' ? `${w.thing}のこと${p.step ? `(${p.step})` : ''}` : p.mode === 'add' ? 'やめたいことを足す' : `${w.thing}の設定`;

  return (
    <div className="page form">
      {p.mode === 'first' && p.intro ? (
        <section className="welcome">
          <p className="brand-name big">やめ日和</p>
          <p className="welcome-lead">{w.thing}をやめた日を、数えていきます。<br />もし{w.verbUse}日があっても、それまでの日は消えません。</p>
        </section>
      ) : (
        <TopBar title={title} onClose={p.onCancel} />
      )}

      {p.mode === 'add' && (
        <fieldset className="field">
          <legend>何をやめますか</legend>
          <div className="seg">
            {(['alcohol', 'smoke', 'custom'] as HabitKind[]).map((k) => (
              <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{k === 'alcohol' ? 'お酒' : k === 'smoke' ? 'たばこ' : 'そのほか'}</button>
            ))}
          </div>
          {kind === 'custom' && !locked && <input className="input" placeholder="例: 甘いジュース、夜ふかし" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />}
          {locked && <p className="small muted">{kind === 'custom' ? 'お酒とたばこのほかのやめたいことは、完全版で記録できます。' : `${w.thing}はもう記録しています。2つ目からは完全版で記録できます。`}</p>}
        </fieldset>
      )}

      {!locked && (<>
      <fieldset className="field">
        <legend>いつからやめていますか</legend>
        {!init && (
          <div className="seg">
            <button className={startMode === 'now' ? 'on' : ''} onClick={() => setStartMode('now')}>いまから</button>
            <button className={startMode === 'past' ? 'on' : ''} onClick={() => setStartMode('past')}>前から(日時を選ぶ)</button>
          </div>
        )}
        {(startMode === 'past' || init) && (
          <input className="input" type="datetime-local" aria-label="やめ始めた日時" value={start} max={toLocalInput(new Date(p.now).toISOString())} onChange={(e) => setStart(e.target.value)} />
        )}
      </fieldset>

      <fieldset className="field">
        <legend>{w.thing}に使っていたお金</legend>
        {kind === 'smoke' ? (
          <div className="grid3">
            <label>1箱の値段<span className="unit-in"><input className="input" inputMode="numeric" aria-label="1箱の値段" value={packYen} onChange={(e) => setPackYen(e.target.value.replace(/\D/g, ''))} />円</span></label>
            <label>1日の本数<span className="unit-in"><input className="input" inputMode="numeric" aria-label="1日の本数" value={perDay} onChange={(e) => setPerDay(e.target.value.replace(/\D/g, ''))} />本</span></label>
            <label>1箱の本数<span className="unit-in"><input className="input" inputMode="numeric" aria-label="1箱の本数" value={perPack} onChange={(e) => setPerPack(e.target.value.replace(/\D/g, ''))} />本</span></label>
          </div>
        ) : (
          <>
            {usePeriod && (
              <div className="seg small">
                <button className={period === 'week' ? 'on' : ''} onClick={() => setPeriod('week')}>1週間あたり</button>
                <button className={period === 'day' ? 'on' : ''} onClick={() => setPeriod('day')}>1日あたり</button>
              </div>
            )}
            <span className="unit-in wide"><input className="input" inputMode="numeric" aria-label="使っていたお金" placeholder={kind === 'alcohol' ? '例: 3500' : '例: 300'} value={yen} onChange={(e) => setYen(e.target.value.replace(/\D/g, ''))} />円</span>
          </>
        )}
        <p className="muted small">1日あたり {yenPerDay.toLocaleString('ja-JP')}円 として、浮いたお金を数えます。あとで変えられます。</p>
      </fieldset>

      <fieldset className="field">
        <legend>やめたい理由(つらい時に読み返します)</legend>
        <textarea className="input" rows={2} maxLength={120} placeholder={kind === 'smoke' ? '例: 子どもと思いきり走りたい。服のにおいを気にしたくない。' : '例: 朝すっきり起きたい。子どもと公園に行きたい。'} value={reason} onChange={(e) => setReason(e.target.value)} />
      </fieldset>

      {p.mode !== 'edit' && kind !== 'custom' && <QuoteCard q={CAUTION[kind]} className={kind === 'alcohol' ? 'caution' : ''} />}
      {p.mode !== 'edit' && kind === 'alcohol' && <p className="small caution-note">毎日たくさん飲んでいた方は、急にやめる前に医療機関や専門の窓口に相談してください。</p>}
      </>)}

      {err && <p className="err" role="alert">{err}</p>}
      <div className="form-actions">
        <button className="btn primary wide big" onClick={save}>{locked ? '完全版について' : p.saveLabel ?? (p.mode === 'edit' ? '保存する' : 'はじめる')}</button>
        {p.onDelete && <button className="btn danger wide" onClick={p.onDelete}>この記録を消す</button>}
      </div>
    </div>
  );
}
