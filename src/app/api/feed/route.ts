import { NextResponse } from "next/server";
import { db, rankScore, secondsUntilUtcMidnight, toFeedRow } from "@/lib/prother";
import type { FeedResponse, FeedRow, Teaser, TopWeekRow } from "@/lib/prother";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const weekAgo = new Date(todayStart.getTime() - 6 * 86_400_000);
  const tomorrowStart = new Date(todayStart.getTime() + 86_400_000);
  const dayAfter = new Date(todayStart.getTime() + 2 * 86_400_000);

  const [tools, weekTools, subscriberCount] = await Promise.all([
    db.tool.findMany({
      where: { launch: { scheduled: false, launchDate: { gte: todayStart, lt: tomorrowStart } } },
      include: { launch: true, category: { select: { slug: true, name: true, emoji: true } } },
    }),
    db.tool.findMany({
      where: { launch: { scheduled: false, launchDate: { gte: weekAgo, lt: todayStart } } },
      include: { launch: true, category: { select: { slug: true, name: true, emoji: true } } },
      orderBy: { launch: { baseUpvotes: "desc" } },
      take: 5,
    }),
    db.subscriber.count(),
  ]);

  // Anonymous votes are part of the live tally (baseUpvotes + real votes).
  const todayLaunchIds = tools.map((t) => t.launch!.id);
  const weekLaunchIds = weekTools.map((t) => t.launch!.id).filter(Boolean);
  const [anonToday, anonWeek] = await Promise.all([
    db.vote.groupBy({
      by: ["launchId"],
      _count: { _all: true },
      where: { launchId: { in: todayLaunchIds } },
    }),
    weekLaunchIds.length
      ? db.vote.groupBy({
          by: ["launchId"],
          _count: { _all: true },
          where: { launchId: { in: weekLaunchIds } },
        })
      : Promise.resolve([] as { launchId: string; _count: { _all: number } }[]),
  ]);
  const anonByLaunch = new Map<string, number>();
  for (const g of [...anonToday, ...anonWeek]) {
    anonByLaunch.set(g.launchId, g._count._all);
  }
  for (const t of [...tools, ...weekTools]) {
    if (t.launch) {
      t.launch.baseUpvotes += anonByLaunch.get(t.launch.id) ?? 0;
    }
  }

  const votedSet = new Set<string>();
  const rows: FeedRow[] = tools.map((t) => toFeedRow(t, t.category, votedSet));

  // Top Today: score = weighted_upvotes / hours^1.2 (PRD F-36)
  const top = [...rows].sort((a, b) => {
    const at = tools.find((t) => t.slug === a.slug)!;
    const bt = tools.find((t) => t.slug === b.slug)!;
    const as = rankScore(a.votes, at.launch!.launchDate, now);
    const bs = rankScore(b.votes, bt.launch!.launchDate, now);
    return bs - as;
  });

  // New: submission order, most recent first
  const newRows = [...rows].sort((a, b) => {
    const at = tools.find((t) => t.slug === a.slug)!;
    const bt = tools.find((t) => t.slug === b.slug)!;
    return bt.launch!.createdAt.getTime() - at.launch!.createdAt.getTime();
  });

  // Tomorrow teasers: name + tagline only (PRD §9)
  const teaserTools = await db.tool.findMany({
    where: { launch: { scheduled: true, launchDate: { gte: tomorrowStart, lt: dayAfter } } },
    include: { launch: true, category: { select: { slug: true, name: true, emoji: true } } },
  });
  const tomorrow: Teaser[] = teaserTools
    .sort((a, b) => (a.launch?.createdAt.getTime() ?? 0) - (b.launch?.createdAt.getTime() ?? 0))
    .map((t) => ({
      slug: t.slug,
      name: t.name,
      tagline: t.tagline,
      emoji: t.logoEmoji,
      gradient: t.logoGradient,
      category: t.category,
      goesLiveInH: Math.max(
        1,
        Math.round((t.launch!.launchDate.getTime() - now.getTime()) / 3_600_000)
      ),
    }));

  // Top Week sidebar: raw upvotes (PRD §9 wireframe)
  const topWeek: TopWeekRow[] = weekTools.map((t) => ({
    slug: t.slug,
    name: t.name,
    emoji: t.logoEmoji,
    gradient: t.logoGradient,
    votes: t.launch?.baseUpvotes ?? 0,
    categoryEmoji: t.category.emoji,
  }));

  const editorsPick = top.find((r) => r.badges.editorsPick) ?? null;

  const body: FeedResponse = {
    date: todayStart.toISOString().slice(0, 10),
    dayLabel: now.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }),
    resetsInSec: secondsUntilUtcMidnight(now),
    todayCount: rows.length,
    new: newRows,
    top,
    tomorrow,
    topWeek,
    editorsPick,
    subscriberCount,
  };

  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
