import type { MatchAnalytics, Prediction, Confidence, OverUnder, RefereeImpact } from "./types";

// ── Poisson helpers ─────────────────────────────────────────────────────────
function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}
function pois(k: number, lambda: number): number {
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}
/** P(over line) / P(under line) for a Poisson(lambda) count vs a .5 line */
function overUnder(lambda: number, line: number): OverUnder {
  const threshold = Math.floor(line); // line is x.5
  let under = 0;
  for (let k = 0; k <= threshold; k++) under += pois(k, lambda);
  under = Math.min(1, Math.max(0, under));
  return { line, over: round(1 - under), under: round(under) };
}
const round = (x: number) => Math.round(x * 1000) / 1000;
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const blend = (g: number, xg?: number) => (xg != null ? 0.5 * g + 0.5 * xg : g);

const AVG_GOALS = 1.35; // baseline goals per team per game
const HOST_ADV = 1.10; // host-crowd advantage — applies ONLY to host nations at home
// The 3 hosts are the only teams playing real home games; every other WC match is
// at a neutral venue, where "home/away" is just the fixture's listing order.
export const HOSTS = new Set(["usa", "mex", "can"]);
export const isHost = (teamId: string) => HOSTS.has(teamId);

// ── expected goals from team strength, ratings, form, injuries ───────────────
function expectedGoals(a: MatchAnalytics) {
  const hs = a.homeStats;
  const as = a.awayStats;
  const atkH = blend(hs.goalsFor, hs.xgFor) / AVG_GOALS;
  const defH = blend(hs.goalsAgainst, hs.xgAgainst) / AVG_GOALS;
  const atkA = blend(as.goalsFor, as.xgFor) / AVG_GOALS;
  const defA = blend(as.goalsAgainst, as.xgAgainst) / AVG_GOALS;

  const eloMult = clamp(1 + (a.home.elo - a.away.elo) / 3000, 0.78, 1.22);
  const formH = formFactor(a, a.match.homeId);
  const formA = formFactor(a, a.match.awayId);
  const injH = injuryFactor(a, a.match.homeId);
  const injA = injuryFactor(a, a.match.awayId);
  // home advantage only when a host plays at home — neutral otherwise
  const advH = isHost(a.match.homeId) ? HOST_ADV : 1;
  const advA = isHost(a.match.awayId) ? HOST_ADV : 1;

  let lh = AVG_GOALS * atkH * defA * advH * eloMult * formH * injH;
  let la = AVG_GOALS * atkA * defH * advA * (1 / eloMult) * formA * injA;
  lh = clamp(lh, 0.2, 4.5);
  la = clamp(la, 0.2, 4.5);
  return { home: round(lh), away: round(la) };
}

function formFactor(a: MatchAnalytics, teamId: string): number {
  const f = teamId === a.match.homeId ? a.homeForm : a.awayForm;
  const pts = f.results.reduce((s, r) => s + (r.result === "W" ? 3 : r.result === "D" ? 1 : 0), 0);
  const pct = pts / (3 * Math.max(1, f.results.length));
  return 0.85 + 0.3 * pct; // 0.85 .. 1.15
}
function injuryFactor(a: MatchAnalytics, teamId: string): number {
  const n = a.injuries.filter((i) => i.teamId === teamId && (i.status === "out" || i.status === "suspended")).length;
  return clamp(1 - 0.035 * n, 0.88, 1); // each key absence trims attacking output a touch
}

// ── score matrix → markets ──────────────────────────────────────────────────
function markets(lh: number, la: number, maxGoals = 8) {
  let home = 0,
    draw = 0,
    away = 0,
    btts = 0;
  const scoreProbs: { score: string; prob: number }[] = [];
  for (let i = 0; i <= maxGoals; i++) {
    for (let j = 0; j <= maxGoals; j++) {
      const p = pois(i, lh) * pois(j, la);
      if (i > j) home += p;
      else if (i === j) draw += p;
      else away += p;
      if (i >= 1 && j >= 1) btts += p;
      scoreProbs.push({ score: `${i}-${j}`, prob: p });
    }
  }
  const norm = home + draw + away;
  const scorelines = scoreProbs.sort((x, y) => y.prob - x.prob).slice(0, 5).map((s) => ({ score: s.score, prob: round(s.prob) }));
  const totals = (line: number) => overUnder(lh + la, line);
  return {
    oneXtwo: { home: round(home / norm), draw: round(draw / norm), away: round(away / norm) },
    overUnder: [totals(1.5), totals(2.5), totals(3.5)],
    btts: { yes: round(btts), no: round(1 - btts) },
    scorelines,
  };
}

