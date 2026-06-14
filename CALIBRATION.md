# Model calibration log

Backtest of the prediction engine against **actual** WC2026 results (pulled from
ESPN's public scoreboard API — see `scripts/fetch_results.py`).

## How to re-run (each matchday)
```bash
python3 scripts/fetch_results.py        # → scripts/results.json (completed games)
npm run dev                             # start the app
python3 scripts/calibrate.py http://localhost:3000
```

## Round 1 — after 9 group games (11–14 June 2026)

Results: Mexico 2-0 RSA · Korea 2-1 Czechia · Canada 1-1 Bosnia · USA 4-1 Paraguay ·
Qatar 1-1 Switzerland · Brazil 1-1 Morocco · Haiti 0-1 Scotland · Australia 2-0 Türkiye ·
Germany 7-1 Curaçao.

**Diagnosis** — the raw independent-Poisson model was:
- ✅ **well-calibrated on total goals** (predicted 2.92 vs actual 3.00, bias +0.08)
- ❌ **too optimistic on Over 2.5** (model 56% vs actual 33%)
- ❌ **under-predicting draws** (model 23% vs actual 33%) and **over-confident on favourites**
  (Switzerland 61% drew; Brazil 44% drew; Czechia favoured but lost)

This is the well-known independent-Poisson bias: it spreads goals too evenly and
under-weights tight draws.

**Fix applied:** Dixon-Coles-style **draw inflation** on the score-grid diagonal
(`DRAW_BOOST = 1.25` in `src/lib/engine.ts`).

| Metric | Before | After |
|---|---|---|
| Brier (1X2) | 0.538 | **0.530** |
| Log-loss | 0.914 | **0.895** |
| Draw rate (actual 33%) | 23% | **27%** |
| P(over 2.5) (actual 33%) | 56% | **54%** |
| Goals bias | +0.08 | +0.08 |

**Caveats:** only 9 games — kept the adjustment modest and theory-driven (not fit to
noise). Team inputs are still synthetic (FIFA-rank-derived), so this tunes only the
global score distribution, not per-team strength. Re-run as more results land; if the
draw/over gap persists over ~30+ games, raise `DRAW_BOOST` and/or trim `AVG_GOALS`.
