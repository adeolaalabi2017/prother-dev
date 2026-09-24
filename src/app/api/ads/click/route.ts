import { NextRequest, NextResponse } from "next/server";
import { convexAdClick } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/**
 * Click tracking (Task 23): increments the campaign's click counter, then
 * 302s to the destination. Only http(s) URLs are redirectable.
 *  GET /api/ads/click?id=<campaignId>
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id || !/^[a-zA-Z0-9_-]{1,64}$/.test(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  // Convex-only (ads cutover): register + resolve destination. Either
  // counting alone still redirects — measurement must never break the click.
  try {
    const res = await convexAdClick(createServerConvexClient()!, { id });
    if (!res.clickUrl || !/^https?:\/\//i.test(res.clickUrl)) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.redirect(res.clickUrl, {
      status: 302,
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "x-data-backend": "convex",
      },
    });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
