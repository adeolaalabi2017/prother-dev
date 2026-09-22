import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/prother";
import type { Badge } from "@/lib/prother";
import { blurbFor } from "@/lib/category-blurbs";
import { trendingScores } from "@/lib/trending";
import { commentCountsByTool } from "@/lib/discussion";

export const dynamic = "force-dynamic";

/** Public directory row (F-02/03/05) — consumed by the explorer + SEO pages. */
export type DirectoryRow = {
  slug: string;
  name: string;
  tagline: string;
  emoji: string;
  gradient: string;
  pricing: { model: string; price: string | null; note: string | null };
  category: { slug: string; name: string; emoji: string };
  editorsPick: boolean;
  curated: boolean;
  badges: Badge;
  /** Present only when the listing has discussion (count > 0). */
  comments?: number;
  /** ISO date the tool was listed in the directory. */
  listedAt: string;
  reviews: { count: number };
};

const PRICING_FILTERS = new Set(["free", "freemium", "paid", "open_source"]);
const SORTS = new Set(["featured", "newest", "top-rated", "trending"]);

/**
 * GET /api/tools — public directory (PRD F-02/03/05).
 * ?category=&q=&pricing=free|freemium|paid|open_source&tag=
 * &page=1..&pageSize=1..60
 * &sort=featured|newest|top-rated|trending
 *  · featured (default) — pinned, then Editor's Picks, then curated,
 *    then newest listings first
 *  · newest — createdAt desc
 *  · top-rated — published-review average of (ease+power+value)/3 via a
 *    raw LEFT JOIN aggregate; listings with 0 reviews rank last
 *  · trending — 7-day engagement score (comments/reviews/saves) from
 *    lib/trending
 * Only status="live" tools are listed.
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;

  const categorySlug = sp.get("category")?.trim() || null;
  const q = sp.get("q")?.trim() || null;
  const pricingRaw = sp.get("pricing")?.trim() || null;
  const pricing = pricingRaw && PRICING_FILTERS.has(pricingRaw) ? pricingRaw : null;
  const tag = sp.get("tag")?.trim() || null;
  const sortRaw = sp.get("sort")?.trim() || "featured";
  const sort = SORTS.has(sortRaw) ? sortRaw : "featured";
  const pageRaw = Number.parseInt(sp.get("page") ?? "", 10);
  const page = Number.isFinite(pageRaw) ? Math.max(1, pageRaw) : 1;
  const pageSizeRaw = Number.parseInt(sp.get("pageSize") ?? "", 10);
  const pageSize = Number.isFinite(pageSizeRaw) ? Math.min(60, Math.max(1, pageSizeRaw)) : 40;

  // Validate the category before building the query — unknown slugs 404.
  let category: { id: string; slug: string; name: string; emoji: string } | null = null;
  if (categorySlug) {
    const cat = await db.category.findUnique({
      where: { slug: categorySlug },
      select: { id: true, slug: true, name: true, emoji: true },
    });
    if (!cat) {
      return NextResponse.json({ error: "category_not_found" }, { status: 404 });
    }
    category = cat;
  }

  const where = {
    status: "live" as const,
    ...(category ? { categoryId: category.id } : {}),
    ...(pricing ? { pricingModel: pricing } : {}),
    ...(tag ? { tags: { contains: tag } } : {}),
    ...(q
      ? {
          OR: [{ name: { contains: q } }, { tagline: { contains: q } }],
        }
      : {}),
  };

  const toolSelect = {
    id: true,
    slug: true,
    name: true,
    tagline: true,
    logoEmoji: true,
    logoGradient: true,
    pricingModel: true,
    startingPrice: true,
    pricingNote: true,
    editorsPick: true,
    curated: true,
    claimed: true,
    hasApi: true,
    createdAt: true,
    category: { select: { slug: true, name: true, emoji: true } },
  } as const;

  let pageTools: {
    id: string;
    slug: string;
    name: string;
    tagline: string;
    logoEmoji: string;
    logoGradient: string;
    pricingModel: string;
    startingPrice: string | null;
    pricingNote: string | null;
    editorsPick: boolean;
    curated: boolean;
    claimed: boolean;
    hasApi: boolean;
    createdAt: Date;
    category: { slug: string; name: string; emoji: string };
  }[];

  if (sort === "top-rated") {
    // Raw SQL LEFT JOIN: AVG((ease+power+value)/3.0) over published reviews.
    // 0-review listings sort last (avgRating IS NULL), then newest first.
    // (LEFT JOIN cannot change WHICH tools match — the count below uses the
    // same Tool-only `where`.)
    const conditions: Prisma.Sql[] = [Prisma.sql`t.status = 'live'`];
    if (category) conditions.push(Prisma.sql`t.categoryId = ${category.id}`);
    if (pricing) conditions.push(Prisma.sql`t.pricingModel = ${pricing}`);
    if (tag) conditions.push(Prisma.sql`t.tags LIKE ${`%${tag}%`}`);
    if (q)
      conditions.push(
        Prisma.sql`(t.name LIKE ${`%${q}%`} OR t.tagline LIKE ${`%${q}%`})`
      );

    const ranked = await db.$queryRaw<{ id: string }[]>`
      SELECT t.id
      FROM Tool t
      LEFT JOIN Review r ON r.toolId = t.id AND r.status = 'published'
      WHERE ${Prisma.join(conditions, " AND ")}
      GROUP BY t.id
      ORDER BY (AVG((r.ease + r.power + r.value) / 3.0)) IS NULL ASC,
               (AVG((r.ease + r.power + r.value) / 3.0)) DESC,
               t.createdAt DESC
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;

    const byId = new Map(
      ranked.map((r, i) => [r.id, i])
    );
    const rows = await db.tool.findMany({
      where: { id: { in: [...byId.keys()] } },
      select: toolSelect,
    });
    pageTools = rows.sort(
      (a, b) => (byId.get(a.id) ?? 0) - (byId.get(b.id) ?? 0)
    );
  } else if (sort === "trending") {
    const [all, scores] = await Promise.all([
      db.tool.findMany({ where, select: toolSelect }),
      trendingScores("week"),
    ]);
    pageTools = all
      .map((t) => ({ t, score: scores.get(t.slug)?.score ?? 0 }))
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.t.createdAt.getTime() - a.t.createdAt.getTime()
      )
      .slice((page - 1) * pageSize, page * pageSize)
      .map(({ t }) => t);
  } else {
    pageTools = await db.tool.findMany({
      where,
      select: toolSelect,
      orderBy:
        sort === "newest"
          ? [{ createdAt: "desc" }]
          : [
              { pinned: "desc" },
              { editorsPick: "desc" },
              { curated: "desc" },
              { createdAt: "desc" },
            ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  const [total, commentCounts, reviewCounts] = await Promise.all([
    db.tool.count({ where }),
    commentCountsByTool(pageTools.map((t) => t.id)),
    publishedReviewCounts(pageTools.map((t) => t.id)),
  ]);

  const rows: DirectoryRow[] = pageTools.map((t) => {
    const commentCount = commentCounts.get(t.id) ?? 0;
    return {
      slug: t.slug,
      name: t.name,
      tagline: t.tagline,
      emoji: t.logoEmoji,
      gradient: t.logoGradient,
      pricing: { model: t.pricingModel, price: t.startingPrice, note: t.pricingNote },
      category: t.category,
      editorsPick: t.editorsPick,
      curated: t.curated,
      badges: {
        editorsPick: t.editorsPick,
        curated: t.curated,
        unclaimed: !t.claimed,
        hasApi: t.hasApi,
        openSource: t.pricingModel === "open_source",
      },
      ...(commentCount > 0 ? { comments: commentCount } : {}),
      listedAt: t.createdAt.toISOString(),
      reviews: { count: reviewCounts.get(t.id) ?? 0 },
    };
  });

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
      where: { status: "live", category: { slug: category.slug } },
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
    {
      rows,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / pageSize)),
      ...(categoryMeta ? { categoryMeta } : {}),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/** Published review counts per tool id (Review is a post-boot model → raw). */
async function publishedReviewCounts(
  toolIds: string[]
): Promise<Map<string, number>> {
  if (toolIds.length === 0) return new Map();
  const rows = await db.$queryRaw<{ toolId: string; n: number }[]>`
    SELECT toolId, COUNT(*) as n
    FROM Review
    WHERE status = 'published' AND toolId IN (${Prisma.join(toolIds)})
    GROUP BY toolId`;
  return new Map(rows.map((r) => [r.toolId, Number(r.n)]));
}
