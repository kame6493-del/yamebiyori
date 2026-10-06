import raw from '../flavor.current.json';
import type { HabitKind } from './types';

/**
 * どのアプリとして組むか(scripts/use-flavor.mjs が src/flavor.current.json を書く)。
 * 出すのは both(お酒とたばこを1本で記録する版)だけ。sake / tabako は 2026-10 に App Store の
 * Guideline 4.3(a) で「同じ作りの2本」とされたので、1本にまとめた。2本の設定は記録のために残してある。
 */
export interface Flavor {
  key: 'sake' | 'tabako' | 'both';
  dir: string;
  /** ネイティブの殻(flavors/<native>/android・ios)。both は sake の殻をそのまま使う */
  native?: string;
  /** 前の版が端末に残した記録の名前。最初に開いたときに読み込んで引き継ぐ */
  legacyKeys?: string[];
  appId: string;
  appName: string;
  brandSub: string;
  storeTitle: string;
  kind: Exclude<HabitKind, 'custom'> | 'both';
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

/** はじめに選べる「やめること」(both ならお酒とたばこ、ほかはその1つ) */
export const BASE_KINDS: ('alcohol' | 'smoke')[] = FLAVOR.kind === 'both' ? ['alcohol', 'smoke'] : [FLAVOR.kind];

/** 習慣の種類ごとの言葉 */
export interface Words { thing: string; verbUse: string; verbCrave: string; craveNoun: string; stopNoun: string; unit: string }

export function wordsFor(kind: HabitKind, name: string): Words {
  if (kind === 'alcohol') return { thing: 'お酒', verbUse: '飲んだ', verbCrave: '飲みたくなった', craveNoun: '飲みたい気持ち', stopNoun: '禁酒', unit: '杯' };
  if (kind === 'smoke') return { thing: 'たばこ', verbUse: '吸った', verbCrave: '吸いたくなった', craveNoun: '吸いたい気持ち', stopNoun: '禁煙', unit: '本' };
  const t = name.trim() || 'やめたいこと';
  return { thing: t, verbUse: 'やってしまった', verbCrave: 'したくなった', craveNoun: 'したい気持ち', stopNoun: `${t}断ち`, unit: '回' };
}
