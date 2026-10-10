"""見本(ChatGPT の UI 参考画像)とアプリの画面を並べた比較画像を作る。python scripts/make_compare.py
アプリの画面は scripts/e2e_screens.py が撮った本物(375 幅。両方の版=both、たばこの版=tabako)。
出力: docs/compare_redesign_NN_名前.png と docs/compare_redesign_all.png"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DOCS = os.path.join(ROOT, 'docs')
DL = os.path.join(os.path.expanduser('~'), 'Downloads')
SHOTS = os.path.join(HERE, 'e2e_out')
FONT = 'C:/Windows/Fonts/YuGothB.ttc'
os.makedirs(DOCS, exist_ok=True)

# (番号, 名前, [(見本番号, 枠)], [(版, 画面)])
SCREENS = [
    ('01', 'はじめの画面', [(2, (842, 125, 1110, 960)), (8, (570, 255, 830, 945))], [('both', '01_welcome'), ('tabako', '01_welcome')]),
    ('02', 'ホーム', [(2, (12, 122, 285, 870)), (2, (297, 122, 560, 830))], [('both', '03_home'), ('both', '03b_home_tabako'), ('tabako', '03_home')]),
    ('03', '気持ちを記録', [(3, (18, 272, 288, 1100))], [('both', '04_feel')]),
    ('04', '5分タイマー', [(3, (295, 272, 560, 1100))], [('both', '05_timer'), ('tabako', '05_timer')]),
    ('05', '効いた方法', [(3, (565, 272, 832, 1100))], [('both', '06_methods')]),
    ('06', '振り返って保存', [(3, (838, 272, 1105, 1100))], [('both', '07_save')]),
    ('07', '記録する', [(2, (572, 122, 830, 930))], [('both', '08_slip'), ('tabako', '08_slip')]),
    ('08', '記録と記念日', [(4, (575, 370, 835, 1195)), (4, (845, 370, 1110, 1195))], [('both', '09_log')]),
    ('09', 'カレンダー', [(4, (12, 370, 285, 1130))], [('both', '10_calendar')]),
    ('10', '日別の記録', [(4, (298, 370, 562, 1195))], [('both', '11_day'), ('both', '11b_day_slip')]),
    ('11', '読みもの', [(5, (10, 122, 285, 930)), (5, (295, 122, 560, 930))], [('both', '12b_body_tabako'), ('both', '12_body')]),
    ('12', '設定', [(7, (12, 180, 285, 1090)), (7, (295, 180, 560, 1090))], [('both', '13_settings')]),
    ('13', '完全版', [(6, (10, 125, 285, 1000))], [('both', '14_paywall')]),
    ('14', 'グラフ', [(6, (295, 125, 560, 1000)), (6, (570, 125, 830, 1015))], [('both', '15_graphs')]),
    ('15', '記念日の画像', [(5, (840, 122, 1112, 970)), (8, (840, 250, 1110, 950))], [('both', '16_card')]),
    ('16', '待ち受け画像', [(8, (295, 250, 560, 925))], [('both', '17_wall')]),
    ('17', 'テーマの色', [(7, (25, 1130, 860, 1310))], [('both', '18_home_sumi'), ('both', '18b_home_sakura')]),
    ('18', '記念日のお祝い', [(5, (840, 122, 1112, 970))], [('both', '19_celebrate')]),
    ('19', '空の状態', [(8, (570, 255, 830, 945))], [('both', '20_empty')]),
]


def font(size):
    return ImageFont.truetype(FONT, size)


def pair(num, name, refs, apps, H=1000):
    ims = []
    for n, box in refs:
        r = Image.open(os.path.join(DL, f'yame_ref_{n}_1122x1402.png')).convert('RGB').crop(box)
        k = min(H / r.height, 900 / r.width)
        ims.append((f'見本{n}', r.resize((int(r.width * k), int(r.height * k)), Image.LANCZOS)))
    for fl, sh in apps:
        a = Image.open(os.path.join(SHOTS, f'screens_{fl}_375', f'{sh}.png')).convert('RGB')
        ims.append(('アプリ ' + ('両方の版' if fl == 'both' else 'たばこの版'), a.resize((int(a.width * H / a.height), H), Image.LANCZOS)))
    head = 120
    W = sum(i.width for _, i in ims) + 30 * (len(ims) + 1)
    out = Image.new('RGB', (W, H + head + 20), (255, 255, 255))
    d = ImageDraw.Draw(out)
    x = 30
    for label, im in ims:
        d.text((x, 66), label, font=font(30), fill=(150, 60, 40) if label.startswith('見本') else (60, 110, 50))
        out.paste(im, (x, head))
        x += im.width + 30
    d.text((30, 14), f'{num} {name}', font=font(34), fill=(40, 40, 40))
    out.save(os.path.join(DOCS, f'compare_redesign_{num}_{name}.png'))


for num, name, refs, apps in SCREENS:
    pair(num, name, refs, apps)

# 一覧: アプリの画面(両方の版)を並べる
th = 520
names = [(s[0], s[1], s[3][0]) for s in SCREENS]
ims = []
for num, name, (fl, sh) in names:
    a = Image.open(os.path.join(SHOTS, f'screens_{fl}_375', f'{sh}.png')).convert('RGB')
    ims.append((f'{num} {name}', a.resize((int(a.width * th / a.height), th), Image.LANCZOS)))
cols = 10
cw = ims[0][1].width + 14
rows = (len(ims) + cols - 1) // cols
ov = Image.new('RGB', (cols * cw + 20, rows * (th + 50) + 20), (255, 255, 255))
d = ImageDraw.Draw(ov)
for i, (label, im) in enumerate(ims):
    x = 10 + (i % cols) * cw
    y = 10 + (i // cols) * (th + 50)
    d.text((x, y), label, font=font(20), fill=(60, 60, 60))
    ov.paste(im, (x, y + 32))
ov.save(os.path.join(DOCS, 'compare_redesign_all.png'))
print('compare ok', len(SCREENS))
