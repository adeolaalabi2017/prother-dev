import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guard, logAudit } from "@/lib/admin";
import { AD_PLACEMENTS, AD_STATUSES, createCampaign, listCampaigns } from "@/lib/ads";
import { getPlacementMeasurement } from "@/lib/ad-measure";

export const dynamic = "force-dynamic";

/**
 * Admin — advertising campaigns (Task 23).
 *  GET  /api/admin/ads — all campaigns + aggregate stats (CTR, totals)
 *  POST /api/admin/ads — create a campaign
 */
const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  advertiser: z.string().trim().min(2).max(60),
  placement: z.enum(AD_PLACEMENTS).default("feed_row"),
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

  try {
    const payload = await listCampaigns();
    // Task 28: 7-day fill/viewability accounting for the Measurement card.
    const measurement = await getPlacementMeasurement();
    return NextResponse.json(
      { ...payload, measurement },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[api:admin/ads] GET failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
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
    const { id } = await createCampaign(parsed.data);
    logAudit(
      "ad.create",
      "campaign",
      id,
      `${parsed.data.name} (${parsed.data.placement}, ${parsed.data.status})`
    );
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    console.error("[api:admin/ads] POST failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
