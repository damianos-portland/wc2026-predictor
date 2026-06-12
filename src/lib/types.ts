import { z } from "zod";

// ── shared ────────────────────────────────────────────────────────────────
export type Confidence = "low" | "medium" | "high";

export interface SourceRef {
  label: string;
  url: string;
  /** ISO timestamp the data point was retrieved */
  retrievedAt?: string;
}

// ── teams & matches ─────────────────────────────────────────────────────────
export interface Team {
  id: string;
  name: string;
  code: string; // 3-letter
  flag: string; // emoji
  fifaRank: number;
  elo: number;
}

export interface MatchInfo {
  id: string;
  stage: string; // e.g. "Group A", "Round of 16"
  group?: string;
  kickoff: string; // ISO
  venue: string;
  homeId: string;
  awayId: string;
}

// ── per-team stats (season / tournament, per-game averages) ──────────────────
export interface TeamStats {
  teamId: string;
  matches: number;
  goalsFor: number; // per game
  goalsAgainst: number; // per game
  xgFor?: number;
  xgAgainst?: number;
  cleanSheetPct: number; // 0..1
  possession: number; // 0..100
  shots: number; // per game
  shotsOnTarget: number;
  corners: number;
  fouls: number; // committed per game
  cardsFor: number; // yellow+red per game received
  offsides: number; // per game
  throwIns: number; // per game
  goalKicks: number; // per game
  passes: number; // per game
  sources: SourceRef[];
}

export interface FormResult {
  date: string;
  opponent: string;
  venue: "H" | "A" | "N";
  gf: number;
  ga: number;
  result: "W" | "D" | "L";
}
export interface TeamForm {
  teamId: string;
  results: FormResult[]; // most-recent first
  sources: SourceRef[];
}

export interface H2HMatch {
  date: string;
  competition: string;
  home: string;
  away: string;
  score: string;
}
export interface H2H {
  matches: H2HMatch[];
  homeWins: number;
  draws: number;
  awayWins: number;
  sources: SourceRef[];
}

export interface Injury {
  player: string;
  teamId: string;
  reason: string;
  status: "out" | "doubtful" | "suspended";
  sources: SourceRef[];
}

export interface Lineup {
  teamId: string;
  formation: string;
  players: string[];
  note?: string;
  sources: SourceRef[];
}

export interface MarketTrend {
  market: string;
  note: string;
  sources: SourceRef[];
}

export interface ExpertPrediction {
  outlet: string;
  pick: string;
  note: string;
  sources: SourceRef[];
}

export interface Referee {
  id: string;
  name: string;
  country: string;
  matchesSample: number;
  avgFouls: number; // fouls called per match
  avgYellow: number;
  avgRed: number;
  penaltiesPerMatch: number;
  byCompetition?: { competition: string; avgYellow: number; matches: number }[];
  sources: SourceRef[];
}

// ── aggregated analytics for a match ────────────────────────────────────────
export interface MatchAnalytics {
  match: MatchInfo;
  home: Team;
  away: Team;
  homeStats: TeamStats;
  awayStats: TeamStats;
  homeForm: TeamForm;
  awayForm: TeamForm;
  h2h: H2H;
  injuries: Injury[];
  lineups: Lineup[];
  trends: MarketTrend[];
  experts: ExpertPrediction[];
  referee: Referee | null;
  generatedAt: string;
}

// ── prediction output ───────────────────────────────────────────────────────
export interface ProbOption {
  label: string;
  prob: number; // 0..1
}
export interface OverUnder {
  line: number;
  over: number;
  under: number;
}
export interface Prediction {
  matchId: string;
  expectedGoals: { home: number; away: number };
  oneXtwo: { home: number; draw: number; away: number };
  overUnder: OverUnder[]; // multiple lines (1.5, 2.5, 3.5)
  btts: { yes: number; no: number };
  scorelines: { score: string; prob: number }[];
  // referee-driven card / foul / penalty markets
  cards: { expected: number; lines: OverUnder[] };
  fouls: { expected: number; lines: OverUnder[] };
  penalty: { yes: number; no: number };
  confidence: Confidence;
  factors: string[];
  refereeImpact: RefereeImpact | null;
  trendSummary: string;
}

export interface RefereeImpact {
  referee: string;
  sampleSize: number;
  avgFouls: number;
  avgYellow: number;
  avgRed: number;
  penaltiesPerMatch: number;
  notes: string[];
  confidence: Confidence;
  sources: SourceRef[];
}

// ── odds & value bets ───────────────────────────────────────────────────────
export const OddsSelectionSchema = z.object({
  market: z.string().min(1),
  selection: z.string().min(1),
  decimalOdds: z.number().gt(1).lt(1000),
});
export type OddsSelection = z.infer<typeof OddsSelectionSchema>;

export const AnalyzeRequestSchema = z.object({
  matchId: z.string().min(1),
  // either a Stoiximan URL (handled per compliance) or manual odds
  stoiximanUrl: z.string().url().optional(),
  odds: z.array(OddsSelectionSchema).optional(),
  edgeThreshold: z.number().min(0).max(1).default(0.03),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export interface ValueBet {
  market: string;
  selection: string;
  decimalOdds: number;
  impliedProb: number;
  modelProb: number;
  edge: number; // model - implied
  ev: number; // (model * odds) - 1
  confidence: Confidence;
  explanation: string;
  sources: SourceRef[];
}

export interface AnalyzeResponse {
  matchId: string;
  source: "manual" | "sample" | "stoiximan";
  notice?: string; // compliance notice when a URL can't be auto-read
  valueBets: ValueBet[];
  evaluated: number; // how many selections were checked
  edgeThreshold: number;
  disclaimer: string;
}

export const DISCLAIMER =
  "This tool is for informational and analytical purposes only. It does not guarantee betting outcomes. Odds and predictions can be wrong. 18+. Gamble responsibly — see begambleaware.org / ΚΕΘΕΑ.";
