"""製品ビルド(dist)を、買った人と同じく http で配って押して回る確認。
python scripts/e2e.py   (先に node scripts/use-flavor.mjs <both|sake|tabako> && npm run build)
both(お酒とたばこを1本にした版)は、はじめに「両方」を選んで2つ入れ、ホームの2つの数・切り替え・前の版の記録の引き継ぎも見る。
結果の画面写真は scripts/e2e_out/<flavor>/ に置く。"""
import datetime as dt
import functools
import http.server
import json
import os
import re
import sys
import threading
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FL = json.load(open(os.path.join(ROOT, "src", "flavor.current.json"), encoding="utf-8"))
OUT = os.path.join(HERE, "e2e_out", FL["key"])
os.makedirs(OUT, exist_ok=True)
BOTH = FL["kind"] == "both"
# both はホームを「お酒」から始めるので、そのあとの流れはお酒の版と同じ
SMOKE = FL["kind"] == "smoke"

# dist を自分で配る(この処理の中のスレッド。終わったら止める)
class Quiet(http.server.SimpleHTTPRequestHandler):
    # Windows のレジストリ次第で .js が text/plain になり、モジュールが読まれないため明示する
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".html": "text/html"}

    def log_message(self, *a):
        pass


handler = functools.partial(Quiet, directory=os.path.join(ROOT, "dist"))
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{srv.server_address[1]}/"

errors, fails = [], []
sys.stdout.reconfigure(encoding="utf-8")


def check(cond, msg):
    print(("OK  " if cond else "NG  ") + msg, flush=True)
    if not cond:
        fails.append(msg)


def shot(page, name):
    page.screenshot(path=os.path.join(OUT, name + ".png"), full_page=True)


