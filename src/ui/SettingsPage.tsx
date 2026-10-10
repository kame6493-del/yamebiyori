import { useState } from 'react';
import { wordsFor } from '../domain/flavor';
import { SRC } from '../domain/health';
import { THEMES } from '../domain/themes';
import type { AppData, Habit } from '../domain/types';
import { isMockBilling, setMockPremium } from '../platform/billing';
import { openUrl } from '../platform/native';
import { art, thingIcon } from './art';
import { TopBar } from './common';

function Head(p: { icon: string; title: string; sub?: string }) {
  return (
    <div className="set-h">
      <img className="art" src={art(p.icon)} alt="" />
      <div><p className="card-h">{p.title}</p>{p.sub && <p className="small muted">{p.sub}</p>}</div>
    </div>
  );
}

export function SettingsPage(p: {
  data: AppData; habits: Habit[]; premium: boolean; canAddFree: boolean; notifyMsg: string;
  onNotify: (on: boolean, time: string) => void;
  onTheme: (id: string) => void;
  onEdit: (id: string) => void;
  onAdd: () => void;
  onUnlock: () => void;
  onRestore: () => void;
  onExport: () => void;
  onImport: (text: string, how: 'replace' | 'merge') => void;
  onClearAll: () => void;
}) {
  const st = p.data.settings;
  const [importOpen, setImportOpen] = useState(false);
  const [text, setText] = useState('');
  const hidden = p.data.habits.length - p.habits.length;
  const cur = THEMES.find((t) => t.id === (st.theme === 'mori' ? 'base' : st.theme)) ?? THEMES[0];

  const readFile = async (f: File | undefined) => {
    if (!f) return;
    setText(await f.text());
  };

  return (
    <div className="page settings">
      <TopBar title="設定" />

      <section className="card">
        <Head icon="st_sprout" title="習慣の設定" sub="やめていることの開始日・金額・理由を変更できます" />
        <ul className="habits">
          {p.habits.map((h) => (
            <li key={h.id}>
              <span><img src={thingIcon(h.kind)} alt="" />{wordsFor(h.kind, h.name).thing}</span>
              <button className="btn small" onClick={() => p.onEdit(h.id)}>日時・金額・理由</button>
            </li>
          ))}
        </ul>
        {hidden > 0 && <p className="small muted">ほかに{hidden}件の記録があります(完全版で開けます。消してはいません)。</p>}
        <button className="btn small wide" onClick={p.onAdd}>＋ やめたいことを足す{p.premium || p.canAddFree ? '' : '(完全版)'}</button>
      </section>

      <section className="card">
        <Head icon="st_cal" title="記念日のお知らせ" sub="やめてからの節目の日に、お祝いの通知をお届けします" />
        <label className="row">
          <span>通算の記念日に知らせる</span>
          <input type="checkbox" role="switch" className="toggle" checked={st.notify} onChange={(e) => p.onNotify(e.target.checked, st.notifyTime)} />
        </label>
        <label className="row">
          <span>知らせる時刻</span>
          <input type="time" className="input time" value={st.notifyTime} disabled={!st.notify} onChange={(e) => e.target.value && p.onNotify(st.notify, e.target.value)} />
        </label>
        {p.notifyMsg && <p className="small err">{p.notifyMsg}</p>}
      </section>

      <section className="card">
        <Head icon="pw_colors" title={`テーマカラー${p.premium ? '' : '(完全版)'}`} sub="気分に合わせて、アプリの色を選べます" />
        <div className="themes">
          {THEMES.map((t) => {
            const on = cur.id === t.id || (!p.premium && t.id === 'base');
            return (
              <button key={t.id} className={`theme ${on ? 'on' : ''}`} aria-pressed={on}
                onClick={() => (t.premium && !p.premium ? p.onUnlock() : p.onTheme(t.id))}>
                <img className="art" src={art(t.art)} alt="" />
                <span className="theme-t"><b>{t.name}</b><small>{t.desc}</small>
                  <span className="dots"><i style={{ background: t.accent }} /><i style={{ background: t.accentSoft }} /><i style={{ background: t.warm }} /></span>
                </span>
                <span className="radio" aria-hidden />
              </button>
            );
          })}
        </div>
      </section>

      <section className="card">
        <Head icon="st_lock" title="データ・プライバシー" sub="記録は端末の中だけ。安心して使えます" />
        <ul className="priv">
          <li><b>会員登録は不要です</b><span className="small muted">メールアドレスや個人情報の登録なしで使えます。</span></li>
          <li><b>広告はありません</b><span className="small muted">アプリの中に広告は表示されません。</span></li>
          <li><b>記録は端末の中だけ</b><span className="small muted">記録はこの端末の中だけに保存し、外へ送りません。</span></li>
        </ul>
        <p className="card-h sub">控え(機種変更のとき)</p>
        <p className="small muted">機種を変える前に控えを書き出して、新しい端末で読み込んでください。前の「やめ日和 お酒」「やめ日和 たばこ」の控えも読み込めます。</p>
        <div className="two-btn">
          <button className="btn small" onClick={p.onExport}>控えを書き出す</button>
          <button className="btn small" onClick={() => setImportOpen(!importOpen)}>控えを読み込む</button>
        </div>
        {importOpen && (
          <div className="import">
            <input type="file" accept=".json,application/json,text/plain" aria-label="控えのファイル" onChange={(e) => readFile(e.target.files?.[0])} />
            <textarea className="input" rows={3} placeholder="控えの中身を貼り付けてもかまいません" value={text} onChange={(e) => setText(e.target.value)} />
            <div className="two-btn">
              <button className="btn small green" disabled={!text.trim()} onClick={() => p.onImport(text, 'merge')}>今の記録に足す</button>
              <button className="btn small" disabled={!text.trim()} onClick={() => { if (confirm('今の記録を、控えの内容で置き換えますか')) p.onImport(text, 'replace'); }}>この控えで置き換える</button>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <Head icon="st_crown" title="完全版・購入の復元" sub={p.premium ? '完全版をお使いいただいています。ありがとうございます。' : '買い切り。月額の契約はありません'} />
        {!p.premium && <button className="btn small green" onClick={p.onUnlock}>完全版について</button>}
        <button className="link small" onClick={p.onRestore}>購入の復元</button>
        {isMockBilling && (
          <label className="row dev"><span>開発用: 完全版</span><input type="checkbox" checked={p.premium} onChange={(e) => { setMockPremium(e.target.checked); location.reload(); }} /></label>
        )}
      </section>

      <section className="card">
        <Head icon="cat_grow" title="情報の出どころ" />
        <ul className="src-list small">
          {Object.values(SRC).map((s) => <li key={s.url}><button className="link" onClick={() => openUrl(s.url)}>{s.title}</button>({s.site})</li>)}
        </ul>
        <p className="small muted">原文のまま、出典を付けて載せています。内容を厚生労働省が本アプリのために示したものではありません。</p>
      </section>

      <button className="btn danger wide" onClick={() => { if (confirm('すべての記録を消します。元には戻せません。よろしいですか')) p.onClearAll(); }}>すべての記録を消す</button>

      <section className="banner foot-art">
        <img className="art" src={art('bench_art')} alt="" />
        <p className="banner-msg">やめる。続ける。<br />きっと、いい日がくる。</p>
      </section>
    </div>
  );
}
