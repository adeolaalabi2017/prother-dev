import { NextResponse } from "next/server";
import { db } from "@/lib/prother";
import { guard, logAudit } from "@/lib/admin";

export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;

/**
 * GET /api/admin/overview — dashboard payload for the /admin route
 * (PRD F-49 admin dashboard). Directory-metrics shape (backward-compatible
 * superset of the old Overview-tab structure, minus the dropped waitlist
 * and all launch/vote metrics):
 *   · kpis           — toolsLive, pendingSubs, postsPublished, comments,
 *                      reviewsPublished, reportsOpen, adsActive,
 *                      adImpressions, adClicks, pageviewsToday
 *   · listingsByDay  — tools listed (createdAt) per UTC day, last 14 days
 *   · reviewsByDay   — published reviews per UTC day, last 14 days
 *   · categoryMix    — live listings per category (name + count)
 *   · pricingMix     — live listings per pricingModel (model + count)
 *   · queueAgeH / oldestPending / audit — unchanged
 *
 * Raw SQL is used for the post-boot tables (Review, Report, AdCampaign,
 * PageViewDaily) per the stale-PrismaClient rule; SQLite DateTime columns
 * store INTEGER ms-epoch so `>= ms` comparisons are safe.
 */
export async function GET(req: Request) {
  const denied = guard(req);
  if (denied) return denied;

  const now = new Date();
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const todayKey = todayStart.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  // 14-day window: 13 days ago 00:00 UTC → today 00:00 UTC (inclusive).
  const windowStart = new Date(todayStart.getTime() - 13 * DAY_MS);
  const windowStartMs = windowStart.getTime();

  const [
    toolsLive,
    pendingSubs,
    comments,
    postsPublished,
    categories,
    audit,
    oldestPending,
    categoryRows,
    pricingRows,
    reviewTotals,
    reportTotals,
    adTotals,
    pageviewsToday,
    toolDayRows,
    reviewDayRows,
  ] = await Promise.all([
    db.tool.count({ where: { status: "live" } }),
    db.submission.count({ where: { status: "pending" } }),
    db.comment.count(),
    db.post.count({ where: { status: "published" } }),
    db.category.count(),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 14 }),
    db.submission.findFirst({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      select: { name: true, createdAt: true },
    }),
    db.category.findMany({
      select: {
        name: true,
        _count: { select: { tools: { where: { status: "live" } } } },
      },
    }),
    db.tool.groupBy({
      by: ["pricingModel"],
      where: { status: "live" },
      _count: { _all: true },
    }),
    // Chart data + review totals — raw SQL (Review is a post-boot model).
    db.$queryRaw<{ n: number }[]>`
      SELECT COUNT(*) as n FROM Review WHERE status = 'published'`,
    db.$queryRaw<{ n: number }[]>`
      SELECT COUNT(*) as n FROM Report WHERE status = 'open'`,
    db.$queryRaw<{ active: number; impressions: number; clicks: number }[]>`
      SELECT SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
             COALESCE(SUM(impressions), 0) as impressions,
             COALESCE(SUM(clicks), 0) as clicks
      FROM AdCampaign`,
    db.$queryRaw<{ n: number }[]>`
      SELECT COALESCE(SUM(views), 0) as n
      FROM PageViewDaily
      WHERE day = ${todayKey}`,
    // 14-day chart buckets — createdAt columns are INTEGER ms-epoch.
    db.$queryRaw<{ createdAt: number }[]>`
      SELECT createdAt FROM Tool
      WHERE status = 'live' AND createdAt >= ${windowStartMs}`,
    db.$queryRaw<{ createdAt: number }[]>`
      SELECT createdAt FROM Review
      WHERE status = 'published' AND createdAt >= ${windowStartMs}`,
  ]);

  /** Bucket rows into the 14-UTC-day window (index 13 = today). */
  const bucketByDay = (rows: { createdAt: number }[]): number[] => {
    const counts = new Array<number>(14).fill(0);
    for (const r of rows) {
      const idx = Math.floor(
        (new Date(Number(r.createdAt)).getTime() - windowStartMs) / DAY_MS
      );
      if (idx >= 0 && idx < 14) counts[idx]++;
    }
    return counts;
  };

  const listingsByDay = bucketByDay(toolDayRows);
  const reviewsByDay = bucketByDay(reviewDayRows);

  const categoryMix = categoryRows
    .map((c) => ({ name: c.name, count: c._count.tools }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);

  const pricingMix = pricingRows
    .map((p) => ({ model: p.pricingModel, count: p._count._all }))
    .sort((a, b) => b.count - a.count);

  const queueAgeH = oldestPending
    ? Math.floor((now.getTime() - oldestPending.createdAt.getTime()) / 3_600_000)
    : 0;

  logAudit("admin.view", "overview");

  return NextResponse.json({
    kpis: {
      toolsLive,
      pendingSubs,
      postsPublished,
      comments,
      reviewsPublished: Number(reviewTotals[0]?.n ?? 0),
      reportsOpen: Number(reportTotals[0]?.n ?? 0),
      adsActive: Number(adTotals[0]?.active ?? 0),
      adImpressions: Number(adTotals[0]?.impressions ?? 0),
      adClicks: Number(adTotals[0]?.clicks ?? 0),
      pageviewsToday: Number(pageviewsToday[0]?.n ?? 0),
      categories,
    },
    listingsByDay,
    reviewsByDay,
    categoryMix,
    pricingMix,
    queueAgeH,
    oldestPending: oldestPending?.name ?? null,
    audit: audit.map((a) => ({
      id: a.id,
      action: a.action,
      entity: a.entity,
      entityId: a.entityId,
      meta: a.meta,
      at: a.createdAt.toISOString(),
    })),
  });
}
