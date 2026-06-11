# World Cup Value Finder

Prediction analytics & **value-bet detection** for FIFA World Cup matches.

Select a match → read a data-driven prediction built from **public sources** (form, H2H, injuries, lineups, ratings, stats, **referee analytics**) → paste bookmaker odds → see where the **price beats the model** (edge & expected value), per market.

> **Disclaimer.** This tool is for informational and analytical purposes only. It does not guarantee betting outcomes. Predictions are estimates. 18+. Gamble responsibly.

The **real FIFA World Cup 2026 group-stage schedule** is scraped from Wikipedia (72 matches, 48 teams, real venues, kickoff dates and assigned referees) and bundled in `src/lib/schedule.json`. Model inputs (team stats, form, sample odds) are generated as estimates until the live `DataSource` adapters are connected.

> Regenerate the schedule anytime from `src/lib/schedule.json` — it was built from `en.wikipedia.org/wiki/2026_FIFA_World_Cup` + the per-group sub-pages via the MediaWiki API. Knockout fixtures (Round of 32 → Final) are added once the bracket teams are known.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
```

No database or API keys required for the MVP (in-memory cache + bundled mock data).

---

## Features

- **Landing page** — hero, match selector, search/filter by team / venue / stage, “Analyze Match” CTA.
- **Match analytics** — recent form, head-to-head, injuries & suspensions, expected lineups, FIFA rank / Elo, market trends, expert picks, and full statistical indicators (goals, xG, clean sheets, possession, shots, corners, fouls, cards). **Every data point links to its source.**
- **Referee analytics** — average fouls / yellows / reds / penalties per match, sample size, by-competition splits, and **how they shift card / foul / penalty markets**.
- **Prediction engine** — Poisson model over expected goals → 1X2, Over/Under (1.5/2.5/3.5), BTTS, most-likely scorelines, plus referee-adjusted cards / fouls / penalty markets. Confidence + key reasoning factors + trend summary.
- **Value finder** — paste a Stoiximan URL (compliant: see below) or enter odds manually / load the sample. Computes implied probability, edge and EV, and surfaces only **genuine value** (model > implied, edge ≥ threshold, confidence ≠ low).

### Value math

```
implied_probability = 1 / decimal_odds
edge                = model_probability − implied_probability
expected_value      = (model_probability × decimal_odds) − 1
```
A bet is shown only when `model > implied`, `edge ≥ threshold` (default 3%, configurable in the UI) and `confidence ≠ low`.

---

## Compliance & safety

- Uses **only publicly accessible sources** and attaches a **source URL to every data point**.
- Respects `robots.txt`, rate limits and each site’s Terms of Service; results are **cached** to avoid excessive requests.
- **Never** bypasses paywalls, login walls, captchas or anti-bot systems.
- **Stoiximan:** bookmaker pages are bot-protected and their Terms restrict automated access, so the app **does not auto-read them**. Paste odds manually, load the sample, or integrate a *licensed* odds feed via an adapter.
- Predictions are presented as estimates, never guarantees; a responsible-gambling disclaimer is shown site-wide.

---

## Architecture

```
src/
  app/
    page.tsx                 Landing (hero + match browser)
    match/[id]/page.tsx      Analytics + prediction + value finder
    api/
      matches/route.ts       GET list of matches
      matches/[id]/route.ts  GET analytics + prediction + sample odds
      analyze/route.ts       POST odds → value bets (Zod-validated)
  lib/
    types.ts                 Domain types + Zod schemas + DISCLAIMER
    schedule.json            REAL scraped WC2026 schedule (72 matches, 48 teams, venues, referees)
    mock.ts                  Loads schedule.json; generates model inputs (stats/form/odds)
    cache.ts                 CacheStore interface + in-memory TTL cache
    sources.ts               DataSource abstraction + getMatchAnalytics()
    engine.ts                Prediction engine (Poisson + heuristics + referee)
    value.ts                 Odds → model mapping + edge/EV + thresholds
    odds.ts                  Stoiximan URL handling (compliant) + helpers
  components/                UI (browser, analytics, prediction, odds analyzer)
```

### Replacing mock data with live scraping

Everything live-fetchable goes through the **`DataSource`** abstraction in `src/lib/sources.ts`. Each adapter returns its payload **with `sources: SourceRef[]`**. To go live:

1. Implement adapters per category (form, h2h, injuries, lineups, rankings, referee, market-trends, experts, stats) that fetch public pages **within `robots.txt`/ToS** and return data + source URLs.
2. Wire them in `getMatchAnalytics()` under the `DATA_MODE === "live"` branch.
3. Set `DATA_MODE=live`. The cache (`cache.ts`) already rate-limits and TTL-caches results (default 15 min).

### Cache / database

The default `CacheStore` is in-memory (`cache.ts`). For persistence, implement the same interface against **SQLite or PostgreSQL** and export it as `cache` — no other code changes needed.

### Prediction model

Weighted-heuristic + Poisson today, structured to be swapped for ML later: `engine.ts` exposes a single `predict(analytics)` that turns features (team attack/defence, xG, ratings, form, injuries, referee tendencies) into market probabilities. Replace the internals with a trained model while keeping the same `Prediction` output shape.

---

## Configuration

| Env | Default | Purpose |
|-----|---------|---------|
| `DATA_MODE` | `mock` | `live` to use real scraping adapters (implement them first) |
| `ODDS_API_KEY` | — | Licensed odds feed ([The Odds API](https://the-odds-api.com), free tier) → enables **⚡ Fetch live odds** |
| `ODDS_API_REGIONS` | `eu,uk` | Bookmaker regions (`us`/`uk`/`eu`/`au`) |
| `ODDS_API_SPORT` | `soccer_fifa_world_cup` | Sport key |

Edge threshold is set per-analysis in the UI (default 3%).

### Live odds (compliant)

The app **does not scrape bookmaker pages** (Stoiximan and similar are bot-protected and restrict automated access in their Terms — bypassing that is out of scope). Instead, **⚡ Fetch live odds** pulls prices from a **licensed feed** (The Odds API) via `src/lib/oddsApi.ts`, aggregating the **best price per selection across books** — ideal for value-finding. Covers 1X2, Over/Under and BTTS; cards/fouls/penalty stay manual. Add `ODDS_API_KEY` (see `.env.example`) to enable; without it, the button shows a friendly "configure a key" message and manual/sample still work. Responses are cached (5 min) to respect the request quota.

## Roadmap

- Live `DataSource` adapters (compliant).
- SQLite/Postgres cache adapter + background refresh job.
- ML prediction model behind the same interface.
- More markets (Asian handicap, corners, player props).
