#!/usr/bin/env python3
"""Fetch actual WC2026 results from ESPN's public scoreboard API → scripts/results.json.

Compliant: ESPN's site.api.espn.com JSON is the public endpoint their own site uses
(no auth, no scraping of protected pages). Run before each calibration.

Usage: python3 scripts/fetch_results.py 20260611 20260612 ... (dates)
       (no args → defaults to 11–26 June 2026)
"""
import json, sys, re, urllib.request, os

DATES = sys.argv[1:] or [f"202606{d:02d}" for d in range(11, 27)]
BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates="
HERE = os.path.dirname(__file__)

seen, res = {}, []
for d in DATES:
    try:
        req = urllib.request.Request(BASE + d, headers={"User-Agent": "Mozilla/5.0"})
        data = json.load(urllib.request.urlopen(req, timeout=20))
    except Exception as e:
        print(f"  {d}: {e}"); continue
    for e in data.get("events", []):
        if e.get("status", {}).get("type", {}).get("state") != "post":
            continue  # only completed matches
        comp = e["competitions"][0]
        ha = {c["homeAway"]: c for c in comp["competitors"]}
        h, a = ha.get("home"), ha.get("away")
        if not (h and a) or e["id"] in seen:
            continue
        seen[e["id"]] = 1
        res.append({"date": e["date"][:10], "home": h["team"]["displayName"],
                    "away": a["team"]["displayName"], "hg": int(h["score"]), "ag": int(a["score"])})
res.sort(key=lambda x: x["date"])
json.dump(res, open(os.path.join(HERE, "results.json"), "w"), indent=1)
print(f"Wrote {len(res)} completed matches to scripts/results.json")
for r in res:
    print(f"  {r['date']} {r['home']} {r['hg']}-{r['ag']} {r['away']}")
