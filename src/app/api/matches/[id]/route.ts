import { NextResponse } from "next/server";
import { getMatchAnalytics } from "@/lib/sources";
import { predict } from "@/lib/engine";
import { sampleOddsFromPrediction } from "@/lib/odds";
import { DISCLAIMER } from "@/lib/types";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analytics = await getMatchAnalytics(id);
  if (!analytics) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  const prediction = predict(analytics);
  const sampleOdds = sampleOddsFromPrediction(prediction, analytics.home, analytics.away);
  return NextResponse.json({ analytics, prediction, sampleOdds, disclaimer: DISCLAIMER });
}
