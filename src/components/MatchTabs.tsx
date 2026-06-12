"use client";

import { useState } from "react";

type Tab = "overview" | "lines" | "value";

export default function MatchTabs({ overview, lines, value }: { overview: React.ReactNode; lines: React.ReactNode; value: React.ReactNode }) {
  const [tab, setTab] = useState<Tab>("overview");
  const tabs: [Tab, string][] = [["overview", "Overview & stats"], ["lines", "Build lines"], ["value", "Value finder"]];

  return (
    <div className="mt-6">
      <div className="mb-5 inline-flex rounded-xl border border-line bg-panel p-1">
        {tabs.map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === t ? "bg-accent text-black" : "text-muted hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div>{tab === "overview" ? overview : tab === "lines" ? lines : value}</div>
    </div>
  );
}
