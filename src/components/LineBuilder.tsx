"use client";

import { useMemo, useState } from "react";
import type { Team } from "@/lib/types";
import { type MarketSpec, type MarketScope, lambdaFor, probOver, fairOdds, defaultLine } from "@/lib/markets";
import { Section, ConfidencePill } from "./ui";

export default function LineBuilder({ models, home, away }: { models: MarketSpec[]; home: Team; away: Team }) {
  const [key, setKey] = useState(models[0].key);
  const [scope, setScope] = useState<MarketScope>("match");
  const spec = useMemo(() => models.find((m) => m.key === key) ?? models[0], [models, key]);
  const lambda = lambdaFor(spec, scope);
  const [line, setLine] = useState(defaultLine(lambda));

  const selectMarket = (k: string) => { const s = models.find((m) => m.key === k)!; setKey(k); setLine(defaultLine(lambdaFor(s, scope))); };
  const selectScope = (sc: MarketScope) => { setScope(sc); setLine(defaultLine(lambdaFor(spec, sc))); };

  const pOver = probOver(spec, lambda, line);
  const pUnder = 1 - pOver;
  const ladder = Array.from({ length: 9 }, (_, i) => +(defaultLine(lambda) + (i - 4) * spec.step).toFixed(2)).filter((l) => l > 0);

  const scopeLabel = scope === "home" ? home.name : scope === "away" ? away.name : "Match total";

  return (
    <div className="grid gap-4">
      <Section title="Build a line" hint="model prices it instantly">
        {/* market picker */}
        <div className="mb-4 flex flex-wrap gap-2">
          {models.map((m) => (
            <button key={m.key} onClick={() => selectMarket(m.key)} data-cursor
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${m.key === key ? "bg-accent text-black" : "bg-panel2 text-muted ring-1 ring-line hover:text-ink"}`}>
              {m.label}
            </button>
          ))}
        </div>

        {/* scope */}
        <div className="mb-4 inline-flex rounded-lg bg-panel2 p-1 text-xs">
          {([["match", "Match total"], ["home", home.name], ["away", away.name]] as [MarketScope, string][]).map(([sc, lbl]) => (
            <button key={sc} onClick={() => selectScope(sc)} className={`rounded-md px-3 py-1.5 transition-colors ${scope === sc ? "bg-accent text-black font-semibold" : "text-muted hover:text-ink"}`}>
              {lbl}
            </button>
          ))}
        </div>

        {/* line stepper */}
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted">{spec.label} line · {scopeLabel}</label>
            <div className="inline-flex items-center gap-1">
              <button onClick={() => setLine((l) => Math.max(0.5, +(l - spec.step).toFixed(2)))} className="grid h-9 w-9 place-items-center rounded-md bg-panel2 text-lg ring-1 ring-line hover:ring-accent/40">−</button>
              <input type="number" step={spec.step} value={line}
                onChange={(e) => setLine(Number(e.target.value))}
                className="tabular mono w-28 rounded-md border border-line bg-bg px-3 py-1.5 text-center text-lg font-semibold outline-none focus:border-accent/50" />
              <button onClick={() => setLine((l) => +(l + spec.step).toFixed(2))} className="grid h-9 w-9 place-items-center rounded-md bg-panel2 text-lg ring-1 ring-line hover:ring-accent/40">+</button>
            </div>
          </div>
          <div className="rounded-lg bg-panel2 px-4 py-2">
            <div className="text-[10px] uppercase tracking-wide text-muted">Model expects</div>
            <div className="tabular mono text-lg font-semibold text-ink">{lambda.toFixed(1)} {spec.unit}</div>
          </div>
        </div>

        {/* over / under result */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <ResultCard side="Over" line={line} prob={pOver} />
          <ResultCard side="Under" line={line} prob={pUnder} />
        </div>
      </Section>

      {/* ladder of nearby lines */}
      <Section title={`${spec.label} ladder`} hint={scopeLabel}>
        <div className="overflow-hidden rounded-lg border border-line text-sm">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] bg-panel2 px-3 py-1.5 text-[11px] font-semibold text-muted">
            <span>Line</span><span className="text-center">Over</span><span className="text-center">fair</span><span className="text-center">Under</span><span className="text-center">fair</span>
          </div>
          {ladder.map((l) => {
            const o = probOver(spec, lambda, l);
            const cur = Math.abs(l - line) < 1e-6;
            return (
              <button key={l} onClick={() => setLine(l)} className={`grid w-full grid-cols-[1fr_1fr_1fr_1fr_1fr] items-center border-t border-line px-3 py-1.5 text-left hover:bg-panel2/60 ${cur ? "bg-accent/10" : ""}`}>
                <span className="tabular mono font-medium">{l}</span>
                <span className="tabular mono text-center text-accent2">{(o * 100).toFixed(0)}%</span>
                <span className="tabular mono text-center text-muted">{fairOdds(o).toFixed(2)}</span>
                <span className="tabular mono text-center text-ink/80">{((1 - o) * 100).toFixed(0)}%</span>
                <span className="tabular mono text-center text-muted">{fairOdds(1 - o).toFixed(2)}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <ConfidencePill level={spec.dist === "poisson" ? "medium" : "low"} />
          <span className="text-[11px] text-muted">Compare “fair” to the bookmaker price — a longer price than fair is potential value.</span>
        </div>
      </Section>
    </div>
  );
}

function ResultCard({ side, line, prob }: { side: string; line: number; prob: number }) {
  return (
    <div className="rounded-lg border border-line bg-panel2 p-4 text-center">
      <div className="text-xs text-muted">{side} {line}</div>
      <div className="tabular mono mt-1 text-3xl font-bold text-accent2">{(prob * 100).toFixed(1)}%</div>
      <div className="text-[11px] text-muted">fair odds <b className="mono text-ink/80">{fairOdds(prob).toFixed(2)}</b></div>
    </div>
  );
}
