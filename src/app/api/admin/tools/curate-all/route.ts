import { NextResponse } from "next/server";
import { guard, logAudit } from "@/lib/admin";
import { convexAdminMarkAllCurated } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/tools/curate-all — mark every listing curated (launch
 * state: no founder/editor makers registered, the directory vouches for
 * every tool). Idempotent; returns { updated, total }.
 */
export async function POST(req: Request) {
  const denied = guard(req);
  if (denied) return denied;
  try {
    const res = await convexAdminMarkAllCurated(createServerConvexClient()!);
    logAudit("tool.bulk-curate", "tool", "", `${res.updated}/${res.total}`);
    return NextResponse.json(res, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[api:admin/tools/curate-all] failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
