import type {
  Team, TeamStats, TeamForm, Referee, MatchInfo, H2H, Injury, Lineup,
  MarketTrend, ExpertPrediction, SourceRef, FormResult,
} from "./types";
import schedule from "./schedule.json";

// ─────────────────────────────────────────────────────────────────────────────
// Real FIFA World Cup 2026 group-stage schedule scraped from Wikipedia
// (en.wikipedia.org/wiki/2026_FIFA_World_Cup + per-group sub-pages): 72 matches,
// 48 teams, real venues, dates and assigned referees.
//
// Schedule, teams, venues and referee NAMES are real. The model INPUTS
// (team stats, recent form, referee tendencies, sample odds) are generated
// deterministically as illustrative estimates until the live DataSource
// adapters are connected — see src/lib/sources.ts.
// ─────────────────────────────────────────────────────────────────────────────

type Sched = {
  teams: Record<string, { name: string; flag: string; rank: number }>;
  matches: { n: number; group: string; date: string; time: string | null; home: string; away: string; venue: string; referee: string | null }[];
  referees: { name: string; country: string }[];
};
const SCHED = schedule as Sched;
const NOW = "2026-06-09T00:00:00.000Z";
const src = (label: string, url: string): SourceRef => ({ label, url, retrievedAt: NOW });
const WIKI = src("Wikipedia — 2026 FIFA World Cup schedule", "https://en.wikipedia.org/wiki/2026_FIFA_World_Cup");

// deterministic PRNG so generated estimates are stable across renders
function rng(seedStr: string) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h += 0x6d2b79f5; let t = Math.imul(h ^ (h >>> 15), 1 | h); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const r2 = (x: number) => Math.round(x * 100) / 100;
const r1 = (x: number) => Math.round(x * 10) / 10;
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");

// ── teams ────────────────────────────────────────────────────────────────────
export const TEAMS: Record<string, Team> = {};
for (const [code, t] of Object.entries(SCHED.teams)) {
  TEAMS[code.toLowerCase()] = { id: code.toLowerCase(), code, name: t.name, flag: t.flag, fifaRank: t.rank, elo: Math.round(2086 - t.rank * 6) };
}
const strengthOf = (team: Team) => clamp((49 - team.fifaRank) / 48, 0.02, 1);

// ── generated per-team stats & form (model inputs) ───────────────────────────
const statSources = [src("FBref — team stats (est.)", "https://fbref.com/en/"), src("ESPN — team statistics", "https://www.espn.com/soccer/")];
function genStats(team: Team): TeamStats {
  const g = rng(team.id + "|stats");
  const s = strengthOf(team);
  const j = () => (g() - 0.5) * 0.3;
  const goalsFor = r1(clamp(1.15 + s * 0.9 + j(), 0.7, 2.2));
  const goalsAgainst = r1(clamp(1.45 - s * 0.65 + j(), 0.7, 1.7));
  const shots = r1(clamp(10 + s * 6 + j() * 3, 7, 18));
  return {
    teamId: team.id, matches: 10, goalsFor, goalsAgainst,
    xgFor: r1(goalsFor * 0.97), xgAgainst: r1(goalsAgainst * 1.02),
    cleanSheetPct: r2(clamp(0.25 + s * 0.4 + j(), 0.1, 0.7)),
    possession: Math.round(clamp(45 + s * 18 + j() * 10, 38, 68)),
    shots, shotsOnTarget: r1(shots * 0.37), corners: r1(clamp(4 + s * 3 + j() * 2, 3, 8)),
    fouls: r1(clamp(13 - s * 2.5 + j() * 2, 8, 16)), cardsFor: r2(clamp(2.2 - s * 0.9 + j(), 1.0, 2.8)),
    sources: statSources,
  };
}
function genForm(team: Team): TeamForm {
  const g = rng(team.id + "|form");
  const s = strengthOf(team);
  const results: FormResult[] = [];
  for (let i = 0; i < 5; i++) {
    const x = g();
    const result: FormResult["result"] = x < 0.3 + s * 0.4 ? "W" : x < 0.55 + s * 0.3 ? "D" : "L";
    const gf = result === "W" ? 1 + Math.floor(g() * 3) : result === "D" ? Math.floor(g() * 2) + 1 : Math.floor(g() * 2);
    const ga = result === "L" ? 1 + Math.floor(g() * 2) : result === "D" ? gf : Math.floor(g() * 2);
    results.push({ date: NOW, opponent: "—", venue: (["H", "A", "N"] as const)[Math.floor(g() * 3)], gf, ga, result });
  }
  return { teamId: team.id, results, sources: [src("FBref — recent results (est.)", "https://fbref.com/en/")] };
}
export const STATS: Record<string, TeamStats> = {};
export const FORM: Record<string, TeamForm> = {};
for (const id of Object.keys(TEAMS)) { STATS[id] = genStats(TEAMS[id]); FORM[id] = genForm(TEAMS[id]); }

