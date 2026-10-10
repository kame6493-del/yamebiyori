"""ストア素材を作る(2026-10 の作り直しの見た目)。python scripts/make_store.py http://localhost:5291/  (今の flavor の分。開発サーバーで見本データ ?demo=1 を使う)
1) 見本データで画面を撮る(430x932 ×3 = 1290x2796)
2) 見出しを付けて iPhone 用 1290x2796 と Play 用 1080x1920 にする(値段・「無料」は写さない)
3) アイコン 1024 / Play 512(持ち主の絵 store/icon_source_1024.png の縁を除いた物)/ フィーチャー 1024x500
出力: store/<flavor>/ と store/<flavor>/play/"""
import json
import os
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")
URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5291/"
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FL = json.load(open(os.path.join(ROOT, "src", "flavor.current.json"), encoding="utf-8"))
KEY = FL["key"]
STORE = os.path.join(ROOT, "store", KEY)
RAW = os.path.join(STORE, "raw")
PLAY = os.path.join(STORE, "play")
REF = os.path.join(ROOT, "src", "assets", "ref")
for d in (STORE, RAW, PLAY, os.path.join(STORE, "ios"), os.path.join(PLAY, "screenshots")):
    os.makedirs(d, exist_ok=True)

GOTHIC = "C:/Windows/Fonts/YuGothB.ttc"
GOTHIC_M = "C:/Windows/Fonts/YuGothM.ttc"
PAPER = (251, 247, 236)
SAGE = (232, 241, 231)
SUN = (250, 228, 170)
GREEN = (90, 148, 71)
CORAL = (220, 116, 87)
INK = (58, 58, 51)
INK2 = (95, 93, 84)
SMOKE = KEY == "tabako"
BOTH = KEY == "both"

if BOTH:
    CAPTIONS = [
        ("1_home", "お酒もたばこも\nひとつのアプリで", "日数と浮いたお金を、別々に数える"),
        ("2_craving", "気持ちが来たら\n5分だけやり過ごす", "効いた方法が、たまっていく"),
        ("3_slip", "飲んでしまった日も\n責めない", "通算の日数は消えない。数え直すのは今回だけ"),
        ("4_calendar", "続いた日が\nカレンダーで見える", "日付を押すと、その日の記録"),
        ("5_body", "体の変化の目安を\n厚生労働省の原文で", "出典つき・言い換えなし"),
        ("6_graphs", "来やすい時間がわかれば\n先回りできる", "グラフ・記念日の画像は完全版"),
        ("7_start", "お酒・たばこ・両方\nはじめに選ぶだけ", "広告なし・登録なし・記録は端末の中だけ"),
    ]
else:
    CAPTIONS = [
        ("1_home", "たばこをやめた日と\n浮いたお金が見える", "広告なし・登録なし"),
        ("2_craving", "吸いたくなったら\n5分だけやり過ごす", "効いた方法が、たまっていく"),
        ("3_slip", "吸ってしまった日も\n責めない", "通算の日数は消えない。数え直すのは今回だけ"),
        ("4_calendar", "続いた日が\nカレンダーで見える", "日付を押すと、その日の記録"),
        ("5_body", "禁煙の効果の目安を\n厚生労働省の原文で", "出典つき・言い換えなし"),
        ("6_graphs", "来やすい時間がわかれば\n先回りできる", "グラフ・記念日の画像は完全版"),
    ]


def capture():
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 430, "height": 932}, device_scale_factor=3, locale="ja-JP")
        pg = ctx.new_page()
        pg.on("dialog", lambda d: d.accept())
        pg.goto(URL + "?demo=1&days=45&slips=1&crav=30&premium=1")
        pg.wait_for_selector(".hero")
        pg.wait_for_timeout(500)
        pg.screenshot(path=os.path.join(RAW, "1_home.png"))

        if BOTH:
            pg.click(".pair-card:has-text('たばこ')")
        pg.click(".crave-btn")
        pg.wait_for_selector(".faces")
        pg.click(".faces button:has-text('3')")
        pg.click(".next-btn")
        pg.wait_for_selector(".timer")
        pg.locator(".chip-btn.try").first.click()
        pg.evaluate("window.scrollTo(0, 0)")
        pg.wait_for_timeout(2600)
        pg.screenshot(path=os.path.join(RAW, "2_craving.png"))
        pg.click(".topbar .icon")
        pg.click(".topbar .icon")
        if BOTH:
            pg.click(".pair-card:has-text('お酒')")
        pg.click(".slip-btn")
        pg.wait_for_selector(".gentle")
        pg.wait_for_timeout(300)
        pg.screenshot(path=os.path.join(RAW, "3_slip.png"))
        pg.click(".topbar .icon")

        pg.click(".tab:has-text('カレンダー')")
        pg.wait_for_selector(".cal-grid")
        pg.wait_for_timeout(300)
        pg.screenshot(path=os.path.join(RAW, "4_calendar.png"))

        pg.click(".tab:has-text('読みもの')")
        pg.wait_for_selector(".body")
        if BOTH:
            pg.click(".switch button:has-text('たばこ')")
        pg.wait_for_selector(".tl")
        pg.evaluate("() => { const e = document.querySelector('.tl'); window.scrollTo(0, e.closest('.card').getBoundingClientRect().top + window.scrollY - 70) }")
        pg.wait_for_timeout(300)
        pg.screenshot(path=os.path.join(RAW, "5_body.png"))
        if BOTH:
            pg.click(".switch button:has-text('お酒')")
        pg.click(".tab:has-text('記録')")
        pg.wait_for_selector(".chart")
        pg.evaluate("() => { const e = document.querySelector('.peak') || document.querySelector('.chart'); window.scrollTo(0, e.closest('.card').getBoundingClientRect().top + window.scrollY - 70) }")
        pg.wait_for_timeout(300)
        pg.screenshot(path=os.path.join(RAW, "6_graphs.png"))
        if BOTH:
            pg2 = b.new_context(viewport={"width": 430, "height": 932}, device_scale_factor=3, locale="ja-JP").new_page()
            pg2.goto(URL)
            pg2.wait_for_selector(".pick")
            pg2.wait_for_timeout(400)
            pg2.screenshot(path=os.path.join(RAW, "7_start.png"))
        b.close()


