import { notFound } from "next/navigation";
import Link from "next/link";
import { getMatchAnalytics } from "@/lib/sources";
import { predict } from "@/lib/engine";
import { sampleOddsFromPrediction } from "@/lib/odds";
import { listMatches } from "@/lib/mock";
import Analytics from "@/components/Analytics";
import PredictionPanel from "@/components/Prediction";
import OddsAnalyzer from "@/components/OddsAnalyzer";

export function generateStaticParams() {
  return listMatches().map((m) => ({ id: m.id }));
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await getMatchAnalytics(id);
  if (!a) notFound();
  const pred = predict(a);
  const sample = sampleOddsFromPrediction(pred, a.home, a.away);
  const kickoff = new Date(a.match.kickoff).toLocaleString("en-GB", { weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" });

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <Link href="/" className="text-sm text-muted hover:text-accent2">← All matches</Link>

      {/* header */}
      <div className="card mt-3 p-5">
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span className="rounded bg-panel2 px-2 py-0.5">{a.match.stage}</span>
          <span>{kickoff}</span>
        </div>
        <div className="mt-4 flex items-center justify-center gap-4 sm:gap-8">
          <TeamHead flag={a.home.flag} name={a.home.name} rank={a.home.fifaRank} elo={a.home.elo} />
          <div className="text-center">
            <div className="mono text-2xl font-bold tabular">{Math.round(pred.oneXtwo.home * 100)} · {Math.round(pred.oneXtwo.draw * 100)} · {Math.round(pred.oneXtwo.away * 100)}</div>
            <div className="text-[10px] uppercase tracking-wide text-muted">model 1 · X · 2 (%)</div>
          </div>
          <TeamHead flag={a.away.flag} name={a.away.name} rank={a.away.fifaRank} elo={a.away.elo} />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-muted">
          <span>📍 {a.match.venue}</span>
          {a.referee && <span>🧑‍⚖️ {a.referee.name}</span>}
          <span>Model xG {pred.expectedGoals.home} – {pred.expectedGoals.away}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <PredictionPanel pred={pred} home={a.home} away={a.away} />
          <div>
            <h2 className="mb-3 text-lg font-semibold">Match analytics <span className="text-xs font-normal text-muted">— public sources, every data point linked</span></h2>
            <Analytics a={a} />
          </div>
        </div>
        <div className="lg:sticky lg:top-20 lg:h-fit">
          <h2 className="mb-3 text-lg font-semibold">Value finder</h2>
          <OddsAnalyzer matchId={a.match.id} sampleOdds={sample} />
        </div>
      </div>
    </main>
  );
}

function TeamHead({ flag, name, rank, elo }: { flag: string; name: string; rank: number; elo: number }) {
  return (
    <div className="text-center">
      <div className="text-4xl sm:text-5xl">{flag}</div>
      <div className="mt-1 text-sm font-semibold">{name}</div>
      <div className="text-[10px] text-muted">FIFA #{rank} · Elo {elo}</div>
    </div>
  );
}
