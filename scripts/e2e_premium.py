"""完全版の機能を、開発サーバー(疑似購入が使える)で押して回る確認。
python scripts/e2e_premium.py http://localhost:5291/
製品ビルドには疑似購入が入らないので、この確認だけは開発サーバーで行う。"""
import json
import os
import sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")
URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5291/"
HERE = os.path.dirname(os.path.abspath(__file__))
FL = json.load(open(os.path.join(os.path.dirname(HERE), "src", "flavor.current.json"), encoding="utf-8"))
OUT = os.path.join(HERE, "e2e_out", FL["key"] + "_premium")
os.makedirs(OUT, exist_ok=True)
errors, fails = [], []
BOTH = FL["kind"] == "both"
FIRST = "お酒" if BOTH else FL["thing"]


def check(cond, msg):
    print(("OK  " if cond else "NG  ") + msg, flush=True)
    if not cond:
        fails.append(msg)


def shot(page, name):
    page.screenshot(path=os.path.join(OUT, name + ".png"), full_page=True)


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, locale="ja-JP", accept_downloads=True)
    page = ctx.new_page()
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("dialog", lambda d: d.accept())

    # 無料の見本データで始めて、画面から買う(疑似購入)
    page.goto(URL + "?demo=1&days=45&slips=1&crav=28")
    page.wait_for_selector(".hero")
    check(page.locator(".unlock").count() == 1, "無料では完全版の案内")
    page.click(".unlock")
    page.wait_for_selector(".paywall")
    check("¥600" in page.inner_text(".pw-cta"), "開発用の値段 ¥600 が出る")
    page.click(".pw-cta .btn.primary")
    page.wait_for_selector(".hero")
    check(page.locator(".unlock").count() == 0, "買ったら案内が消える")

    # グラフ
    page.click(".tab:has-text('記録')")
    page.wait_for_selector(".cal-grid")
    check(page.locator(".chart").count() == 3, "グラフ3つ(時間帯・曜日・お金)")
    check(page.locator(".bar-mark").count() > 3, "棒が描かれている")
    page.locator(".chart").first.locator("g").nth(8).click()
    check("回" in page.locator(".chart-val").first.inner_text(), "棒を押すと値が出る")
    shot(page, "01_graphs")

    # 記念日の画像
    page.locator(".ms li.got button").last.click()
    page.wait_for_selector(".share-img img")
    src = page.get_attribute(".share-img img", "src")
    check(src.startswith("data:image/png") and len(src) > 20000, "記念日の画像ができる")
    with page.expect_download() as dl:
        page.click("text=保存・共有する")
    check(dl.value.suggested_filename.endswith(".png"), "画像を保存できる")
    shot(page, "02_card")
    page.click(".topbar .icon")

    # 待ち受け
    page.click("text=待ち受け画像をつくる")
    page.wait_for_selector(".share-img.wall img")
    check(page.get_attribute(".share-img img", "src").startswith("data:image/png"), "待ち受け画像ができる")
    shot(page, "03_wall")
    page.click(".topbar .icon")

    # 色
    page.click(".tab:has-text('設定')")
    page.click(".theme:has-text('よる')")
    bg = page.evaluate("getComputedStyle(document.body).backgroundColor")
    check(bg == "rgb(21, 25, 31)", f"色を「よる」に変えられる {bg}")
    shot(page, "04_theme_yoru")
    page.click(".theme:nth-child(1)")

    # 複数の習慣
    page.click("text=やめたいことを足す")
    page.wait_for_selector(".form")
    page.click(".seg button:has-text('そのほか')")
    page.fill("input[placeholder^='例: 甘い']", "甘いジュース")
    page.fill("input[aria-label='使っていたお金']", "1050")
    page.click("text=はじめる")
    sel = ".pair-card" if BOTH else ".switch button"
    page.wait_for_selector(sel)
    want = 3 if BOTH else 2
    check(page.locator(sel).count() == want, f"足すとホームに{want}つ並ぶ")
    check("甘いジュースをやめて" in page.inner_text(".hero-label"), "足した物がホームに出る")
    page.click(".crave-btn")
    page.wait_for_selector(".timer")
    check(page.locator(".quote").count() == 0, "出典の無い習慣には体の情報を出さない")
    page.click("text=乗り切れた")
    page.wait_for_selector(".hero")
    page.locator(sel).first.click()
    check(FIRST in page.inner_text(".hero-label"), "元の習慣に戻れる")
    shot(page, "05_two_habits")

    check(not errors, f"画面のエラー無し {errors[:3]}")
    b.close()

print(f"\n{FL['appName']} 完全版: NG {len(fails)} 件")
sys.exit(1 if fails else 0)
