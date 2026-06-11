import type { OddsSelection } from "./types";
import { cached } from "./cache";

// ─────────────────────────────────────────────────────────────────────────────
// Licensed odds feed adapter — The Odds API (https://the-odds-api.com)
//
// COMPLIANT alternative to scraping a bookmaker: a provider that *licenses* odds
// data and issues you an API key. No bot-protection bypass, no ToS violation.
// Set ODDS_API_KEY to enable. Free tier available; responses are cached to
// respect the request quota.
//
// Covers 1X2 (h2h), Over/Under (totals) and BTTS. Cards/fouls/penalty markets are
// not in the standard feed — keep using manual entry for those.
// ─────────────────────────────────────────────────────────────────────────────

const BASE = "https://api.the-odds-api.com/v4";
const SPORT = process.env.ODDS_API_SPORT || "soccer_fifa_world_cup";
const REGIONS = process.env.ODDS_API_REGIONS || "eu,uk";
const KEY = process.env.ODDS_API_KEY;

export interface OddsApiResult {
  ok: boolean;
  reason?: "no_key" | "no_event" | "no_markets" | "error";
  message?: string;
  books?: number;
  odds: OddsSelection[];
}

const key = (s: string) => s.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "");
const ALIAS: Record<string, string> = {
  ivorycoast: "cotedivoire",
  korearepublic: "southkorea",
  republicofkorea: "southkorea",
  czechrepublic: "czechia",
  turkiye: "turkey",
  bosniaandherzegovina: "bosniaherzegovina",
  bosniaherzegovina: "bosniaherzegovina",
  usa: "unitedstates",
  drcongo: "congodr",
  democraticrepublicofthecongo: "congodr",
  capeverdeislands: "capeverde",
};
const canon = (s: string) => { const k = key(s); return ALIAS[k] || k; };
const same = (a: string, b: string) => canon(a) === canon(b);

type ApiOutcome = { name: string; point?: number; price: number };
type ApiMarket = { key: string; outcomes: ApiOutcome[] };
type ApiBook = { title: string; markets: ApiMarket[] };
type ApiEvent = { home_team: string; away_team: string; commence_time: string; bookmakers: ApiBook[] };

/** Fetch the licensed odds for one fixture and aggregate the BEST price per selection. */
export async function fetchOddsForMatch(homeName: string, awayName: string): Promise<OddsApiResult> {
  if (!KEY) {
    return { ok: false, reason: "no_key", odds: [], message: "Live odds are not configured. Add ODDS_API_KEY (free at the-odds-api.com) to enable automatic odds, or use manual / sample below." };
  }
  let events: ApiEvent[];
  try {
    events = await cached(`oddsapi:${SPORT}:${REGIONS}`, 5 * 60 * 1000, async () => {
      const url = `${BASE}/sports/${SPORT}/odds/?apiKey=${KEY}&regions=${encodeURIComponent(REGIONS)}&markets=h2h,totals,btts&oddsFormat=decimal`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Odds API HTTP ${r.status}`);
      return (await r.json()) as ApiEvent[];
    });
  } catch (e) {
    return { ok: false, reason: "error", odds: [], message: e instanceof Error ? e.message : "Odds API request failed." };
  }

  const ev = events.find(
    (e) =>
      (same(e.home_team, homeName) && same(e.away_team, awayName)) ||
      (same(e.home_team, awayName) && same(e.away_team, homeName))
  );
  if (!ev) return { ok: false, reason: "no_event", odds: [], message: "No live market found for this fixture yet — bookmakers usually price World Cup games closer to kickoff." };

  const odds = aggregateBest(ev, homeName, awayName);
  if (!odds.length) return { ok: false, reason: "no_markets", odds: [], message: "The fixture is listed but has no open markets right now." };
  return { ok: true, books: ev.bookmakers.length, odds };
}

/** best (highest) decimal price per market+selection across all bookmakers */
function aggregateBest(ev: ApiEvent, homeName: string, awayName: string): OddsSelection[] {
  const best = new Map<string, OddsSelection>();
  const put = (market: string, selection: string, price: number) => {
    const k = `${market}|${selection}`;
    const cur = best.get(k);
    if (!cur || price > cur.decimalOdds) best.set(k, { market, selection, decimalOdds: price });
  };
  for (const bk of ev.bookmakers ?? []) {
    for (const m of bk.markets ?? []) {
      for (const o of m.outcomes ?? []) {
        if (!(o.price > 1)) continue;
        if (m.key === "h2h") {
          const sel = same(o.name, homeName) ? homeName : same(o.name, awayName) ? awayName : /draw/i.test(o.name) ? "Draw" : null;
          if (sel) put("Match Result", sel, o.price);
        } else if (m.key === "totals" && o.point != null) {
          put(`Over/Under ${o.point}`, `${o.name} ${o.point}`, o.price); // "Over 2.5" / "Under 2.5"
        } else if (m.key === "btts") {
          put("Both Teams To Score", /yes/i.test(o.name) ? "Yes" : "No", o.price);
        }
      }
    }
  }
  return [...best.values()];
}
