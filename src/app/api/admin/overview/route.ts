import { NextResponse } from "next/server";
import { guard, logAudit } from "@/lib/admin";
import { shadowAdminOverview } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/overview — dashboard payload for the /admin route
 * (PRD F-49 admin dashboard). Convex-only (admin cutover): directory
 * metrics, 14-day charts, queue age, and the Convex audit trail.
 */
export async function GET(req: Request) {
  const denied = guard(req);
  if (denied) return denied;

  // Convex-only (admin cutover). logAudit is Convex-first (lib/admin.ts),
  // so the audit trail keeps growing in Convex.
  logAudit("admin.view", "overview");
  const payload = await shadowAdminOverview(createServerConvexClient()!);
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store", "x-data-backend": "convex" },
  });
}
