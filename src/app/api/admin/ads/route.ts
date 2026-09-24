import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guard, logAudit } from "@/lib/admin";
import { AD_PLACEMENTS, AD_STATUSES } from "@/lib/ads";
import { convexCampaignCreate, shadowAdminAds, shadowPlacementMeasurement } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/**
 * Admin — advertising campaigns (Task 23).
 *  GET  /api/admin/ads — all campaigns + aggregate stats (CTR, totals)
 *  POST /api/admin/ads — create a campaign
 */
const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  advertiser: z.string().trim().min(2).max(60),
  placement: z.enum(AD_PLACEMENTS).default("directory_banner"),
  headline: z.string().trim().min(4).max(90),
  body: z.string().trim().max(140).default(""),
  clickUrl: z.string().url().max(400),
  emoji: z.string().max(8).default("📣"),
  gradient: z.string().max(80).default("from-orange-500 to-amber-700"),
  targetCategory: z.string().max(60).nullable().optional(),
  weight: z.number().int().min(1).max(10).default(1),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  totalBudgetCents: z.number().int().min(0).max(100_000_00).default(0),
  dailyBudgetCents: z.number().int().min(0).max(1_000_00).default(0),
  status: z.enum(AD_STATUSES).default("draft"),
});

export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  // Convex-only (admin cutover).
  const client = createServerConvexClient()!;
  const [table, measurement] = await Promise.all([
    shadowAdminAds(client),
    shadowPlacementMeasurement(client),
  ]);
  return NextResponse.json(
    { ...table, measurement },
    {
      headers: { "Cache-Control": "no-store", "x-data-backend": "convex" },
    },
  );
}

export async function POST(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues.slice(0, 3) },
      { status: 400 }
    );
  }

  try {
    // Convex-only: one id + timestamps for the insert.
    const sharedId = crypto.randomUUID();
    const nowMs = Date.now();
    const res = await convexCampaignCreate(createServerConvexClient()!, {
      id: sharedId,
      name: parsed.data.name,
      advertiser: parsed.data.advertiser,
      placement: parsed.data.placement,
      headline: parsed.data.headline,
      body: parsed.data.body,
      clickUrl: parsed.data.clickUrl,
      emoji: parsed.data.emoji,
      gradient: parsed.data.gradient,
      targetCategory: parsed.data.targetCategory,
      weight: parsed.data.weight,
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt).getTime() : null,
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt).getTime() : null,
      totalBudgetCents: parsed.data.totalBudgetCents,
      dailyBudgetCents: parsed.data.dailyBudgetCents,
      status: parsed.data.status,
      createdAt: nowMs,
      updatedAt: nowMs,
    });
    logAudit(
      "ad.create",
      "campaign",
      res.id,
      `${parsed.data.name} (${parsed.data.placement}, ${parsed.data.status})`
    );
    return NextResponse.json({ ok: true, id: res.id }, { status: 201 });
  } catch (err) {
    console.error("[api:admin/ads] POST failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
