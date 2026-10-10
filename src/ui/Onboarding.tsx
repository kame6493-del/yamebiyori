import { useState } from 'react';
import { BASE_KINDS, FLAVOR } from '../domain/flavor';
import type { HabitKind } from '../domain/types';
import { APP_ICON, art } from './art';
import { HabitForm, type HabitFields } from './HabitForm';

type Pick = 'alcohol' | 'smoke' | 'both';

const PICKS: { k: Pick; label: string; sub: string; icons: string[] }[] = [
  { k: 'alcohol', label: 'お酒', sub: '禁酒・断酒・減酒', icons: ['ic_drink'] },
  { k: 'smoke', label: 'たばこ', sub: '禁煙・卒煙', icons: ['ic_smoke'] },
  { k: 'both', label: '両方', sub: 'お酒とたばこを別々に数える', icons: ['ic_drink', 'ic_smoke'] },
];

/**
 * はじめて開いたときの画面(見本の「さっそく始める」の画面)。
 * both: 何をやめるか(お酒 / たばこ / 両方)を選ぶ → 選んだ物ごとに、やめ始めた日時・お金・理由を入れる。
 *   両方のときは2つ入れ終えてから、まとめて保存する(途中で閉じても半端な記録を残さない)。
 * お酒かたばこの1つだけで組んだ版(sake / tabako)は「さっそく始める」から入力へ。
 */
export function Onboarding(p: { now: number; onDone: (fs: HabitFields[]) => void }) {
  const single = BASE_KINDS.length === 1;
  const [kinds, setKinds] = useState<HabitKind[] | null>(null);
  const [done, setDone] = useState<HabitFields[]>([]);
  const thing = FLAVOR.kind === 'smoke' ? 'たばこ' : FLAVOR.kind === 'alcohol' ? 'お酒' : 'お酒やたばこ';
  const te = FLAVOR.kind === 'smoke' ? '吸って' : '飲んで';

  if (!kinds) {
    return (
      <div className="page onboard">
        <section className="welcome">
          <img className="app-icon" src={APP_ICON} alt="" />
          <p className="brand-name big">やめ日和<img src={art('ic_leaf')} alt="" /></p>
          <p className="tagline">やめる。続ける。<br />きっと、いい日がくる。</p>
          <p className="welcome-lead">{thing}をやめた日を、数えていきます。</p>
        </section>
        <ul className="feats">
          <li><img className="art" src={art('ic_leaf')} alt="" /><span><b>数え直すのは今回だけ</b><small>もし{te}しまっても、通算の記録や最長記録はそのまま残ります。</small></span></li>
          <li><img className="art" src={art('cat_heart')} alt="" /><span><b>広告なし・登録なし</b><small>余計なものはありません。シンプルに、気持ちよく続けられます。</small></span></li>
          <li><img className="art" src={art('st_lock')} alt="" /><span><b>記録は端末の中だけ</b><small>あなたの記録は端末の中に保存され、外部に送信されません。医療の助言や診断はしません。</small></span></li>
        </ul>
        {single ? (
          <div className="form-actions">
            <button className="btn coral wide big start-btn" onClick={() => setKinds(BASE_KINDS)}>さっそく始める</button>
          </div>
        ) : (
          <fieldset className="field">
            <legend>何をやめますか</legend>
            <div className="pick">
              {PICKS.map((x) => (
                <button key={x.k} className="pick-btn" onClick={() => { setDone([]); setKinds(x.k === 'both' ? ['alcohol', 'smoke'] : [x.k]); }}>
                  <span className="pick-ic">{x.icons.map((i) => <img key={i} src={art(i)} alt="" />)}</span>
                  <b>{x.label}</b>
                  <span>{x.sub}</span>
                  <span className="chev" aria-hidden>›</span>
                </button>
              ))}
            </div>
            <p className="small muted">あとから設定で足したり、消したりできます。</p>
          </fieldset>
        )}
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
      step={kinds.length > 1 ? `${i + 1}/${kinds.length}` : undefined}
      saveLabel={last ? 'はじめる' : `つぎへ(${next === 'smoke' ? 'たばこ' : 'お酒'})`}
      now={p.now}
      onCancel={() => (i > 0 ? setDone(done.slice(0, -1)) : setKinds(null))}
      onSave={(f) => {
        const all = [...done, f];
        if (all.length === kinds.length) p.onDone(all);
        else setDone(all);
      }}
    />
  );
}
