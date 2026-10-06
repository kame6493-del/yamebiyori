import { useState } from 'react';
import { BASE_KINDS } from '../domain/flavor';
import type { HabitKind } from '../domain/types';
import { HabitForm, type HabitFields } from './HabitForm';

type Pick = 'alcohol' | 'smoke' | 'both';

const PICKS: { k: Pick; label: string; sub: string }[] = [
  { k: 'alcohol', label: 'お酒', sub: '禁酒・断酒・減酒' },
  { k: 'smoke', label: 'たばこ', sub: '禁煙・卒煙' },
  { k: 'both', label: '両方', sub: 'お酒とたばこを別々に数える' },
];

/**
 * はじめて開いたときの画面。
 * 1) 何をやめるか(お酒 / たばこ / 両方)を選ぶ → 2) 選んだ物ごとに、やめ始めた日時・お金・理由を入れる。
 * 両方のときは2つ入れ終えてから、まとめて保存する(途中で閉じても半端な記録を残さない)。
 * お酒かたばこの1つだけで組んだ版(sake / tabako)は、選ぶ画面を出さずに入力から始める。
 */
export function Onboarding(p: { now: number; onDone: (fs: HabitFields[]) => void }) {
  const single = BASE_KINDS.length === 1;
  const [kinds, setKinds] = useState<HabitKind[] | null>(single ? BASE_KINDS : null);
  const [done, setDone] = useState<HabitFields[]>([]);

  if (!kinds) {
    return (
      <div className="page form onboard">
        <section className="welcome">
          <p className="brand-name big">やめ日和</p>
          <p className="welcome-lead">お酒やたばこをやめた日を、数えていきます。<br />もし飲んだ日・吸った日があっても、それまでの日は消えません。</p>
        </section>
        <fieldset className="field">
          <legend>何をやめますか</legend>
          <div className="pick">
            {PICKS.map((x) => (
              <button key={x.k} className="pick-btn" onClick={() => { setDone([]); setKinds(x.k === 'both' ? ['alcohol', 'smoke'] : [x.k]); }}>
                <b>{x.label}</b>
                <span>{x.sub}</span>
              </button>
            ))}
          </div>
          <p className="small muted">あとから設定で足したり、消したりできます。</p>
        </fieldset>
        <section className="card">
          <p className="card-h">このアプリについて</p>
          <p className="small">広告なし・登録なし。記録はこの端末の中だけに保存します。医療の助言や診断はしません。</p>
        </section>
      </div>
    );
  }

  const i = done.length;
  const kind = kinds[i];
  const last = i === kinds.length - 1;
  const next = kinds[i + 1];
  return (
    <HabitForm
      key={`${kind}-${i}`}
      mode="first"
      kind={kind}
      intro={single}
      step={kinds.length > 1 ? `${i + 1}/${kinds.length}` : undefined}
      saveLabel={last ? 'はじめる' : `つぎへ(${next === 'smoke' ? 'たばこ' : 'お酒'})`}
      now={p.now}
      onCancel={single ? undefined : () => (i > 0 ? setDone(done.slice(0, -1)) : setKinds(null))}
      onSave={(f) => {
        const all = [...done, f];
        if (all.length === kinds.length) p.onDone(all);
        else setDone(all);
      }}
    />
  );
}