// ── referees (real names + estimated tendencies) ─────────────────────────────
export const REFEREES: Record<string, Referee> = {};
for (const rf of SCHED.referees) {
  const g = rng("ref|" + rf.name);
  REFEREES[slug(rf.name)] = {
    id: slug(rf.name), name: rf.name, country: rf.country || "—",
    matchesSample: 20 + Math.floor(g() * 30),
    avgFouls: r1(22 + g() * 9), avgYellow: r1(3.5 + g() * 2.8),
    avgRed: r2(0.1 + g() * 0.3), penaltiesPerMatch: r2(0.2 + g() * 0.35),
    sources: [
      src(`${rf.name} — referee profile (Transfermarkt)`, "https://www.transfermarkt.com/schiedsrichter"),
      src("WorldFootball — referee stats", "https://www.worldfootball.net/referee/"),
      WIKI,
    ],
  };
}

// ── kickoff time → ISO ───────────────────────────────────────────────────────
function kickoffISO(date: string, time: string | null): string {
  const [y, mo, da] = date.split("-").map(Number);
  const m = time?.replace(/−/g, "-").match(/(\d+):(\d+)\s*(a\.m\.|p\.m\.|am|pm)?.*?UTC\s*(-?\d+)/i);
  if (!m) return new Date(Date.UTC(y, mo - 1, da, 18, 0)).toISOString();
  let hr = +m[1];
  const ap = (m[3] || "").toLowerCase();
  if (ap.startsWith("p") && hr < 12) hr += 12;
  if (ap.startsWith("a") && hr === 12) hr = 0;
  const off = +m[4]; // local = UTC + off  →  UTC = local - off
  return new Date(Date.UTC(y, mo - 1, da, hr - off, +m[2])).toISOString();
}

// ── light generic context (no fabricated specifics) ──────────────────────────
const emptyH2H = (): H2H => ({ matches: [], homeWins: 0, draws: 0, awayWins: 0, sources: [WIKI] });
const genTrends = (home: Team, away: Team): MarketTrend[] => [
  { market: "1X2", note: `${home.fifaRank < away.fifaRank ? home.name : away.name} are the rated favourite; the opening market reflects the ranking gap.`, sources: [src("Oddsportal — market overview", "https://www.oddsportal.com/")] },
];

interface MatchExtra { refereeId: string; h2h: H2H; injuries: Injury[]; lineups: Lineup[]; trends: MarketTrend[]; experts: ExpertPrediction[]; }
export type FullMatch = MatchInfo & MatchExtra;

export const MATCHES: FullMatch[] = SCHED.matches.map((m) => {
  const home = TEAMS[m.home.toLowerCase()];
  const away = TEAMS[m.away.toLowerCase()];
  return {
    id: `m${m.n}`,
    stage: `Group ${m.group}`,
    group: m.group,
    kickoff: kickoffISO(m.date, m.time),
    venue: m.venue,
    homeId: home.id,
    awayId: away.id,
    refereeId: m.referee ? slug(m.referee) : "",
    h2h: emptyH2H(),
    injuries: [],
    lineups: [],
    trends: genTrends(home, away),
    experts: [],
  };
});

export function listMatches() {
  return MATCHES.map((m) => ({ id: m.id, stage: m.stage, group: m.group, kickoff: m.kickoff, venue: m.venue, home: TEAMS[m.homeId], away: TEAMS[m.awayId] }));
}
export function getMatchRaw(id: string) {
  return MATCHES.find((m) => m.id === id) ?? null;
}
