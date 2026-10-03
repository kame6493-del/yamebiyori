# -*- coding: utf-8 -*-
"""r1_raw.json から RELEASE.md 用の表を作る。出力: research/r6_table.md"""
import json, os, statistics as st
HERE = os.path.dirname(os.path.abspath(__file__))
d = json.load(open(os.path.join(HERE, "r1_raw.json"), encoding="utf-8"))
out = []
for term, ids in d["terms"].items():
    cs = [d["apps"][i]["cnt"] for i in ids]
    paid = sum(1 for i in ids if d["apps"][i]["price"])
    iap = sum(1 for i in ids if d["apps"][i]["iap"])
    out.append(f"### 「{term}」上位{len(ids)}本(評価件数の中央値 {st.median(cs):g}・有料アプリ {paid}本・アプリ内課金あり {iap}本)\n")
    out.append("| 順 | アプリ | 開発 | 値段 | 評価件数(平均) | 課金の中身(先頭3つ) | 低評価(直近50件中)の不満 |")
    out.append("|---|---|---|---|---|---|---|")
    for r, i in enumerate(ids, 1):
        a = d["apps"][i]
        name = a["name"].replace("|", "/")[:22]
        price = "無料" if not a["price"] else f"¥{int(a['price'])}"
        iapt = " / ".join(a["iap"][:3]).replace("|", "/") or "なし"
        kw = "・".join(f"{k}{v}" for k, v in a["kw_low"].items() if v) or "-"
        avg = f"{a['avg']:.1f}" if a["avg"] else "-"
        out.append(f"| {r} | {name} | {a['seller'][:14]} | {price} | {a['cnt']:,}({avg}) | {iapt[:70]} | 低{a['low']}件: {kw} |")
    out.append("")
tot = {}
for a in d["apps"].values():
    for k, v in a["kw_low"].items():
        tot[k] = tot.get(k, 0) + v
out.append(f"重複を除いた {len(d['apps'])} 本の低評価(★1〜2)合計 {sum(a['low'] for a in d['apps'].values())} 件の内訳: " + "・".join(f"{k}{v}" for k, v in sorted(tot.items(), key=lambda x: -x[1]) if v))
open(os.path.join(HERE, "r6_table.md"), "w", encoding="utf-8").write("\n".join(out))
print("ok")
