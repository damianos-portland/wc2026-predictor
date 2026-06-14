#!/usr/bin/env python3
"""Backtest the prediction model against actual results and report calibration.

Prereqs: dev server running (npm run dev) + scripts/results.json (fetch_results.py).
Usage: python3 scripts/calibrate.py [http://localhost:3000]

Reports, on the matches played so far:
  - Goals bias        (predicted total vs actual)  → tune AVG_GOALS if large
  - 1X2 Brier/LogLoss (lower = better)             → favourite calibration
  - Draw rate         model vs actual              → tune DRAW_BOOST
  - Over 2.5 / BTTS   model vs actual hit rate
"""
import json, sys, re, math, os, urllib.request

API = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000").rstrip("/")
HERE = os.path.dirname(__file__)
ALIAS = {"trkiye": "turkey"}
def norm(s):
    n = re.sub(r"[^a-z]", "", s.lower()); return ALIAS.get(n, n)
def get(u):
    return json.load(urllib.request.urlopen(u, timeout=20))

results = json.load(open(os.path.join(HERE, "results.json")))
idx = {tuple(sorted([norm(m["home"]["name"]), norm(m["away"]["name"])])): m for m in get(f"{API}/api/matches")["matches"]}

rows = []
for r in results:
    m = idx.get(tuple(sorted([norm(r["home"]), norm(r["away"])])))
    if not m:
        print("  (no schedule match for)", r["home"], "v", r["away"]); continue
    p = get(f"{API}/api/matches/{m['id']}")["prediction"]
    hg, ag = (r["hg"], r["ag"]) if norm(m["home"]["name"]) == norm(r["home"]) else (r["ag"], r["hg"])
    eg, ox = p["expectedGoals"], p["oneXtwo"]
    ou = next(l for l in p["overUnder"] if l["line"] == 2.5)
    outcome = "home" if hg > ag else "away" if ag > hg else "draw"
    rows.append(dict(predTot=eg["home"] + eg["away"], actTot=hg + ag, pH=ox["home"], pD=ox["draw"], pA=ox["away"],
                     outcome=outcome, pOver=ou["over"], over=(hg + ag) > 2.5, pB=p["btts"]["yes"], btts=(hg >= 1 and ag >= 1)))

n = len(rows)
if not n:
    print("No matched results."); sys.exit()
avg = lambda f: sum(f(r) for r in rows) / n
brier = avg(lambda r: (r["pH"] - (r["outcome"] == "home")) ** 2 + (r["pD"] - (r["outcome"] == "draw")) ** 2 + (r["pA"] - (r["outcome"] == "away")) ** 2)
logloss = avg(lambda r: -math.log(max(1e-9, {"home": r["pH"], "draw": r["pD"], "away": r["pA"]}[r["outcome"]])))
hit = avg(lambda r: max([("home", r["pH"]), ("draw", r["pD"]), ("away", r["pA"])], key=lambda x: x[1])[0] == r["outcome"])
print(f"n={n} matches")
print(f"GOALS  : pred avg {avg(lambda r: r['predTot']):.2f} | actual {avg(lambda r: r['actTot']):.2f} | bias {avg(lambda r: r['actTot']-r['predTot']):+.2f}")
print(f"1X2    : Brier {brier:.3f} | LogLoss {logloss:.3f} | top-pick {hit*100:.0f}%")
print(f"DRAWS  : model {avg(lambda r: r['pD'])*100:.0f}% | actual {avg(lambda r: r['outcome']=='draw')*100:.0f}%")
print(f"OVER2.5: model {avg(lambda r: r['pOver'])*100:.0f}% | actual {avg(lambda r: r['over'])*100:.0f}%")
print(f"BTTS   : model {avg(lambda r: r['pB'])*100:.0f}% | actual {avg(lambda r: r['btts'])*100:.0f}%")
