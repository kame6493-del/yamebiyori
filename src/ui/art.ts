import appIcon from '../assets/app_icon.webp';
import type { HabitKind } from '../domain/types';

/** 見本から切り出した絵(scripts/crop_ref.py が src/assets/ref/ に書く)。名前で引く */
const files = import.meta.glob('../assets/ref/*.webp', { eager: true, import: 'default' }) as Record<string, string>;
const ART: Record<string, string> = Object.fromEntries(Object.entries(files).map(([k, v]) => [k.split('/').pop()!.replace('.webp', ''), v]));

export const APP_ICON = appIcon;

export function art(name: string): string {
  return ART[name] ?? '';
}

/** 習慣の小さな印(お酒・たばこ・そのほか) */
export function thingIcon(kind: HabitKind): string {
  return art(kind === 'alcohol' ? 'ic_drink' : kind === 'smoke' ? 'ic_smoke' : 'ic_leaf');
}

/** 乗り切り方の絵。言葉から選ぶ(合う絵が無ければ双葉) */
export function copingIcon(text: string): string {
  const t = text;
  if (/呼吸/.test(t)) return art('cp_breath');
  if (/水|炭酸|お茶/.test(t)) return art('cp_water');
  if (/歩|外|離れ/.test(t)) return art('cp_walk');
  if (/ガム/.test(t)) return art('cp_gum');
  if (/連絡|電話/.test(t)) return art('cp_call');
  if (/温か|暖か|紅茶/.test(t)) return art('cp_warm');
  return art('ic_leaf');
}

/** 場面の絵(合う絵が無ければ出さない) */
export function sceneIcon(text: string): string {
  const t = text;
  if (/仕事/.test(t)) return art('sc_work');
  if (/食/.test(t)) return art('sc_meal');
  if (/ひとり|さみしい/.test(t)) return art('sc_alone');
  if (/飲み会|集まり|お酒の席/.test(t)) return art('sc_people');
  if (/ストレス|いらいら/.test(t)) return art('sc_stress');
  if (/眠|寝る|夜/.test(t)) return art('sc_night');
  if (/コーヒー/.test(t)) return art('cp_warm');
  return '';
}

/** 記念日の木(日数が大きいほど育つ) */
export function milestoneIcon(days: number): string {
  if (days <= 1) return art('ms_1');
  if (days <= 3) return art('ms_3');
  if (days <= 14) return art('ms_7');
  if (days <= 60) return art('ms_30');
  if (days <= 180) return art('ms_100');
  return art('ms_365');
}

/** 円の表示(見本どおり「4,800円」) */
export function yen(n: number): string {
  return `${Math.max(0, Math.floor(n)).toLocaleString('ja-JP')}円`;
}

/** 飲んでしまった日・吸ってしまった日の印。お酒は見本の赤いグラス、ほかは小さな印(コーラルの丸に載せる) */
export function slipIcon(kind: HabitKind): string {
  return kind === 'alcohol' ? art('mk_slip_drink') : thingIcon(kind);
}
