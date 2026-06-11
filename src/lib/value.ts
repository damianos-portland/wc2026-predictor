import type { MatchAnalytics, Prediction, OddsSelection, ValueBet, Confidence, SourceRef } from "./types";

// local poisson over/under (keeps value calc independent of engine internals)
function fact(n: number) { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }
function pois(k: number, l: number) { return (Math.exp(-l) * Math.pow(l, k)) / fact(k); }
function poissonOU(lambda: number, line: number): { over: number; under: number } {
  let under = 0;
  for (let k = 0; k <= Math.floor(line); k++) under += pois(k, lambda);
  under = Math.min(1, Math.max(0, under));
  return { over: 1 - under, under };
}

export const impliedProb = (decimalOdds: number) => 1 / decimalOdds;
const round = (x: number) => Math.round(x * 1000) / 1000;

function parseOU(selection: string): { side: "over" | "under"; line: number } | null {
  const m = selection.match(/(over|under)\s*([\d]+(?:\.\d+)?)/i);
  if (!m) return null;
  return { side: m[1].toLowerCase() as "over" | "under", line: parseFloat(m[2]) };
}

function sourcesFor(kind: "match" | "goals" | "referee", a: MatchAnalytics): SourceRef[] {
  const stat = [a.homeStats.sources[0], a.awayStats.sources[0]].filter(Boolean);
  if (kind === "referee") return [...(a.referee?.sources ?? []), ...stat].slice(0, 4);
  const form = [a.homeForm.sources[0], a.awayForm.sources[0]].filter(Boolean);
  const trend = a.trends[0]?.sources ?? [];
  return [...stat, ...form, ...trend].slice(0, 4);
}

/** Map a bookmaker selection to a model probability (or null if not modelled). */
function modelProbFor(
  pred: Prediction,
  a: MatchAnalytics,
  market: string,
  selection: string
): { prob: number; confidence: Confidence; explanation: string; sources: SourceRef[] } | null {
  const M = market.toLowerCase();
  const S = selection.toLowerCase().trim();

  // 1X2 / Match Result
  if (M.includes("result") || M.includes("1x2") || M.includes("winner")) {
    let prob: number | null = null;
    if (S === a.home.name.toLowerCase() || S === "home" || S === "1") prob = pred.oneXtwo.home;
    else if (S === a.away.name.toLowerCase() || S === "away" || S === "2") prob = pred.oneXtwo.away;
    else if (S === "draw" || S === "x" || S === "tie") prob = pred.oneXtwo.draw;
    if (prob == null) return null;
    return { prob, confidence: pred.confidence, explanation: "1X2 from the expected-goals model (form, ratings, injuries).", sources: sourcesFor("match", a) };
  }

  // Over/Under goals
  if ((M.includes("over") || M.includes("under") || M.includes("total goals") || M.includes("goals")) && !M.includes("card") && !M.includes("foul")) {
    const ou = parseOU(selection);
    if (!ou) return null;
    const p = poissonOU(pred.expectedGoals.home + pred.expectedGoals.away, ou.line);
    return { prob: round(ou.side === "over" ? p.over : p.under), confidence: pred.confidence, explanation: `Total-goals Poisson on xG ${pred.expectedGoals.home}+${pred.expectedGoals.away}.`, sources: sourcesFor("goals", a) };
  }

  // BTTS
  if (M.includes("both teams") || M.includes("btts")) {
    if (S.startsWith("y")) return { prob: pred.btts.yes, confidence: pred.confidence, explanation: "BTTS from independent-Poisson scoring model.", sources: sourcesFor("goals", a) };
    if (S.startsWith("n")) return { prob: pred.btts.no, confidence: pred.confidence, explanation: "BTTS from independent-Poisson scoring model.", sources: sourcesFor("goals", a) };
    return null;
  }

  // Total Cards (referee-driven)
  if (M.includes("card")) {
    const ou = parseOU(selection);
    if (!ou) return null;
    const p = poissonOU(pred.cards.expected, ou.line);
    const conf = pred.refereeImpact?.confidence ?? "low";
    return { prob: round(ou.side === "over" ? p.over : p.under), confidence: conf, explanation: `Cards model: expected ${pred.cards.expected} (referee tendency + team discipline).`, sources: sourcesFor("referee", a) };
  }

  // Total Fouls (referee-driven)
  if (M.includes("foul")) {
    const ou = parseOU(selection);
    if (!ou) return null;
    const p = poissonOU(pred.fouls.expected, ou.line);
    const conf = pred.refereeImpact?.confidence ?? "low";
    return { prob: round(ou.side === "over" ? p.over : p.under), confidence: conf, explanation: `Fouls model: expected ${pred.fouls.expected} (referee whistle rate + team fouls).`, sources: sourcesFor("referee", a) };
  }

  // Penalty awarded
  if (M.includes("penalty")) {
    const conf = pred.refereeImpact?.confidence ?? "low";
    if (S.startsWith("y")) return { prob: pred.penalty.yes, confidence: conf, explanation: `Penalty model from referee rate (${pred.refereeImpact?.penaltiesPerMatch ?? 0.25}/match).`, sources: sourcesFor("referee", a) };
    if (S.startsWith("n")) return { prob: pred.penalty.no, confidence: conf, explanation: "Penalty model from referee rate.", sources: sourcesFor("referee", a) };
    return null;
  }

  // Correct score
  if (M.includes("correct score") || M.includes("score")) {
    const m = selection.match(/(\d+)\s*[-:]\s*(\d+)/);
    if (!m) return null;
    const i = +m[1], j = +m[2];
    const p = pois(i, pred.expectedGoals.home) * pois(j, pred.expectedGoals.away);
    return { prob: round(p), confidence: "low", explanation: "Exact-score probability from the Poisson grid (inherently low confidence).", sources: sourcesFor("goals", a) };
  }

  return null;
}

export function detectValueBets(
  pred: Prediction,
  a: MatchAnalytics,
  odds: OddsSelection[],
  edgeThreshold: number
): { valueBets: ValueBet[]; evaluated: number } {
  const valueBets: ValueBet[] = [];
  let evaluated = 0;
  for (const o of odds) {
    const m = modelProbFor(pred, a, o.market, o.selection);
    if (!m) continue;
    evaluated++;
    const implied = impliedProb(o.decimalOdds);
    const edge = m.prob - implied;
    const ev = m.prob * o.decimalOdds - 1;
    // value gates: model beats the price, edge over threshold, confidence not low
    if (m.prob > implied && edge >= edgeThreshold && m.confidence !== "low") {
      valueBets.push({
        market: o.market,
        selection: o.selection,
        decimalOdds: o.decimalOdds,
        impliedProb: round(implied),
        modelProb: round(m.prob),
        edge: round(edge),
        ev: round(ev),
        confidence: m.confidence,
        explanation: m.explanation,
        sources: m.sources,
      });
    }
  }
  valueBets.sort((x, y) => y.ev - x.ev);
  return { valueBets, evaluated };
}
