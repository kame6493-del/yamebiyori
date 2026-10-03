/**
 * 画面写真・E2E 用の見本データ(開発ビルドだけ。製品ビルドには入らない)。
 * ?demo=1&days=45&slips=1&crav=28&premium=1&reason=...&theme=base&two=1
 */
import { addCraving, addHabit, addSlip, emptyData, newHabit } from '../domain/data';
import { FLAVOR } from '../domain/flavor';
import { DAY, HOUR, yenPerDayFromPack } from '../domain/stats';
import { setMockPremium } from '../platform/billing';
import { saveData } from '../platform/storage';

function rnd(seed: number) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
}

export async function installDemo(q: URLSearchParams) {
  const days = Number(q.get('days') ?? 45);
  const slips = Number(q.get('slips') ?? 1);
  const crav = Number(q.get('crav') ?? 28);
  const now = Date.now();
  const start = now - days * DAY - 5 * HOUR;
  const kind = FLAVOR.kind;
  const yen = kind === 'smoke' ? yenPerDayFromPack(600, 20, 20) : Math.round(3500 / 7);
  const reason = q.get('reason') ?? (kind === 'smoke' ? '子どもと思いきり走りたい。服のにおいを気にしたくない。' : '朝すっきり起きたい。休みの日を午前から使いたい。');
  const h = newHabit({ kind, name: FLAVOR.thing, startAt: new Date(start).toISOString(), yenPerDay: yen, reason, ...(kind === 'smoke' ? { packYen: 600, perDay: 20, perPack: 20 } : {}) });
  let d = addHabit(emptyData(), h);
  const r = rnd(7);
  // 気持ちの記録: 夕方〜夜に多め、はじめの方に多め
  for (let i = 0; i < crav; i++) {
    const dd = Math.floor(Math.pow(r(), 1.8) * Math.max(1, days - 1));
    const hour = kind === 'smoke' ? [7, 8, 10, 12, 13, 15, 18, 21][Math.floor(r() * 8)] : [17, 18, 19, 20, 20, 21, 21, 22][Math.floor(r() * 8)];
    const at = new Date(start + dd * DAY);
    at.setHours(hour, Math.floor(r() * 60), 0, 0);
    if (at.getTime() >= now || at.getTime() <= start) continue;
    const coping = h.copings[Math.floor(r() * 4)];
    d = addCraving(d, h.id, { at: at.toISOString(), strength: 1 + Math.floor(r() * 5), scene: kind === 'smoke' ? '食事の後' : '夕食', coping, outcome: 'passed' });
  }
  for (let i = 0; i < slips; i++) {
    const at = new Date(start + Math.floor(days * (0.3 + 0.25 * i)) * DAY);
    at.setHours(21, 0, 0, 0);
    if (at.getTime() < now) d = addSlip(d, h.id, { at: at.toISOString(), amount: 2, note: kind === 'smoke' ? '飲み会でもらってしまった' : '送別会で断りにくかった' });
  }
  if (q.get('two') === '1') {
    const k2 = kind === 'smoke' ? 'alcohol' : 'smoke';
    d = addHabit(d, newHabit({ kind: k2, name: k2 === 'smoke' ? 'たばこ' : 'お酒', startAt: new Date(now - 12 * DAY).toISOString(), yenPerDay: k2 === 'smoke' ? 600 : 500 }));
    d = { ...d, activeId: h.id };
  }
  d = { ...d, settings: { ...d.settings, theme: q.get('theme') ?? 'base' } };
  await saveData(d);
  setMockPremium(q.get('premium') === '1');
  history.replaceState(null, '', location.pathname);
}
