"use client";

import { useState } from "react";
import type { AnalyzeResponse, OddsSelection } from "@/lib/types";
import { Section, Pct, ConfidencePill, SourceList } from "./ui";

export default function OddsAnalyzer({ matchId, sampleOdds }: { matchId: string; sampleOdds: OddsSelection[] }) {
  const [url, setUrl] = useState("");
  const [rows, setRows] = useState<OddsSelection[]>([]);
  const [threshold, setThreshold] = useState(3); // percent
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveMsg, setLiveMsg] = useState<string | null>(null);

  const post = async (payload: object) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Request failed");
      setRes(data as AnalyzeResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const checkUrl = () => post({ matchId, stoiximanUrl: url });
  const findValue = () => {
    const odds = rows.filter((r) => r.market && r.selection && r.decimalOdds > 1);
    if (!odds.length) { setError("Add at least one valid market with decimal odds > 1."); return; }
    post({ matchId, odds, edgeThreshold: threshold / 100 });
  };
  const loadSample = () => { setRows(sampleOdds.map((o) => ({ ...o }))); setRes(null); setError(null); setLiveMsg(null); };
  const fetchLive = async () => {
    setLoading(true); setError(null); setRes(null); setLiveMsg(null);
    try {
      const r = await fetch(`/api/odds?matchId=${matchId}`);
      const d = await r.json();
      if (d.ok && d.odds?.length) { setRows(d.odds); setLiveMsg(`Loaded ${d.odds.length} markets — ${d.bookmakerLabel}.`); }
      else setLiveMsg(d.message || "No live odds available right now.");
    } catch { setLiveMsg("Live odds request failed."); }
    finally { setLoading(false); }
  };
  const update = (i: number, patch: Partial<OddsSelection>) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => setRows((rs) => rs.filter((_, k) => k !== i));
  const addRow = () => setRows((rs) => [...rs, { market: "", selection: "", decimalOdds: 2.0 }]);

  const input = "rounded-md border border-line bg-bg px-2 py-1.5 text-sm outline-none focus:border-accent/50";

  return (
    <div className="grid gap-4">
      <Section title="1 · Paste a Stoiximan match URL" hint="optional">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.stoiximan.gr/…" className={`${input} flex-1`} />
          <button onClick={checkUrl} disabled={loading || !url} className="rounded-md bg-panel2 px-4 py-2 text-sm font-medium ring-1 ring-line hover:ring-accent/40 disabled:opacity-40">
            Check URL
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          We don’t scrape bookmaker pages. For automatic odds use <b className="text-ink/80">⚡ Fetch live odds</b> (licensed feed, best price across books), or paste / load sample below.
        </p>
      </Section>

      <Section title="2 · Odds (manual / sample)" hint={`edge threshold ${threshold}%`}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button onClick={fetchLive} disabled={loading} className="rounded-md bg-gradient-to-r from-accent to-accent2 px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-50">⚡ Fetch live odds</button>
          <button onClick={loadSample} className="rounded-md bg-panel2 px-3 py-1.5 text-xs ring-1 ring-line">Load sample odds</button>
          <button onClick={addRow} className="rounded-md bg-panel2 px-3 py-1.5 text-xs ring-1 ring-line">+ Add market</button>
          {rows.length > 0 && <button onClick={() => setRows([])} className="rounded-md px-3 py-1.5 text-xs text-muted hover:text-danger">Clear</button>}
          <label className="ml-auto flex items-center gap-2 text-xs text-muted">
            Edge ≥
            <input type="number" min={0} max={50} step={0.5} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className={`${input} w-16`} /> %
          </label>
        </div>
        {liveMsg && <p className="mb-3 rounded-md bg-panel2 px-3 py-2 text-[11px] text-muted">{liveMsg}</p>}

        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">
            No odds yet. Load the sample, or add markets and enter the Stoiximan decimal odds.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="hidden grid-cols-[1.3fr_1fr_0.7fr_auto] gap-2 px-1 text-[10px] uppercase text-muted sm:grid">
              <span>Market</span><span>Selection</span><span>Decimal odds</span><span />
            </div>
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1.3fr_1fr_0.7fr_auto] gap-2">
                <input value={r.market} onChange={(e) => update(i, { market: e.target.value })} placeholder="Market" className={input} />
                <input value={r.selection} onChange={(e) => update(i, { selection: e.target.value })} placeholder="Selection" className={input} />
                <input type="number" step={0.01} min={1.01} value={r.decimalOdds} onChange={(e) => update(i, { decimalOdds: Number(e.target.value) })} className={`${input} tabular mono`} />
                <button onClick={() => remove(i)} className="px-2 text-muted hover:text-danger">✕</button>
              </div>
            ))}
          </div>
        )}

        <button onClick={findValue} disabled={loading || rows.length === 0} className="mt-4 w-full rounded-lg bg-gradient-to-r from-accent to-accent2 py-2.5 text-sm font-semibold text-black disabled:opacity-40">
          {loading ? "Analysing…" : "Find value bets →"}
        </button>
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      </Section>

      {res && <Results res={res} />}
    </div>
  );
}

function Results({ res }: { res: AnalyzeResponse }) {
  if (res.notice) {
    return (
      <Section title="Notice">
        <p className="text-sm text-warn">{res.notice}</p>
      </Section>
    );
  }
  return (
    <Section title="3 · Value bets" hint={`${res.valueBets.length} found · ${res.evaluated} markets checked · edge ≥ ${(res.edgeThreshold * 100).toFixed(1)}%`}>
      {res.valueBets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">
          No value found above the threshold — the bookmaker prices look efficient for these markets. That’s a normal, healthy result.
        </div>
      ) : (
        <div className="space-y-3">
          {res.valueBets.map((b, i) => (
            <div key={i} className="rounded-lg border border-accent/30 bg-accent/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">{b.selection} <span className="text-xs font-normal text-muted">· {b.market}</span></div>
                  <div className="text-xs text-muted">{b.explanation}</div>
                </div>
                <ConfidencePill level={b.confidence} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                <Cell label="Odds" value={b.decimalOdds.toFixed(2)} />
                <Cell label="Implied" value={`${(b.impliedProb * 100).toFixed(1)}%`} />
                <Cell label="Model" value={`${(b.modelProb * 100).toFixed(1)}%`} accent />
                <Cell label="Edge" value={`+${(b.edge * 100).toFixed(1)}%`} accent />
                <Cell label="EV" value={`${b.ev >= 0 ? "+" : ""}${(b.ev * 100).toFixed(1)}%`} accent />
              </div>
              <SourceList sources={b.sources} />
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 text-[11px] text-muted">{res.disclaimer}</p>
    </Section>
  );
}

function Cell({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-md bg-bg/60 px-2.5 py-2">
      <div className="text-[10px] uppercase text-muted">{label}</div>
      <div className={`tabular mono text-sm font-semibold ${accent ? "text-accent2" : "text-ink"}`}>{value}</div>
    </div>
  );
}
