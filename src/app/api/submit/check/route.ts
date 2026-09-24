import { NextRequest, NextResponse } from "next/server";
import { domainOf } from "@/lib/submit";
import { shadowSubmitCheck } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/**
 * GET /api/submit/check?url=…
 * PRD §11 duplicate interstitial: fires on Step-1 URL blur.
 * Checks submitted queue AND existing listings (1 submission per domain).
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url") ?? "";
  const domain = domainOf(url);
  if (!domain) {
    return NextResponse.json({
      valid: false,
      duplicate: null as null | {
        kind: string;
        name: string;
        slug?: string;
        maker?: string;
      },
    });
  }

  // Existing tool with the same domain wins the check.
  // Convex-only (submit cutover): the query covers queue + listings.
  try {
    const res = await shadowSubmitCheck(createServerConvexClient()!, domain);
    return NextResponse.json(res, {
      headers: { "x-data-backend": "convex" },
    });
  } catch (err) {
    console.error("[api:submit/check] failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
