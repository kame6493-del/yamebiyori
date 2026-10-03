import { FLAVOR } from './flavor';

export interface Theme {
  id: string;
  name: string;
  premium: boolean;
  dark: boolean;
  paper: string; // 地
  sheet: string; // 札の白
  rule: string; // 線
  ink: string;
  ink2: string;
  ink3: string;
  accent: string;
  accentSoft: string;
  warm: string; // 再開した日の印(赤でなく、やわらかい色)
  warmSoft: string;
}

const base: Theme = FLAVOR.key === 'tabako'
  ? { id: 'base', name: 'そら', premium: false, dark: false, paper: '#f3f6f7', sheet: '#ffffff', rule: '#dde5e9', ink: '#1f2a33', ink2: '#4f5d68', ink3: '#7d8a94', accent: '#2d5d8a', accentSoft: '#e1ebf4', warm: '#c07a3a', warmSoft: '#f6e8da' }
  : { id: 'base', name: 'きなり', premium: false, dark: false, paper: '#f7f4ec', sheet: '#ffffff', rule: '#e6e0d2', ink: '#262622', ink2: '#575750', ink3: '#86857c', accent: '#2f6f73', accentSoft: '#dfeeed', warm: '#c07a3a', warmSoft: '#f6e8da' };

export const THEMES: Theme[] = [
  base,
  { id: 'sakura', name: 'さくら', premium: true, dark: false, paper: '#fbf3f3', sheet: '#ffffff', rule: '#efdcdc', ink: '#2e2426', ink2: '#5f4f52', ink3: '#8f7c80', accent: '#a8466a', accentSoft: '#f6e0e8', warm: '#b9783c', warmSoft: '#f5e6d6' },
  { id: 'mori', name: 'もり', premium: true, dark: false, paper: '#f2f5ef', sheet: '#ffffff', rule: '#dbe3d4', ink: '#202a1f', ink2: '#4c5a49', ink3: '#7a8776', accent: '#3d6b3a', accentSoft: '#e1ecdc', warm: '#b9783c', warmSoft: '#f5e6d6' },
  { id: 'yuuhi', name: 'ゆうひ', premium: true, dark: false, paper: '#fbf5ee', sheet: '#ffffff', rule: '#efe0cf', ink: '#2e241c', ink2: '#5f5044', ink3: '#8f7e70', accent: '#b4532a', accentSoft: '#f7e3d6', warm: '#7b5ea7', warmSoft: '#ebe4f4' },
  { id: 'yoru', name: 'よる', premium: true, dark: true, paper: '#15191f', sheet: '#1e242c', rule: '#2e3640', ink: '#eef1f4', ink2: '#b9c1ca', ink3: '#8892a0', accent: '#7fb5e0', accentSoft: '#22384b', warm: '#e0a46a', warmSoft: '#3c2f22' },
];

export function themeById(id: string, premium: boolean): Theme {
  const t = THEMES.find((x) => x.id === id) ?? base;
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
  r.setProperty('color-scheme', t.dark ? 'dark' : 'light');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.paper);
}