// ── referee-driven markets (cards / fouls / penalty) ─────────────────────────
function refereeMarkets(a: MatchAnalytics): { cards: Prediction["cards"]; fouls: Prediction["fouls"]; penalty: Prediction["penalty"]; impact: RefereeImpact | null } {
  const ref = a.referee;
  const refY = ref?.avgYellow ?? 4.0;
  const refR = ref?.avgRed ?? 0.2;
  const refFouls = ref?.avgFouls ?? 24;
  const refPen = ref?.penaltiesPerMatch ?? 0.25;
  const teamCards = a.homeStats.cardsFor + a.awayStats.cardsFor; // both sides, per game
  const teamFouls = a.homeStats.fouls + a.awayStats.fouls;

  const expCards = round(0.55 * refY + 0.45 * teamCards + refR);
  const expFouls = round(0.6 * refFouls + 0.4 * teamFouls);
  const penYes = round(1 - Math.exp(-refPen));

  const cards = { expected: expCards, lines: [overUnder(expCards, 3.5), overUnder(expCards, 4.5), overUnder(expCards, 5.5)] };
  const fouls = { expected: expFouls, lines: [overUnder(expFouls, 21.5), overUnder(expFouls, 24.5)] };
  const penalty = { yes: penYes, no: round(1 - penYes) };

  // No referee appointed yet → provisional tournament-average profile (clearly labelled)
  if (!ref) {
    const impact: RefereeImpact = {
      referee: "Referee TBA — tournament average",
      sampleSize: 0,
      avgFouls: refFouls,
      avgYellow: refY,
      avgRed: refR,
      penaltiesPerMatch: refPen,
      notes: ["No official appointed yet — using tournament-average tendencies. Re-check closer to kickoff for the real referee."],
      confidence: "low",
      sources: [],
    };
    return { cards, fouls, penalty, impact };
  }

  const notes: string[] = [];
  if (ref.avgYellow >= 5) notes.push(`High card referee (${ref.avgYellow.toFixed(1)} yellows/match) → leans card overs.`);
  else if (ref.avgYellow <= 3.8) notes.push(`Lenient referee (${ref.avgYellow.toFixed(1)} yellows/match) → leans card unders.`);
  if (ref.avgFouls >= 27) notes.push(`Whistles often (${ref.avgFouls.toFixed(1)} fouls/match) → supports foul overs.`);
  if (ref.penaltiesPerMatch >= 0.4) notes.push(`Awards penalties frequently (${ref.penaltiesPerMatch.toFixed(2)}/match) → supports "penalty: yes".`);
  const refConf: Confidence = ref.matchesSample >= 35 ? "high" : ref.matchesSample >= 18 ? "medium" : "low";

  const impact: RefereeImpact = {
    referee: ref.name,
    sampleSize: ref.matchesSample,
    avgFouls: ref.avgFouls,
    avgYellow: ref.avgYellow,
    avgRed: ref.avgRed,
    penaltiesPerMatch: ref.penaltiesPerMatch,
    notes,
    confidence: refConf,
    sources: ref.sources,
  };
  return { cards, fouls, penalty, impact };
}

// ── confidence & reasoning ──────────────────────────────────────────────────
function overallConfidence(a: MatchAnalytics, oneXtwo: { home: number; draw: number; away: number }): Confidence {
  let score = 0;
  if (a.injuries.length) score++;
  if (a.lineups.length) score++;
  if (a.h2h.matches.length) score++;
  if (a.referee) score++;
  if (a.homeStats.xgFor != null) score++;
  const margin = Math.max(oneXtwo.home, oneXtwo.draw, oneXtwo.away) - Math.min(oneXtwo.home, oneXtwo.away);
  if (margin > 0.22) score++;
  return score >= 5 ? "high" : score >= 3 ? "medium" : "low";
}

function reasoning(a: MatchAnalytics, eg: { home: number; away: number }): string[] {
  const f: string[] = [];
  const eloGap = a.home.elo - a.away.elo;
  if (Math.abs(eloGap) > 40) f.push(`${eloGap > 0 ? a.home.name : a.away.name} are the stronger side by rating (Elo gap ${Math.abs(eloGap)}).`);
  f.push(`Expected goals model: ${a.home.name} ${eg.home} – ${eg.away} ${a.away.name}.`);
  const host = isHost(a.match.homeId) ? a.home.name : isHost(a.match.awayId) ? a.away.name : null;
  f.push(host ? `${host} carry home advantage as a tournament host.` : `Neutral venue — no home advantage applied (only USA, Mexico & Canada play at home).`);
  const ph = a.homeForm.results.filter((r) => r.result === "W").length;
  const pa = a.awayForm.results.filter((r) => r.result === "W").length;
  f.push(`Recent form (last ${a.homeForm.results.length}): ${a.home.name} ${ph} wins · ${a.away.name} ${pa} wins.`);
  if (a.injuries.length) f.push(`Absences: ${a.injuries.map((i) => `${i.player} (${i.status})`).join(", ")}.`);
  if (a.h2h.matches.length) f.push(`H2H: ${a.h2h.homeWins}–${a.h2h.draws}–${a.h2h.awayWins} (home–draw–away) in recent meetings.`);
  if (a.homeStats.cleanSheetPct >= 0.5 || a.awayStats.cleanSheetPct >= 0.5) f.push(`Defensive solidity present — tempers Over/BTTS slightly.`);
  return f;
}

function trendSummary(a: MatchAnalytics): string {
  const t = a.trends.map((x) => x.note).join(" ");
  const e = a.experts.map((x) => `${x.outlet}: ${x.pick}`).join(" · ");
  return [t, e].filter(Boolean).join(" — ");
}

// ── public entry ────────────────────────────────────────────────────────────
export function predict(a: MatchAnalytics): Prediction {
  const eg = expectedGoals(a);
  const m = markets(eg.home, eg.away);
  const ref = refereeMarkets(a);
  return {
    matchId: a.match.id,
    expectedGoals: eg,
    oneXtwo: m.oneXtwo,
    overUnder: m.overUnder,
    btts: m.btts,
    scorelines: m.scorelines,
    cards: ref.cards,
    fouls: ref.fouls,
    penalty: ref.penalty,
    confidence: overallConfidence(a, m.oneXtwo),
    factors: reasoning(a, eg),
    refereeImpact: ref.impact,
    trendSummary: trendSummary(a),
  };
}
