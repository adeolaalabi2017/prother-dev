import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guard, logAudit } from "@/lib/admin";
import { AD_PLACEMENTS, AD_STATUSES } from "@/lib/ads";
import { convexCampaignDelete, convexCampaignPatch } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/**
 * Admin — single campaign operations (Task 23).
 *  PATCH  /api/admin/ads/[id] — partial edit incl. status transitions
 *  DELETE /api/admin/ads/[id] — hard delete (drafts/tests only)
 */
const patchSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  advertiser: z.string().trim().min(2).max(60).optional(),
  placement: z.enum(AD_PLACEMENTS).optional(),
  status: z.enum(AD_STATUSES).optional(),
  headline: z.string().trim().min(4).max(90).optional(),
  body: z.string().trim().max(140).optional(),
  clickUrl: z.string().url().max(400).optional(),
  emoji: z.string().max(8).optional(),
  gradient: z.string().max(80).optional(),
  targetCategory: z.string().max(60).nullable().optional(),
  weight: z.number().int().min(1).max(10).optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  totalBudgetCents: z.number().int().min(0).max(100_000_00).optional(),
  dailyBudgetCents: z.number().int().min(0).max(1_000_00).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = guard(req);
  if (denied) return denied;

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues.slice(0, 3) },
      { status: 400 }
    );
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  // Convex-only (admin cutover): the mutation throws not_found.
  const client = createServerConvexClient()!;
  const convexErr = (err: unknown): string =>
    err instanceof Error ? err.message : String(err);
  try {
    await convexCampaignPatch(client, {
      campaignLegacyId: id,
      patch: parsed.data,
      nowMs: Date.now(),
    });
    logAudit(
      "ad.update",
      "campaign",
      id,
      `${parsed.data.name ?? ""}: ${Object.keys(parsed.data).join(", ")}`
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (convexErr(err).includes("not_found")) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    console.error("[api:admin/ads] PATCH failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const denied = guard(req);
  if (denied) return denied;

  const { id } = await params;
  // Convex-only (admin cutover): the mutation throws not_found.
  try {
    await convexCampaignDelete(createServerConvexClient()!, {
      campaignLegacyId: id,
    });
    logAudit("ad.delete", "campaign", id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m.includes("not_found")) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    console.error("[api:admin/ads] DELETE failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
