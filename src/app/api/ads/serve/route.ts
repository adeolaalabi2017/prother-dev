import { NextRequest, NextResponse } from "next/server";
import { AD_PLACEMENTS, type AdPlacement } from "@/lib/ads";
import { placementEnabled } from "@/lib/ad-config";
import { convexAdServe } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/**
 * Ad serving (Task 23; Task 27 adds serving-config gating).
 *  GET /api/ads/serve?placement=directory_banner&category=<slug>
 *  (placement defaults to directory_banner; invalid values fall back to it)
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
  const placementParam =
    req.nextUrl.searchParams.get("placement") ?? "directory_banner";
  const placement = AD_PLACEMENTS.includes(placementParam as AdPlacement)
    ? (placementParam as AdPlacement)
    : "directory_banner";
  const category = req.nextUrl.searchParams.get("category");

  const noStore = { headers: { "Cache-Control": "no-store" } };

  // Kill switch first — a disabled slot must not spend impressions (and is
  // NOT an unfilled slot — nothing was requested).
  if (!(await placementEnabled(placement))) {
    return NextResponse.json({ ad: null, fallback: "none" }, noStore);
  }

  // Convex-only (ads cutover): pick + impression + fill atomically.
  const client = createServerConvexClient()!;
  const res = await convexAdServe(client, {
    placement,
    category: category ?? undefined,
  });
  if (!res.ad) {
    return NextResponse.json(
      { ad: null, fallback: res.fallback },
      {
        headers: { "Cache-Control": "no-store", "x-data-backend": "convex" },
      },
    );
  }
  return NextResponse.json(
    { ad: res.ad, clickHref: res.clickHref },
    {
      headers: { "Cache-Control": "no-store", "x-data-backend": "convex" },
    },
  );
}
