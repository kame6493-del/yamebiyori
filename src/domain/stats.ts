import type { Craving, Habit, Slip } from './types';

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

/** 端末の暦での日付 "YYYY-MM-DD" */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** やめ始めより後の、再開した記録(古い順) */
export function slipsAfterStart(h: Habit): Slip[] {
  const start = Date.parse(h.startAt);
  return h.slips.filter((s) => Date.parse(s.at) >= start).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

export interface HabitStats {
  elapsedMs: number; // やめ始めてからの時間
  slipDays: number; // 再開してしまった日の数(同じ日に何回でも1日)
  totalDays: number; // 通算でやめられた日数(経過時間 − 再開した時刻からその日の終わりまで)
  streakMs: number; // 今回(最後に再開してから)の時間
  streakDays: number;
  longestMs: number; // いちばん長く続いた時間
  savedYen: number; // 浮いたお金(やめられた時間ぶん)
  lastUseAt: number; // 最後に使った時刻(なければ開始時刻)
}

/**
 * 再開した日に「数えない時間」。その日に最初に再開した時刻から、その日の終わり(翌0時)まで。
 * これで通算もお金も、再開した瞬間に減らない(その日の残りは止まり、翌日からまた増える)。
 */
export function lostWindows(h: Habit): { from: number; to: number }[] {
  const first = new Map<string, number>();
  for (const s of slipsAfterStart(h)) {
    const t = Date.parse(s.at);
    const k = dateKey(new Date(t));
    if (!first.has(k)) first.set(k, t);
  }
  return [...first.values()].map((t) => {
    const d = new Date(t);
    return { from: t, to: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() };
  });
}

/** now までに数えなかった時間の合計 */
export function lostMs(h: Habit, now: number): number {
  return lostWindows(h).reduce((a, w) => a + Math.max(0, Math.min(now, w.to) - w.from), 0);
}

export function computeStats(h: Habit, now: number): HabitStats {
  const start = Date.parse(h.startAt);
  const elapsedMs = Math.max(0, now - start);
  const slips = slipsAfterStart(h).filter((s) => Date.parse(s.at) <= now);
  const slipDays = new Set(slips.map((s) => dateKey(new Date(s.at)))).size;
  const freeMs = Math.max(0, elapsedMs - lostMs(h, now));
  const lastUseAt = slips.length ? Date.parse(slips[slips.length - 1].at) : start;
  const streakMs = Math.max(0, now - lastUseAt);
  let longestMs = 0;
  let prev = start;
  for (const t of [...slips.map((s) => Date.parse(s.at)), now]) {
    longestMs = Math.max(longestMs, t - prev);
    prev = t;
  }
  const freeDaysExact = freeMs / DAY;
  return {
    elapsedMs,
    slipDays,
    totalDays: Math.floor(freeDaysExact),
    streakMs,
    streakDays: Math.floor(streakMs / DAY),
    longestMs: Math.max(0, longestMs),
    savedYen: Math.floor(freeDaysExact * Math.max(0, h.cost.yenPerDay || 0)),
    lastUseAt,
  };
}

/** たばこの1日あたりの値段 = 1箱の値段 × 1日の本数 ÷ 1箱の本数 */
export function yenPerDayFromPack(packYen: number, perDay: number, perPack: number): number {
  if (!(packYen > 0) || !(perDay > 0) || !(perPack > 0)) return 0;
  return Math.round((packYen * perDay) / perPack);
}

/** "12日 5時間" / "3時間 20分" / "40分" */
export function formatDuration(ms: number): string {
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / HOUR);
  const m = Math.floor((ms % HOUR) / MIN);
  if (d > 0) return `${d}日 ${h}時間`;
  if (h > 0) return `${h}時間 ${m}分`;
  return `${m}分`;
}

export function formatYen(n: number): string {
  return '¥' + Math.max(0, Math.floor(n)).toLocaleString('ja-JP');
}

/** 乗り切れた割合など、気持ちの記録のまとめ */
export interface CravingSummary { total: number; passed: number; byCoping: { coping: string; tried: number; passed: number }[]; byHour: number[]; byWeekday: number[] }

export function summarizeCravings(cs: Craving[]): CravingSummary {
  const byHour = Array(24).fill(0) as number[];
  const byWeekday = Array(7).fill(0) as number[];
  const map = new Map<string, { tried: number; passed: number }>();
  let passed = 0;
  for (const c of cs) {
    const d = new Date(c.at);
    byHour[d.getHours()]++;
    byWeekday[d.getDay()]++;
    if (c.outcome === 'passed') passed++;
    const key = c.coping.trim();
    if (key) {
      const v = map.get(key) ?? { tried: 0, passed: 0 };
      v.tried++;
      if (c.outcome === 'passed') v.passed++;
      map.set(key, v);
    }
  }
  const byCoping = [...map.entries()].map(([coping, v]) => ({ coping, ...v }))
    .sort((a, b) => b.passed - a.passed || b.tried - a.tried || a.coping.localeCompare(b.coping, 'ja'));
  return { total: cs.length, passed, byCoping, byHour, byWeekday };
}

/** 浮いたお金の積み上がり(日ごと)。グラフ用。points 個に間引く */
export function savingsSeries(h: Habit, now: number, points = 30): { t: number; yen: number }[] {
  const start = Date.parse(h.startAt);
  if (now <= start) return [{ t: start, yen: 0 }];
  const out: { t: number; yen: number }[] = [];
  const n = Math.max(2, points);
  for (let i = 0; i < n; i++) {
    const t = start + ((now - start) * i) / (n - 1);
    out.push({ t, yen: computeStats(h, t).savedYen });
  }
  return out;
}

/** 月のカレンダー用: その日が「やめられた日」「再開した日」「まだ始めていない/未来」のどれか */
export type DayMark = 'free' | 'slip' | 'none';

export function dayMarks(h: Habit, year: number, month0: number, now: number): DayMark[] {
  const start = Date.parse(h.startAt);
  const slipSet = new Set(slipsAfterStart(h).map((s) => dateKey(new Date(s.at))));
  const days = new Date(year, month0 + 1, 0).getDate();
  const startKey = dateKey(new Date(start));
  const todayKey = dateKey(new Date(now));
  const out: DayMark[] = [];
  for (let d = 1; d <= days; d++) {
    const k = dateKey(new Date(year, month0, d));
    if (k < startKey || k > todayKey) out.push('none');
    else out.push(slipSet.has(k) ? 'slip' : 'free');
  }
  return out;
}
