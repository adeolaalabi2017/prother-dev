import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prother";
import { guard, logAudit } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * Launch calendar (PRD §12 / F-34, admin-scope adaptation).
 *  GET  /api/admin/schedule — 14-day grid (counts + tools) + unscheduled pool
 *  POST /api/admin/schedule — schedule / reschedule / unschedule a launch
 *
 * Floor ≥5 · Cap ≤15 enforced with capacity chips client-side; the POST
 * rejects days already at cap (server-side truth).
 */
export const FLOOR = 5;
export const CAP = 15;

export async function GET(req: Request) {
  const denied = guard(req);
  if (denied) return denied;

  const now = new Date();
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  const from = todayStart;
  const to = new Date(todayStart.getTime() + 14 * 86_400_000);

  const launches = await db.launch.findMany({
    where: { launchDate: { gte: from, lt: to } },
    include: {
      tool: {
        select: {
          id: true,
          slug: true,
          name: true,
          logoEmoji: true,
          logoGradient: true,
          track: true,
          status: true,
          editorsPick: true,
          pinned: true,
          category: { select: { name: true, emoji: true } },
        },
      },
    },
    orderBy: [{ launchDate: "asc" }, { baseUpvotes: "desc" }],
  });

  const days = Array.from({ length: 14 }, (_, i) => {
    const date = new Date(todayStart.getTime() + i * 86_400_000);
    const iso = date.toISOString().slice(0, 10);
    const dayLaunches = launches.filter(
      (l) => l.launchDate.toISOString().slice(0, 10) === iso
    );
    return {
      date: iso,
      weekday: date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
      locked: i === 0, // today is live — past days archive, today can't re-rank
      // Capacity counts EVERY launch on the day (teasers included) so the
      // chip always matches the pills rendered beside it.
      count: dayLaunches.length,
      teaserCount: dayLaunches.filter((l) => l.scheduled).length,
      tools: dayLaunches.map((l) => ({
        launchId: l.id,
        id: l.tool.id,
        slug: l.tool.slug,
        name: l.tool.name,
        logoEmoji: l.tool.logoEmoji,
        logoGradient: l.tool.logoGradient,
        track: l.tool.track,
        status: l.tool.status,
        editorsPick: l.tool.editorsPick,
        pinned: l.tool.pinned,
        category: `${l.tool.category.emoji} ${l.tool.category.name}`,
        votes: l.baseUpvotes,
        scheduled: l.scheduled,
      })),
    };
  });

  // Unscheduled pool: live/draft tools with no launch row at all.
  const pool = await db.tool.findMany({
    where: { status: { in: ["live", "draft", "approved"] }, launch: null },
    select: {
      id: true,
      slug: true,
      name: true,
      logoEmoji: true,
      logoGradient: true,
      track: true,
      status: true,
      createdAt: true,
      category: { select: { name: true, emoji: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return NextResponse.json({
    floor: FLOOR,
    cap: CAP,
    days,
    pool: pool.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      waitingDays: Math.floor(
        (now.getTime() - t.createdAt.getTime()) / 86_400_000
      ),
    })),
  });
}

const postSchema = z.object({
  toolId: z.string().min(1),
  /** "YYYY-MM-DD" to schedule (UTC midnight), or null to unschedule. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  baseUpvotes: z.number().int().min(0).max(2000).optional(),
});

export async function POST(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { toolId, date, baseUpvotes } = parsed.data;

  const tool = await db.tool.findUnique({ where: { id: toolId } });
  if (!tool) return NextResponse.json({ error: "Tool not found" }, { status: 404 });

  // Unschedule
  if (date === null) {
    await db.launch.deleteMany({ where: { toolId } });
    logAudit("launch.unschedule", "tool", toolId, tool.slug);
    return NextResponse.json({ ok: true, unscheduled: true });
  }
  if (!date) {
    return NextResponse.json({ error: "Missing date" }, { status: 400 });
  }

  const target = new Date(`${date}T00:00:00.000Z`);
  const todayIso = new Date().toISOString().slice(0, 10);
  const capCount = await db.launch.count({
    where: {
      launchDate: target,
      scheduled: target.toISOString().slice(0, 10) !== todayIso ? true : false,
    },
  });
  if (target.getTime() > Date.now() && capCount >= CAP) {
    return NextResponse.json(
      { error: `Day is at cap (${CAP}) — pick another day` },
      { status: 409 }
    );
  }

  const launch = await db.launch.upsert({
    where: { toolId },
    update: {
      launchDate: target,
      scheduled: target.getTime() > Date.now(),
      ...(baseUpvotes !== undefined ? { baseUpvotes } : {}),
    },
    create: {
      toolId,
      launchDate: target,
      scheduled: target.getTime() > Date.now(),
      baseUpvotes: baseUpvotes ?? 0,
    },
  });

  logAudit(
    "launch.schedule",
    "tool",
    toolId,
    `${tool.slug} → ${date}${baseUpvotes !== undefined ? ` (+${baseUpvotes} seed)` : ""}`
  );
  return NextResponse.json({
    ok: true,
    scheduled: launch.scheduled,
    date: launch.launchDate.toISOString(),
  });
}
