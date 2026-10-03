import { useState } from 'react';
import { purchase, restore, type BillingState } from '../platform/billing';
import { TopBar } from './common';

export function Paywall(p: { billing: BillingState; onClose: () => void; onBought: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const price = p.billing.status === 'ready' ? p.billing.price ?? '' : '';

  const buy = async () => {
    setBusy(true); setMsg('');
    try {
      if (await purchase(p.billing)) p.onBought();
    } catch (e) {
      setMsg(`購入できませんでした(${(e as Error).message ?? e})`);
    } finally { setBusy(false); }
  };
  const doRestore = async () => {
    setBusy(true); setMsg('');
    try {
      if (await restore()) p.onBought();
      else setMsg('このアカウントでの購入は見つかりませんでした');
    } catch (e) {
      setMsg(`復元できませんでした(${(e as Error).message ?? e})`);
    } finally { setBusy(false); }
  };

  const rows: [string, string, string][] = [
    ['やめた日数・浮いたお金', '○', '○'],
    ['気持ちの記録と5分タイマー', '○', '○'],
    ['体の変化の目安(出典つき)', '○', '○'],
    ['記念日のお知らせ', '○', '○'],
    ['控えの書き出し・読み込み', '○', '○'],
    ['時間帯・曜日・お金のグラフ', '—', '○'],
    ['記念日の画像・待ち受け画像', '—', '○'],
    ['色の変更(5色)', '—', '○'],
    ['お酒・たばこ・ほかを同時に記録', '1つ', 'いくつでも'],
    ['広告', 'なし', 'なし'],
  ];

  return (
    <div className="page paywall">
      <TopBar title="完全版" onClose={p.onClose} />
      <section className="pw-hero">
        <p className="pw-kicker">買い切り・月額なし・広告なし</p>
        <h2>続いた日を、<br />目に見える形に。</h2>
      </section>
      <table className="pw-table">
        <thead><tr><th></th><th>無料</th><th>完全版</th></tr></thead>
        <tbody>{rows.map(([a, b, c]) => <tr key={a}><td>{a}</td><td>{b}</td><td>{c}</td></tr>)}</tbody>
      </table>
      <div className="pw-cta">
        {p.billing.status === 'ready' ? (
          <button className="btn primary wide big" disabled={busy || (!p.billing.pkg && !import.meta.env.DEV)} onClick={buy}>
            {busy ? '処理中…' : `${price || '完全版'} で買う(1回だけ)`}
          </button>
        ) : (
          <button className="btn wide big" disabled>{p.billing.reason}</button>
        )}
        <button className="link" disabled={busy} onClick={doRestore}>以前に買った方はこちら(購入の復元)</button>
        {msg && <p className="err">{msg}</p>}
      </div>
      <p className="muted small">一度買えば、同じストアのアカウントなら機種変更後も「購入の復元」で使えます。自動で更新される契約はありません。記録はこの端末の中だけに保存し、外へ送りません。</p>
    </div>
  );
}
