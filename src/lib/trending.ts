/**
 * Trending score (PRD F-06) — shared by /api/trending and the directory's
 * sort=trending. Recent-engagement weighted score over a 7/30-day window.
 *
 * RAW-SQL NOTE: Review is one of the post-boot community models (stale
 * require-cached PrismaClient in the long-running dev server — see
 * lib/discussion.ts) → its aggregate goes through $queryRaw.
 */
import { db } from "@/lib/db";
import { round1 } from "@/lib/community";

export type TrendingWindow = "week" | "month";

export type TrendingSignals = {
  /** All-time votes on the current launch (base + anonymous). */
  votes: number;
  /** Comments created within the window. */
  comments: number;
  /** Published reviews created within the window. */
  reviews: number;
};

export type TrendingEntry = { score: number; signals: TrendingSignals };

/**
 * score = recentVotes*2 + recentComments*3 + recentReviews*4
 *       + relaunchCount*5 + totalVotes*0.05        (rounded to 1 decimal)
 */
export async function trendingScores(window: TrendingWindow): Promise<Map<string, TrendingEntry>> {
  const days = window === "month" ? 30 : 7;
  const sinceMs = Date.now() - days * 86_400_000;

  // Raw query: Tool.relaunchCount is a post-boot column (stale-client note).
  const tools = await db.$queryRaw<
    { id: string; slug: string; relaunchCount: number; launchId: string | null; baseUpvotes: number | null }[]
  >`
    SELECT t.id, t.slug, t.relaunchCount, l.id as launchId, l.baseUpvotes
    FROM Tool t
    LEFT JOIN Launch l ON l.toolId = t.id
    WHERE t.status = 'live' AND l.scheduled = 0`;

  const toolIds = tools.map((t) => t.id);
  const launchIds = tools.map((t) => t.launchId).filter((v): v is string => Boolean(v));

  const [totalVotes, recentVotes, recentComments, recentReviews] = await Promise.all([
    launchIds.length
      ? db.vote.groupBy({
          by: ["launchId"],
          _count: { _all: true },
          where: { launchId: { in: launchIds } },
        })
      : Promise.resolve([] as { launchId: string; _count: { _all: number } }[]),
    launchIds.length
      ? db.vote.groupBy({
          by: ["launchId"],
          _count: { _all: true },
          where: { launchId: { in: launchIds }, createdAt: { gte: new Date(sinceMs) } },
        })
      : Promise.resolve([] as { launchId: string; _count: { _all: number } }[]),
    toolIds.length
      ? db.comment.groupBy({
          by: ["toolId"],
          _count: { _all: true },
          where: { toolId: { in: toolIds }, createdAt: { gte: new Date(sinceMs) } },
        })
      : Promise.resolve([] as { toolId: string; _count: { _all: number } }[]),
    db.$queryRaw<{ toolId: string; n: number }[]>`
      SELECT toolId, COUNT(*) as n
      FROM Review
      WHERE status = 'published' AND createdAt >= ${sinceMs}
      GROUP BY toolId`,
  ]);

  const totalByLaunch = new Map(totalVotes.map((g) => [g.launchId, g._count._all]));
  const recentByLaunch = new Map(recentVotes.map((g) => [g.launchId, g._count._all]));
  const commentsByTool = new Map(recentComments.map((g) => [g.toolId, g._count._all]));
  const reviewsByTool = new Map(recentReviews.map((g) => [g.toolId, Number(g.n)]));

  const out = new Map<string, TrendingEntry>();
  for (const t of tools) {
    const total = (t.baseUpvotes ?? 0) + (t.launchId ? totalByLaunch.get(t.launchId) ?? 0 : 0);
    const comments = commentsByTool.get(t.id) ?? 0;
    const reviews = reviewsByTool.get(t.id) ?? 0;
    const recentVoteCount = t.launchId ? recentByLaunch.get(t.launchId) ?? 0 : 0;
    const score =
      recentVoteCount * 2 + comments * 3 + reviews * 4 + Number(t.relaunchCount) * 5 + total * 0.05;
    out.set(t.slug, { score: round1(score), signals: { votes: total, comments, reviews } });
  }
  return out;
}
