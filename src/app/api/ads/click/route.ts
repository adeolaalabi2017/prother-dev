import { NextRequest, NextResponse } from "next/server";
import { recordClick } from "@/lib/ads";

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

  const url = await recordClick(id).catch(() => null);
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.redirect(url, {
    status: 302,
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
