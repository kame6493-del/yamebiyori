# -*- coding: utf-8 -*-
"""e-ヘルスネットのメニューを押して、喫煙・飲酒の記事一覧とJSONの通信先を調べる"""
import json, os
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "kennet")
os.makedirs(OUT, exist_ok=True)
reqs = []
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(locale="ja-JP")
    pg.on("response", lambda r: reqs.append((r.url, r.headers.get("content-type", ""))) if "json" in r.headers.get("content-type", "") else None)
    pg.goto("https://kennet.mhlw.go.jp/information/information", wait_until="networkidle", timeout=60000)
    for label in ["喫煙", "飲酒"]:
        pg.goto("https://kennet.mhlw.go.jp/information/information", wait_until="networkidle", timeout=60000)
        pg.get_by_text(label, exact=True).first.click()
        pg.wait_for_timeout(3000)
        links = pg.evaluate("() => [...document.querySelectorAll('a')].map(a => [a.innerText.trim().slice(0,60), a.href])")
        txt = pg.inner_text("body")
        open(os.path.join(OUT, "menu_" + label + ".txt"), "w", encoding="utf-8").write(pg.url + "\n" + txt + "\n\n" + "\n".join("%s\t%s" % tuple(l) for l in links))
        print(label, pg.url, len(links))
    b.close()
json.dump(reqs, open(os.path.join(OUT, "json_reqs.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(reqs))
