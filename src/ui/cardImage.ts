import type { Theme } from '../domain/themes';
import { art } from './art';

const FONT = '"Hiragino Maru Gothic ProN", "Hiragino Sans", "Noto Sans JP", "Yu Gothic UI", "Yu Gothic", sans-serif';

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

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, ng) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => ng(new Error('絵を読み込めませんでした'));
    im.src = src;
  });
}

/** 絵を枠いっぱいに(はみ出た所は切る)。ay は縦のどこを残すか(0=上 1=下) */
function cover(c: CanvasRenderingContext2D, im: HTMLImageElement, x: number, y: number, w: number, h: number, ay = 0.5) {
  const k = Math.max(w / im.width, h / im.height);
  const sw = w / k, sh = h / k;
  c.drawImage(im, (im.width - sw) / 2, (im.height - sh) * ay, sw, sh, x, y, w, h);
}

/** 墨色のときは絵を少し暗くして、文字の札をなじませる */
function dim(c: CanvasRenderingContext2D, t: Theme, W: number, H: number) {
  if (!t.dark) return;
  c.fillStyle = 'rgba(20,24,30,.38)';
  c.fillRect(0, 0, W, H);
}

/** 記念日の画像(1080x1350、SNS の縦長)。見本の「100日達成」の絵(月桂樹の輪と朝日とベンチ)に数字を書く */
export async function drawMilestoneCard(inp: CardInput): Promise<string> {
  const W = 1080, H = 1350;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d')!;
  const t = inp.theme;
  c.fillStyle = t.paper; c.fillRect(0, 0, W, H);
  cover(c, await load(art('card_art')), 0, 0, W, H, 0.3);
  dim(c, t, W, H);
  // 輪の中(見本の文字を消した所)に、朝の光のような生成りの楕円を敷いて文字を読みやすく
  const g = c.createRadialGradient(W / 2, 690, 60, W / 2, 690, 420);
  g.addColorStop(0, 'rgba(255,249,232,1)'); g.addColorStop(0.72, 'rgba(255,249,232,.97)'); g.addColorStop(1, 'rgba(255,249,232,0)');
  c.fillStyle = g;
  c.save(); c.translate(W / 2, 690); c.scale(0.86, 1); c.beginPath(); c.arc(0, 0, 420, 0, Math.PI * 2); c.restore(); c.fill();

  const brown = '#7a5230';
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.fillStyle = brown;
  fitText(c, inp.headline, 520, 52, FONT, 700);
  c.fillText(inp.headline, W / 2, 520);
  const bigSize = fitText(c, inp.big, 440, 230, FONT, 800);
  const bw = c.measureText(inp.big).width;
  c.font = `800 ${bigSize}px ${FONT}`;
  c.fillText(inp.big, W / 2 - 40, 520 + bigSize * 0.92);
  c.font = `800 96px ${FONT}`;
  c.textAlign = 'left';
  c.fillText(inp.unit, W / 2 - 40 + bw / 2 + 8, 520 + bigSize * 0.92);
  c.textAlign = 'center';
  c.font = `700 60px ${FONT}`;
  c.fillText('達成', W / 2, 520 + bigSize * 0.92 + 92);

  // 下の行(浮いたお金・始めた日)は白い札に
  let y = 1100;
  for (const ln of inp.lines.slice(0, 2)) {
    c.fillStyle = 'rgba(255,253,248,.92)';
    roundRect(c, 170, y - 58, W - 340, 84, 42); c.fill();
    c.fillStyle = '#3a3a33';
    fitText(c, ln, W - 400, 40, FONT, 700);
    c.fillText(ln, W / 2, y);
    y += 104;
  }
  c.fillStyle = 'rgba(255,253,248,.85)';
  roundRect(c, W / 2 - 300, H - 92, 600, 60, 30); c.fill();
  c.fillStyle = '#5f5d54';
  c.font = `600 30px ${FONT}`;
  c.fillText(`${inp.dateText}  ${inp.appName}`, W / 2, H - 50);
  return cv.toDataURL('image/png');
}

