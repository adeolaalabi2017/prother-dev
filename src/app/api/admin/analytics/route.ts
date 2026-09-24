import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/admin";
import { shadowTrafficReadout } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/analytics — first-party traffic readout for the admin
 * Overview "Traffic" card: 14-day daily totals + top paths. Aggregated,
 * cookieless data only (that is all PageViewDaily holds).
 */
export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  // Convex-only (admin cutover).
  const payload = await shadowTrafficReadout(createServerConvexClient()!);
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store", "x-data-backend": "convex" },
  });
}
