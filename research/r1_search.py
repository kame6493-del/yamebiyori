# -*- coding: utf-8 -*-
"""App Store(日本)で 禁酒/断酒/禁煙/減酒 を検索し、上位20本ずつの 値段・課金内容・評価件数・低評価レビューの不満 を集める。
出力: research/r1_raw.json"""
import html, json, os, re, time, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "r1_raw.json")
TERMS = ["禁酒", "断酒", "禁煙", "減酒"]
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36", "Accept-Language": "ja"}

KW = {
    "広告": ["広告"],
    "課金・値段": ["課金", "有料", "サブスク", "高い", "プレミアム", "月額", "年額", "お金を払", "買い切り"],
    "責められる・リセットがつらい": ["リセット", "0日", "ゼロ", "やり直", "責め", "罪悪感", "戻って", "失敗"],
    "記録の消失・引き継ぎ": ["消え", "引き継", "機種変", "バックアップ", "データが"],
    "不具合・重い": ["落ちる", "重い", "バグ", "起動しない", "不具合", "フリーズ", "開かない"],
    "通知": ["通知"],
    "ウィジェット": ["ウィジェット"],
    "複数の習慣": ["複数", "両方", "タバコも", "お酒も"],
    "減酒・飲んだ量": ["減酒", "量", "休肝日"],
}


def fetch(url, js=True):
    for i in range(3):
        try:
            s = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read().decode("utf-8")
            return json.loads(s) if js else s
        except Exception as ex:
            print("retry", url[:80], ex, flush=True)
            time.sleep(5 * (i + 1))
    return {} if js else ""


res = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {"terms": {}, "apps": {}}
for term in TERMS:
    d = fetch("https://itunes.apple.com/search?" + urllib.parse.urlencode({"term": term, "country": "jp", "entity": "software", "limit": 20, "lang": "ja_jp"}))
    rows = d.get("results", [])
    res["terms"][term] = [str(r["trackId"]) for r in rows]
    for rank, r in enumerate(rows, 1):
        aid = str(r["trackId"])
        if aid in res["apps"]:
            continue
        a = {
            "name": r.get("trackName"), "seller": r.get("sellerName"), "price": r.get("price"), "cnt": r.get("userRatingCount", 0),
            "avg": r.get("averageUserRating"), "released": (r.get("releaseDate") or "")[:10], "updated": (r.get("currentVersionReleaseDate") or "")[:10],
            "genre": r.get("primaryGenreName"), "url": r.get("trackViewUrl", "").split("?")[0],
        }
        page = fetch("https://apps.apple.com/jp/app/id%s" % aid, js=False)
        pairs = re.findall(r'class="text-pair[^"]*"><span>(.*?)</span>\s*<span>(.*?)</span>', page)
        seen = []
        for x, y in pairs:
            t = (html.unescape(x).strip(), html.unescape(y).strip())
            if t not in seen and "¥" in t[1]:
                seen.append(t)
        a["iap"] = ["%s %s" % t for t in seen]
        time.sleep(1.0)
        revs = []
        rv = fetch("https://itunes.apple.com/jp/rss/customerreviews/page=1/id=%s/sortby=mostrecent/json" % aid)
        ents = (rv or {}).get("feed", {}).get("entry", []) or []
        if isinstance(ents, dict):
            ents = [ents]
        for e in ents:
            if "im:rating" not in e:
                continue
            revs.append({"r": int(e["im:rating"]["label"]), "t": e["title"]["label"], "c": e["content"]["label"][:300]})
        low = [x for x in revs if x["r"] <= 2]
        a["n_rev"] = len(revs)
        a["low"] = len(low)
        a["kw_low"] = {k: sum(1 for x in low if any(w in x["t"] + x["c"] for w in ws)) for k, ws in KW.items()}
        a["kw_all"] = {k: sum(1 for x in revs if any(w in x["t"] + x["c"] for w in ws)) for k, ws in KW.items()}
        a["low_samples"] = low[:8]
        res["apps"][aid] = a
        print(term, rank, (a["name"] or "")[:24], a["price"], a["cnt"], len(a["iap"]), a["low"], flush=True)
        json.dump(res, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        time.sleep(2.0)
json.dump(res, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("done")
