import { NextRequest, NextResponse } from "next/server";
import { AD_PLACEMENTS, serveAd, type AdPlacement } from "@/lib/ads";

export const dynamic = "force-dynamic";

/**
 * Ad serving (Task 23).
 *  GET /api/ads/serve?placement=feed_row&category=<slug>
 *
 * Weighted-random ACTIVE campaign in its flight window; records one
 * impression per call. Clicks go through /api/ads/click?id= so CTR is real.
 */
export async function GET(req: NextRequest) {
  const placementParam = req.nextUrl.searchParams.get("placement") ?? "feed_row";
  const placement = AD_PLACEMENTS.includes(placementParam as AdPlacement)
    ? (placementParam as AdPlacement)
    : "feed_row";
  const category = req.nextUrl.searchParams.get("category");

  const res = await serveAd(placement, category);
  if (!res) {
    return NextResponse.json(
      { ad: null },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
  return NextResponse.json(
    { ad: res.ad, clickHref: `/api/ads/click?id=${res.ad.id}` },
    { headers: { "Cache-Control": "no-store" } }
  );
}
