"""ストア素材を作る。python scripts/make_store.py http://localhost:5377/  (今の flavor の分)
1) 見本データ(?demo=1)で画面を撮る(430x932 ×3 = 1290x2796)
2) 見出しを付けて iPhone 用 1290x2796 と Play 用 1080x1920 にする
3) アイコン 1024 / Play 512 / フィーチャー 1024x500
出力: store/<flavor>/ と store/<flavor>/play/"""
import json
import os
import sys
from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")
URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5377/"
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FL = json.load(open(os.path.join(ROOT, "src", "flavor.current.json"), encoding="utf-8"))
KEY = FL["key"]
STORE = os.path.join(ROOT, "store", KEY)
RAW = os.path.join(STORE, "raw")
PLAY = os.path.join(STORE, "play")
for d in (STORE, RAW, PLAY, os.path.join(STORE, "ios"), os.path.join(PLAY, "screenshots")):
    os.makedirs(d, exist_ok=True)

GOTHIC = "C:/Windows/Fonts/YuGothB.ttc"
GOTHIC_M = "C:/Windows/Fonts/YuGothM.ttc"
MINCHO = "C:/Windows/Fonts/yumindb.ttf"


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


PAPER = hexrgb(FL["paper"])
ACCENT = hexrgb(FL["accent"])
SOFT = (223, 238, 237) if KEY == "sake" else (225, 235, 244)
INK = (38, 38, 34) if KEY == "sake" else (31, 42, 51)
INK2 = (87, 87, 80) if KEY == "sake" else (79, 93, 104)
SMOKE = KEY == "tabako"
V = FL["verbCrave"]

CAPTIONS = [
    ("1_home", "やめた日と浮いたお金が\nひと目でわかる", "広告なし・登録なし"),
    ("2_craving", f"{V}ら\n5分だけ別のことを", "乗り切れた方法が、たまっていく"),
    ("3_slip", f"{FL['verbUse']}日も責めない\n通算の日数は消えない", "数え直すのは「今回」だけ"),
    ("4_body", "体の変化の目安を\n厚生労働省の原文で", "出典つき・言い換えなし"),
    ("5_graphs", "来やすい時間がわかれば\n先回りできる", "グラフ・記念日の画像は完全版"),
]


def capture():
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 430, "height": 932}, device_scale_factor=3, locale="ja-JP")
        pg = ctx.new_page()
        pg.on("dialog", lambda d: d.accept())
        pg.goto(URL + "?demo=1&days=45&slips=1&crav=30&premium=1")
        pg.wait_for_selector(".hero")
        pg.wait_for_timeout(400)
        pg.screenshot(path=os.path.join(RAW, "1_home.png"))

        pg.click(".crave-btn")
        pg.wait_for_selector(".timer")
        pg.locator(".chip-btn").nth(1).click()
        pg.click(".strength button:has-text('3')")
        pg.wait_for_timeout(2600)  # タイマーが動いている所
        pg.screenshot(path=os.path.join(RAW, "2_craving.png"))
        pg.click(".topbar .icon")

        pg.click(".slip-btn")
        pg.wait_for_selector(".gentle")
        pg.fill("textarea", "送別会で断りにくかった")
        pg.screenshot(path=os.path.join(RAW, "3_slip.png"))
        pg.click(".topbar .icon")

        pg.click(".tab:has-text('体のこと')")
        pg.wait_for_selector(".body")
        if SMOKE:
            pg.evaluate("() => { const e = document.querySelector('.tl'); window.scrollTo(0, e.closest('.card').getBoundingClientRect().top + window.scrollY - 70) }")
        else:
            pg.evaluate("() => { const e = document.querySelectorAll('.quote')[1]; window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 70) }")
        pg.wait_for_timeout(300)
        pg.screenshot(path=os.path.join(RAW, "4_body.png"))

        pg.click(".tab:has-text('記録')")
        pg.wait_for_selector(".chart")
        pg.evaluate("() => { const e = document.querySelector('.chart'); window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 110) }")
        pg.wait_for_timeout(300)
        pg.screenshot(path=os.path.join(RAW, "5_graphs.png"))
        b.close()


def rounded(im, r):
    m = Image.new("L", im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, im.size[0] - 1, im.size[1] - 1], r, fill=255)
    out = Image.new("RGBA", im.size)
    out.paste(im, (0, 0), m)
    return out


