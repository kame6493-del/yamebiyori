/**
 * App Review 用の画面録画で流す自動操作。VITE_REVIEW_TOUR=1 で作ったビルドだけで動く(製品版には入らない)。
 * 持ち主が iPhone を持っていないので、CI のシミュレーターでこれを流しながら録画する(.github/workflows/ios-review-video.yml)。
 * 起動(はじめの画面)→ やめ始めた日・お金・理由を入れる → ホーム → 飲みたくなった/吸いたくなった(5分タイマー)→ 乗り切れた
 * → 記録 → 体のこと → 完全版の購入画面。お酒・たばこのどちらのビルドでも同じ手順で進む。押した所に丸を出す。
 */
import flavor from '../flavor.current.json';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const SMOKE = flavor.kind === 'smoke';
const BOTH = flavor.kind === 'both';

function tapMark(el: Element) {
  const r = el.getBoundingClientRect();
  const dot = document.createElement('div');
  Object.assign(dot.style, {
    position: 'fixed', left: `${r.left + r.width / 2 - 22}px`, top: `${r.top + r.height / 2 - 22}px`,
    width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(210,64,42,0.35)',
    border: '2px solid rgba(210,64,42,0.8)', zIndex: '99999', pointerEvents: 'none', transition: 'opacity .6s, transform .6s',
  });
  document.body.appendChild(dot);
  requestAnimationFrame(() => { dot.style.transform = 'scale(1.4)'; dot.style.opacity = '0'; });
  setTimeout(() => dot.remove(), 700);
}

async function find(sel: string, pred: (b: HTMLElement) => boolean = () => true, wait = 6000): Promise<HTMLElement | null> {
  const end = Date.now() + wait;
  while (Date.now() < end) {
    const el = [...document.querySelectorAll<HTMLElement>(sel)].find((b) => b.getClientRects().length > 0 && !(b as HTMLButtonElement).disabled && pred(b));
    if (el) return el;
    await sleep(200);
  }
  return null;
}

async function tap(sel: string, pred: (b: HTMLElement) => boolean = () => true, pause = 1500, wait = 6000) {
  const el = await find(sel, pred, wait);
  if (!el) return false;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  await sleep(500);
  tapMark(el);
  await sleep(250);
  el.click();
  await sleep(pause);
  return true;
}

const text = (s: string) => (b: HTMLElement) => b.innerText.replace(/\s+/g, '').includes(s.replace(/\s+/g, ''));

/** React の入力欄に値を入れる(元の setter + input イベント)。typing=true なら1文字ずつ */
async function fill(sel: string, v: string, typing = false) {
  const el = (await find(sel, undefined, 3000)) as HTMLInputElement | HTMLTextAreaElement | null;
  if (!el) return false;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  await sleep(500);
  tapMark(el);
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!;
  const parts = typing ? [...v].map((_, k) => v.slice(0, k + 1)) : [v];
  for (const s of parts) {
    setter.call(el, s);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(typing ? 150 : 0);
  }
  await sleep(900);
  return true;
}

async function scrollSlow(to: number, ms = 1600) {
  const from = window.scrollY;
  const steps = 30;
  for (let k = 1; k <= steps; k++) { window.scrollTo(0, from + ((to - from) * k) / steps); await sleep(ms / steps); }
}

const pad = (n: number) => String(n).padStart(2, '0');
function localInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** はじめの入力1つ分(やめ始めた日時・お金・理由) */
async function firstForm(smoke: boolean, daysAgo: number, reason: string, button: string) {
  await sleep(1500);
  await scrollSlow(400, 1500); await sleep(800);
  if (await tap('button', text('前から(日時を選ぶ)'), 1000)) {
    await fill('input[type="datetime-local"]', localInput(new Date(Date.now() - (daysAgo * 24 + 1) * 3600e3)));
  }
  if (smoke) {
    await fill('input[aria-label="1箱の値段"]', '600', true);
    await fill('input[aria-label="1日の本数"]', '20', true);
  } else {
    await fill('input[aria-label="使っていたお金"]', '3500', true);
  }
  await fill('textarea', reason, true);
  await tap('button.primary', text(button), 3500);
}

export async function runReviewTour() {
  await sleep(4000); // はじめの画面を見せる
  if (BOTH) {
    // 何をやめるか: 両方 → お酒の入力 → たばこの入力
    await tap('.pick-btn', text('両方'), 2000);
    await firstForm(false, 10, '朝すっきり起きたい', 'つぎへ');
    await firstForm(true, 4, '服のにおいを気にしたくない', 'はじめる');
  } else {
    await firstForm(SMOKE, 10, '朝すっきり起きたい', 'はじめる');
  }

  // ホーム: 続いた日数・浮いたお金・理由。両方のときは、たばこの方も開いて見せてから、お酒に戻す
  await scrollSlow(document.body.scrollHeight, 2500); await sleep(1500); await scrollSlow(0, 1200); await sleep(800);
  if (BOTH && (await tap('.pair-card', text('たばこ'), 2500))) {
    await scrollSlow(document.body.scrollHeight, 2500); await sleep(1200); await scrollSlow(0, 1200);
    await tap('.pair-card', text('お酒'), 2000);
  }

  // 飲みたくなった / 吸いたくなった → 5分タイマー → 乗り切れた
  if (await tap('.crave-btn', undefined, 3000)) {
    await tap('.chip-btn', undefined, 900);
    await tap('.strength button', text('4'), 900);
    const scenes = [...document.querySelectorAll<HTMLElement>('.chip-btn')];
    if (scenes.length > 1) await tap('.chip-btn', (b) => b === scenes[scenes.length - 1], 900);
    await sleep(1500);
    await tap('button.primary', text('乗り切れた'), 3000);
  }

  // 記録(カレンダー・乗り切り方・記念日)
  await tap('.tab', text('記録'), 2000);
  await scrollSlow(document.body.scrollHeight, 3000); await sleep(1500);
  // 体のこと(出典つき)
  await tap('.tab', (b) => b.innerText.includes('体'), 2000);
  await scrollSlow(document.body.scrollHeight * 0.6, 2500); await sleep(1500);

  // 記録のグラフ(完全版)→ 購入画面。無ければホームの案内から
  await tap('.tab', text('記録'), 1500);
  if (!(await tap('.locked button', undefined, 3000))) {
    await tap('.tab', text('きょう'), 1500);
    await tap('.unlock', undefined, 3000);
  }
  await sleep(1500);
  await scrollSlow(document.body.scrollHeight, 2500);
  await sleep(2500);
  // 購入ボタン(シミュレーターでストアの商品が取れたときだけ押せる)
  await tap('.pw-cta button.primary', text('買う'), 10000, 10000);
  await sleep(6000);
}
