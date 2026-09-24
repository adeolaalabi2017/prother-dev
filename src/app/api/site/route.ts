import { NextResponse } from "next/server";
import { shadowSite } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/**
 * GET /api/site — public site settings + headline directory stats.
 * The hero/announcement/footer consume this with in-code defaults as
 * fallback, so a missing/empty store never breaks the page.
 */
export async function GET() {
  try {
    const payload = await shadowSite(createServerConvexClient()!);
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store", "x-data-backend": "convex" },
    });
  } catch {
    // Never 500 — the hero consumes this route on every page load.
    return NextResponse.json(
      { settings: {}, stats: { tools: 0, categories: 0, reviews: 0, comments: 0 } },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
