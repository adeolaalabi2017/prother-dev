import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/admin";
import { listReports } from "@/lib/reports";

export const dynamic = "force-dynamic";

/**
 * Admin — community reports queue (Task 23).
 *  GET /api/admin/reports?status=open|resolved|dismissed|all
 */
export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  const status = req.nextUrl.searchParams.get("status") ?? "all";
  try {
    const payload = await listReports(status);
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[api:admin/reports] GET failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
