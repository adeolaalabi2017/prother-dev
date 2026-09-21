import { NextResponse } from "next/server";
import { db } from "@/lib/prother";
import { guard, logAudit } from "@/lib/admin";

export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;

/**
 * GET /api/admin/overview — dashboard payload for the /admin route
 * (PRD F-49 admin dashboard). Backward-compatible superset of the old
 * Overview-tab shape, minus the dropped waitlist/Subscriber metrics:
 *   · kpis            — counters (votesToday/votesYesterday added for deltas)
 *   · launchesByDay   — real launch counts for the last 14 UTC days
 *   · votesByDay      — real vote counts for the last 14 UTC days
 *   · categoryMix     — live listings per category (name + count)
 *   · pricingMix      — live listings per pricingModel (model + count)
 *   · queueAgeH / oldestPending / audit — unchanged
 */
export async function GET(req: Request) {
  const denied = guard(req);
  if (denied) return denied;

  const now = new Date();
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const tomorrowStart = new Date(todayStart.getTime() + DAY_MS);
  // 14-day window: 13 days ago 00:00 UTC → today 00:00 UTC (inclusive).
  const windowStart = new Date(todayStart.getTime() - 13 * DAY_MS);

  const [
    toolsLive,
    toolsDraft,
    toolsRemoved,
    launchesToday,
    launchesTomorrow,
    pendingSubs,
    votes,
    comments,
    postsPublished,
    postsDrafts,
    postViews,
    categories,
    audit,
    oldestPending,
    launchRows,
    voteRows,
    categoryRows,
    pricingRows,
  ] = await Promise.all([
    db.tool.count({ where: { status: { not: "removed" } } }),
    db.tool.count({ where: { status: "draft" } }),
    db.tool.count({ where: { status: "removed" } }),
    db.launch.count({ where: { scheduled: false, launchDate: { gte: todayStart, lt: tomorrowStart } } }),
    db.launch.count({ where: { scheduled: true, launchDate: { gte: tomorrowStart } } }),
    db.submission.count({ where: { status: "pending" } }),
    db.vote.count(),
    db.comment.count(),
    db.post.count({ where: { status: "published" } }),
    db.post.count({ where: { status: "draft" } }),
    db.post.aggregate({ _sum: { views: true } }),
    db.category.count(),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 14 }),
    db.submission.findFirst({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      select: { name: true, createdAt: true },
    }),
    // Chart data — bucketed into UTC days client-agnostic (server-side below).
    db.launch.findMany({
      where: { scheduled: false, launchDate: { gte: windowStart } },
      select: { launchDate: true },
    }),
    db.vote.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { createdAt: true },
    }),
    db.category.findMany({
      select: {
        name: true,
        _count: { select: { tools: { where: { status: { not: "removed" } } } } },
      },
    }),
    db.tool.groupBy({
      by: ["pricingModel"],
      where: { status: { not: "removed" } },
      _count: { _all: true },
    }),
  ]);

  /** Bucket rows into the 14-UTC-day window (index 13 = today). */
  const bucketByDay = (dates: Date[]): number[] => {
    const counts = new Array<number>(14).fill(0);
    for (const d of dates) {
      const idx = Math.floor((d.getTime() - windowStart.getTime()) / DAY_MS);
      if (idx >= 0 && idx < 14) counts[idx]++;
    }
    return counts;
  };

  const launchesByDay = bucketByDay(launchRows.map((r) => r.launchDate));
  const votesByDay = bucketByDay(voteRows.map((r) => r.createdAt));

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
      toolsDraft,
      toolsRemoved,
      launchesToday,
      launchesTomorrow,
      pendingSubs,
      votes,
      votesToday: votesByDay[13],
      votesYesterday: votesByDay[12],
      comments,
      postsPublished,
      postsDrafts,
      postViews: postViews._sum.views ?? 0,
      categories,
    },
    launchesByDay,
    votesByDay,
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
