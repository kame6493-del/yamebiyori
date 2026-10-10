"""持ち主の UI 見本(ChatGPT で作った7枚)から、アプリで使う絵を切り出す。python scripts/crop_ref.py
出力: src/assets/ref/*.webp と work/look/sheet_ref.png(切り出した物の一覧。目で確かめる用)
- 文字が載っている所は inpaint で消してから使う(文字はアプリが HTML で重ねる)
- 小さな絵(アイコン)は地の色を透明にして、余白を詰める
- 見本は 1122x1402 の1枚に画面が並んだ物なので、絵は小さい。なめらかに拡大して少しだけ輪郭を立てる"""
import os

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

DL = os.path.join(os.path.expanduser('~'), 'Downloads')
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'src', 'assets', 'ref')
LOOK = os.path.join(ROOT, 'work', 'look')
os.makedirs(OUT, exist_ok=True)
os.makedirs(LOOK, exist_ok=True)
IM = {n: np.array(Image.open(os.path.join(DL, f'yame_ref_{n}_1122x1402.png')).convert('RGB')) for n in range(2, 9)}
made = []


def crop(n, box):
    x0, y0, x1, y1 = box
    return IM[n][y0:y1, x0:x1].copy()


def inpaint(img, boxes, r=7):
    """boxes は切り出した絵の中の座標。文字の形だけを拾って消す(四角ごと消すより絵が残る)"""
    m = np.zeros(img.shape[:2], np.uint8)
    for (x0, y0, x1, y1) in boxes:
        sub = img[y0:y1, x0:x1].astype(int)
        # 文字は周りより暗い。地の明るさから大きく離れた画素を文字とみなす
        lum = sub.mean(axis=2)
        bgl = np.percentile(lum, 70)
        ink = (lum < bgl - 28).astype(np.uint8) * 255
        ink = cv2.dilate(ink, np.ones((3, 3), np.uint8), iterations=2)
        m[y0:y1, x0:x1] = np.maximum(m[y0:y1, x0:x1], ink)
    return cv2.inpaint(img, m, r, cv2.INPAINT_TELEA)


def inpaint_rect(img, boxes, r=9):
    m = np.zeros(img.shape[:2], np.uint8)
    for (x0, y0, x1, y1) in boxes:
        m[y0:y1, x0:x1] = 255
    return cv2.inpaint(img, m, r, cv2.INPAINT_TELEA)


def knockout(img, t0=10, t1=30):
    """縁の画素の中央値(地の色)に近い所を透明にする。絵の中の明るい所は外とつながっていなければ残す"""
    border = np.concatenate([img[0], img[-1], img[:, 0], img[:, -1]], 0).astype(float)
    bg = np.median(border, axis=0)
    d = np.sqrt(((img.astype(float) - bg) ** 2).sum(axis=2))
    a = np.clip((d - t0) / (t1 - t0), 0, 1)
    solid = (a > 0.5).astype(np.uint8)
    n, lab = cv2.connectedComponents(1 - solid)
    outside = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
    inner = np.isin(lab, list(outside), invert=True) & (solid == 0)
    a[inner] = 1
    a = cv2.GaussianBlur(a.astype(np.float32), (0, 0), 0.6)
    rgba = np.dstack([img, (a * 255).astype(np.uint8)])
    ys, xs = np.where(a > 0.08)
    if len(xs):
        p = 1
        rgba = rgba[max(0, ys.min() - p):ys.max() + 1 + p, max(0, xs.min() - p):xs.max() + 1 + p]
    return rgba


def up(img, k):
    im = Image.fromarray(img)
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    # 拡大でぼやけた輪郭を少しだけ立てる(水彩なので弱め)
    if im.mode == 'RGBA':
        rgb = im.convert('RGB').filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
        rgb.putalpha(im.getchannel('A'))
        return rgb
    return im.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))


def save(img, name, k=3, q=86, ko=False):
    if ko:
        img = knockout(img)
    im = up(img, k)
    im.save(os.path.join(OUT, f'{name}.webp'), 'WEBP', quality=q, method=6)
    made.append((name, im))


