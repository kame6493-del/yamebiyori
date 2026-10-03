import raw from '../flavor.current.json';
import type { HabitKind } from './types';

/** どちらのアプリとして組むか(scripts/use-flavor.mjs が src/flavor.current.json を書く) */
export interface Flavor {
  key: 'sake' | 'tabako';
  dir: string;
  appId: string;
  appName: string;
  brandSub: string;
  storeTitle: string;
  kind: Exclude<HabitKind, 'custom'>;
  thing: string;
  verbUse: string;
  verbCrave: string;
  craveNoun: string;
  stopNoun: string;
  productId: string;
  entitlement: string;
  revenuecat?: { ios?: string; android?: string };
  theme: string;
  paper: string;
  accent: string;
}

export const FLAVOR = raw as Flavor;

/** 習慣の種類ごとの言葉 */
export interface Words { thing: string; verbUse: string; verbCrave: string; craveNoun: string; stopNoun: string; unit: string }

export function wordsFor(kind: HabitKind, name: string): Words {
  if (kind === 'alcohol') return { thing: 'お酒', verbUse: '飲んだ', verbCrave: '飲みたくなった', craveNoun: '飲みたい気持ち', stopNoun: '禁酒', unit: '杯' };
  if (kind === 'smoke') return { thing: 'たばこ', verbUse: '吸った', verbCrave: '吸いたくなった', craveNoun: '吸いたい気持ち', stopNoun: '禁煙', unit: '本' };
  const t = name.trim() || 'やめたいこと';
  return { thing: t, verbUse: 'やってしまった', verbCrave: 'したくなった', craveNoun: 'したい気持ち', stopNoun: `${t}断ち`, unit: '回' };
}
