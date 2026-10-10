"""全画面を 375 と 430 の幅で開いて撮る E2E(2026-10 の作り直しの確認)。
python scripts/e2e_screens.py http://localhost:5291/   (開発サーバー。見本データ ?demo=1 と疑似購入を使うため)
先に node scripts/use-flavor.mjs <both|tabako> で版を選んでおく。
撮った写真: scripts/e2e_out/screens_<flavor>_<幅>/NN_名前.png(画面の大きさ)と NN_名前_full.png(下まで)
画面ごとに: 横にはみ出していないか・絵が全部読めたか・画面のエラーが無いか・英語の取り残しが無いか を見る。"""
import json
import os
import re
import sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")
URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5291/"
HERE = os.path.dirname(os.path.abspath(__file__))
FL = json.load(open(os.path.join(os.path.dirname(HERE), "src", "flavor.current.json"), encoding="utf-8"))
BOTH = FL["kind"] == "both"
fails = []


def check(cond, msg):
    print(("OK  " if cond else "NG  ") + msg, flush=True)
    if not cond:
        fails.append(msg)


def run(width):
    height = 812 if width == 375 else 932
    out = os.path.join(HERE, "e2e_out", f"screens_{FL['key']}_{width}")
    os.makedirs(out, exist_ok=True)
    for f in os.listdir(out):
        os.remove(os.path.join(out, f))
    with sync_playwright() as p:
        b = p.chromium.launch()
        errors = []

        def open_page(q=""):
            ctx = b.new_context(viewport={"width": width, "height": height}, device_scale_factor=2, locale="ja-JP", accept_downloads=True)
            pg = ctx.new_page()
            pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            pg.on("pageerror", lambda e: errors.append(str(e)))
            pg.on("dialog", lambda d: d.accept())
            pg.goto(URL + q)
            return pg

        def shot(pg, name):
            # 知らせの帯(数秒で消える)が消えてから撮る
            pg.wait_for_selector(".toast", state="detached", timeout=6000)
            pg.wait_for_timeout(350)
            pg.evaluate("window.scrollTo(0, 0)")
            pg.wait_for_timeout(150)
            pg.screenshot(path=os.path.join(out, f"{name}.png"))
            pg.screenshot(path=os.path.join(out, f"{name}_full.png"), full_page=True)
            over = pg.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            check(over <= 0, f"{width} {name}: 横にはみ出していない ({over})")
            broken = pg.evaluate("[...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src.slice(-40))")
            check(not broken, f"{width} {name}: 絵が全部読めた {broken}")
            txt = pg.evaluate("""() => { const c = document.body.cloneNode(true); c.querySelectorAll('.cite, .cite-url').forEach(e => e.remove()); return c.innerText; }""")
            eng = re.findall(r"[A-Za-z]{3,}", txt)
            check(not eng, f"{width} {name}: 英語の取り残しなし {eng[:5]}")

        # はじめの画面
        pg = open_page()
        pg.wait_for_selector(".welcome")
        shot(pg, "01_welcome")
        if BOTH:
            pg.click(".pick-btn:has-text('両方')")
        else:
            pg.click(".start-btn")
        pg.wait_for_selector(".form")
        shot(pg, "02_form")
        pg.context.close()

        # ホーム(見本データ)
        pg = open_page("?demo=1&days=45&slips=1&crav=28")
        pg.wait_for_selector(".hero")
        shot(pg, "03_home")
        if BOTH:
            pg.click(".pair-card:has-text('たばこ')")
            pg.wait_for_selector(".hero-label:has-text('たばこ')")
            shot(pg, "03b_home_tabako")
            pg.click(".pair-card:has-text('お酒')")
        # 気持ちが来た 1〜4
        pg.click(".crave-btn")
        pg.wait_for_selector(".faces")
        pg.click(".faces button:has-text('4')")
        pg.locator(".chip-btn.scene").first.click()
        shot(pg, "04_feel")
        pg.click(".next-btn")
        pg.wait_for_selector(".timer-num")
        t1 = pg.inner_text(".timer-num")
        check(t1 in ("05:00", "04:59", "04:58"), f"{width} 5分タイマーが動き出す {t1}")
        pg.locator(".chip-btn.try").first.click()
        pg.wait_for_timeout(1500)
        check(pg.inner_text(".timer-num") != t1, f"{width} タイマーが進む")
        shot(pg, "05_timer")
        pg.click("text=効いた方法を見る")
        pg.wait_for_selector(".methods")
        check(pg.locator(".methods li").count() >= 5, f"{width} 効いた方法の一覧")
        check("%" in pg.inner_text(".methods"), f"{width} 効いた割合が出る")
        shot(pg, "06_methods")
        pg.click("text=これで乗り切れた")
        pg.wait_for_selector(".outcome")
        pg.fill(".step4 textarea", "散歩したら落ち着いた")
        shot(pg, "07_save")
        pg.click(".save-btn")
        pg.wait_for_selector(".toast")
        check("乗り切れました" in pg.inner_text(".toast"), f"{width} 保存すると乗り切れたと出る")
        # 記録する(飲んでしまった日)
        pg.click(".slip-btn")
        pg.wait_for_selector(".gentle")
        shot(pg, "08_slip")
        pg.click(".topbar .icon")
        # 記録
        pg.click(".tab:has-text('記録')")
        pg.wait_for_selector(".ms")
        shot(pg, "09_log")
        # カレンダー
        pg.click(".tab:has-text('カレンダー')")
        pg.wait_for_selector(".cal-grid")
        check(pg.locator(".cal-day.free").count() >= 10, f"{width} カレンダーにやめられた日")
        shot(pg, "10_calendar")
        pg.locator(".cal-day.free").nth(3).click()
        pg.wait_for_selector(".day-head")
        shot(pg, "11_day")
        pg.click(".topbar .icon")
        pg.click(".tab:has-text('カレンダー')")
        for _ in range(3):
            if pg.locator(".cal-day.slip").count():
                break
            pg.click("[aria-label='前の月']")
        pg.locator(".cal-day.slip").first.click()
        pg.wait_for_selector(".day-head")
        check("しまった日" in pg.inner_text(".day-head"), f"{width} 飲んでしまった日の日別の記録")
        shot(pg, "11b_day_slip")
        pg.click(".topbar .icon")
        # 読みもの
        pg.click(".tab:has-text('読みもの')")
        pg.wait_for_selector(".body")
        shot(pg, "12_body")
        if BOTH:
            pg.click(".switch button:has-text('たばこ')")
            pg.wait_for_selector(".tl")
            shot(pg, "12b_body_tabako")
            pg.click(".switch button:has-text('お酒')")
        # 設定
        pg.click(".tab:has-text('設定')")
        pg.wait_for_selector(".themes")
        shot(pg, "13_settings")
        # 完全版
        pg.click(".theme:has-text('墨色')")
        pg.wait_for_selector(".paywall")
        shot(pg, "14_paywall")
        pg.click(".pw-cta .btn.coral")
        pg.wait_for_selector(".tabbar")
        # 完全版: グラフ・記念日の画像・待ち受け・色
        pg.click(".tab:has-text('記録')")
        pg.wait_for_selector(".chart")
        check(pg.locator(".chart").count() == 3, f"{width} 完全版のグラフ3つ")
        pg.evaluate("document.querySelector('.chart').scrollIntoView()")
        pg.screenshot(path=os.path.join(out, "15_graphs.png"))
        pg.locator(".ms li.got button").first.click()
        pg.wait_for_selector(".share-img img")
        check(len(pg.get_attribute(".share-img img", "src")) > 20000, f"{width} 記念日の画像ができる")
        shot(pg, "16_card")
        pg.click(".topbar .icon")
        pg.click("text=待ち受け画像をつくる")
        pg.wait_for_selector(".share-img.wall img")
        shot(pg, "17_wall")
        pg.click(".topbar .icon")
        pg.click(".tab:has-text('設定')")
        pg.click(".theme:has-text('墨色')")
        pg.click(".tab:has-text('ホーム')")
        pg.wait_for_selector(".hero")
        check(pg.evaluate("getComputedStyle(document.body).backgroundColor") == "rgb(30, 34, 40)", f"{width} 墨色に変わる")
        shot(pg, "18_home_sumi")
        pg.click(".tab:has-text('設定')")
        pg.click(".theme:has-text('さくら')")
        pg.click(".tab:has-text('ホーム')")
        shot(pg, "18b_home_sakura")
        pg.context.close()

        # 記念日に届いた日(お祝い)
        pg = open_page("?demo=1&days=30&slips=0&crav=6")
        pg.wait_for_selector(".celebrate")
        shot(pg, "19_celebrate")
        pg.context.close()

        # 始めたばかり(空の状態)
        pg = open_page("?demo=1&days=0&slips=0&crav=0")
        pg.wait_for_selector(".hero")
        pg.click(".tab:has-text('記録')")
        pg.wait_for_selector(".empty")
        shot(pg, "20_empty")
        pg.context.close()

        check(not errors, f"{width} 画面のエラー無し {errors[:3]}")
        b.close()


for w in (375, 430):
    run(w)
print(f"\n{FL['appName']}({FL['key']}) 全画面: NG {len(fails)} 件")
sys.exit(1 if fails else 0)
