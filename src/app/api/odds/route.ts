import { NextResponse } from "next/server";
import { getMatchAnalytics } from "@/lib/sources";
import { fetchOddsForMatch } from "@/lib/oddsApi";

// GET /api/odds?matchId=m1 → licensed live odds for the fixture (The Odds API)
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("matchId");
  if (!id) return NextResponse.json({ ok: false, message: "matchId required" }, { status: 400 });
  const a = await getMatchAnalytics(id);
  if (!a) return NextResponse.json({ ok: false, message: "Match not found" }, { status: 404 });

  const res = await fetchOddsForMatch(a.home.name, a.away.name);
  return NextResponse.json({
    ok: res.ok,
    message: res.message,
    books: res.books,
    bookmakerLabel: res.ok ? `best of ${res.books} books (The Odds API)` : undefined,
    odds: res.odds,
  });
}
