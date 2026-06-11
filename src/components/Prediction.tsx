import type { Prediction, Team, OverUnder } from "@/lib/types";
import { Section, ProbBar, Pct, ConfidencePill, SourceList } from "./ui";

export default function PredictionPanel({ pred, home, away }: { pred: Prediction; home: Team; away: Team }) {
  return (
    <div className="grid gap-4">
      {/* match result */}
      <Section title="Prediction — Match result" hint={`xG ${pred.expectedGoals.home} – ${pred.expectedGoals.away}`}>
        <div className="mb-3"><ConfidencePill level={pred.confidence} /></div>
        <div className="grid gap-3">
          <ProbBar label={`${home.flag} ${home.name} (Home)`} value={pred.oneXtwo.home} />
          <ProbBar label="Draw" value={pred.oneXtwo.draw} tone="muted" />
          <ProbBar label={`${away.flag} ${away.name} (Away)`} value={pred.oneXtwo.away} />
        </div>
      </Section>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* goals markets */}
        <Section title="Goals markets">
          <OUTable rows={pred.overUnder} />
          <div className="mt-3 flex items-center justify-between rounded-lg bg-panel2 px-3 py-2 text-sm">
            <span>Both teams to score</span>
            <span className="mono">Yes <b className="text-accent2"><Pct v={pred.btts.yes} /></b> · No <Pct v={pred.btts.no} /></span>
          </div>
        </Section>

        {/* most likely scorelines */}
        <Section title="Most likely scorelines">
          <div className="flex flex-wrap gap-2">
            {pred.scorelines.map((s) => (
              <div key={s.score} className="rounded-lg border border-line bg-panel2 px-3 py-2 text-center">
                <div className="mono text-lg font-semibold">{s.score}</div>
                <div className="text-[11px] text-muted"><Pct v={s.prob} /></div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* referee-driven markets */}
      <Section title="Cards, fouls & penalties (referee-adjusted)" hint={pred.refereeImpact ? `${pred.refereeImpact.referee}` : "no referee data"}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-2 text-xs text-muted">Total cards — expected <b className="mono text-ink">{pred.cards.expected}</b></div>
            <OUTable rows={pred.cards.lines} />
          </div>
          <div>
            <div className="mb-2 text-xs text-muted">Total fouls — expected <b className="mono text-ink">{pred.fouls.expected}</b></div>
            <OUTable rows={pred.fouls.lines} />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-lg bg-panel2 px-3 py-2 text-sm">
          <span>Penalty awarded</span>
          <span className="mono">Yes <b className="text-accent2"><Pct v={pred.penalty.yes} /></b> · No <Pct v={pred.penalty.no} /></span>
        </div>
        {pred.refereeImpact && (
          <div className="mt-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-muted sm:grid-cols-4">
              <span>Sample: <b className="text-ink">{pred.refereeImpact.sampleSize}</b></span>
              <span>Fouls/m: <b className="text-ink">{pred.refereeImpact.avgFouls.toFixed(1)}</b></span>
              <span>Yellows/m: <b className="text-ink">{pred.refereeImpact.avgYellow.toFixed(1)}</b></span>
              <span>Pens/m: <b className="text-ink">{pred.refereeImpact.penaltiesPerMatch.toFixed(2)}</b></span>
            </div>
            {pred.refereeImpact.notes.map((n, i) => (
              <p key={i} className="mt-1.5 text-xs text-ink/80">• {n}</p>
            ))}
            <div className="mt-2"><ConfidencePill level={pred.refereeImpact.confidence} /></div>
            <SourceList sources={pred.refereeImpact.sources} />
          </div>
        )}
      </Section>

      {/* reasoning */}
      <Section title="Key reasoning factors">
        <ul className="space-y-1.5 text-sm text-ink/85">
          {pred.factors.map((f, i) => (
            <li key={i} className="flex gap-2"><span className="text-accent2">›</span>{f}</li>
          ))}
        </ul>
        {pred.trendSummary && (
          <p className="mt-3 rounded-lg bg-panel2 px-3 py-2 text-xs text-muted"><b className="text-ink/80">Trend summary:</b> {pred.trendSummary}</p>
        )}
      </Section>
    </div>
  );
}

function OUTable({ rows }: { rows: OverUnder[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line text-sm">
      <div className="grid grid-cols-3 bg-panel2 px-3 py-1.5 text-[11px] font-semibold text-muted">
        <span>Line</span><span className="text-center">Over</span><span className="text-right">Under</span>
      </div>
      {rows.map((r) => (
        <div key={r.line} className="grid grid-cols-3 border-t border-line px-3 py-1.5">
          <span className="mono">{r.line}</span>
          <span className="mono text-center text-accent2"><Pct v={r.over} /></span>
          <span className="mono text-right text-ink/70"><Pct v={r.under} /></span>
        </div>
      ))}
    </div>
  );
}
