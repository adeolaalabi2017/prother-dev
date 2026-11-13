import { NextResponse } from "next/server";
import { guard, logAudit } from "@/lib/admin";
import { shadowAdminOverview } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/overview — dashboard payload for the /admin route
 * (PRD F-49 admin dashboard). Directory metrics, 14-day charts and queue
 * age come from D1 (SQL aggregates); the audit trail from Convex.
 */
export async function GET(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;

  // logAudit is Convex-first (lib/admin.ts), so the audit trail keeps
  // growing in Convex; shadowAdminOverview reads it back from there.
  logAudit("admin.view", "overview");
  const payload = await shadowAdminOverview(createServerConvexClient()!);
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store", "x-data-backend": "d1" },
  });
}
