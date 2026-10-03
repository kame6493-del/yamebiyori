import type { Theme } from '../domain/themes';

const FONT = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic UI", "Yu Gothic", sans-serif';
const SERIF = '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif';

export interface CardInput {
  theme: Theme;
  appName: string;
  headline: string; // 例: 「お酒をやめて 通算」
  big: string; // 例: 「30」
  unit: string; // 例: 「日」
  lines: string[]; // 下の小さな行(浮いたお金など)
  dateText: string;
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/** 横幅に収まるまで文字を小さくする */
function fitText(c: CanvasRenderingContext2D, text: string, maxW: number, size: number, family: string, weight = 700) {
  let s = size;
  do {
    c.font = `${weight} ${s}px ${family}`;
    if (c.measureText(text).width <= maxW) break;
    s -= 4;
  } while (s > 12);
  return s;
}

/** 記念日の画像(1080x1350、SNS の縦長) */
export function drawMilestoneCard(inp: CardInput): string {
  const W = 1080, H = 1350;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d')!;
  const t = inp.theme;
  c.fillStyle = t.paper; c.fillRect(0, 0, W, H);
  // 大きな円(日の出のような印)
  c.fillStyle = t.accentSoft;
  c.beginPath(); c.arc(W / 2, 560, 360, 0, Math.PI * 2); c.fill();
  c.strokeStyle = t.accent; c.lineWidth = 6;
  c.beginPath(); c.arc(W / 2, 560, 360, Math.PI * 1.08, Math.PI * 1.92); c.stroke();

  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.fillStyle = t.ink2;
  fitText(c, inp.headline, 760, 50, FONT, 600);
  c.fillText(inp.headline, W / 2, 400);
  c.fillStyle = t.accent;
  const bigSize = fitText(c, inp.big, 640, 300, SERIF, 700);
  c.fillText(inp.big, W / 2 - 40, 400 + bigSize * 0.95);
  c.fillStyle = t.ink;
  c.font = `700 84px ${FONT}`;
  const bw = (() => { c.font = `700 ${bigSize}px ${SERIF}`; return c.measureText(inp.big).width; })();
  c.font = `700 84px ${FONT}`;
  c.textAlign = 'left';
  c.fillText(inp.unit, W / 2 - 40 + bw / 2 + 12, 400 + bigSize * 0.95);

  c.textAlign = 'center';
  let y = 1030;
  for (const ln of inp.lines.slice(0, 2)) {
    c.fillStyle = t.sheet;
    roundRect(c, 150, y - 66, W - 300, 96, 48); c.fill();
    c.strokeStyle = t.rule; c.lineWidth = 3; c.stroke();
    c.fillStyle = t.ink;
    fitText(c, ln, W - 380, 46, FONT, 600);
    c.fillText(ln, W / 2, y);
    y += 124;
  }
  c.fillStyle = t.ink3;
  c.font = `500 34px ${FONT}`;
  c.fillText(`${inp.dateText}  ${inp.appName}`, W / 2, H - 56);
  return cv.toDataURL('image/png');
}

/** 待ち受け画像(1170x2532、ロック画面の時計の下に数字が来る配置) */
export function drawWallpaper(inp: CardInput & { reason: string }): string {
  const W = 1170, H = 2532;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d')!;
  const t = inp.theme;
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, t.paper); g.addColorStop(1, t.accentSoft);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.textAlign = 'center';
  c.fillStyle = t.ink2;
  fitText(c, inp.headline, 900, 56, FONT, 600);
  c.fillText(inp.headline, W / 2, 1180);
  c.fillStyle = t.accent;
  const s = fitText(c, inp.big + inp.unit, 900, 260, SERIF, 700);
  c.fillText(inp.big + inp.unit, W / 2, 1180 + s * 1.0);
  c.fillStyle = t.ink;
  let y = 1180 + s + 140;
  for (const ln of inp.lines.slice(0, 2)) {
    fitText(c, ln, 900, 52, FONT, 600);
    c.fillText(ln, W / 2, y); y += 84;
  }
  if (inp.reason.trim()) {
    // 理由は小さくせず、幅で折り返す(最大3行)
    c.fillStyle = t.ink2;
    c.font = `500 50px ${FONT}`;
    const text = `「${inp.reason.trim().slice(0, 60)}」`;
    const rows: string[] = [];
    let cur = '';
    for (const ch of text) {
      if (c.measureText(cur + ch).width > 900) { rows.push(cur); cur = ch; } else cur += ch;
    }
    if (cur) rows.push(cur);
    rows.slice(0, 3).forEach((r, i) => c.fillText(r, W / 2, y + 90 + i * 72));
  }
  c.fillStyle = t.ink3;
  c.font = `500 36px ${FONT}`;
  c.fillText(`${inp.dateText} 時点  ${inp.appName}`, W / 2, H - 220);
  return cv.toDataURL('image/png');
}
