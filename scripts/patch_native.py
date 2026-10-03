"""ネイティブ設定を書き換える。python scripts/patch_native.py sake|tabako
(縦固定・日本語・ホーム画面の名前・版番号・署名の受け口・写真保存の説明文・アイコンと起動画面)。
何度流しても同じ結果になる。npx cap add の直後に1回流す。広告は入れていない。"""
import json
import re
import shutil
import sys
from pathlib import Path
from PIL import Image

APP = Path(__file__).resolve().parent.parent
KEY = sys.argv[1]
ROOT = APP / "flavors" / KEY
FL = json.loads((ROOT / "flavor.json").read_text(encoding="utf-8"))
NAME = FL["appName"]
ICON = APP / "store" / KEY / "icon_1024.png"
PAPER = FL["paper"]


def patch(path: Path, pairs):
    s = path.read_text(encoding="utf-8")
    for old, new in pairs:
        if new in s:
            continue
        assert old in s, (path.name, old[:60])
        s = s.replace(old, new, 1)
    path.write_text(s, encoding="utf-8", newline="\n")


# ---------- Android ----------
A = ROOT / "android"
patch(A / "app/src/main/AndroidManifest.xml", [
    ('            android:launchMode="singleTask"\n',
     '            android:launchMode="singleTask"\n            android:screenOrientation="portrait"\n'),
    # 通知のプラグインが足す「正確なアラーム」を外す(記念日は数分ずれても困らない。Play の申告も要らなくなる)
    ('<manifest xmlns:android="http://schemas.android.com/apk/res/android">',
     '<manifest xmlns:android="http://schemas.android.com/apk/res/android"\n    xmlns:tools="http://schemas.android.com/tools">'),
    ('    <uses-permission android:name="android.permission.INTERNET" />',
     '    <uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" tools:node="remove" />'),
])
strings = A / "app/src/main/res/values/strings.xml"
s = strings.read_text(encoding="utf-8")
s = re.sub(r'<string name="app_name">[^<]*</string>', f'<string name="app_name">{NAME}</string>', s)
s = re.sub(r'<string name="title_activity_main">[^<]*</string>', f'<string name="title_activity_main">{NAME}</string>', s)
strings.write_text(s, encoding="utf-8", newline="\n")

gradle = A / "app/build.gradle"
s = gradle.read_text(encoding="utf-8")
s = re.sub(r"versionCode \d+", "versionCode 1", s)
s = re.sub(r'versionName "[^"]*"', 'versionName "1.0.0"', s)
gradle.write_text(s, encoding="utf-8", newline="\n")
patch(gradle, [
    ("    buildTypes {\n        release {\n            minifyEnabled false",
     """    // 公開用の署名。鍵とパスワードは scripts/build-android.ps1 が環境変数で渡す(リポジトリには置かない)
    signingConfigs {
        release {
            if (System.getenv("YB_UPLOAD_STORE")) {
                storeFile file(System.getenv("YB_UPLOAD_STORE"))
                storePassword System.getenv("YB_UPLOAD_PASSWORD")
                keyAlias "yamebiyori-upload"
                keyPassword System.getenv("YB_UPLOAD_PASSWORD")
            }
        }
    }
    buildTypes {
        release {
            if (System.getenv("YB_UPLOAD_STORE")) signingConfig signingConfigs.release
            minifyEnabled false"""),
])

icon = Image.open(ICON).convert("RGB")
res = A / "app/src/main/res"
for d, px in {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}.items():
    folder = res / f"mipmap-{d}"
    folder.mkdir(exist_ok=True)
    icon.resize((px, px), Image.LANCZOS).save(folder / "ic_launcher.png")
    # 丸いアイコン: 丸く切り抜く
    r = icon.resize((px, px), Image.LANCZOS).convert("RGBA")
    m = Image.new("L", (px, px), 0)
    from PIL import ImageDraw
    ImageDraw.Draw(m).ellipse([0, 0, px - 1, px - 1], fill=255)
    r.putalpha(m)
    r.save(folder / "ic_launcher_round.png")
    # 形の変わるアイコンの前景: 108dp のうち中央 66dp に収める
    fg_px = int(px * 108 / 48)
    fg = Image.new("RGBA", (fg_px, fg_px), (0, 0, 0, 0))
    inner = int(fg_px * 66 / 108)
    fg.paste(icon.resize((inner, inner), Image.LANCZOS), ((fg_px - inner) // 2, (fg_px - inner) // 2))
    fg.save(folder / "ic_launcher_foreground.png")
bgxml = res / "values/ic_launcher_background.xml"
bgxml.write_text(f'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">{PAPER}</color>\n</resources>\n', encoding="utf-8", newline="\n")


def splash(w, h):
    im = Image.new("RGB", (w, h), PAPER)
    sz = int(min(w, h) * 0.32)
    im.paste(icon.resize((sz, sz), Image.LANCZOS), ((w - sz) // 2, (h - sz) // 2))
    return im


for p in res.glob("drawable*/splash.png"):
    w, h = Image.open(p).size
    splash(w, h).save(p)

# ---------- iOS ----------
I = ROOT / "ios/App"
plist = I / "App/Info.plist"
s = plist.read_text(encoding="utf-8")
s = re.sub(r"(<key>CFBundleDisplayName</key>\s*<string>)[^<]*(</string>)", rf"\g<1>{NAME}\g<2>", s)
plist.write_text(s, encoding="utf-8", newline="\n")
patch(plist, [
    ("\t<key>CFBundleDevelopmentRegion</key>\n\t<string>en</string>",
     "\t<key>CFBundleDevelopmentRegion</key>\n\t<string>ja</string>"),
    ("\t<key>LSRequiresIPhoneOS</key>\n",
     "\t<key>ITSAppUsesNonExemptEncryption</key>\n\t<false/>\n"
     "\t<key>NSPhotoLibraryAddUsageDescription</key>\n\t<string>記念日の画像や待ち受け画像を、写真に保存するときに使います。</string>\n"
     "\t<key>LSRequiresIPhoneOS</key>\n"),
    ("\t\t<string>armv7</string>", "\t\t<string>arm64</string>"),
    ("\t<array>\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t\t<string>UIInterfaceOrientationLandscapeLeft</string>\n\t\t<string>UIInterfaceOrientationLandscapeRight</string>\n\t</array>",
     "\t<array>\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t</array>"),
])
pbx = I / "App.xcodeproj/project.pbxproj"
s = pbx.read_text(encoding="utf-8")
s = s.replace('TARGETED_DEVICE_FAMILY = "1,2";', "TARGETED_DEVICE_FAMILY = 1;").replace("MARKETING_VERSION = 1.0;", "MARKETING_VERSION = 1.0.0;")
pbx.write_text(s, encoding="utf-8", newline="\n")

for p in (I / "App/Assets.xcassets/AppIcon.appiconset").glob("*.png"):
    w, _ = Image.open(p).size
    icon.resize((w, w), Image.LANCZOS).save(p)  # アルファ無しの RGB(App Store の条件)
for p in (I / "App/Assets.xcassets/Splash.imageset").glob("*.png"):
    w, h = Image.open(p).size
    splash(w, h).save(p)

shutil.copyfile(APP / "scripts" / "ExportOptions.plist", ROOT / "ios" / "ExportOptions.plist")
print("ok", KEY)
