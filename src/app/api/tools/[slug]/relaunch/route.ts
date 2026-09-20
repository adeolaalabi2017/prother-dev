import { NextResponse } from "next/server";
import { db } from "@/lib/prother";
import { getAuthUser } from "@/lib/auth";
import { logAudit } from "@/lib/admin";
import {
  cooldownInfo,
  relaunchAnchor,
  startOfUtcDay,
  toolCommunityFields,
} from "@/lib/community";

export const dynamic = "force-dynamic";

/**
 * POST /api/tools/[slug]/relaunch — maker-only re-launch (F-35).
 * Archives the current launch window into RelaunchEvent, wipes the vote
 * pool for a fresh start, and moves the launch date to today (UTC).
 * Cooldown: one re-launch per ~6 months (183 days) per PRD.
 *
 * NOTE: Tool.makerEmail / relaunchCount / relaunchNote / originalLaunchDate
 * are post-boot columns (stale-client note in lib/community.ts) — all reads
 * and writes of them go through $queryRaw/$executeRaw.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  const tool = await db.tool.findUnique({
    where: { slug },
    include: { launch: { select: { id: true, launchDate: true, scheduled: true, baseUpvotes: true } } },
  });
  if (!tool || tool.status !== "live" || !tool.launch) {
    return NextResponse.json({ error: "tool_not_found" }, { status: 404 });
  }
  if (tool.launch.scheduled) {
    return NextResponse.json({ error: "scheduled" }, { status: 409 });
  }

  const fields = await toolCommunityFields(tool.id);

  // Maker check: verified claim owner OR makerHandle match.
  const isMaker =
    (tool.claimed && fields.makerEmail === user.email) ||
    tool.makerHandle === `@${user.handle}`;
  if (!isMaker) {
    return NextResponse.json({ error: "not_maker" }, { status: 403 });
  }

  // 6-month cooldown anchored on the last relaunch (or original launch).
  const anchor = await relaunchAnchor(tool.id, {
    originalLaunchDate: fields.originalLaunchDate,
    launch: tool.launch,
  });
  const cooldown = cooldownInfo(anchor);
  if (!cooldown.eligible) {
    return NextResponse.json(
      { error: "cooldown", nextEligibleAt: cooldown.nextEligibleAt },
      { status: 403 }
    );
  }

  const relaunchCount = fields.relaunchCount;
  const version = `v${relaunchCount + 2}.0`;
  const today = startOfUtcDay();
  const launchId = tool.launch.id;
  const previousLaunchDate = tool.launch.launchDate;

  const totalVotes =
    tool.launch.baseUpvotes + (await db.vote.count({ where: { launchId } }));

  await db.$transaction([
    db.$executeRaw`
      INSERT INTO RelaunchEvent (id, toolId, version, note, launchedAt, totalVotes, createdAt)
      VALUES (${crypto.randomUUID()}, ${tool.id}, ${version},
              ${"Re-launch — fresh vote pool"}, ${previousLaunchDate.getTime()},
              ${totalVotes}, ${Date.now()})`,
    db.vote.deleteMany({ where: { launchId } }),
    db.launch.update({
      where: { id: launchId },
      data: { launchDate: today, scheduled: false },
    }),
    db.$executeRaw`
      UPDATE Tool
      SET relaunch = 1,
          relaunchCount = relaunchCount + 1,
          relaunchNote = ${version},
          originalLaunchDate = ${fields.originalLaunchDate ? fields.originalLaunchDate : previousLaunchDate.getTime()}
      WHERE id = ${tool.id}`,
  ]);

  logAudit("tool.relaunch", "tool", tool.slug, `${version} — votes reset (${totalVotes} archived)`);

  return NextResponse.json({
    relaunched: true,
    version,
    date: today.toISOString(),
    freshVotes: 0,
  });
}
