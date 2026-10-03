import { describe, expect, it } from 'vitest';
import { addCraving, addHabit, addSlip, canAddHabit, emptyData, exportBackup, importBackup, newHabit, normalize, removeSlip, visibleHabits, activeHabit } from './data';
import { MILESTONES, milestoneTime, nextMilestone, planMilestoneNotices, reachedMilestones } from './milestones';
import { computeStats, dayMarks, DAY, formatDuration, formatYen, HOUR, MIN, savingsSeries, summarizeCravings, yenPerDayFromPack } from './stats';
import { TOBACCO_TIMELINE, timelineProgress, QUOTES, CAUTION, SRC } from './health';

const T0 = new Date(2026, 0, 1, 20, 0, 0).getTime(); // 2026-01-01 20:00(端末の時刻)
const iso = (t: number) => new Date(t).toISOString();

function habit(yen = 1000) {
  return newHabit({ kind: 'alcohol', name: 'お酒', startAt: iso(T0), yenPerDay: yen });
}

describe('日数とお金', () => {
  it('始めた直後は0', () => {
    const s = computeStats(habit(), T0);
    expect(s).toMatchObject({ elapsedMs: 0, totalDays: 0, streakDays: 0, savedYen: 0, slipDays: 0 });
  });

  it('10日たてば通算10日・連続10日・浮いたお金は10日分', () => {
    const s = computeStats(habit(1000), T0 + 10 * DAY);
    expect(s.totalDays).toBe(10);
    expect(s.streakDays).toBe(10);
    expect(s.savedYen).toBe(10000);
    expect(s.longestMs).toBe(10 * DAY);
  });

  it('お金は時間に比例して増える(半日なら半分)', () => {
    expect(computeStats(habit(1000), T0 + 12 * HOUR).savedYen).toBe(500);
  });

  it('未来の開始日なら何も数えない', () => {
    const s = computeStats(habit(), T0 - DAY);
    expect(s.elapsedMs).toBe(0);
    expect(s.savedYen).toBe(0);
  });

  it('再開しても通算は消えない。再開した時刻からその日の終わりまでだけ数えない。連続は再開した時刻から', () => {
    const h = habit(1000); // 1/1 20:00 開始
    let d = addHabit(emptyData(), h);
    d = addSlip(d, h.id, { at: iso(T0 + 5 * DAY + 2 * HOUR) }); // 1/6 22:00 → 数えないのは 22:00〜24:00 の2時間
    const s = computeStats(d.habits[0], T0 + 10 * DAY);
    expect(s.slipDays).toBe(1);
    expect(s.totalDays).toBe(9); // 10日 − 2時間
    expect(s.savedYen).toBe(Math.floor((10 - 2 / 24) * 1000));
    expect(s.streakMs).toBe(5 * DAY - 2 * HOUR);
    expect(s.longestMs).toBe(5 * DAY + 2 * HOUR);
  });

  it('記録した瞬間に通算もお金も減らない。そのあとも時間とともに減らない', () => {
    const h = habit(1000);
    const at = T0 + 10 * DAY + 1 * HOUR; // 1/11 21:00
    const before = computeStats(h, at);
    const d = addSlip(addHabit(emptyData(), h), h.id, { at: iso(at) });
    const after = computeStats(d.habits[0], at);
    expect(after.totalDays).toBe(before.totalDays);
    expect(after.savedYen).toBe(before.savedYen);
    let prev = after;
    for (let t = at; t <= at + 3 * DAY; t += 20 * MIN) {
      const cur = computeStats(d.habits[0], t);
      expect(cur.totalDays).toBeGreaterThanOrEqual(prev.totalDays);
      expect(cur.savedYen).toBeGreaterThanOrEqual(prev.savedYen);
      prev = cur;
    }
    // その日の残り(21:00〜24:00)は止まり、翌日からまた増える
    expect(computeStats(d.habits[0], at + 3 * HOUR).savedYen).toBe(after.savedYen);
    expect(computeStats(d.habits[0], at + 4 * HOUR).savedYen).toBeGreaterThan(after.savedYen);
  });

  it('同じ日に何度再開しても1日として数える', () => {
    const h = habit();
    let d = addHabit(emptyData(), h);
    d = addSlip(d, h.id, { at: iso(T0 + 3 * DAY) });
    d = addSlip(d, h.id, { at: iso(T0 + 3 * DAY + 30 * MIN) });
    expect(computeStats(d.habits[0], T0 + 10 * DAY).slipDays).toBe(1);
  });

  it('開始より前の再開記録や、まだ来ていない時刻の記録は数えない', () => {
    const h = habit();
    let d = addHabit(emptyData(), h);
    d = addSlip(d, h.id, { at: iso(T0 - 2 * DAY) });
    d = addSlip(d, h.id, { at: iso(T0 + 20 * DAY) });
    const s = computeStats(d.habits[0], T0 + 10 * DAY);
    expect(s.slipDays).toBe(0);
    expect(s.totalDays).toBe(10);
  });

  it('再開の記録を消せば元の数に戻る', () => {
    const h = habit();
    let d = addHabit(emptyData(), h);
    d = addSlip(d, h.id, { at: iso(T0 + 2 * DAY) });
    const slipId = d.habits[0].slips[0].id;
    d = removeSlip(d, h.id, slipId);
    expect(computeStats(d.habits[0], T0 + 10 * DAY).totalDays).toBe(10);
  });

  it('たばこの1日あたり = 箱の値段 × 本数 ÷ 1箱の本数', () => {
    expect(yenPerDayFromPack(600, 20, 20)).toBe(600);
    expect(yenPerDayFromPack(580, 10, 20)).toBe(290);
    expect(yenPerDayFromPack(1000, 30, 20)).toBe(1500); // 値段に上限を付けない
    expect(yenPerDayFromPack(0, 10, 20)).toBe(0);
    expect(yenPerDayFromPack(600, 10, 0)).toBe(0);
  });

  it('表示の形', () => {
    expect(formatDuration(12 * DAY + 5 * HOUR + 3 * MIN)).toBe('12日 5時間');
    expect(formatDuration(3 * HOUR + 20 * MIN)).toBe('3時間 20分');
    expect(formatDuration(40 * MIN)).toBe('40分');
    expect(formatYen(182500)).toBe('¥182,500');
    expect(formatYen(-5)).toBe('¥0');
  });

  it('浮いたお金の積み上がりは減らない', () => {
    const h = habit(800);
    const d = addSlip(addHabit(emptyData(), h), h.id, { at: iso(T0 + 4 * DAY) });
    const ser = savingsSeries(d.habits[0], T0 + 20 * DAY, 21);
    expect(ser).toHaveLength(21);
    for (let i = 1; i < ser.length; i++) expect(ser[i].yen).toBeGreaterThanOrEqual(ser[i - 1].yen);
    expect(ser[ser.length - 1].yen).toBe(computeStats(d.habits[0], T0 + 20 * DAY).savedYen);
  });

  it('カレンダーの印: 始める前/やめた日/再開した日/未来', () => {
    const h = habit();
    const d = addSlip(addHabit(emptyData(), h), h.id, { at: iso(new Date(2026, 0, 5, 21).getTime()) });
    const marks = dayMarks(d.habits[0], 2026, 0, new Date(2026, 0, 10, 12).getTime());
    expect(marks).toHaveLength(31);
    expect(marks[0]).toBe('free'); // 1日(開始日)
    expect(marks[4]).toBe('slip'); // 5日
    expect(marks[9]).toBe('free'); // 10日(今日)
    expect(marks[10]).toBe('none'); // 11日(未来)
    const before = dayMarks(d.habits[0], 2025, 11, new Date(2026, 0, 10).getTime());
    expect(before.every((m) => m === 'none')).toBe(true);
  });
});

