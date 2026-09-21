import { NextResponse } from "next/server";
import { db } from "@/lib/prother";
import { blurbFor } from "@/lib/category-blurbs";
import { trendingScores } from "@/lib/trending";
import { commentCountsByTool } from "@/lib/discussion";
import type { TrendingWindow } from "@/lib/trending";

export const dynamic = "force-dynamic";

/** Public directory row (F-02/03/05) — consumed by the explorer + SEO pages. */
export type DirectoryRow = {
  slug: string;
  name: string;
  tagline: string;
  emoji: string;
  gradient: string;
  votes: number;
  comments: number;
  maker: string;
  track: "editor_seed" | "community";
  pricing: { model: string; price: string | null };
  tags: string[];
  badges: {
    editorsPick: boolean;
    curated: boolean;
    relaunch: boolean;
    unclaimed: boolean;
    hasApi: boolean;
    openSource: boolean;
  };
  launchDate: string | null;
  category: { slug: string; name: string; emoji: string };
};

const PRICING_FILTERS = new Set(["free", "freemium", "paid", "open_source"]);
const SORTS = new Set(["votes", "top", "new", "trending"]);

/**
 * GET /api/tools — public directory (PRD F-02/03/05).
 * ?category=&q=&pricing=free|freemium|paid|open_source&tag=
 * &sort=votes|top|new|trending&window=week|month&limit=1..60
 * ("top" is an alias of "votes" — same ranking, friendlier name for the
 * /tools directory's segmented control.)
 * Only status="live" tools with launch.scheduled=false are listed.
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;

  const categorySlug = sp.get("category")?.trim() || null;
  const q = sp.get("q")?.trim() || null;
  const pricingRaw = sp.get("pricing")?.trim() || null;
  const pricing = pricingRaw && PRICING_FILTERS.has(pricingRaw) ? pricingRaw : null;
  const tag = sp.get("tag")?.trim() || null;
  const sortRaw = sp.get("sort")?.trim() || "votes";
  const sort = SORTS.has(sortRaw) ? (sortRaw === "top" ? "votes" : sortRaw) : "votes";
  const window: TrendingWindow = sp.get("window") === "month" ? "month" : "week";
  const limitRaw = Number.parseInt(sp.get("limit") ?? "", 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(60, Math.max(1, limitRaw)) : 40;

  // Validate the category before building the query — unknown slugs 404.
  let category: { slug: string; name: string; emoji: string } | null = null;
  if (categorySlug) {
    const cat = await db.category.findUnique({
      where: { slug: categorySlug },
      select: { slug: true, name: true, emoji: true },
    });
    if (!cat) {
      return NextResponse.json({ error: "category_not_found" }, { status: 404 });
    }
    category = cat;
  }

  const where = {
    status: "live" as const,
    launch: { is: { scheduled: false } },
    ...(category ? { category: { slug: category.slug } } : {}),
    ...(pricing ? { pricingModel: pricing } : {}),
    ...(tag ? { tags: { contains: tag } } : {}),
    ...(q
      ? {
          OR: [{ name: { contains: q } }, { tagline: { contains: q } }],
        }
      : {}),
  };

  const [tools, total] = await Promise.all([
    db.tool.findMany({
      where,
      include: {
        launch: { include: { _count: { select: { votes: true } } } },
        category: { select: { slug: true, name: true, emoji: true } },
      },
    }),
    db.tool.count({ where }),
  ]);

  type Scored = (typeof tools)[number] & { total: number; trending: number };
  const scored: Scored[] = tools.map((t) => ({
    ...t,
    total: (t.launch?.baseUpvotes ?? 0) + (t.launch?._count.votes ?? 0),
    trending: 0,
  }));

  if (sort === "trending") {
    const scores = await trendingScores(window);
    for (const s of scored) s.trending = scores.get(s.slug)?.score ?? 0;
  }

  scored.sort((a, b) => {
    if (sort === "new") {
      const ad = a.launch?.launchDate.getTime() ?? 0;
      const bd = b.launch?.launchDate.getTime() ?? 0;
      return bd - ad;
    }
    if (sort === "trending") return b.trending - a.trending;
    return b.total - a.total;
  });

  const top = scored.slice(0, limit);

  const commentCounts = await commentCountsByTool(top.map((t) => t.id));

  const rows: DirectoryRow[] = top.map((t) => ({
    slug: t.slug,
    name: t.name,
    tagline: t.tagline,
    emoji: t.logoEmoji,
    gradient: t.logoGradient,
    votes: t.total,
    comments: commentCounts.get(t.id) ?? 0,
    maker: t.makerHandle,
    track: t.track === "community" ? "community" : "editor_seed",
    pricing: { model: t.pricingModel, price: t.startingPrice },
    tags: t.tags.split("|").filter(Boolean),
    badges: {
      editorsPick: t.editorsPick,
      curated: t.curated,
      relaunch: t.relaunch,
      unclaimed: !t.claimed,
      hasApi: t.hasApi,
      openSource: t.pricingModel === "open_source",
    },
    launchDate: t.launch?.launchDate.toISOString() ?? null,
    category: t.category,
  }));

  // Category SEO meta — only when the request is scoped to one category.
  let categoryMeta: {
    slug: string;
    name: string;
    emoji: string;
    blurb: string;
    count: number;
  } | null = null;
  if (category) {
    const count = await db.tool.count({
      where: { status: "live", launch: { is: { scheduled: false } }, category: { slug: category.slug } },
    });
    categoryMeta = {
      slug: category.slug,
      name: category.name,
      emoji: category.emoji,
      blurb: blurbFor(category.slug, category.name),
      count,
    };
  }

  return NextResponse.json(
    { rows, total, ...(categoryMeta ? { categoryMeta } : {}) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
