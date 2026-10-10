/**
 * 色の組み合わせ。見本(2026-10 の作り直し)の5色: 若葉(無料)・空色・こはく・さくら・墨色(完全版)。
 * id は前の版の保存データと同じ物を使う(yuuhi=こはく、yoru=墨色)。前の版の「もり」は若葉に寄せる。
 */
export interface Theme {
  id: string;
  name: string;
  desc: string;
  /** 色の見本の絵(src/assets/ref/<art>.webp) */
  art: string;
  premium: boolean;
  dark: boolean;
  paper: string; // 地(生成り)
  sheet: string; // 札
  rule: string; // 線
  ink: string;
  ink2: string;
  ink3: string;
  accent: string; // 葉の緑など(文字やボタンに使える濃さ)
  accentSoft: string; // セージ
  warm: string; // 気持ちが来た・記録するのボタン(コーラル)。再開した日の印もこの色(赤くしない)
  warmSoft: string;
  sun: string; // サンライト
}

const base: Theme = { id: 'base', name: '若葉', desc: 'やさしく、前向きな気持ちに', art: 'theme_base', premium: false, dark: false, paper: '#fbf7ec', sheet: '#fffdf8', rule: '#ece4d2', ink: '#3a3a33', ink2: '#5f5d54', ink3: '#8a877b', accent: '#5a9447', accentSoft: '#e8f1e7', warm: '#dc7457', warmSoft: '#fbe8df', sun: '#f6c667' };

export const THEMES: Theme[] = [
  base,
  { id: 'sora', name: '空色', desc: 'すっきりと心が晴れるように', art: 'theme_sora', premium: true, dark: false, paper: '#f5f9fb', sheet: '#ffffff', rule: '#dbe6ed', ink: '#2c3640', ink2: '#55636e', ink3: '#84919b', accent: '#3f7fa8', accentSoft: '#e2eef5', warm: '#dc7457', warmSoft: '#fbe8df', sun: '#f6c667' },
  { id: 'yuuhi', name: 'こはく', desc: 'あたたかく落ち着いた気持ちに', art: 'theme_kohaku', premium: true, dark: false, paper: '#fcf6ec', sheet: '#fffdf8', rule: '#efe1ca', ink: '#3b3229', ink2: '#65584b', ink3: '#94877a', accent: '#b8741f', accentSoft: '#faecd7', warm: '#d6654a', warmSoft: '#f9e2d9', sun: '#f3b54f' },
  { id: 'sakura', name: 'さくら', desc: 'やさしく華やかに続ける毎日に', art: 'theme_sakura', premium: true, dark: false, paper: '#fcf5f4', sheet: '#ffffff', rule: '#f0dddf', ink: '#3a2e30', ink2: '#66575a', ink3: '#958488', accent: '#c05e78', accentSoft: '#f8e4ea', warm: '#dc7457', warmSoft: '#fbe8df', sun: '#f6c667' },
  { id: 'yoru', name: '墨色', desc: '静かに、自分のペースで', art: 'theme_sumi', premium: true, dark: true, paper: '#1e2228', sheet: '#282d35', rule: '#3a414b', ink: '#eef0f2', ink2: '#c3c9d0', ink3: '#959ca7', accent: '#9cc48a', accentSoft: '#2f3b2d', warm: '#cc6a52', warmSoft: '#40302a', sun: '#e8c56d' },
];

export function themeById(id: string, premium: boolean): Theme {
  const t = THEMES.find((x) => x.id === (id === 'mori' ? 'base' : id)) ?? base;
  return t.premium && !premium ? base : t;
}

export function applyTheme(t: Theme) {
  const r = document.documentElement.style;
  r.setProperty('--paper', t.paper);
  r.setProperty('--sheet', t.sheet);
  r.setProperty('--rule', t.rule);
  r.setProperty('--ink', t.ink);
  r.setProperty('--ink-2', t.ink2);
  r.setProperty('--ink-3', t.ink3);
  r.setProperty('--accent', t.accent);
  r.setProperty('--accent-soft', t.accentSoft);
  r.setProperty('--warm', t.warm);
  r.setProperty('--warm-soft', t.warmSoft);
  r.setProperty('--sun', t.sun);
  r.setProperty('color-scheme', t.dark ? 'dark' : 'light');
  document.documentElement.dataset.dark = t.dark ? '1' : '0';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.paper);
}
