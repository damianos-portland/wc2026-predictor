import { listMatches } from "@/lib/mock";
import MatchBrowser from "@/components/MatchBrowser";

export default function Home() {
  const matches = listMatches();
  return (
    <main className="mx-auto max-w-7xl px-4 lg:px-6">
      {/* hero */}
      <section className="pt-12 pb-8 lg:pt-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-[11px] text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> FIFA World Cup · public-data analytics
        </div>
        <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
          World Cup <span className="grad">Prediction Analytics</span> & Value-Bet Finder
        </h1>
        <p className="mt-4 max-w-2xl text-muted">
          Pick a match, get a data-driven prediction (winner, goals, BTTS, cards, fouls, penalties) built from public sources,
          then paste bookmaker odds to spot where the price beats the model — with the edge and expected value shown for every pick.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ["1 · Select a match", "Filter by team, date, group or round."],
            ["2 · Read the analytics", "Form, H2H, injuries, lineups, ratings, referee — each with sources."],
            ["3 · Find value", "Paste Stoiximan odds (or use manual / sample) → implied vs model, edge & EV."],
          ].map(([t, d]) => (
            <div key={t} className="card p-4">
              <div className="text-sm font-semibold text-accent2">{t}</div>
              <div className="mt-1 text-xs text-muted">{d}</div>
            </div>
          ))}
        </div>
      </section>

      <MatchBrowser matches={matches} />
    </main>
  );
}
