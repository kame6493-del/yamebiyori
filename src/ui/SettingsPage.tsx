import { useState } from 'react';
import { wordsFor } from '../domain/flavor';
import { SRC } from '../domain/health';
import { THEMES } from '../domain/themes';
import type { AppData, Habit } from '../domain/types';
import { isMockBilling, setMockPremium } from '../platform/billing';
import { openUrl } from '../platform/native';
import { TopBar } from './common';

export function SettingsPage(p: {
  data: AppData; habits: Habit[]; premium: boolean; notifyMsg: string;
  onNotify: (on: boolean, time: string) => void;
  onTheme: (id: string) => void;
  onEdit: (id: string) => void;
  onAdd: () => void;
  onUnlock: () => void;
  onRestore: () => void;
  onExport: () => void;
  onImport: (text: string) => void;
  onClearAll: () => void;
}) {
  const st = p.data.settings;
  const [importOpen, setImportOpen] = useState(false);
  const [text, setText] = useState('');
  const hidden = p.data.habits.length - p.habits.length;

  const readFile = async (f: File | undefined) => {
    if (!f) return;
    setText(await f.text());
  };

  return (
    <div className="page settings">
      <TopBar title="設定" />

      <section className="card">
        <p className="card-h">やめていること</p>
        <ul className="habits">
          {p.habits.map((h) => (
            <li key={h.id}>
              <span>{wordsFor(h.kind, h.name).thing}</span>
              <button className="btn small" onClick={() => p.onEdit(h.id)}>日時・金額・理由</button>
            </li>
          ))}
        </ul>
        {hidden > 0 && <p className="small muted">ほかに{hidden}件の記録があります(完全版で開けます。消してはいません)。</p>}
        <button className="btn small wide" onClick={p.premium ? p.onAdd : p.onUnlock}>＋ やめたいことを足す{p.premium ? '' : '(完全版)'}</button>
      </section>

      <section className="card">
        <p className="card-h">記念日のお知らせ</p>
        <label className="row">
          <span>通算の記念日に知らせる</span>
          <input type="checkbox" className="toggle" checked={st.notify} onChange={(e) => p.onNotify(e.target.checked, st.notifyTime)} />
        </label>
        <label className="row">
          <span>知らせる時刻</span>
          <input type="time" className="input time" value={st.notifyTime} disabled={!st.notify} onChange={(e) => e.target.value && p.onNotify(st.notify, e.target.value)} />
        </label>
        {p.notifyMsg && <p className="small err">{p.notifyMsg}</p>}
      </section>

      <section className="card">
        <p className="card-h">色{p.premium ? '' : '(完全版)'}</p>
        <div className="themes">
          {THEMES.map((t) => (
            <button key={t.id} className={`theme ${st.theme === t.id || (!p.premium && t.id === 'base') ? 'on' : ''}`} style={{ background: t.paper, color: t.ink, borderColor: t.accent }}
              onClick={() => (t.premium && !p.premium ? p.onUnlock() : p.onTheme(t.id))}>
              <i style={{ background: t.accent }} />{t.name}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <p className="card-h">控え(機種変更のとき)</p>
        <p className="small muted">記録はこの端末の中だけにあります。機種を変える前に控えを書き出して、新しい端末で読み込んでください。</p>
        <div className="two-btn">
          <button className="btn small" onClick={p.onExport}>控えを書き出す</button>
          <button className="btn small" onClick={() => setImportOpen(!importOpen)}>控えを読み込む</button>
        </div>
        {importOpen && (
          <div className="import">
            <input type="file" accept=".json,application/json,text/plain" aria-label="控えのファイル" onChange={(e) => readFile(e.target.files?.[0])} />
            <textarea className="input" rows={3} placeholder="控えの中身を貼り付けてもかまいません" value={text} onChange={(e) => setText(e.target.value)} />
            <button className="btn small primary" disabled={!text.trim()} onClick={() => { if (confirm('今の記録を、控えの内容で置き換えますか')) p.onImport(text); }}>この控えで置き換える</button>
          </div>
        )}
      </section>

      <section className="card">
        <p className="card-h">完全版</p>
        {p.premium ? <p className="small">完全版をお使いいただいています。ありがとうございます。</p> : <button className="btn small primary" onClick={p.onUnlock}>完全版について</button>}
        <button className="link small" onClick={p.onRestore}>購入の復元</button>
        {isMockBilling && (
          <label className="row dev"><span>開発用: 完全版</span><input type="checkbox" checked={p.premium} onChange={(e) => { setMockPremium(e.target.checked); location.reload(); }} /></label>
        )}
      </section>

      <section className="card">
        <p className="card-h">情報の出どころ</p>
        <ul className="src-list small">
          {Object.values(SRC).map((s) => <li key={s.url}><button className="link" onClick={() => openUrl(s.url)}>{s.title}</button>({s.site})</li>)}
        </ul>
        <p className="small muted">原文のまま、出典を付けて載せています。内容を厚生労働省が本アプリのために示したものではありません。</p>
      </section>

      <section className="card">
        <p className="card-h">プライバシー</p>
        <p className="small muted">記録はこの端末の中だけに保存し、外へ送りません。アカウントの登録も、広告もありません。</p>
      </section>

      <button className="btn danger wide" onClick={() => { if (confirm('すべての記録を消します。元には戻せません。よろしいですか')) p.onClearAll(); }}>すべての記録を消す</button>
    </div>
  );
}
