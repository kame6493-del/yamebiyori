import { Preferences } from '@capacitor/preferences';
import type { AppData } from '../domain/types';
import { emptyData, mergeData, normalize } from '../domain/data';
import { FLAVOR } from '../domain/flavor';

const keyOf = (k: string) => `yamebiyori.${k}.v1`;
const KEY = keyOf(FLAVOR.key);
const BACKUP_KEY = `${KEY}.prev`;

/**
 * 前の版(やめ日和 お酒 / たばこ)が同じ端末のこのアプリに残した記録を読む。
 * 同じアプリの更新として入れた人(Android の jp.yamebiyori.sake を使っていた人など)は、記録がそのまま続く。
 * 前の版の記録は消さずに残す(戻したくなったときのため)。新しい記録は KEY にだけ書く。
 */
async function loadLegacy(): Promise<AppData> {
  let d = emptyData();
  for (const k of FLAVOR.legacyKeys ?? []) {
    if (k === FLAVOR.key) continue;
    for (const key of [keyOf(k), `${keyOf(k)}.prev`]) {
      const { value } = await Preferences.get({ key });
      if (!value) continue;
      try {
        const got = normalize(JSON.parse(value));
        if (got.habits.length) { d = mergeData(d, got); break; }
      } catch { /* 壊れていれば控えの方を読む */ }
    }
  }
  return d;
}

/**
 * 端末内に保存する。アカウントもサーバーも使わない。
 * Preferences はネイティブでは UserDefaults / SharedPreferences に書く(WebView の localStorage は OS に消されることがある)。
 */
export async function loadData(): Promise<AppData> {
  const { value } = await Preferences.get({ key: KEY });
  if (!value) return loadLegacy();
  try {
    return normalize(JSON.parse(value));
  } catch {
    const prev = await Preferences.get({ key: BACKUP_KEY });
    try {
      return prev.value ? normalize(JSON.parse(prev.value)) : emptyData();
    } catch {
      return emptyData();
    }
  }
}

let chain: Promise<void> = Promise.resolve();

/** 書き込みは順番に1本ずつ。前回の保存を控えに残してから上書きする */
export function saveData(data: AppData): Promise<void> {
  const json = JSON.stringify(data);
  chain = chain.then(async () => {
    const cur = await Preferences.get({ key: KEY });
    if (cur.value) await Preferences.set({ key: BACKUP_KEY, value: cur.value });
    await Preferences.set({ key: KEY, value: json });
  }).catch((e) => console.error('[yamebiyori] save failed', e));
  return chain;
}

export async function clearData(): Promise<void> {
  await chain;
  await Preferences.remove({ key: KEY });
  await Preferences.remove({ key: BACKUP_KEY });
  // 「すべて消す」は前の版の記録も消す(消したのに次に開くと戻ってくる、を起こさない)
  for (const k of FLAVOR.legacyKeys ?? []) {
    await Preferences.remove({ key: keyOf(k) });
    await Preferences.remove({ key: `${keyOf(k)}.prev` });
  }
}
