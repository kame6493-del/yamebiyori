export type HabitKind = 'alcohol' | 'smoke' | 'custom';

/** 再開してしまった日(つまずき)。数は消さずに、その日だけを「やめられなかった日」として数える */
export interface Slip {
  id: string;
  at: string; // ISO
  amount?: number; // 飲んだ杯数・吸った本数(任意)
  note?: string;
}

export type CravingOutcome = 'passed' | 'used';

/** 飲みたくなった/吸いたくなった時の記録 */
export interface Craving {
  id: string;
  at: string; // ISO
  strength: number; // 1〜5
  scene: string; // 場面(自由入力または候補)
  coping: string; // やってみた乗り切り方
  outcome: CravingOutcome;
  note?: string;
}

export interface Cost {
  yenPerDay: number;
  /** たばこ用: 1箱の値段・1日の本数・1箱の本数(編集し直すために残す) */
  packYen?: number;
  perDay?: number;
  perPack?: number;
}

export interface Habit {
  id: string;
  kind: HabitKind;
  name: string;
  startAt: string; // ISO。過去の日時も選べる
  cost: Cost;
  reason: string; // やめたい理由(つらい時に見返す)
  copings: string[]; // 自分の乗り切り方の一覧
  slips: Slip[];
  cravings: Craving[];
  createdAt: string;
}

export interface Settings {
  notify: boolean; // 記念日のお知らせ
  notifyTime: string; // "HH:MM"
  theme: string; // 色の組み合わせ(完全版で選べる)
}

export interface AppData {
  v: 1;
  habits: Habit[];
  activeId: string | null;
  settings: Settings;
}
