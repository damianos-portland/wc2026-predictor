import type { MatchAnalytics, TeamStats } from "@/lib/types";
import { Section, Stat, SourceList, FormDots } from "./ui";

export default function Analytics({ a }: { a: MatchAnalytics }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <FormCard a={a} />
      <StatsCard a={a} />
      <RefereeCard a={a} />
      <H2HCard a={a} />
      <InjuriesCard a={a} />
      <LineupsCard a={a} />
      <TrendsCard a={a} />
      <ExpertsCard a={a} />
    </div>
  );
}

function FormCard({ a }: { a: MatchAnalytics }) {
  return (
    <Section title="Recent form" hint={`last ${a.homeForm.results.length}`}>
      {[{ t: a.home, f: a.homeForm }, { t: a.away, f: a.awayForm }].map(({ t, f }) => (
        <div key={t.id} className="mb-3 flex items-center justify-between gap-3 last:mb-0">
          <span className="flex items-center gap-2 text-sm"><span className="text-lg">{t.flag}</span>{t.name}</span>
          <FormDots results={f.results} />
        </div>
      ))}
      <SourceList sources={a.homeForm.sources} />
    </Section>
  );
}

const ROWS: { key: keyof TeamStats; label: string; better: "high" | "low"; fmt?: (n: number) => string }[] = [
  { key: "goalsFor", label: "Goals for /g", better: "high" },
  { key: "goalsAgainst", label: "Goals against /g", better: "low" },
  { key: "xgFor", label: "xG for /g", better: "high" },
  { key: "xgAgainst", label: "xG against /g", better: "low" },
  { key: "cleanSheetPct", label: "Clean sheets", better: "high", fmt: (n) => `${Math.round(n * 100)}%` },
  { key: "possession", label: "Possession", better: "high", fmt: (n) => `${n}%` },
  { key: "shots", label: "Shots /g", better: "high" },
  { key: "shotsOnTarget", label: "On target /g", better: "high" },
  { key: "corners", label: "Corners /g", better: "high" },
  { key: "fouls", label: "Fouls /g", better: "low" },
  { key: "cardsFor", label: "Cards /g", better: "low" },
  { key: "offsides", label: "Offsides /g", better: "low" },
  { key: "passes", label: "Passes /g", better: "high", fmt: (n) => `${Math.round(n)}` },
];

function StatsCard({ a }: { a: MatchAnalytics }) {
  return (
    <Section title="Statistical indicators" hint="per game">
      <div className="overflow-hidden rounded-lg border border-line">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center bg-panel2 px-3 py-2 text-xs font-semibold">
          <span className="text-left">{a.home.flag} {a.home.code}</span>
          <span className="text-muted">metric</span>
          <span className="text-right">{a.away.code} {a.away.flag}</span>
        </div>
        {ROWS.map((r) => {
          const h = a.homeStats[r.key] as number | undefined;
          const v = a.awayStats[r.key] as number | undefined;
          if (h == null || v == null) return null;
          const hb = r.better === "high" ? h >= v : h <= v;
          const f = r.fmt ?? ((n: number) => n.toFixed(1));
          return (
            <div key={r.key} className="grid grid-cols-[1fr_auto_1fr] items-center border-t border-line px-3 py-1.5 text-sm">
              <span className={`tabular mono text-left ${hb ? "text-accent2" : "text-ink/70"}`}>{f(h)}</span>
              <span className="px-2 text-center text-[11px] text-muted">{r.label}</span>
              <span className={`tabular mono text-right ${!hb ? "text-accent2" : "text-ink/70"}`}>{f(v)}</span>
            </div>
          );
        })}
      </div>
      <SourceList sources={[...a.homeStats.sources, ...a.awayStats.sources].slice(0, 3)} />
    </Section>
  );
}

function RefereeCard({ a }: { a: MatchAnalytics }) {
  const r = a.referee;
  if (!r) return (
    <Section title="Referee">
      <p className="text-sm text-muted">Referee not yet confirmed for this match.</p>
    </Section>
  );
  return (
    <Section title="Referee analytics" hint={`sample: ${r.matchesSample} matches`}>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">🧑‍⚖️ {r.name} <span className="text-xs font-normal text-muted">· {r.country}</span></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Fouls /m" value={r.avgFouls.toFixed(1)} />
        <Stat label="Yellows /m" value={r.avgYellow.toFixed(1)} />
        <Stat label="Reds /m" value={r.avgRed.toFixed(2)} />
        <Stat label="Pens /m" value={r.penaltiesPerMatch.toFixed(2)} />
      </div>
      {r.byCompetition && (
        <div className="mt-3 text-[11px] text-muted">
          By competition: {r.byCompetition.map((c) => `${c.competition} ${c.avgYellow.toFixed(1)}Y (${c.matches})`).join(" · ")}
        </div>
      )}
      <SourceList sources={r.sources} />
    </Section>
  );
}