describe('気持ちの記録', () => {
  it('乗り切れた記録は再開にならない。負けた記録は再開も1つ残す', () => {
    const h = habit();
    let d = addHabit(emptyData(), h);
    d = addCraving(d, h.id, { at: iso(T0 + DAY), strength: 4, scene: '夕食', coping: '炭酸水やお茶を飲む', outcome: 'passed' });
    expect(d.habits[0].slips).toHaveLength(0);
    d = addCraving(d, h.id, { at: iso(T0 + 2 * DAY), strength: 9, scene: '寝る前', coping: '', outcome: 'used' });
    expect(d.habits[0].slips).toHaveLength(1);
    expect(d.habits[0].cravings[1].strength).toBe(5); // 1〜5に収める
  });

  it('よく効いた乗り切り方の順に並べる・時間帯と曜日を数える', () => {
    const h = habit();
    let d = addHabit(emptyData(), h);
    const at = (dd: number, hh: number) => iso(new Date(2026, 0, 1 + dd, hh).getTime());
    d = addCraving(d, h.id, { at: at(1, 21), strength: 3, scene: '', coping: '歯をみがく', outcome: 'passed' });
    d = addCraving(d, h.id, { at: at(2, 21), strength: 3, scene: '', coping: '歯をみがく', outcome: 'passed' });
    d = addCraving(d, h.id, { at: at(3, 18), strength: 3, scene: '', coping: '外を5分歩く', outcome: 'passed' });
    d = addCraving(d, h.id, { at: at(4, 18), strength: 3, scene: '', coping: '外を5分歩く', outcome: 'used' });
    const s = summarizeCravings(d.habits[0].cravings);
    expect(s.total).toBe(4);
    expect(s.passed).toBe(3);
    expect(s.byCoping[0]).toEqual({ coping: '歯をみがく', tried: 2, passed: 2 });
    expect(s.byHour[21]).toBe(2);
    expect(s.byHour[18]).toBe(2);
    expect(s.byWeekday.reduce((a, b) => a + b, 0)).toBe(4);
  });
});

