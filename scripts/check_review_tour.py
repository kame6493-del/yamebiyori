"""録画用の自動操作(src/dev/reviewTour.ts)が最後まで進むかを手元のブラウザで確かめる。
先に VITE_REVIEW_TOUR=1 で作ったビルドを配っておく:
  VITE_REVIEW_TOUR=1 npx vite build --outDir <tmp> && npx vite preview --outDir <tmp> --port 5232 --strictPort
python scripts/check_review_tour.py [URL] [録画の置き場所] → 通った画面の見出しを順に出し、録画を残す。
完全版の購入画面(.paywall)まで行けば OK で終わる。"""
import os
import sys
import time
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5232/"
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.environ.get("TEMP", "."), "yamebiyori_review_tour")
os.makedirs(OUT, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=2, locale="ja-JP", timezone_id="Asia/Tokyo",
                        record_video_dir=OUT, record_video_size={"width": 393, "height": 852})
    pg = ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.on("dialog", lambda d: d.accept())
    pg.goto(URL)
    seen = []
    t0 = time.time()
    reached = None
    while time.time() - t0 < 150:
        txt = pg.evaluate("document.body.innerText.slice(0,70).replace(/\\s+/g,' ')")
        if not seen or seen[-1] != txt:
            seen.append(txt)
            print(round(time.time() - t0), txt)
            pg.screenshot(path=os.path.join(OUT, "s%03d.png" % round(time.time() - t0)))
        if reached is None and pg.locator(".paywall").count() > 0:
            reached = round(time.time() - t0)
        if reached is not None and time.time() - t0 > reached + 12:
            break
        time.sleep(1)
    path = pg.video.path()
    ctx.close()
    b.close()
    dst = os.path.join(OUT, "review_tour_check.webm")
    os.replace(path, dst)
    print("events:", pg and "", "errors:", errors)
    print("paywall reached at", reached, "s / total", round(time.time() - t0), "s / video", dst)
    sys.exit(0 if reached is not None and not errors else 1)
