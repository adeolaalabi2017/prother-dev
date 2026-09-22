import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/admin";
import { getTrafficReadout } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/analytics — first-party traffic readout for the admin
 * Overview "Traffic" card: 14-day daily totals + top paths. Aggregated,
 * cookieless data only (that is all PageViewDaily holds).
 */
export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  try {
    const payload = await getTrafficReadout();
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[api:admin/analytics] GET failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
