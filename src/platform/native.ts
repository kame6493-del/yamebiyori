import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';
import type { PlannedNotice } from '../domain/milestones';

const native = Capacitor.isNativePlatform();

export function buzz() {
  if (!native) return;
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}

/** 記念日のお知らせの id は 10000〜99999 を使う(習慣ごとに 1000 ずつ) */
const ID_MIN = 10000;
const ID_MAX = 99999;

/** 記念日のお知らせを入れ直す。notices が空なら全部取り消す。許可されなかったら false */
export async function scheduleMilestones(notices: PlannedNotice[]): Promise<boolean> {
  if (!native) return true;
  try {
    const pending = await LocalNotifications.getPending();
    const ours = pending.notifications.filter((n) => n.id >= ID_MIN && n.id <= ID_MAX).map((n) => ({ id: n.id }));
    if (ours.length) await LocalNotifications.cancel({ notifications: ours });
    if (!notices.length) return true;
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return false;
    await LocalNotifications.schedule({
      // 記念日は数分ずれても困らない。正確なアラームの権限(設定画面への誘導)を使わない
      notifications: notices.map((n) => ({ id: n.id, title: n.title, body: n.body, isExactNotification: false, schedule: { at: new Date(n.at), allowWhileIdle: true } })),
    });
    return true;
  } catch (e) {
    console.error('[yamebiyori] notify', e);
    return false;
  }
}

/** 画像(data URL の PNG)を保存・共有する。ブラウザではダウンロードにする */
export async function shareImage(dataUrl: string, fileName: string): Promise<void> {
  if (!native) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }
  const base64 = dataUrl.split(',')[1] ?? '';
  const { uri } = await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
  await Share.share({ title: fileName, files: [uri] });
}

/** 控え(文字)を共有する。ブラウザではファイルとしてダウンロード */
export async function shareText(text: string, fileName: string): Promise<void> {
  if (!native) {
    const blob = new Blob([text], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }
  const { uri } = await Filesystem.writeFile({ path: fileName, data: btoa(unescape(encodeURIComponent(text))), directory: Directory.Cache });
  await Share.share({ title: fileName, files: [uri] });
}

export function openUrl(url: string) {
  window.open(url, '_blank', 'noopener');
}
