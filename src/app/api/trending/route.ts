import { NextResponse } from "next/server";
import { shadowTrending } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

type TrendingWindow = "week" | "month";

/**
 * GET /api/trending — most-engaged live tools over a rolling window (F-06).
 * Score = recent comments/reviews/collection saves + editorial bonus (no
 * votes). ?window=week|month (default week) &limit=1..24 (default 12).
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const window: TrendingWindow = sp.get("window") === "month" ? "month" : "week";
  const limitRaw = Number.parseInt(sp.get("limit") ?? "", 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(24, Math.max(1, limitRaw)) : 12;

  try {
    const payload = await shadowTrending(createServerConvexClient()!, window, limit);
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store", "x-data-backend": "convex" },
    });
  } catch (err) {
    console.error("[api:trending] failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
