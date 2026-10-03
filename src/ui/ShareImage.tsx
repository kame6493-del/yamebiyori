import { useMemo, useState } from 'react';
import { FLAVOR, wordsFor } from '../domain/flavor';
import { MILESTONES, milestoneTime } from '../domain/milestones';
import { computeStats, formatYen } from '../domain/stats';
import type { Theme } from '../domain/themes';
import type { Habit } from '../domain/types';
import { shareImage } from '../platform/native';
import { drawMilestoneCard, drawWallpaper } from './cardImage';
import { fmtDate, TopBar } from './common';

/** 記念日の画像(kind=card)と待ち受け画像(kind=wall)。完全版だけが開ける */
export function ShareImage(p: { habit: Habit; now: number; theme: Theme; kind: 'card' | 'wall'; days?: number; onClose: () => void }) {
  const h = p.habit;
  const w = wordsFor(h.kind, h.name);
  const s = computeStats(h, p.now);
  const [msg, setMsg] = useState('');
  const m = MILESTONES.find((x) => x.days === p.days);
  const url = useMemo(() => {
    if (p.kind === 'card') {
      // 記念日の画像は、その記念日に届いた時点の数字で描く(今日の数字を混ぜない)
      const at = m ? Math.min(p.now, milestoneTime(h, m.days)) : p.now;
      const sa = computeStats(h, at);
      const big = m ? String(m.days) : String(sa.totalDays);
      const lines = [`浮いたお金 ${formatYen(sa.savedYen)}`, `${fmtDate(Date.parse(h.startAt))}から`];
      return drawMilestoneCard({ theme: p.theme, appName: FLAVOR.appName, headline: `${w.thing}をやめて 通算`, big, unit: '日', lines, dateText: fmtDate(at) });
    }
    return drawWallpaper({ theme: p.theme, appName: FLAVOR.appName, headline: `${w.thing}をやめて 今回`, big: String(s.streakDays), unit: '日', lines: [`通算 ${s.totalDays}日`, `浮いたお金 ${formatYen(s.savedYen)}`], dateText: fmtDate(p.now), reason: h.reason });
  }, [p.kind, p.theme, p.now, m, h, s.savedYen, s.streakDays, s.totalDays, w.thing]);

  const save = async () => {
    setMsg('');
    try {
      await shareImage(url, p.kind === 'card' ? `yamebiyori_${m?.days ?? s.totalDays}days.png` : 'yamebiyori_wallpaper.png');
    } catch (e) {
      setMsg(`保存できませんでした(${(e as Error).message ?? e})`);
    }
  };

  return (
    <div className="page share">
      <TopBar title={p.kind === 'card' ? '記念の画像' : '待ち受け画像'} onClose={p.onClose} />
      <div className={`share-img ${p.kind}`}><img src={url} alt={p.kind === 'card' ? '記念の画像' : '待ち受け画像'} /></div>
      {p.kind === 'wall' && <p className="small muted">ロック画面に置くと、開かなくても日数が目に入ります。数字は作った時点のものです。ときどき作り直してください。</p>}
      {msg && <p className="err">{msg}</p>}
      <div className="bottom-bar">
        <button className="btn primary wide big" onClick={save}>保存・共有する</button>
      </div>
    </div>
  );
}