def rounded(im, r):
    m = Image.new("L", im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, im.size[0] - 1, im.size[1] - 1], r, fill=255)
    out = Image.new("RGBA", im.size)
    out.paste(im, (0, 0), m)
    return out


def art(name):
    return Image.open(os.path.join(REF, name + ".webp")).convert("RGBA")


def compose(name, title, sub, W, H, out):
    s = W / 1290
    bg = Image.new("RGB", (W, H), PAPER)
    # 右上に朝日、下にやわらかいセージ
    R = int(360 * s)
    sun = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sun).ellipse([W - R * 1.5, -R * 0.9, W + R * 0.5, R * 1.1], fill=SUN + (255,))
    sun = sun.filter(ImageFilter.GaussianBlur(40 * s))
    bg.paste(sun, (0, 0), sun)
    d = ImageDraw.Draw(bg)
    d.rectangle([0, int(H * 0.62), W, H], fill=SAGE)
    ft = ImageFont.truetype(GOTHIC, int(90 * s))
    fs = ImageFont.truetype(GOTHIC_M, int(46 * s))
    y = int(140 * s)
    for line in title.split("\n"):
        d.text((int(90 * s), y), line, font=ft, fill=INK)
        y += int(122 * s)
    d.text((int(94 * s), y + int(16 * s)), sub, font=fs, fill=GREEN)
    top = y + int(120 * s)
    shot = Image.open(os.path.join(RAW, name + ".png")).convert("RGB")
    avail_h = H - top - int(70 * s)
    sw = int(W * 0.80)
    sh = int(shot.size[1] * sw / shot.size[0])
    if sh > avail_h:
        sh = avail_h
        sw = int(shot.size[0] * sh / shot.size[1])
    shot = shot.resize((sw, sh), Image.LANCZOS)
    x = (W - sw) // 2
    shadow = Image.new("RGBA", (sw + 80, sh + 80), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle([40, 50, sw + 40, sh + 40], int(60 * s), fill=(90, 70, 30, 60))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18 * s))
    bg.paste(shadow, (x - 40, top - 40), shadow)
    frame = rounded(shot, int(60 * s))
    bg.paste(frame, (x, top), frame)
    d.rounded_rectangle([x, top, x + sw, top + sh], int(60 * s), outline=(226, 218, 198), width=max(2, int(4 * s)))
    bg.save(out)


def icon(size=1024):
    src = Image.open(os.path.join(ROOT, "store", "icon_source_1024.png")).convert("RGB")
    return src.crop((40, 40, 984, 984)).resize((size, size), Image.LANCZOS)


def feature():
    W, H = 1024, 500
    im = Image.new("RGB", (W, H), PAPER)
    land = art("hero_park" if SMOKE else "hero_lake").convert("RGB")
    k = max(W * 0.62 / land.width, H / land.height)
    land = land.resize((int(land.width * k), int(land.height * k)), Image.LANCZOS)
    im.paste(land, (W - land.width + 30, (H - land.height) // 2))
    # 左を生成りでぼかしてつなぐ
    fade = Image.new("L", (W, H), 0)
    fd = ImageDraw.Draw(fade)
    for x in range(W):
        a = 255 if x < 400 else max(0, int(255 * (1 - (x - 400) / 220)))
        fd.line([(x, 0), (x, H)], fill=a)
    im.paste(Image.new("RGB", (W, H), PAPER), (0, 0), fade)
    d = ImageDraw.Draw(im)
    ic = rounded(icon(150), 34)
    im.paste(ic, (64, 70), ic)
    d.text((236, 92), "やめ日和", font=ImageFont.truetype(GOTHIC, 86), fill=INK)
    d.text((70, 250), "やめる。続ける。きっと、いい日がくる。", font=ImageFont.truetype(GOTHIC, 34), fill=GREEN)
    d.text((70, 314), "たばこをやめた日を、数えていく。" if SMOKE else "お酒もたばこも、やめた日を数える。", font=ImageFont.truetype(GOTHIC_M, 30), fill=INK2)
    d.text((70, 366), "責めない記録・5分タイマー・出典つきの体の目安", font=ImageFont.truetype(GOTHIC_M, 26), fill=INK2)
    d.text((70, 414), "広告なし・登録なし", font=ImageFont.truetype(GOTHIC_M, 26), fill=CORAL)
    return im


if "--no-capture" not in sys.argv:
    for f in os.listdir(RAW):
        os.remove(os.path.join(RAW, f))
    capture()
for folder in (os.path.join(STORE, "ios"), os.path.join(PLAY, "screenshots")):
    for f in os.listdir(folder):
        os.remove(os.path.join(folder, f))
for name, title, sub in CAPTIONS:
    compose(name, title, sub, 1290, 2796, os.path.join(STORE, "ios", f"iphone_{name}.png"))
    compose(name, title, sub, 1080, 1920, os.path.join(PLAY, "screenshots", f"play_{name}.png"))
icon(1024).save(os.path.join(STORE, "icon_1024.png"))
icon(512).save(os.path.join(PLAY, "icon_512.png"))
feature().save(os.path.join(PLAY, "feature_1024x500.png"))
print("done", STORE)