/** 待ち受け画像(1170x2532)。下半分は見本のロック画面の景色、上は空の色をのばす(時計の所は空ける) */
export async function drawWallpaper(inp: CardInput & { reason: string }): Promise<string> {
  const W = 1170, H = 2532;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d')!;
  const t = inp.theme;
  const im = await load(art('wall_art'));
  const ah = Math.round(im.height * (W / im.width));
  const top = H - ah;
  // 空: 絵のいちばん上の色から、上へ少し青く
  const probe = document.createElement('canvas');
  probe.width = im.width; probe.height = 4;
  const pc = probe.getContext('2d')!;
  pc.drawImage(im, 0, 0, im.width, 4, 0, 0, im.width, 4);
  const px = pc.getImageData(Math.floor(im.width / 2), 1, 1, 1).data;
  const sky = c.createLinearGradient(0, 0, 0, top + 4);
  sky.addColorStop(0, '#bcdbe6'); sky.addColorStop(1, `rgb(${px[0]},${px[1]},${px[2]})`);
  c.fillStyle = sky; c.fillRect(0, 0, W, top + 4);
  c.drawImage(im, 0, top, W, ah);
  // 絵の上の端を空になじませる
  const blend = c.createLinearGradient(0, top - 2, 0, top + 120);
  blend.addColorStop(0, `rgba(${px[0]},${px[1]},${px[2]},1)`); blend.addColorStop(1, `rgba(${px[0]},${px[1]},${px[2]},0)`);
  c.fillStyle = blend; c.fillRect(0, top - 2, W, 122);
  dim(c, t, W, H);

  // 時計の下に、日数の札
  const cy = 1000;
  c.fillStyle = 'rgba(255,253,248,.9)';
  roundRect(c, 185, cy - 210, W - 370, 470, 120); c.fill();
  c.textAlign = 'center';
  c.fillStyle = '#5f5d54';
  fitText(c, inp.headline, 700, 54, FONT, 700);
  c.fillText(inp.headline, W / 2, cy - 100);
  c.fillStyle = '#4f8a3d';
  const s = fitText(c, inp.big + inp.unit, 700, 220, FONT, 800);
  c.fillText(inp.big + inp.unit, W / 2, cy - 100 + s * 0.95);
  c.fillStyle = '#3a3a33';
  c.font = `700 46px ${FONT}`;
  c.fillText(inp.lines.slice(0, 2).join('   '), W / 2, cy + 205);
  if (inp.reason.trim()) {
    // 理由は小さくせず、幅で折り返す(最大3行)。空の上に白い札
    c.font = `600 48px ${FONT}`;
    const text = `「${inp.reason.trim().slice(0, 60)}」`;
    const rows: string[] = [];
    let cur = '';
    for (const ch of text) {
      if (c.measureText(cur + ch).width > 820) { rows.push(cur); cur = ch; } else cur += ch;
    }
    if (cur) rows.push(cur);
    const rs = rows.slice(0, 3);
    const ry = cy + 330;
    c.fillStyle = 'rgba(255,253,248,.82)';
    roundRect(c, 150, ry - 70, W - 300, rs.length * 70 + 60, 50); c.fill();
    c.fillStyle = '#3a3a33';
    rs.forEach((r, i) => c.fillText(r, W / 2, ry + i * 70));
  }
  c.fillStyle = 'rgba(255,253,248,.85)';
  roundRect(c, W / 2 - 320, H - 300, 640, 66, 33); c.fill();
  c.fillStyle = '#5f5d54';
  c.font = `600 32px ${FONT}`;
  c.fillText(`${inp.dateText} 時点  ${inp.appName}`, W / 2, H - 256);
  return cv.toDataURL('image/png');
}
