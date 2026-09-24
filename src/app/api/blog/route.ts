import { NextRequest, NextResponse } from "next/server";
import { shadowBlog } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/**
 * GET /api/blog — published journal posts (public).
 * Query: ?limit=6&category=Playbooks
 * Powers the on-page Journal section and any embeds. Drafts never leak.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const limit = Math.min(24, Math.max(1, Number(sp.get("limit") ?? 12)));
  const category = sp.get("category");

  try {
    const payload = await shadowBlog(createServerConvexClient()!, limit, category);
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store", "x-data-backend": "convex" },
    });
  } catch (err) {
    console.error("[api:blog] failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
