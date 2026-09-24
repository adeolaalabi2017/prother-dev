import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/admin";
import { shadowAdminReports } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/**
 * Admin — community reports queue (Task 23).
 *  GET /api/admin/reports?status=open|resolved|dismissed|all
 */
export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  const status = req.nextUrl.searchParams.get("status") ?? "all";
  // Convex-only (admin cutover): Prisma fallback removed.
  try {
    const res = await shadowAdminReports(createServerConvexClient()!, status);
    return NextResponse.json(res, {
      headers: { "Cache-Control": "no-store", "x-data-backend": "convex" },
    });
  } catch (err) {
    console.error("[api:admin/reports] GET failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
