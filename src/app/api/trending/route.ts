import { NextResponse } from "next/server";
import { db } from "@/lib/prother";
import { trendingScores } from "@/lib/trending";
import type { TrendingWindow } from "@/lib/trending";

export const dynamic = "force-dynamic";

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

  const scores = await trendingScores(window);

  const live = await db.tool.findMany({
    where: { status: "live" },
    select: {
      slug: true,
      name: true,
      tagline: true,
      logoEmoji: true,
      logoGradient: true,
      category: { select: { slug: true, name: true, emoji: true } },
    },
  });

  const rows = live
    .map((t) => {
      const entry = scores.get(t.slug) ?? {
        score: 0,
        signals: { comments: 0, reviews: 0, saves: 0 },
      };
      return {
        slug: t.slug,
        name: t.name,
        tagline: t.tagline,
        emoji: t.logoEmoji,
        gradient: t.logoGradient,
        score: entry.score,
        signals: entry.signals,
        category: t.category,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return NextResponse.json(
    { window, rows },
    { headers: { "Cache-Control": "no-store" } }
  );
}
