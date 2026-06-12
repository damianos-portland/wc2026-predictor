import type { MatchAnalytics, Prediction } from "./types";

// On-the-fly line markets. Each market exposes an expected total (match + per
// team) and a dispersion model, so any user-typed line can be priced instantly.
export type MarketScope = "match" | "home" | "away";

export interface MarketSpec {
  key: string;
  label: string;
  unit: string;
  dist: "poisson" | "normal";
  cv: number; // normal: sd = lambda * cv
  match: number;
  home: number;
  away: number;
  step: number; // UI line increment
}

const round = (x: number, d = 1) => Math.round(x * 10 ** d) / 10 ** d;

export function buildMarketModels(a: MatchAnalytics, pred: Prediction): MarketSpec[] {
  const hs = a.homeStats, as = a.awayStats;
  const cardsHome = (hs.cardsFor / (hs.cardsFor + as.cardsFor)) * pred.cards.expected;
  return [
    spec("goals", "Goals", "goals", "poisson", 0, pred.expectedGoals.home, pred.expectedGoals.away, 0.5),
    spec("cards", "Cards", "cards", "poisson", 0, cardsHome, pred.cards.expected - cardsHome, 0.5),
    spec("corners", "Corners", "corners", "normal", 0.3, hs.corners, as.corners, 0.5),
    // a free kick is awarded for a foul → a team's free kicks ≈ the opponent's fouls
    spec("freekicks", "Free kicks", "free kicks", "normal", 0.2, as.fouls, hs.fouls, 0.5),
    spec("throwins", "Throw-ins", "throw-ins", "normal", 0.17, hs.throwIns, as.throwIns, 1),
    spec("goalkicks", "Goal kicks", "goal kicks", "normal", 0.25, hs.goalKicks, as.goalKicks, 1),
    spec("offsides", "Offsides", "offsides", "poisson", 0, hs.offsides, as.offsides, 0.5),
    spec("shots", "Total shots", "shots", "normal", 0.22, hs.shots, as.shots, 1),
    spec("passes", "Passes", "passes", "normal", 0.11, hs.passes, as.passes, 10),
  ];
}

function spec(key: string, label: string, unit: string, dist: "poisson" | "normal", cv: number, home: number, away: number, step: number): MarketSpec {
  return { key, label, unit, dist, cv, home: round(home), away: round(away), match: round(home + away), step };
}

export const lambdaFor = (m: MarketSpec, scope: MarketScope) => (scope === "home" ? m.home : scope === "away" ? m.away : m.match);

// ── probability math (pure; runs on the client too) ──────────────────────────
function fact(n: number) { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }
function erf(x: number) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}
const normCdf = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));

/** P(total > line) for a Poisson or Normal-approx market */
export function probOver(m: MarketSpec, lambda: number, line: number): number {
  if (m.dist === "poisson") {
    let under = 0;
    for (let k = 0; k <= Math.floor(line); k++) under += (Math.exp(-lambda) * Math.pow(lambda, k)) / fact(k);
    return Math.min(1, Math.max(0, 1 - under));
  }
  const sd = Math.max(1e-6, lambda * m.cv);
  return Math.min(1, Math.max(0, 1 - normCdf((line - lambda) / sd)));
}

export const fairOdds = (p: number) => (p > 0.012 ? 1 / p : 99);
export const defaultLine = (lambda: number) => Math.max(0.5, Math.round(lambda) - 0.5);
