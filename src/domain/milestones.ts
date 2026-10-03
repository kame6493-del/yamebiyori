import { computeStats, DAY, lostWindows } from './stats';
import type { Habit } from './types';

/**
 * 記念日は「通算でやめられた日数」で数える。再開しても、それまでに積んだ日は消えない(責めない設計)。
 */
export const MILESTONES: { days: number; label: string }[] = [
  { days: 1, label: '1日' },
  { days: 3, label: '3日' },
  { days: 7, label: '1週間' },
  { days: 14, label: '2週間' },
  { days: 30, label: '30日' },
  { days: 60, label: '60日' },
  { days: 100, label: '100日' },
  { days: 180, label: '180日' },
  { days: 365, label: '365日' },
  { days: 500, label: '500日' },
  { days: 730, label: '730日' },
  { days: 1000, label: '1000日' },
  { days: 1095, label: '1095日' },
  { days: 1825, label: '1825日' },
  { days: 3650, label: '3650日' },
];

export function reachedMilestones(totalDays: number) {
  return MILESTONES.filter((m) => totalDays >= m.days);
}

export function nextMilestone(totalDays: number) {
  return MILESTONES.find((m) => totalDays < m.days) ?? null;
}

/**
 * 通算 M 日に届く時刻。この先は再開しないと仮定して、
 * 開始 + M 日 + 数えなかった時間(再開した時刻からその日の終わりまで)の合計。
 */
export function milestoneTime(h: Habit, days: number): number {
  // 届く前に始まった「数えない時間」だけ後ろへずらす(後の再開で過去の記念日の日付は動かない)
  let t = Date.parse(h.startAt) + days * DAY;
  for (const w of lostWindows(h).sort((a, b) => a.from - b.from)) {
    if (w.from < t) t += w.to - w.from;
  }
  return t;
}

export interface PlannedNotice { id: number; at: number; title: string; body: string; days: number }

/**
 * 先の記念日のお知らせ予定。届く時刻のあと最初の「お知らせ時刻(HH:MM)」に出す(夜中に鳴らさない)。
 * idBase は習慣ごとに 1000 ずつずらす。数は max 件まで(iOS は予約64件まで)。
 */
export function planMilestoneNotices(h: Habit, now: number, time: string, idBase: number, thing: string, max = 8): PlannedNotice[] {
  const [hh, mm] = time.split(':').map((x) => Number(x));
  const total = computeStats(h, now).totalDays;
  const out: PlannedNotice[] = [];
  for (const m of MILESTONES) {
    if (m.days <= total) continue;
    const reach = milestoneTime(h, m.days);
    const d = new Date(reach);
    const at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh || 0, mm || 0, 0, 0);
    if (at.getTime() < reach) at.setDate(at.getDate() + 1);
    if (at.getTime() <= now) continue;
    out.push({
      id: idBase + m.days,
      at: at.getTime(),
      days: m.days,
      title: `${thing}をやめて通算${m.label}`,
      body: `今日で通算${m.label}になりました。ここまでの日を、ちゃんと数えています。`,
    });
    if (out.length >= max) break;
  }
  return out;
}
