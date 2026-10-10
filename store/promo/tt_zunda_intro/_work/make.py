"""やめ日和(お酒とたばこの両方の版 both)ずんだもんのアプリ紹介 縦動画(1080x1920)。共通部品 Downloads/ui_remake_common/zunda_promo.py
画面は dist-promo(開発モードの確認用ビルド。dist には触れない)を vite preview して見本データで録画した clips/(record.py)
言葉づかい: 責めない。医療の助言はしない(やめ方の指南・効果の約束をしない)。
python record.py → python make.py → ../yamebiyori_zunda_intro.mp4 / ../thumb.png
"""
import sys
from pathlib import Path

sys.path.insert(0, r'C:\Users\yuichi1\Downloads\ui_remake_common')
import zunda_promo as Z  # noqa: E402

HERE = Path(__file__).resolve().parent
OUT = HERE.parent
STORE = HERE.parents[2]

Z.setup(name='やめ日和', tagline='お酒とたばこをやめる記録', icon=STORE / 'both' / 'icon_1024.png', renewed=True,
        brand=(0x4E, 0x86, 0x3C), bg=(0x2E, 0x62, 0x32), bg2=(0x56, 0x8C, 0x3E), ink=(0x3A, 0x3A, 0x33),
        key='yame3', clips=HERE / 'clips',
        # 2026-10-10 生成りの地をやめ、アプリの朝日の湖の絵を若葉色に沈めて敷く。名前は HG教科書体
        bg_img=STORE.parent / 'src' / 'assets' / 'ref' / 'hero_lake.webp', bg_blur=10, bg_tint=(0x2A, 0x5C, 0x2E, 185),
        head_ink=(255, 255, 255), name_font='C:/Windows/Fonts/HGRKK.TTC')

HOME = Z.clip_at('home', 0)
SLIP = Z.clip_at('slip', 0)
CAL = Z.clip_at('calendar', 0)
TOP = Z.box9(540, 760, 1000)


def scenes():
    return [
        Z.Seg('お酒やたばこを控えたいのに、つい手が伸びる日って、あるのだ。', 'おさけやたばこを控えたいのに、つい手が伸びる日って、あるのだ。',
              sub='お酒やたばこを控えたいのに|つい手が伸びる日って|あるのだ', img=HOME, crop0=Z.FULLBOX, crop1=TOP, zt=(0.3, 2.4),
              pose=13, sfx=[(0.0, 'scout-impact.wav', 0.2)]),
        Z.Seg('そこで、やめ日和なのだ。UIと見た目を大幅に変えて、新しくなったのだ。',
              'そこで、やめびよりなのだ。ユーアイと見た目を大幅に変えて、新しくなったのだ。',
              sub='そこで、やめ日和なのだ。|UIと見た目を大幅に変えて|新しくなったのだ', img=HOME, crop0=TOP, crop1=Z.box9(540, 640, 900),
              zt=(0.2, 1.8), pose=3, hl=['やめ日和', '新しくなった'], sfx=[(0.0, 'card-place.wav', 0.35)]),
        Z.Seg('お酒もたばこも、ひとつのアプリで、やめた日数と浮いたお金を数えられるのだ。',
              'おさけもたばこも、ひとつのアプリで、やめた日数と浮いたお金を数えられるのだ。',
              sub='お酒もたばこも|ひとつのアプリで|日数と浮いたお金を記録', clip='pair', c0=0.4, c1=2.35,
              crop0=Z.box9(540, 760, 1040), pose=20, hl=['お酒もたばこも']),
        Z.Seg('飲みたい、吸いたい気持ちが来たら、記録して5分タイマーなのだ。',
              'のみたい、すいたい気持ちが来たら、記録してごふんタイマーなのだ。',
              sub='飲みたい・吸いたい|気持ちが来たら|記録して5分タイマー', clip='crave', c0=0.4, c1=5.2,
              crop0=Z.box9(540, 760, 1040), pose=30, hl=['5分タイマー'], min_dur=3.4),
        Z.Seg('飲んでしまった日も、責めないのだ。通算の日数は消えないのだ。', 'のんでしまった日も、責めないのだ。通算の日数は消えないのだ。',
              sub='飲んでしまった日も|責めない|通算の日数は消えない', img=SLIP, crop0=Z.box9(540, 900, 1080), crop1=Z.box9(540, 820, 960),
              zt=(0.1, 1.6), pose=2, hl=['責めない']),
        Z.End('やめ日和は、いまアンドロイドのテスト版。テスター募集中なのだ。プロフィールのリンクから参加してほしいのだ!',
              'やめびよりは、いまアンドロイドのテスト版。テスター募集中なのだ。プロフィールのリンクから参加してほしいのだ!', pose=29),
    ]


if __name__ == '__main__':
    mp4 = OUT / 'yamebiyori_zunda_intro.mp4'
    Z.build(scenes(), mp4, HERE / 'timeline.json')
    Z.thumb(OUT / 'thumb.png', HOME, 'お酒もたばこも', 'やめた日を数える', crop=Z.box9(540, 760, 1080), y=1060)
    Z.check(mp4, HERE / 'check', [0.1, 1.5, 3.5, 5.0, 7.5, 9.5, 11.5, 13.5, 15.5, 17.5, 19.5, 21.5, 23.0, 26.0])
