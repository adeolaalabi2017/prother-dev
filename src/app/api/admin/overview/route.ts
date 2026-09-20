import { NextResponse } from "next/server";
import { db } from "@/lib/prother";
import { guard, logAudit } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/overview — KPI strip + capacity + recent audit trail
 * for the Admin Console's Overview tab (PRD F-49 admin dashboard).
 */
export async function GET(req: Request) {
  const denied = guard(req);
  if (denied) return denied;

  const now = new Date();
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const tomorrowStart = new Date(todayStart.getTime() + 86_400_000);

  const [
    subscribers,
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
  ] = await Promise.all([
    db.subscriber.count(),
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
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
    db.submission.findFirst({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      select: { name: true, createdAt: true },
    }),
  ]);

  const queueAgeH = oldestPending
    ? Math.floor((now.getTime() - oldestPending.createdAt.getTime()) / 3_600_000)
    : 0;

  logAudit("admin.view", "overview");

  return NextResponse.json({
    kpis: {
      subscribers,
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
      postViews: postViews._sum.views ?? 0,
      categories,
    },
    queueAgeH,
    oldestPending: oldestPending?.name ?? null,
    audit: audit.map((a) => ({
      id: a.id,
      action: a.action,
      entity: a.entity,
      meta: a.meta,
      at: a.createdAt.toISOString(),
    })),
  });
}
