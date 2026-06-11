import type { Prediction, Team, OddsSelection } from "./types";

// Stoiximan odds intake.
//
// COMPLIANCE: We do NOT scrape Stoiximan match pages. Such pages are typically
// behind bot-protection / dynamic rendering and their Terms of Service restrict
// automated extraction. Bypassing those protections is out of scope.
//
// Flow:
//   - If the user pastes a Stoiximan URL, we recognise it but ask them to paste
//     the odds manually (or load the bundled sample) — we never auto-read it.
//   - Manual odds are validated with Zod (see types.ts) and fed to the value calc.
// To integrate a *licensed* odds feed/API, implement an adapter here that returns
// OddsSelection[] and respects that provider's terms.

export function isStoiximanUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return /(^|\.)stoiximan\.gr$/i.test(u.hostname);
  } catch {
    return false;
  }
}

export const STOIXIMAN_NOTICE =
  "Direct reading of Stoiximan pages is not supported (their Terms restrict automated access and the page is bot-protected). " +
  "Paste the odds manually below, or load the sample odds, and we'll find the value for you.";

// Build illustrative "bookmaker" odds from the model's own probabilities, then
// nudge a few markets (home win, under 2.5, penalty yes) to be slightly generous
// so the value finder surfaces realistic 3–6% edges for the demo. Replace with a
// licensed odds feed in production.
export function sampleOddsFromPrediction(pred: Prediction, home: Team, away: Team): OddsSelection[] {
  const od = (p: number, skew = 1) => Math.round(Math.max(1.08, (1 / Math.min(0.97, Math.max(0.03, p))) * skew) * 100) / 100;
  const ou = pred.overUnder.find((l) => l.line === 2.5) ?? pred.overUnder[0];
  const cards = pred.cards.lines.find((l) => l.line === 4.5) ?? pred.cards.lines[0];
  return [
    { market: "Match Result", selection: home.name, decimalOdds: od(pred.oneXtwo.home, 1.06) }, // generous → value
    { market: "Match Result", selection: "Draw", decimalOdds: od(pred.oneXtwo.draw, 0.94) },
    { market: "Match Result", selection: away.name, decimalOdds: od(pred.oneXtwo.away, 0.96) },
    { market: "Over/Under 2.5", selection: "Over 2.5", decimalOdds: od(ou.over, 0.96) },
    { market: "Over/Under 2.5", selection: "Under 2.5", decimalOdds: od(ou.under, 1.06) }, // generous → value
    { market: "Both Teams To Score", selection: "Yes", decimalOdds: od(pred.btts.yes, 0.97) },
    { market: "Both Teams To Score", selection: "No", decimalOdds: od(pred.btts.no, 1.03) },
    { market: "Total Cards", selection: "Over 4.5", decimalOdds: od(cards.over, 0.97) },
    { market: "Total Cards", selection: "Under 4.5", decimalOdds: od(cards.under, 1.04) },
    { market: "Penalty Awarded", selection: "Yes", decimalOdds: od(pred.penalty.yes, 1.08) }, // generous → value
  ];
}
