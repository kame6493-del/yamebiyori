"""ストア素材の検査。python scripts/check_store.py
字数の上限・太字記法・絵文字・画像の大きさ・各フォルダに要る物がそろっているか。
あわせて store/privacy.md と store/play_forms.md を各アプリの play/ に写す。"""
import os
import re
import shutil
import sys
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORE = os.path.join(ROOT, "store")
fails = []


def check(cond, msg):
    print(("OK  " if cond else "NG  ") + msg)
    if not cond:
        fails.append(msg)


def section(text, title):
    m = re.search(r"### " + re.escape(title) + r"[^\n]*\n(.*?)(?=\n### |\n---|\n## |\Z)", text, re.S)
    return m.group(1).strip() if m else ""


EMOJI = re.compile("[\U0001F300-\U0001FAFF☀-➿]")
for key in ("sake", "tabako"):
    d = os.path.join(STORE, key)
    t = open(os.path.join(d, "listing.md"), encoding="utf-8").read()
    ios, play = t.split("## Google Play")
    name = section(ios, "名前")
    check(0 < len(name) <= 30, f"{key} App Store 名前 {len(name)}字")
    sub = section(ios, "サブタイトル")
    check(0 < len(sub) <= 30, f"{key} サブタイトル {len(sub)}字")
    promo = section(ios, "プロモーションテキスト")
    check(0 < len(promo) <= 170, f"{key} プロモーション {len(promo)}字")
    kw = section(ios, "キーワード")
    check(0 < len(kw) <= 100 and " " not in kw, f"{key} キーワード {len(kw)}字")
    desc = section(ios, "説明")
    check(200 < len(desc) <= 4000, f"{key} 説明 {len(desc)}字")
    check(0 < len(section(play, "アプリ名")) <= 30, f"{key} Play アプリ名 {len(section(play, 'アプリ名'))}字")
    short = section(play, "簡単な説明")
    check(0 < len(short) <= 80, f"{key} Play 簡単な説明 {len(short)}字")
    check("**" not in t, f"{key} 太字記法なし")
    check(not EMOJI.search(t), f"{key} 絵文字なし")
    for f, size in [("icon_1024.png", (1024, 1024)), ("play/icon_512.png", (512, 512)), ("play/feature_1024x500.png", (1024, 500))]:
        im = Image.open(os.path.join(d, f))
        check(im.size == size, f"{key} {f} {im.size}")
        if f.startswith("icon"):
            check(im.mode == "RGB", f"{key} {f} は透明なし({im.mode})")
    ios_shots = sorted(os.listdir(os.path.join(d, "ios")))
    check(3 <= len(ios_shots) <= 10 and all(Image.open(os.path.join(d, "ios", s)).size == (1290, 2796) for s in ios_shots), f"{key} iPhone 写真 {len(ios_shots)}枚 1290x2796")
    ps = sorted(os.listdir(os.path.join(d, "play", "screenshots")))
    check(len(ps) >= 4 and all(Image.open(os.path.join(d, "play", "screenshots", s)).size == (1080, 1920) for s in ps), f"{key} Play 写真 {len(ps)}枚 1080x1920")
    for f in ("privacy.md", "play_forms.md"):
        shutil.copyfile(os.path.join(STORE, f), os.path.join(d, "play", f))
    check(os.path.exists(os.path.join(d, "play", "privacy.md")), f"{key} play/privacy.md")
p = open(os.path.join(STORE, "privacy.md"), encoding="utf-8").read()
check("端末の中だけ" in p and "RevenueCat" in p, "プライバシーポリシーに端末内保存と購入の扱い")
check(os.path.exists(os.path.join(STORE, "tester_post.txt")), "テスター募集文")
print(f"\nNG {len(fails)} 件")
sys.exit(1 if fails else 0)
