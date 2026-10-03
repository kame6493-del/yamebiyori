import sys
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(locale="ja-JP")
    seen=[]
    pg.on("response", lambda r: seen.append((r.status,r.url)) if "kennet" in r.url and not r.url.endswith((".js",".css",".png",".svg",".woff2",".jpg")) else None)
    pg.goto(sys.argv[1], wait_until="networkidle", timeout=60000); pg.wait_for_timeout(3000)
    for s in seen: print(s)
    t=pg.inner_text("body"); print(len(t)); print(t[:200])
    b.close()
