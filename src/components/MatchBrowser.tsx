"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Team } from "@/lib/types";

export interface MatchListItem {
  id: string;
  stage: string;
  group?: string;
  kickoff: string;
  venue: string;
  home: Team;
  away: Team;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function MatchBrowser({ matches }: { matches: MatchListItem[] }) {
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("all");

  const stages = useMemo(() => ["all", ...Array.from(new Set(matches.map((m) => m.stage)))], [matches]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return matches
      .filter((m) => (stage === "all" ? true : m.stage === stage))
      .filter((m) => !query || [m.home.name, m.away.name, m.venue].some((s) => s.toLowerCase().includes(query)))
      .sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff));
  }, [matches, q, stage]);

  return (
    <section id="matches" className="pb-16">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Select a match</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search team or venue…"
            className="rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-accent/50 sm:w-64"
          />
          <select value={stage} onChange={(e) => setStage(e.target.value)} className="rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-accent/50">
            {stages.map((s) => (
              <option key={s} value={s}>{s === "all" ? "All stages" : s}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card grid place-items-center p-12 text-center text-sm text-muted">
          No matches found. Try a different team, venue or stage.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((m) => (
            <Link key={m.id} href={`/match/${m.id}`} className="card group p-5 transition-colors hover:border-accent/40">
              <div className="flex items-center justify-between text-[11px] text-muted">
                <span className="rounded bg-panel2 px-2 py-0.5">{m.stage}</span>
                <span>{fmtDate(m.kickoff)}</span>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <TeamSide team={m.home} />
                <span className="px-2 text-xs text-muted">vs</span>
                <TeamSide team={m.away} right />
              </div>
              <div className="mt-4 truncate text-[11px] text-muted">📍 {m.venue}</div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[11px] text-muted">FIFA #{m.home.fifaRank} · #{m.away.fifaRank}</span>
                <span className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-black transition-transform group-hover:translate-x-0.5">
                  Analyze Match →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function TeamSide({ team, right = false }: { team: Team; right?: boolean }) {
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-2 ${right ? "flex-row-reverse text-right" : ""}`}>
      <span className="text-2xl">{team.flag}</span>
      <span className="truncate text-sm font-semibold">{team.name}</span>
    </div>
  );
}