describe('記念日', () => {
  it('届いた記念日と次の記念日', () => {
    expect(reachedMilestones(0)).toHaveLength(0);
    expect(reachedMilestones(7).map((m) => m.days)).toEqual([1, 3, 7]);
    expect(nextMilestone(7)?.days).toBe(14);
    expect(nextMilestone(99999)).toBeNull();
  });

  it('数えなかった時間だけ、先の記念日が後ろへずれる。過去の記念日の日付は動かない', () => {
    const h = habit(); // 1/1 20:00
    expect(milestoneTime(h, 30)).toBe(T0 + 30 * DAY);
    const d = addSlip(addHabit(emptyData(), h), h.id, { at: iso(T0 + 2 * DAY) }); // 1/3 20:00 → 4時間
    expect(milestoneTime(d.habits[0], 30)).toBe(T0 + 30 * DAY + 4 * HOUR);
    expect(milestoneTime(d.habits[0], 1)).toBe(T0 + DAY); // 再開より前に届いた1日は動かない
    // 届いた時刻には、ちょうど通算がその日数になっている
    const t = milestoneTime(d.habits[0], 30);
    expect(computeStats(d.habits[0], t).totalDays).toBe(30);
    expect(computeStats(d.habits[0], t - MIN).totalDays).toBe(29);
  });

  it('お知らせは届いた後の決まった時刻に出し、夜中には鳴らさない。過ぎた物は入れない', () => {
    const h = habit(); // 20:00 に開始
    const plan = planMilestoneNotices(h, T0 + 2 * DAY, '09:00', 1000, 'お酒', 5);
    expect(plan.map((p) => p.days)).toEqual([3, 7, 14, 30, 60]);
    for (const p of plan) {
      const d = new Date(p.at);
      expect(d.getHours()).toBe(9);
      expect(d.getMinutes()).toBe(0);
      expect(p.at).toBeGreaterThanOrEqual(milestoneTime(h, p.days));
      expect(p.at - milestoneTime(h, p.days)).toBeLessThan(DAY);
    }
    expect(plan[0].id).toBe(1003);
    expect(plan[0].title).toBe('お酒をやめて通算3日');
    expect(new Set(plan.map((p) => p.id)).size).toBe(plan.length);
  });

  it('記念日の一覧は日数の小さい順で重なりがない', () => {
    for (let i = 1; i < MILESTONES.length; i++) expect(MILESTONES[i].days).toBeGreaterThan(MILESTONES[i - 1].days);
  });
});

