import { NextResponse } from "next/server";
import { listMatches } from "@/lib/mock";

export async function GET() {
  return NextResponse.json({ matches: listMatches() });
}
