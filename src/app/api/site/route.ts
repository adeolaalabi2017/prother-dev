import { NextResponse } from "next/server";
import { db } from "@/lib/prother";

export const dynamic = "force-dynamic";

/**
 * GET /api/site — public site settings + headline directory stats.
 * The hero/announcement/footer consume this with in-code defaults as
 * fallback, so a missing/empty store never breaks the page. `stats` is
 * wrapped in try/catch — the hero renders even if the counters fail.
 */
export async function GET() {
  try {
    const rows = await db.siteSetting.findMany();

    let stats = { tools: 0, categories: 0, reviews: 0, comments: 0 };
    try {
      const [tools, categories, reviews, comments] = await Promise.all([
        db.tool.count({ where: { status: "live" } }),
        db.category.count(),
        // Review is a post-boot model → raw SQL (stale-PrismaClient rule).
        db.$queryRaw<{ n: number }[]>`
          SELECT COUNT(*) as n FROM Review WHERE status = 'published'`,
        db.comment.count(),
      ]);
      stats = {
        tools,
        categories,
        reviews: Number(reviews[0]?.n ?? 0),
        comments,
      };
    } catch {
      // Stats are decorative for the hero — zeroed defaults are fine.
    }

    return NextResponse.json(
      {
        settings: Object.fromEntries(rows.map((r) => [r.key, r.value])),
        stats,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    // Never 500 — the hero consumes this route on every page load.
    return NextResponse.json(
      { settings: {}, stats: { tools: 0, categories: 0, reviews: 0, comments: 0 } },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
