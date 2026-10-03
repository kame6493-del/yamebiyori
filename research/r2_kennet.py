# -*- coding: utf-8 -*-
"""e-ヘルスネット(JSで描くページ)を描画して本文を保存する。python r2_kennet.py URL...
出力: research/kennet/<末尾>.txt"""
import os, sys
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "kennet")
os.makedirs(OUT, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(locale="ja-JP")
    for url in sys.argv[1:]:
        pg.goto(url, wait_until="networkidle", timeout=60000)
        pg.wait_for_timeout(1500)
        txt = pg.inner_text("body")
        name = url.rstrip("/").split("/")[-1].replace(".html", "") or "index"
        open(os.path.join(OUT, name + ".txt"), "w", encoding="utf-8").write(url + "\n\n" + txt)
        print(name, len(txt))
    b.close()
