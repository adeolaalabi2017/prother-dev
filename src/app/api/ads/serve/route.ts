import { NextRequest, NextResponse } from "next/server";
import { AD_PLACEMENTS, serveAd, type AdPlacement } from "@/lib/ads";
import { placementEnabled } from "@/lib/ad-config";

export const dynamic = "force-dynamic";

/**
 * Ad serving (Task 23; Task 27 adds serving-config gating).
 *  GET /api/ads/serve?placement=feed_row&category=<slug>
 *
 * Waterfall per the Task 26 plan:
 *  - serving disabled (ads.master / ads.placement.<key> = "0")
 *      → { ad: null, fallback: "none" }   — client collapses, no impression
 *  - no eligible campaign
 *      → { ad: null, fallback: "house" }  — client renders the house creative
 *  - campaign picked → weighted-random ACTIVE campaign in its flight window;
 *    one impression counted per call; clicks go through /api/ads/click so CTR
 *    is real.
 */
export async function GET(req: NextRequest) {
  const placementParam = req.nextUrl.searchParams.get("placement") ?? "feed_row";
  const placement = AD_PLACEMENTS.includes(placementParam as AdPlacement)
    ? (placementParam as AdPlacement)
    : "feed_row";
  const category = req.nextUrl.searchParams.get("category");

  const noStore = { headers: { "Cache-Control": "no-store" } };

  // Kill switch first — a disabled slot must not spend impressions.
  if (!(await placementEnabled(placement))) {
    return NextResponse.json({ ad: null, fallback: "none" }, noStore);
  }

  const res = await serveAd(placement, category);
  if (!res) {
    return NextResponse.json({ ad: null, fallback: "house" }, noStore);
  }
  return NextResponse.json(
    { ad: res.ad, clickHref: `/api/ads/click?id=${res.ad.id}` },
    noStore
  );
}