# ---------- 大きな絵(帯) ----------
# ホームの帯: 湖と朝日(お酒・両方の版)。文字「今日も一歩ずつ…」を消す
a = crop(2, (30, 216, 278, 362))
save(inpaint(a, [(40, 14, 200, 70)]), 'hero_lake', k=3)
# ホームの帯: 公園のベンチ(たばこの版)。文字「深呼吸で、…」を消す
a = crop(2, (303, 216, 553, 362))
save(inpaint(a, [(45, 16, 210, 72)]), 'hero_park', k=3)
# 双葉と土(記録する・保存の画面)
save(crop(2, (594, 280, 793, 374)), 'sprout_soil', k=3)
save(crop(3, (850, 348, 1094, 446)), 'sprout_lake', k=3)
# 気持ちが来た: 朝日と湖と花。文字「大丈夫です。…」を消す
a = crop(3, (26, 345, 280, 500))
save(inpaint(a, [(50, 105, 200, 170)]), 'feel_hero', k=3)
# カレンダーの帯
save(crop(4, (28, 486, 272, 558)), 'cal_hero', k=3)
# 日別の記録の絵
save(crop(4, (307, 447, 558, 540)), 'day_hero', k=3)
# 読みもの: 目を閉じて深呼吸する人
save(crop(5, (571, 192, 824, 327)), 'read_hero', k=3)
# 完全版の帯: 王冠と朝日。文字「やめ日和 完全版」を消す(文字はアプリが重ねる)
a = crop(6, (17, 208, 279, 352))
save(inpaint_rect(a, [(95, 18, 230, 92)], r=11), 'pw_hero', k=3)
# 設定の下の絵: ベンチと湖
save(crop(7, (22, 848, 280, 1008)), 'bench_art', k=3)
# 通知の帯・データの絵
save(crop(7, (578, 283, 824, 358)), 'notify_hero', k=3)
save(crop(7, (850, 282, 1100, 414)), 'privacy_art', k=3)
# 空の状態: 双葉と朝日
save(crop(8, (602, 348, 800, 503)), 'empty_art', k=3)
# 待ち受け用: 湖とベンチと花(ロック画面の見本の下半分。上の空はアプリが色でのばす)
save(crop(8, (307, 556, 549, 832)), 'wall_art', k=4)
# 記念日の画像: 月桂樹の輪と朝日とベンチ。真ん中の文字を消す
a = crop(8, (862, 337, 1088, 670))
save(inpaint_rect(a, [(48, 64, 180, 238)], r=13), 'card_art', k=4)
# 色の見本: 若葉・空色・こはく・さくら・墨色(下の段の絵の上半分。文字の楕円より上)
for name, x in [('theme_base', 37), ('theme_sora', 202), ('theme_kohaku', 372), ('theme_sakura', 537), ('theme_sumi', 702)]:
    save(crop(7, (x, 1143, x + 156, 1219)), name, k=3)

# ---------- 小さな絵(地を透明に) ----------
save(crop(2, (14, 18, 92, 94)), 'logo_sprout', k=3, ko=True)
save(crop(2, (40, 476, 70, 527)), 'ic_sprout', k=4, ko=True)
save(crop(2, (159, 488, 188, 516)), 'ic_total', k=4, ko=True)
save(crop(2, (40, 570, 70, 600)), 'ic_crown', k=4, ko=True)
save(crop(2, (157, 563, 189, 603)), 'ic_coins', k=4, ko=True)
save(crop(2, (40, 644, 70, 684)), 'ic_leaf', k=4, ko=True)
# 気持ちの強さ 1〜5 の顔
for i, cx in enumerate([52, 101, 151, 202, 252], 1):
    save(crop(3, (cx - 19, 593, cx + 19, 632)), f'face_{i}', k=3, ko=True)
# 場面の絵
for name, box in {'sc_work': (46, 856, 74, 884), 'sc_meal': (174, 856, 196, 884), 'sc_alone': (48, 906, 76, 934), 'sc_people': (169, 906, 206, 936),
                  'sc_stress': (48, 953, 74, 989), 'sc_night': (168, 953, 198, 987)}.items():
    save(crop(3, box), name, k=4, ko=True)