describe('体の変化の表(出典の原文)', () => {
  it('経過時間で到達した行を数える', () => {
    expect(timelineProgress(0).reached).toBe(0);
    expect(timelineProgress(0).next?.time).toBe('禁煙後20分');
    expect(timelineProgress(13 * HOUR).reached).toBe(2);
    expect(timelineProgress(20 * 365 * DAY).next).toBeNull();
  });

  it('すべての行・引用・注意に出典URLがある', () => {
    expect(TOBACCO_TIMELINE.rows).toHaveLength(8);
    const all = [...QUOTES.smoke, ...QUOTES.alcohol, CAUTION.smoke, CAUTION.alcohol];
    for (const q of all) {
      expect(q.source.url).toMatch(/^https:\/\/(kennet|www)\.mhlw\.go\.jp\//);
      expect(q.text.endsWith('。')).toBe(true); // 文の途中で切っていない
    }
    for (const s of Object.values(SRC)) expect(s.url.startsWith('https://')).toBe(true);
  });
});

describe('習慣の数と完全版', () => {
  it('無料は1つ。完全版は何個でも。完全版でなくなっても記録は消さず最初の1つを開く', () => {
    const a = habit();
    const b = newHabit({ kind: 'smoke', name: 'たばこ', startAt: iso(T0), yenPerDay: 600 });
    let d = addHabit(emptyData(), a);
    expect(canAddHabit(d, false)).toBe(false);
    expect(canAddHabit(d, true)).toBe(true);
    d = addHabit(d, b);
    expect(d.activeId).toBe(b.id);
    expect(visibleHabits(d, false).map((h) => h.id)).toEqual([a.id]);
    expect(activeHabit(d, false)?.id).toBe(a.id);
    expect(activeHabit(d, true)?.id).toBe(b.id);
    expect(d.habits).toHaveLength(2);
  });
});

describe('保存データ', () => {
  it('壊れたデータでも落ちない', () => {
    expect(normalize(null).habits).toEqual([]);
    expect(normalize('x').habits).toEqual([]);
    const d = normalize({ habits: [{ id: 'a', startAt: 'だめ' }, { id: 'b', startAt: iso(T0), kind: 'smoke', slips: [{ id: 's', at: 'x' }, { id: 't', at: iso(T0 + DAY) }], cravings: [{ id: 'c', at: iso(T0), strength: 99, outcome: '?' }] }], activeId: 'zzz', settings: { notifyTime: '25時' } });
    expect(d.habits).toHaveLength(1);
    expect(d.habits[0].slips).toHaveLength(1);
    expect(d.habits[0].cravings[0]).toMatchObject({ strength: 5, outcome: 'passed', scene: '', coping: '' });
    expect(d.habits[0].copings.length).toBeGreaterThan(0);
    expect(d.activeId).toBe('b');
    expect(d.settings.notifyTime).toBe('09:00');
  });

  it('控えを書き出して読み込むと同じ記録に戻る', () => {
    const h = habit(700);
    let d = addHabit(emptyData(), h);
    d = addSlip(d, h.id, { at: iso(T0 + DAY), amount: 2, note: '飲み会' });
    d = addCraving(d, h.id, { at: iso(T0 + 2 * DAY), strength: 2, scene: '夕食', coping: '歯をみがく', outcome: 'passed' });
    const back = importBackup(exportBackup(d, 'sake'));
    expect(back).toEqual(d);
  });

  it('関係ない文字や空の控えは読み込まない', () => {
    expect(() => importBackup('hello')).toThrow('読めません');
    expect(() => importBackup('{"a":1}')).toThrow('控えではない');
    expect(() => importBackup(exportBackup(emptyData(), 'sake'))).toThrow('入っていません');
  });
});