def english_left(page):
    """画面の文字に英単語が残っていないか(出典のURL・著者の英字は除く)"""
    txt = page.evaluate("""() => {
        const c = document.body.cloneNode(true);
        c.querySelectorAll('.cite, .cite-url').forEach(e => e.remove());
        return c.innerText;
    }""")
    return re.findall(r"[A-Za-z]{3,}", txt)


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, locale="ja-JP", accept_downloads=True)
    page = ctx.new_page()
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("dialog", lambda d: d.accept())

    # 1. はじめて開いた所
    page.goto(URL)
    page.wait_for_selector(".welcome")
    if BOTH:
        check(page.locator(".pick-btn").count() == 3, "何をやめるか 3つ(お酒・たばこ・両方)")
        shot(page, "01_choose")
        check(not english_left(page), f"英語の取り残しなし(選ぶ画面) {english_left(page)}")
        # たばこだけ → 戻る → 両方
        page.click(".pick-btn:has-text('たばこ')")
        page.wait_for_selector("input[aria-label='1箱の値段']")
        check("たばこのこと" in page.inner_text(".topbar h1"), "たばこを選ぶと、たばこの入力")
        page.click(".topbar .icon")
        page.wait_for_selector(".pick")
        page.click(".pick-btn:has-text('両方')")
        page.wait_for_selector(".form")
        check("お酒のこと(1/2)" in page.inner_text(".topbar h1"), f"両方は お酒(1/2) から: {page.inner_text('.topbar h1')!r}")
        check(page.locator("button.primary").inner_text().startswith("つぎへ"), "1つ目のボタンは「つぎへ」")
    check(page.locator(".quote .cite").count() >= 1, "はじめの注意に出典が付いている")
    check("kennet.mhlw.go.jp" in page.locator(".quote .cite").first.inner_text(), "出典は e-ヘルスネット")
    shot(page, "01_welcome")
    check(not english_left(page), f"英語の取り残しなし(はじめ) {english_left(page)}")

    # 未来の日時は選べない
    page.click("text=前から(日時を選ぶ)")
    fut = (dt.datetime.now() + dt.timedelta(days=2)).strftime("%Y-%m-%dT%H:%M")
    page.fill("input[type=datetime-local]", fut)
    page.click("button.primary")
    check(page.locator("[role=alert]").inner_text().startswith("やめ始めた日時は、今より前"), "未来の開始日は止める")

    start = (dt.datetime.now() - dt.timedelta(days=10, hours=1)).strftime("%Y-%m-%dT%H:%M")
    page.fill("input[type=datetime-local]", start)
    if SMOKE:
        page.fill("input[aria-label='1箱の値段']", "600")
        page.fill("input[aria-label='1日の本数']", "20")
        per_day = 600
    else:
        page.fill("input[aria-label='使っていたお金']", "3500")  # 1週間あたり
        per_day = 500
    check(f"1日あたり {per_day:,}円" in page.inner_text(".page"), f"1日あたり {per_day}円 と出る")
    page.fill("textarea", "朝すっきり起きたい")
    if BOTH:
        shot(page, "01b_form_sake")
        page.click("button.primary")
        page.wait_for_selector("input[aria-label='1箱の値段']")
        check("たばこのこと(2/2)" in page.inner_text(".topbar h1"), "2つ目は たばこ(2/2)")
        check("kennet.mhlw.go.jp" in page.locator(".quote .cite").first.inner_text(), "たばこの注意も e-ヘルスネットの出典")
        page.click("text=前から(日時を選ぶ)")
        page.fill("input[type=datetime-local]", (dt.datetime.now() - dt.timedelta(days=4, hours=1)).strftime("%Y-%m-%dT%H:%M"))
        page.fill("input[aria-label='1箱の値段']", "600")
        page.fill("input[aria-label='1日の本数']", "20")
        page.fill("textarea", "服のにおいを気にしたくない")
        shot(page, "01c_form_tabako")
        check(page.locator("button.primary").inner_text() == "はじめる", "2つ目のボタンは「はじめる」")
    page.click("text=はじめる")

    # 2. ホーム
    page.wait_for_selector(".hero")
    if BOTH:
        cards = page.locator(".pair-card")
        check(cards.count() == 2, "ホームに お酒 と たばこ の2つの数")
        check("お酒" in cards.nth(0).inner_text() and "10" in cards.nth(0).locator("b").inner_text(), f"お酒 10日: {cards.nth(0).inner_text()!r}")
        check("たばこ" in cards.nth(1).inner_text() and cards.nth(1).locator("b").inner_text() == "4", f"たばこ 4日: {cards.nth(1).inner_text()!r}")
        check("お酒をやめて" in page.inner_text(".hero-label"), "はじめはお酒の方を大きく出す")
        tot = int(re.search(r"¥([\d,]+)", page.inner_text(".pair-total")).group(1).replace(",", ""))
        check(500 * 10 + 600 * 4 <= tot <= (500 * 10 + 600 * 4) * 1.01, f"合わせて浮いたお金 ¥{tot}")
    shot(page, "02_home")
    if BOTH:
        page.click(".pair-card:has-text('たばこ')")
        check("たばこをやめて" in page.inner_text(".hero-label") and page.locator(".hero-num b").inner_text() == "4", "たばこに切り替えると たばこ 4日")
        check(page.locator(".crave-btn").inner_text() == "吸いたくなった", "ボタンも たばこの言葉")
        check(page.locator(".body-mini").count() == 1, "たばこは禁煙の効果の目安を出す")
        check(page.locator(".reason-text").inner_text() == "服のにおいを気にしたくない", "たばこの理由")
        shot(page, "02b_home_tabako")
        page.click(".pair-card:has-text('お酒')")
        page.wait_for_selector(".hero-label:has-text('お酒')")
    check(page.locator(".hero-num b").inner_text() == "10", "今回 10日")
    stats = page.locator(".stats").inner_text()
    check("10日" in stats, f"通算 10日: {stats!r}")
    money = re.search(r"¥([\d,]+)", stats).group(1).replace(",", "")
    check(per_day * 10 <= int(money) <= per_day * 10.1, f"浮いたお金 ¥{money} ≒ {per_day}円×10日")
    check(page.locator(".reason-text").inner_text() == "朝すっきり起きたい", "やめたい理由が出る")
    check(page.locator(".unlock").count() == 1, "無料のときは完全版の案内が出る")
    check(not english_left(page), f"英語の取り残しなし(ホーム) {english_left(page)}")

    # 3. 飲みたくなった/吸いたくなった → 乗り切れた
    page.click(".crave-btn")
    page.wait_for_selector(".timer-num")
    t1 = page.locator(".timer-num").inner_text()
    check(t1 in ("5:00", "4:59", "4:58"), f"5分のタイマーが動き出す {t1}")
    if SMOKE:
        check("3分～5分" in page.inner_text(".page"), "吸いたい気持ちの長さを出典つきで出す")
        page.click("text=吸いたくなる場面と、代わりになる行動の例")
        check(page.locator(".alt-table tr").count() == 8, "代わりになる行動の表(7行)")
    coping = "深呼吸" if SMOKE else "歯をみがく"
    page.click(f".chip-btn:has-text('{coping}')")
    page.fill("input[placeholder='自分の方法を足す']", "好きな曲を1曲きく")
    page.click(".add-row button")
    check(page.locator(".chip-btn.on").first.inner_text() == "好きな曲を1曲きく", "自分の方法を足すと選ばれる")
    page.click(f".chip-btn:has-text('{coping}')")
    page.click(".strength button:has-text('4')")
    page.click(".chip-btn:has-text('食事の後')" if SMOKE else ".chip-btn:has-text('夕食')")
    shot(page, "03_craving")
    page.wait_for_timeout(1500)
    t2 = page.locator(".timer-num").inner_text()
    check(t2 != t1, f"タイマーが進む {t1}→{t2}")
    page.click("text=乗り切れた")
    page.wait_for_selector(".toast")
    check("乗り切れました" in page.inner_text(".toast"), "乗り切れたと出る")
    check(page.locator(".hero-num b").inner_text() == "10", "乗り切れたときは日数がそのまま")

    # 4. 飲んでしまった日 → 責めない。通算は消えない
    page.click(".slip-btn")
    page.wait_for_selector(".gentle")
    g = page.inner_text(".gentle")
    check("通算10日" in g and "消えません" in g, f"通算は消えないと伝える: {g[:60]!r}")
    if not SMOKE:
        check(page.locator(".tips li").count() == 5, "ガイドラインの配慮5つを出典つきで出す")
    shot(page, "04_slip")
    page.fill("input[aria-label='量']", "2")
    page.fill("textarea", "送別会")
    page.click("text=記録して、また今日から")
    page.wait_for_selector(".toast")
    toast = page.inner_text(".toast")
    check("通算10日" in toast, f"記録後も通算10日: {toast!r}")
    check(page.locator(".hero-num b").inner_text() == "0", "今回は0日から")
    check("10日" in page.inner_text(".stats"), "ホームの通算も10日のまま")
    shot(page, "05_home_after_slip")

    # 5. 記録
    page.click(".tab:has-text('記録')")
    page.wait_for_selector(".cal-grid")
    check(page.locator(".cal-day.slip").count() == 1, "カレンダーに再開した日が1日")
    check(page.locator(".big-line b").inner_text() == "1", "乗り切れた 1回")
    check(page.locator(".rank li").count() >= 1, "よく効いた乗り切り方")
    check(page.locator(".hist li").count() == 2, "これまでの記録 2件")
    if BOTH:
        check(page.locator(".switch button").count() == 2, "記録の画面にも お酒/たばこ の切り替え")
    check(page.locator(".locked").count() == 1, "無料ではグラフが鍵つき")
    check(page.locator(".ms li.got").count() == 3, "記念日は1日・3日・1週間に届いている")
    shot(page, "06_log")
    check(not english_left(page), f"英語の取り残しなし(記録) {english_left(page)}")

    # 6. 完全版の画面(製品ビルドでキーが空 → 準備中で落ちない)
    page.click(".locked button")
    page.wait_for_selector(".paywall")
    btn = page.locator(".pw-cta .btn").first
    check(btn.is_disabled() and "購入は準備中です" in btn.inner_text(), "キーが空なら「購入は準備中です」")
    check("¥" not in page.inner_text(".pw-table"), "値段は表に書かない(ストアの表示に任せる)")
    shot(page, "07_paywall")
    page.click("text=以前に買った方はこちら(購入の復元)")
    page.wait_for_selector(".pw-cta .err")
    check("見つかりません" in page.inner_text(".pw-cta .err"), "復元しても落ちない")
    page.click(".topbar .icon")

    # 7. 体のこと
    page.click(".tab:has-text('体のこと')")
    page.wait_for_selector(".body")
    cites = page.locator(".cite").count()
    check(cites >= 4, f"出典つきの情報が4つ以上 ({cites})")
    check(page.locator(".cite-url").filter(has_text="mhlw.go.jp").count() == cites, "出典はすべて厚生労働省のURL")
    check("医療の助言や診断はしません" in page.inner_text(".note"), "医療の効果を言い切らない注意")
    if SMOKE:
        check(page.locator(".tl tr").count() == 8, "禁煙の効果の表 8行")
        check(page.locator(".tl tr.got").count() == 0, "再開した直後は表の✓が0(最後に吸ってから数える)")
    shot(page, "08_body")
    check(not english_left(page), f"英語の取り残しなし(体) {english_left(page)}")
    if BOTH:
        page.click(".switch button:has-text('たばこ')")
        page.wait_for_selector(".tl")
        check(page.locator(".tl tr").count() == 8, "たばこに切り替えると禁煙の効果の表 8行")
        check(page.locator(".tl tr.got").count() == 2, f"4日たったたばこは表の✓が2つ(20分・12時間) ({page.locator('.tl tr.got').count()})")
        check(page.locator(".cite-url").filter(has_text="kennet.mhlw.go.jp/information/information/tobacco/").count() >= 2, "たばこの出典は e-ヘルスネットのたばこの記事")
        shot(page, "08b_body_tabako")
        page.click(".switch button:has-text('お酒')")

    # 8. 設定: 色は完全版 / 控えの書き出し・読み込み
    page.click(".tab:has-text('設定')")
    page.wait_for_selector(".settings")
    shot(page, "09_settings")
    page.click(".theme:has-text('よる')")
    page.wait_for_selector(".paywall")
    check(True, "無料で色を押すと完全版の案内")
    page.click(".topbar .icon")
    page.click(".tab:has-text('設定')")
    with page.expect_download() as dl:
        page.click("text=控えを書き出す")
    path = dl.value.path()
    backup = open(path, encoding="utf-8").read()
    check('"mark":"yamebiyori-backup"' in backup, "控えが書き出せる")
    page.click("text=控えを読み込む")
    page.fill(".import textarea", "これは控えではない")
    page.click("text=この控えで置き換える")
    page.wait_for_selector(".toast")
    check("読めません" in page.inner_text(".toast"), "関係ない文字は読み込まない")
    page.fill(".import textarea", backup)
    page.click("text=この控えで置き換える")
    page.wait_for_selector(".hero")
    check("10日" in page.inner_text(".stats"), "控えから戻せる")
    if BOTH:
        check(page.locator(".pair-card").count() == 2, "控えから戻すと2つとも戻る")
        page.click(".tab:has-text('設定')")
        page.click("text=控えを読み込む")
        page.fill(".import textarea", backup)
        page.click("text=今の記録に足す")
        page.wait_for_selector(".hero")
        check(page.locator(".pair-card").count() == 2, "同じ控えを足しても2つのまま(重ならない)")

    # 9. 開き直しても記録が残る
    page.reload()
    page.wait_for_selector(".hero")
    check(page.locator(".hero-num b").inner_text() == "0" and "10日" in page.inner_text(".stats"), "開き直しても記録が残る")

    # 10. 全部消す → はじめの画面
    page.click(".tab:has-text('設定')")
    page.click("text=すべての記録を消す")
    page.wait_for_selector(".welcome")
    check(True, "全部消すと、はじめの画面に戻る")

    if BOTH:
        # 11. 前の版(やめ日和 お酒)の記録が端末に残っていれば、そのまま引き継ぐ
        old = json.loads(backup)["data"]
        old["habits"] = [h for h in old["habits"] if h["kind"] == "alcohol"]
        old["activeId"] = old["habits"][0]["id"]
        page.evaluate("v => { localStorage.clear(); localStorage.setItem('CapacitorStorage.yamebiyori.sake.v1', v); }", json.dumps(old))
        page.reload()
        page.wait_for_selector(".hero")
        check("お酒をやめて" in page.inner_text(".hero-label") and "10日" in page.inner_text(".stats"), "前のお酒の版の記録を引き継ぐ(通算10日)")
        check(page.locator(".pair-card").count() == 0, "引き継いだのはお酒だけ")
        page.click(".tab:has-text('設定')")
        check("完全版" not in page.locator("text=やめたいことを足す").inner_text(), "たばこは無料で足せる")
        page.click("text=やめたいことを足す")
        page.wait_for_selector(".form")
        check(page.locator(".seg button.on").first.inner_text() == "たばこ", "足す画面は たばこ が選ばれている")
        page.click(".seg button:has-text('そのほか')")
        check(page.locator("button.primary").inner_text() == "完全版について", "そのほかは完全版の案内")
        page.click(".seg button:has-text('たばこ')")
        page.fill("input[aria-label='1日の本数']", "10")
        page.click("text=はじめる")
        page.wait_for_selector(".pair-card")
        check(page.locator(".pair-card").count() == 2, "たばこを足すとホームに2つ")
        page.reload()
        page.wait_for_selector(".pair-card")
        check(page.locator(".pair-card").count() == 2, "開き直しても2つ(新しい置き場に保存された)")
        # 全部消すと、前の版の記録も戻ってこない
        page.click(".tab:has-text('設定')")
        page.click("text=すべての記録を消す")
        page.wait_for_selector(".welcome")
        page.reload()
        page.wait_for_selector(".welcome")
        check(page.evaluate("Object.keys(localStorage).filter(k => k.startsWith('CapacitorStorage.yamebiyori')).length") == 0, "全部消すと前の版の記録も消える")

    check(not errors, f"画面のエラー無し {errors[:3]}")
    b.close()

srv.shutdown()
print(f"\n{FL['appName']}: NG {len(fails)} 件")
sys.exit(1 if fails else 0)
