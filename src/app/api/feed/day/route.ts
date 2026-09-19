import { NextRequest, NextResponse } from "next/server";
import { attachCommentCounts, db, toFeedRow } from "@/lib/prother";
import type { DayArchiveResponse, FeedRow } from "@/lib/prother";

export const dynamic = "force-dynamic";

/**
 * GET /api/feed/day?date=YYYY-MM-DD — one past launch day's final standings
 * (voting closed, ranked by total upvotes). Powers the Archive tab's day
 * strip: any of the past 6 days is browsable, not just yesterday.
 */
const DAY_MS = 86_400_000;

export async function GET(req: NextRequest) {
  const dateParam = new URL(req.url).searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json(
      { error: "date must be YYYY-MM-DD" },
      { status: 400 }
    );
  }

  const dayStart = new Date(`${dateParam}T00:00:00.000Z`);
  if (Number.isNaN(dayStart.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const now = new Date();
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const oldest = todayStart.getTime() - 6 * DAY_MS;
  if (dayStart.getTime() >= todayStart.getTime()) {
    return NextResponse.json(
      { error: "Archived days are in the past — today's list is the live feed." },
      { status: 403 }
    );
  }
  if (dayStart.getTime() < oldest) {
    return NextResponse.json(
      { error: "Archive covers the past 6 days." },
      { status: 403 }
    );
  }

  const tools = await db.tool.findMany({
    where: {
      launch: { scheduled: false, launchDate: { gte: dayStart, lt: new Date(dayStart.getTime() + DAY_MS) } },
    },
    include: { launch: true, category: { select: { slug: true, name: true, emoji: true } } },
  });

  const launchIds = tools.map((t) => t.launch!.id).filter(Boolean);
  const anon = launchIds.length
    ? await db.vote.groupBy({
        by: ["launchId"],
        _count: { _all: true },
        where: { launchId: { in: launchIds } },
      })
    : [];
  const anonByLaunch = new Map(anon.map((g) => [g.launchId, g._count._all]));
  for (const t of tools) {
    if (t.launch) t.launch.baseUpvotes += anonByLaunch.get(t.launch.id) ?? 0;
  }

  const votedSet = new Set<string>();
  const rows: FeedRow[] = tools
    .map((t) => toFeedRow(t, t.category, votedSet))
    .sort((a, b) => b.votes - a.votes);

  const slugToToolId = new Map(tools.map((t) => [t.slug, t.id] as const));
  await attachCommentCounts([rows], slugToToolId);

  const body: DayArchiveResponse = {
    date: dateParam,
    label: dayStart.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }),
    count: rows.length,
    rows,
  };

  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
