import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/admin";
import { shadowAdminUsers } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/**
 * Admin — forum user management (Task 23).
 *  GET /api/admin/users?q=&status=&role= — searchable roster + activity counts.
 */
export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  const sp = req.nextUrl.searchParams;
  // Convex-only (admin cutover): roster + activity counts from Convex.
  try {
    const res = await shadowAdminUsers(createServerConvexClient()!, {
      q: sp.get("q") ?? "",
      status: sp.get("status") ?? "",
      role: sp.get("role") ?? "",
    });
    return NextResponse.json(res, {
      headers: { "Cache-Control": "no-store", "x-data-backend": "convex" },
    });
  } catch (err) {
    console.error("[api:admin/users] GET failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