# 乗り切り方の絵(効いた方法の一覧の札)
for name, y in [('cp_breath', 452), ('cp_water', 535), ('cp_walk', 617), ('cp_gum', 700), ('cp_call', 785), ('cp_warm', 867)]:
    save(crop(3, (580, y - 2, 624, y + 50)), name, k=3, ko=True)
# カレンダーの印(やめられた日・気持ちが来た日・飲んでしまった日)
save(crop(4, (347, 1222, 386, 1268)), 'mk_free', k=3, ko=True)
save(crop(4, (554, 1222, 593, 1268)), 'mk_crave', k=3, ko=True)
save(crop(4, (802, 1222, 843, 1268)), 'mk_slip_drink', k=3, ko=True)
# 記念日の木(1日〜365日で育つ)
for name, box in {'ms_1': (862, 625, 904, 670), 'ms_3': (862, 690, 904, 752), 'ms_7': (862, 773, 906, 836), 'ms_30': (858, 862, 912, 936),
                  'ms_100': (856, 956, 918, 1031), 'ms_365': (852, 1046, 936, 1124)}.items():
    save(crop(4, box), name, k=3, ko=True)
# 日別の記録の小物
save(crop(4, (320, 892, 348, 919)), 'ic_memo', k=4, ko=True)
save(crop(4, (320, 692, 349, 724)), 'ic_flame', k=4, ko=True)
# 読みものの札(からだ・気持ち・お金・続け方)
for name, x in [('cat_body', 29), ('cat_heart', 131), ('cat_money', 232), ('cat_grow', 333)]:
    save(crop(5, (x, 1136, x + 91, 1216)), name, k=3)
# 読みものの小さな絵
for name, y in [('art_lungs', 265), ('art_calm', 405), ('art_coins', 560), ('art_tree', 710)]:
    save(crop(5, (313, y, 378, y + 107)), name, k=3)
# 完全版の絵(できること)
for name, x in [('pw_chart', 30), ('pw_coins', 205), ('pw_scene', 385), ('pw_phone', 580), ('pw_colors', 755), ('pw_habits', 930)]:
    save(crop(6, (x, 1078, x + 162, 1166)), name, k=3)
save(crop(6, (46, 226, 104, 284)), 'ic_crown_big', k=3, ko=True)
# 設定の札の絵
for name, y in [('st_bell', 290), ('st_cal', 388), ('st_lock', 485), ('st_sprout', 580), ('st_crown', 685)]:
    save(crop(7, (40, y, 74, y + 36)), name, k=4, ko=True)
# 小鳥(責めない言葉に添える)
save(crop(3, (742, 1222, 838, 1326)), 'bird', k=3, ko=True)
# お酒・たばこの小さな印(切り替えの札)
save(crop(2, (66, 1256, 92, 1284)), 'ic_drink', k=4, ko=True)
save(crop(2, (190, 1254, 220, 1285)), 'ic_smoke', k=4, ko=True)

# ---------- 一覧 ----------
FONT = ImageFont.truetype('C:/Windows/Fonts/YuGothM.ttc', 18)
cells = []
for name, im in made:
    t = im.copy()
    t.thumbnail((260, 200))
    cells.append((name, t))
cols = 7
cw, chh = 280, 240
sheet = Image.new('RGB', (cols * cw, ((len(cells) + cols - 1) // cols) * chh), (200, 200, 200))
d = ImageDraw.Draw(sheet)
for i, (name, t) in enumerate(cells):
    x, y = (i % cols) * cw, (i // cols) * chh
    # 透明は市松で見せる
    bg = Image.new('RGB', t.size, (255, 255, 255))
    if t.mode == 'RGBA':
        ck = Image.new('RGB', t.size, (235, 235, 235))
        cd = ImageDraw.Draw(ck)
        for yy in range(0, t.height, 10):
            for xx in range(0, t.width, 10):
                if (xx // 10 + yy // 10) % 2:
                    cd.rectangle([xx, yy, xx + 9, yy + 9], fill=(190, 190, 190))
        ck.paste(t, (0, 0), t)
        bg = ck
    else:
        bg.paste(t)
    sheet.paste(bg, (x + 10, y + 8))
    d.text((x + 10, y + chh - 28), name, font=FONT, fill=(0, 0, 0))
sheet.save(os.path.join(LOOK, 'sheet_ref.png'))
print(len(made), 'ok')