def compose(name, title, sub, W, H, out):
    bg = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(bg)
    s = W / 1290
    # 右上の大きな円(日の出の印)
    R = int(520 * s)
    d.ellipse([W - R * 1.2, -R * 0.9, W + R * 0.8, R * 1.1], fill=SOFT)
    ft = ImageFont.truetype(GOTHIC, int(92 * s))
    fs = ImageFont.truetype(GOTHIC_M, int(50 * s))
    y = int(150 * s)
    for line in title.split("\n"):
        d.text((int(96 * s), y), line, font=ft, fill=INK)
        y += int(124 * s)
    d.text((int(100 * s), y + int(14 * s)), sub, font=fs, fill=ACCENT)
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
    # 影と枠
    shadow = Image.new("RGBA", (sw + 40, sh + 40), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle([20, 26, sw + 20, sh + 20], int(56 * s), fill=(0, 0, 0, 40))
    bg.paste(shadow, (x - 20, top - 20), shadow)
    frame = rounded(shot, int(56 * s))
    bg.paste(frame, (x, top), frame)
    d.rounded_rectangle([x, top, x + sw, top + sh], int(56 * s), outline=(210, 210, 205), width=max(2, int(3 * s)))
    bg.save(out)


def icon(size=1024):
    S = 1024
    im = Image.new("RGB", (S, S), PAPER)
    d = ImageDraw.Draw(im)
    # 地平線と、のぼる日
    hz = 640
    d.ellipse([212, hz - 300, 812, hz + 300], fill=ACCENT)
    d.rectangle([0, hz, S, S], fill=PAPER)
    d.line([(120, hz), (904, hz)], fill=INK, width=22)
    # 光の線
    import math
    for a in (-60, -30, 0, 30, 60):
        r1, r2 = 360, 430
        t = math.radians(a - 90)
        d.line([(512 + r1 * math.cos(t), hz + r1 * math.sin(t)), (512 + r2 * math.cos(t), hz + r2 * math.sin(t))], fill=ACCENT, width=26)
    if SMOKE:
        # 地面に置いた、半分に折ったたばこ(白い棒2本)
        d.rounded_rectangle([250, 738, 480, 792], 14, fill=(255, 255, 255), outline=INK, width=10)
        d.rounded_rectangle([540, 738, 770, 792], 14, fill=(255, 255, 255), outline=INK, width=10)
        d.rectangle([700, 743, 765, 787], fill=(214, 160, 110))
    else:
        # 伏せた盃(もう飲まない、の印)
        # 縁を下にした浅い盃。高台(小さな台)が上に来る
        d.chord([312, 712, 712, 892], 180, 360, fill=(255, 255, 255), outline=INK, width=12)
        d.rounded_rectangle([462, 690, 562, 728], 8, fill=INK)
        d.line([(300, 802), (724, 802)], fill=INK, width=12)
    return im.resize((size, size), Image.LANCZOS)


def feature():
    W, H = 1024, 500
    im = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(im)
    d.ellipse([620, -120, 1180, 440], fill=SOFT)
    ic = icon(300)
    im.paste(rounded(ic.convert("RGB"), 64), (660, 100), rounded(ic.convert("RGB"), 64))
    d.text((64, 120), "やめ日和", font=ImageFont.truetype(MINCHO, 104), fill=ACCENT)
    d.text((70, 262), f"{FL['thing']}をやめた日を、数えていく。", font=ImageFont.truetype(GOTHIC, 38), fill=INK)
    d.text((70, 322), f"{FL['verbUse']}日があっても、通算は消えない。", font=ImageFont.truetype(GOTHIC_M, 32), fill=INK2)
    d.text((70, 380), "広告なし・登録なし・買い切り", font=ImageFont.truetype(GOTHIC_M, 28), fill=ACCENT)
    return im


if "--no-capture" not in sys.argv:
    capture()
for name, title, sub in CAPTIONS:
    compose(name, title, sub, 1290, 2796, os.path.join(STORE, "ios", f"iphone_{name}.png"))
    compose(name, title, sub, 1080, 1920, os.path.join(PLAY, "screenshots", f"play_{name}.png"))
icon(1024).save(os.path.join(STORE, "icon_1024.png"))
icon(512).save(os.path.join(PLAY, "icon_512.png"))
feature().save(os.path.join(PLAY, "feature_1024x500.png"))
print("done", STORE)
