/**
 * Trending score — shared by /api/trending and the directory's sort=trending.
 * Recent-engagement weighted score over a 7/30-day window, re-based for the
 * discovery directory: comments, reviews, and collection saves (no votes).
 *
 * RAW-SQL NOTE: Review is one of the post-boot community models (stale
 * require-cached PrismaClient in the long-running dev server — see
 * lib/discussion.ts) → its aggregate goes through $queryRaw.
 */
import { db } from "@/lib/db";
import { round1 } from "@/lib/community";

export type TrendingWindow = "week" | "month";

export type TrendingSignals = {
  /** Comments created within the window. */
  comments: number;
  /** Published reviews created within the window. */
  reviews: number;
  /** Collection saves (CollectionItem rows) created within the window. */
  saves: number;
};

export type TrendingEntry = { score: number; signals: TrendingSignals };

/**
 * score = recentComments*3 + recentReviews*5 + recentSaves*4
 *       + editorsPickBonus + curatedBonus + totalReviews*0.5 (rounded 1dp)
 */
export async function trendingScores(window: TrendingWindow): Promise<Map<string, TrendingEntry>> {
  const days = window === "month" ? 30 : 7;
  const sinceMs = Date.now() - days * 86_400_000;

  const tools = await db.$queryRaw<
    { id: string; slug: string; editorsPick: number; curated: number }[]
  >`
    SELECT t.id, t.slug, t.editorsPick, t.curated
    FROM Tool t
    WHERE t.status = 'live'`;

  const toolIds = tools.map((t) => t.id);

  const [recentComments, recentReviews, recentSaves, totalReviews] = await Promise.all([
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
    db.$queryRaw<{ toolId: string; n: number }[]>`
      SELECT ci.toolId, COUNT(*) as n
      FROM CollectionItem ci
      JOIN Collection c ON c.id = ci.collectionId
      WHERE ci.createdAt >= ${sinceMs}
      GROUP BY ci.toolId`,
    db.$queryRaw<{ toolId: string; n: number }[]>`
      SELECT toolId, COUNT(*) as n
      FROM Review
      WHERE status = 'published'
      GROUP BY toolId`,
  ]);

  const commentsByTool = new Map(recentComments.map((g) => [g.toolId, g._count._all]));
  const reviewsByTool = new Map(recentReviews.map((g) => [g.toolId, Number(g.n)]));
  const savesByTool = new Map(recentSaves.map((g) => [g.toolId, Number(g.n)]));
  const totalReviewsByTool = new Map(totalReviews.map((g) => [g.toolId, Number(g.n)]));

  const out = new Map<string, TrendingEntry>();
  for (const t of tools) {
    const comments = commentsByTool.get(t.id) ?? 0;
    const reviews = reviewsByTool.get(t.id) ?? 0;
    const saves = savesByTool.get(t.id) ?? 0;
    const editorial = (Number(t.editorsPick) ? 2 : 0) + (Number(t.curated) ? 1 : 0);
    const base = (totalReviewsByTool.get(t.id) ?? 0) * 0.5;
    const score = comments * 3 + reviews * 5 + saves * 4 + editorial + base;
    out.set(t.slug, { score: round1(score), signals: { comments, reviews, saves } });
  }
  return out;
}
