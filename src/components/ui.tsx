import type { Confidence, SourceRef } from "@/lib/types";

export function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold tracking-wide text-ink">{title}</h3>
        {hint && <span className="text-[11px] text-muted">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

export function ConfidencePill({ level }: { level: Confidence }) {
  const map = {
    high: "bg-accent/15 text-accent2 ring-accent/30",
    medium: "bg-warn/15 text-warn ring-warn/30",
    low: "bg-muted/15 text-muted ring-muted/30",
  } as const;
  const label = { high: "High", medium: "Medium", low: "Low" }[level];
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ${map[level]}`}>{label} confidence</span>;
}

export function Pct({ v, className = "" }: { v: number; className?: string }) {
  return <span className={`tabular mono ${className}`}>{(v * 100).toFixed(1)}%</span>;
}

export function ProbBar({ label, value, tone = "accent" }: { label: string; value: number; tone?: "accent" | "muted" }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-ink/85">{label}</span>
        <Pct v={value} className="text-ink/70" />
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-panel2">
        <div className={`h-full rounded-full ${tone === "accent" ? "bg-gradient-to-r from-accent to-accent2" : "bg-line"}`} style={{ width: `${Math.min(100, value * 100)}%` }} />
      </div>
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg bg-panel2 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className="tabular mono mt-0.5 text-lg font-semibold text-ink">{value}</div>
      {sub && <div className="text-[10px] text-muted">{sub}</div>}
    </div>
  );
}

export function SourceList({ sources }: { sources: SourceRef[] }) {
  if (!sources?.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {sources.map((s, i) => (
        <a key={i} href={s.url} target="_blank" rel="noopener noreferrer nofollow"
          className="rounded border border-line bg-panel2 px-2 py-0.5 text-[10px] text-muted hover:text-accent2 hover:border-accent/40">
          🔗 {s.label}
        </a>
      ))}
    </div>
  );
}

export function FormDots({ results }: { results: { result: "W" | "D" | "L" }[] }) {
  const c = { W: "bg-accent text-black", D: "bg-warn/80 text-black", L: "bg-danger/80 text-white" } as const;
  return (
    <div className="flex gap-1">
      {results.map((r, i) => (
        <span key={i} className={`grid h-5 w-5 place-items-center rounded text-[10px] font-bold ${c[r.result]}`}>{r.result}</span>
      ))}
    </div>
  );
}
