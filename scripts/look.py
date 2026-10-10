"""見本の一部を拡大して見る。python tools/look.py <見本番号> x0 y0 x1 y1 [倍率] [出力名]"""
import os, sys
from PIL import Image, ImageDraw
DL = os.path.join(os.path.expanduser('~'), 'Downloads')
n = sys.argv[1]
x0, y0, x1, y1 = map(int, sys.argv[2:6])
k = float(sys.argv[6]) if len(sys.argv) > 6 else 3
name = sys.argv[7] if len(sys.argv) > 7 else 'look'
im = Image.open(os.path.join(DL, f'yame_ref_{n}_1122x1402.png')).convert('RGB').crop((x0, y0, x1, y1))
im = im.resize((int(im.width * k), int(im.height * k)), Image.NEAREST)
d = ImageDraw.Draw(im)
# 10px ごとの目盛り
for x in range(0, x1 - x0, 10):
    d.line([(x * k, 0), (x * k, 6 if x % 50 else 14)], fill=(255, 0, 0))
for y in range(0, y1 - y0, 10):
    d.line([(0, y * k), (6 if y % 50 else 14, y * k)], fill=(255, 0, 0))
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'work', 'look', name + '.png')
im.save(out)
print(out, im.size)