function H2HCard({ a }: { a: MatchAnalytics }) {
  if (a.h2h.matches.length === 0) {
    return (
      <Section title="Head-to-head">
        <p className="text-sm text-muted">No prior-meeting data loaded — connect a live H2H source to populate this.</p>
        <SourceList sources={a.h2h.sources} />
      </Section>
    );
  }
  return (
    <Section title="Head-to-head" hint={`${a.h2h.homeWins}–${a.h2h.draws}–${a.h2h.awayWins}`}>
      <ul className="space-y-1.5 text-sm">
        {a.h2h.matches.map((m, i) => (
          <li key={i} className="flex items-center justify-between border-b border-line/60 pb-1.5 last:border-0">
            <span className="text-muted">{m.date}</span>
            <span>{m.home} <b className="mono">{m.score}</b> {m.away}</span>
          </li>
        ))}
      </ul>
      <SourceList sources={a.h2h.sources} />
    </Section>
  );
}

function InjuriesCard({ a }: { a: MatchAnalytics }) {
  const tag = { out: "text-danger", doubtful: "text-warn", suspended: "text-danger" } as const;
  return (
    <Section title="Injuries & suspensions">
      {a.injuries.length === 0 ? (
        <p className="text-sm text-muted">No reported absences.</p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {a.injuries.map((i, k) => (
            <li key={k} className="flex items-center justify-between">
              <span>{i.player} <span className="text-xs text-muted">({i.teamId.toUpperCase()})</span></span>
              <span className={`text-xs font-semibold uppercase ${tag[i.status]}`}>{i.status}{i.reason && i.reason !== "—" ? ` · ${i.reason}` : ""}</span>
            </li>
          ))}
        </ul>
      )}
      <SourceList sources={a.injuries[0]?.sources ?? []} />
    </Section>
  );
}

function LineupsCard({ a }: { a: MatchAnalytics }) {
  if (a.lineups.length === 0) {
    return (
      <Section title="Expected lineups">
        <p className="text-sm text-muted">Predicted XIs appear here once a team-news source is connected (typically ~1h before kickoff).</p>
      </Section>
    );
  }
  return (
    <Section title="Expected lineups">
      <div className="grid gap-3 sm:grid-cols-2">
        {a.lineups.map((l) => {
          const team = l.teamId === a.home.id ? a.home : a.away;
          return (
            <div key={l.teamId}>
              <div className="mb-1 text-sm font-semibold">{team.flag} {team.name} <span className="text-xs text-muted">{l.formation}</span></div>
              <div className="text-[11px] leading-relaxed text-muted">{l.players.join(" · ")}</div>
            </div>
          );
        })}
      </div>
      <SourceList sources={a.lineups[0]?.sources ?? []} />
    </Section>
  );
}

function TrendsCard({ a }: { a: MatchAnalytics }) {
  return (
    <Section title="Betting market trends">
      <ul className="space-y-2 text-sm">
        {a.trends.map((t, i) => (
          <li key={i}><b className="text-accent2">{t.market}:</b> <span className="text-ink/80">{t.note}</span></li>
        ))}
      </ul>
      <SourceList sources={a.trends[0]?.sources ?? []} />
    </Section>
  );
}

function ExpertsCard({ a }: { a: MatchAnalytics }) {
  if (a.experts.length === 0) {
    return (
      <Section title="Expert predictions">
        <p className="text-sm text-muted">Expert picks from public outlets appear here once that adapter is connected.</p>
      </Section>
    );
  }
  return (
    <Section title="Expert predictions">
      <ul className="space-y-2 text-sm">
        {a.experts.map((e, i) => (
          <li key={i} className="flex flex-col">
            <span><b>{e.outlet}</b> — pick: <span className="text-accent2">{e.pick}</span></span>
            <span className="text-xs text-muted">{e.note}</span>
            <SourceList sources={e.sources} />
          </li>
        ))}
      </ul>
    </Section>
  );
}
