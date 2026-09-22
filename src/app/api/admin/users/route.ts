import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/admin";
import { listManagedUsers } from "@/lib/users";

export const dynamic = "force-dynamic";

/**
 * Admin — forum user management (Task 23).
 *  GET /api/admin/users?q=&status=&role= — searchable roster + activity counts.
 */
export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  const sp = req.nextUrl.searchParams;
  try {
    const payload = await listManagedUsers({
      q: sp.get("q") ?? undefined,
      status: sp.get("status") ?? undefined,
      role: sp.get("role") ?? undefined,
    });
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[api:admin/users] GET failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
