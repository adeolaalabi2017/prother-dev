import { NextResponse } from "next/server";
import { shadowSite } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";
import { dataBackendLabel } from "@/lib/d1/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/site — public site settings + headline directory stats.
 * The hero/announcement/footer consume this with in-code defaults as
 * fallback, so a missing/empty store never breaks the page.
 */
export async function GET() {
  try {
    const [payload, backend] = await Promise.all([
      shadowSite(createServerConvexClient()!),
      dataBackendLabel(),
    ]);
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        "x-data-backend": backend,
      },
    });
  } catch {
    // Never 500 — the hero consumes this route on every page load.
    return NextResponse.json(
      { settings: {}, stats: { tools: 0, categories: 0, reviews: 0, comments: 0 } },
      { headers: { "Cache-Control": "public, s-maxage=60" } }
    );
  }
}
