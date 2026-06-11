import { NextResponse } from "next/server";
import { AnalyzeRequestSchema, DISCLAIMER, type AnalyzeResponse } from "@/lib/types";
import { getMatchAnalytics } from "@/lib/sources";
import { predict } from "@/lib/engine";
import { detectValueBets } from "@/lib/value";
import { isStoiximanUrl, STOIXIMAN_NOTICE } from "@/lib/odds";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.flatten() }, { status: 400 });
  }
  const { matchId, stoiximanUrl, odds, edgeThreshold } = parsed.data;

  const analytics = await getMatchAnalytics(matchId);
  if (!analytics) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  const prediction = predict(analytics);

  // No odds yet: if a Stoiximan URL was pasted, return the compliance notice
  // (we never auto-read it) and ask for manual entry / sample.
  if (!odds || odds.length === 0) {
    if (stoiximanUrl) {
      const res: AnalyzeResponse = {
        matchId,
        source: "stoiximan",
        notice: isStoiximanUrl(stoiximanUrl) ? STOIXIMAN_NOTICE : "Unrecognised URL. Paste the odds manually or load the sample odds.",
        valueBets: [],
        evaluated: 0,
        edgeThreshold,
        disclaimer: DISCLAIMER,
      };
      return NextResponse.json(res);
    }
    return NextResponse.json({ error: "Provide odds (manual/sample) or a Stoiximan URL." }, { status: 400 });
  }

  const { valueBets, evaluated } = detectValueBets(prediction, analytics, odds, edgeThreshold);
  const res: AnalyzeResponse = {
    matchId,
    source: "manual",
    valueBets,
    evaluated,
    edgeThreshold,
    disclaimer: DISCLAIMER,
  };
  return NextResponse.json(res);
}
