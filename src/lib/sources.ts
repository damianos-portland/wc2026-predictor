import type { MatchAnalytics, SourceRef } from "./types";
import { TEAMS, STATS, FORM, REFEREES, getMatchRaw } from "./mock";
import { cached } from "./cache";

/**
 * DataSource abstraction
 * ──────────────────────
 * Every category of data (form, h2h, injuries, lineups, rankings, referee, market
 * trends, expert predictions, stats) is modelled as a replaceable adapter that
 * returns its payload TOGETHER with `sources: SourceRef[]`.
 *
 * Live adapters MUST:
 *   - only use publicly accessible pages,
 *   - respect robots.txt, rate limits and each site's Terms of Service,
 *   - never bypass paywalls, login walls, captchas or anti-bot systems,
 *   - attach a source URL for every data point,
 *   - be cached (see cache.ts) to avoid excessive requests.
 *
 * The default implementation below is MOCK-backed so the app runs immediately.
 * Set DATA_MODE=live and implement the adapters to go live.
 */
export interface DataSource<T> {
  id: string;
  /** human label shown in the UI for attribution */
  label: string;
  fetch(ctx: { matchId: string; homeId: string; awayId: string }): Promise<{ data: T; sources: SourceRef[] }>;
}

export const DATA_MODE = process.env.DATA_MODE === "live" ? "live" : "mock";

const ANALYTICS_TTL = 15 * 60 * 1000; // 15 minutes

/** Aggregate everything needed to analyse a match (cached). */
export async function getMatchAnalytics(matchId: string): Promise<MatchAnalytics | null> {
  return cached(`analytics:${matchId}:${DATA_MODE}`, ANALYTICS_TTL, async () => {
    if (DATA_MODE === "live") {
      // TODO: wire real adapters here (compliance-respecting). Falls back to mock.
    }
    return buildMockAnalytics(matchId);
  });
}

function buildMockAnalytics(matchId: string): MatchAnalytics | null {
  const m = getMatchRaw(matchId);
  if (!m) return null;
  const home = TEAMS[m.homeId];
  const away = TEAMS[m.awayId];
  const referee = REFEREES[m.refereeId] ?? null;
  return {
    match: { id: m.id, stage: m.stage, group: m.group, kickoff: m.kickoff, venue: m.venue, homeId: m.homeId, awayId: m.awayId },
    home,
    away,
    homeStats: STATS[m.homeId],
    awayStats: STATS[m.awayId],
    homeForm: FORM[m.homeId],
    awayForm: FORM[m.awayId],
    h2h: m.h2h,
    injuries: m.injuries,
    lineups: m.lineups,
    trends: m.trends,
    experts: m.experts,
    referee,
    generatedAt: new Date().toISOString(),
  };
}
