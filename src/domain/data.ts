import type { AppData, Craving, CravingOutcome, Habit, HabitKind, Settings, Slip } from './types';

/**
 * 無料で開けるのは「お酒」と「たばこ」をそれぞれ1つずつ(両方やめる人は無料で両方を数えられる)。
 * そのほかのやめたいこと・同じ種類の2つ目は完全版。
 */
export const FREE_KINDS: HabitKind[] = ['alcohol', 'smoke'];

export const DEFAULT_SETTINGS: Settings = { notify: true, notifyTime: '09:00', theme: 'base' };

export function emptyData(): AppData {
  return { v: 1, habits: [], activeId: null, settings: { ...DEFAULT_SETTINGS } };
}

let seq = 0;
export function uid(): string {
  seq = (seq + 1) % 1_000_000;
  return `${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** アプリが用意した乗り切り方の候補(医療の手当てではなく、気をそらす工夫)。自分の物を足せる */
export function defaultCopings(kind: HabitKind): string[] {
  if (kind === 'alcohol') return ['炭酸水やお茶を飲む', '歯をみがく', '外を5分歩く', 'お風呂に入る', '温かい物を食べる', '誰かに連絡する', 'やめたい理由を読み返す'];
  if (kind === 'smoke') return ['深呼吸', '冷たい水を飲む', '歯をみがく', 'ガムを噛む', 'その場を離れる', '手を動かす', 'やめたい理由を読み返す'];
  return ['深呼吸', '水を飲む', 'その場を離れる', 'やめたい理由を読み返す'];
}

/** 場面の候補 */
export function defaultScenes(kind: HabitKind): string[] {
  if (kind === 'alcohol') return ['夕食', '仕事のあと', '寝る前', '休みの日', '人との集まり', 'いらいらした時', 'さみしい時'];
  if (kind === 'smoke') return ['朝起きてすぐ', '食事の後', 'コーヒーと一緒に', '仕事の休憩時間', 'お酒の席', 'いらいらした時', '車の中'];
  return ['朝', '昼', '夜', 'いらいらした時', 'ひまな時'];
}

export function newHabit(p: { kind: HabitKind; name: string; startAt: string; yenPerDay: number; packYen?: number; perDay?: number; perPack?: number; reason?: string }): Habit {
  return {
    id: uid(),
    kind: p.kind,
    name: p.name,
    startAt: p.startAt,
    cost: { yenPerDay: Math.max(0, Math.round(p.yenPerDay || 0)), packYen: p.packYen, perDay: p.perDay, perPack: p.perPack },
    reason: p.reason ?? '',
    copings: defaultCopings(p.kind),
    slips: [],
    cravings: [],
    createdAt: new Date().toISOString(),
  };
}

/** その種類を無料で足せるか(kind を省くと、無料の枠がまだ1つでも空いているか) */
export function canAddFree(d: AppData, kind?: HabitKind): boolean {
  const open = FREE_KINDS.filter((k) => !d.habits.some((h) => h.kind === k));
  return kind ? open.includes(kind) : open.length > 0;
}

export function canAddHabit(d: AppData, premium: boolean, kind?: HabitKind): boolean {
  return premium || canAddFree(d, kind);
}

/**
 * 無料のときに開く習慣: お酒とたばこの最初の1つずつ。どちらも無ければ最初の1つ。
 * 完全版でなくなったとき(返金など)も記録は消さず、ここに入らない物は閉じるだけ。
 */
export function visibleHabits(d: AppData, premium: boolean): Habit[] {
  if (premium) return d.habits;
  const firsts = new Set(FREE_KINDS.map((k) => d.habits.find((h) => h.kind === k)?.id).filter(Boolean));
  const list = d.habits.filter((h) => firsts.has(h.id));
  return list.length ? list : d.habits.slice(0, 1);
}

export function activeHabit(d: AppData, premium: boolean): Habit | null {
  const list = visibleHabits(d, premium);
  return list.find((h) => h.id === d.activeId) ?? list[0] ?? null;
}

export function addHabit(d: AppData, h: Habit): AppData {
  return { ...d, habits: [...d.habits, h], activeId: h.id };
}

/** はじめの画面で選んだ物をまとめて入れる。ホームは最初の物から見せる */
export function addHabits(d: AppData, hs: Habit[]): AppData {
  if (!hs.length) return d;
  return { ...d, habits: [...d.habits, ...hs], activeId: hs[0].id };
}

/**
 * 別の記録(前の版のアプリ・控え)を今の記録に足す。同じ id の習慣は今の方を残す。
 * 今の記録が空なら、設定も足す側の物を使う。
 */
export function mergeData(base: AppData, extra: AppData): AppData {
  const ids = new Set(base.habits.map((h) => h.id));
  const add = extra.habits.filter((h) => !ids.has(h.id));
  if (!base.habits.length) return { ...extra, habits: add, activeId: extra.activeId && add.some((h) => h.id === extra.activeId) ? extra.activeId : add[0]?.id ?? null };
  return { ...base, habits: [...base.habits, ...add] };
}

export function updateHabit(d: AppData, id: string, f: (h: Habit) => Habit): AppData {
  return { ...d, habits: d.habits.map((h) => (h.id === id ? f(h) : h)) };
}

export function removeHabit(d: AppData, id: string): AppData {
  const habits = d.habits.filter((h) => h.id !== id);
  return { ...d, habits, activeId: d.activeId === id ? habits[0]?.id ?? null : d.activeId };
}

export function addSlip(d: AppData, id: string, s: { at: string; amount?: number; note?: string }): AppData {
  const slip: Slip = { id: uid(), at: s.at, ...(s.amount ? { amount: s.amount } : {}), ...(s.note ? { note: s.note } : {}) };
  return updateHabit(d, id, (h) => ({ ...h, slips: [...h.slips, slip] }));
}

export function removeSlip(d: AppData, id: string, slipId: string): AppData {
  return updateHabit(d, id, (h) => ({ ...h, slips: h.slips.filter((s) => s.id !== slipId) }));
}

export function removeCraving(d: AppData, id: string, cravingId: string): AppData {
  return updateHabit(d, id, (h) => ({ ...h, cravings: h.cravings.filter((c) => c.id !== cravingId) }));
}

/** 自分の乗り切り方を足す(同じ物は足さない・空は無視) */
export function addCoping(d: AppData, id: string, text: string): AppData {
  const t = text.trim();
  if (!t) return d;
  return updateHabit(d, id, (h) => (h.copings.includes(t) ? h : { ...h, copings: [...h.copings, t] }));
}

/** 気持ちの記録。負けてしまった(used)ときは、同じ時刻の「再開」も1つ残す */
export function addCraving(d: AppData, id: string, c: { at: string; strength: number; scene: string; coping: string; outcome: CravingOutcome; note?: string }): AppData {
  const cr: Craving = { id: uid(), at: c.at, strength: clamp(Math.round(c.strength), 1, 5), scene: c.scene.trim(), coping: c.coping.trim(), outcome: c.outcome, ...(c.note ? { note: c.note } : {}) };
  let next = updateHabit(d, id, (h) => ({ ...h, cravings: [...h.cravings, cr] }));
  if (c.outcome === 'used') next = addSlip(next, id, { at: c.at, note: c.note });
  return next;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));
}

const isStr = (x: unknown): x is string => typeof x === 'string';
const isIso = (x: unknown): x is string => isStr(x) && !Number.isNaN(Date.parse(x));
const num = (x: unknown, dflt = 0) => (typeof x === 'number' && Number.isFinite(x) ? x : dflt);

/** 保存データを読み直す。壊れた所は捨てて、読める所だけ残す */
export function normalize(raw: unknown): AppData {
  const base = emptyData();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  const habits: Habit[] = [];
  for (const x of Array.isArray(r.habits) ? r.habits : []) {
    if (!x || typeof x !== 'object') continue;
    const h = x as Record<string, unknown>;
    if (!isStr(h.id) || !isIso(h.startAt)) continue;
    const kind: HabitKind = h.kind === 'alcohol' || h.kind === 'smoke' ? h.kind : 'custom';
    const cost = (h.cost && typeof h.cost === 'object' ? h.cost : {}) as Record<string, unknown>;
    habits.push({
      id: h.id,
      kind,
      name: isStr(h.name) ? h.name : '',
      startAt: h.startAt,
      cost: {
        yenPerDay: Math.max(0, num(cost.yenPerDay)),
        ...(typeof cost.packYen === 'number' ? { packYen: cost.packYen } : {}),
        ...(typeof cost.perDay === 'number' ? { perDay: cost.perDay } : {}),
        ...(typeof cost.perPack === 'number' ? { perPack: cost.perPack } : {}),
      },
      reason: isStr(h.reason) ? h.reason : '',
      copings: Array.isArray(h.copings) ? h.copings.filter(isStr) : defaultCopings(kind),
      slips: (Array.isArray(h.slips) ? h.slips : []).filter((s): s is Slip => !!s && isStr((s as Slip).id) && isIso((s as Slip).at)),
      cravings: (Array.isArray(h.cravings) ? h.cravings : [])
        .filter((c): c is Craving => !!c && isStr((c as Craving).id) && isIso((c as Craving).at))
        .map((c) => ({ ...c, strength: clamp(num(c.strength, 3), 1, 5), scene: isStr(c.scene) ? c.scene : '', coping: isStr(c.coping) ? c.coping : '', outcome: c.outcome === 'used' ? 'used' : 'passed' })),
      createdAt: isIso(h.createdAt) ? h.createdAt : h.startAt,
    });
  }
  const s = (r.settings && typeof r.settings === 'object' ? r.settings : {}) as Record<string, unknown>;
  const settings: Settings = {
    notify: typeof s.notify === 'boolean' ? s.notify : DEFAULT_SETTINGS.notify,
    notifyTime: isStr(s.notifyTime) && /^\d{2}:\d{2}$/.test(s.notifyTime) ? s.notifyTime : DEFAULT_SETTINGS.notifyTime,
    theme: isStr(s.theme) ? s.theme : DEFAULT_SETTINGS.theme,
  };
  const activeId = isStr(r.activeId) && habits.some((h) => h.id === r.activeId) ? r.activeId : habits[0]?.id ?? null;
  return { v: 1, habits, activeId, settings };
}

/** 控えの書き出し(機種変更のときに自分で持ち出せるように)。文字列の先頭に印を付ける */
const BACKUP_MARK = 'yamebiyori-backup';

export function exportBackup(d: AppData, appKey: string, now = new Date()): string {
  return JSON.stringify({ mark: BACKUP_MARK, app: appKey, exportedAt: now.toISOString(), data: d });
}

export function importBackup(text: string): AppData {
  let o: unknown;
  try {
    o = JSON.parse(text.trim());
  } catch {
    throw new Error('控えの文字が読めませんでした');
  }
  const r = o as { mark?: unknown; data?: unknown };
  if (!r || r.mark !== BACKUP_MARK) throw new Error('やめ日和の控えではないようです');
  const d = normalize(r.data);
  if (!d.habits.length) throw new Error('控えに記録が入っていません');
  return d;
}
