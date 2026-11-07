/**
 * D1 read ports of the hottest Convex queries (migration wave 1).
 * Same return shapes as convex/tools.ts homepage + convex/site.ts get so
 * src/lib/data.ts can swap backends without touching callers.
 */
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getD1 } from "./client";
import { categories, tools, siteSettings } from "./schema";

function parseArr(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export async function d1SiteGet(): Promise<{
  settings: Record<string, string>;
  stats: { tools: number; categories: number; reviews: number; comments: number };
} | null> {
  const db = await getD1();
  if (!db) return null;
  // Counts in SQL: this runs on every page, so never ship rows just to count.
  const [settingsRows, toolCount, catCount] = await Promise.all([
    db.select().from(siteSettings),
    db.select({ n: sql<number>`count(*)` }).from(tools).where(eq(tools.status, "live")),
    db.select({ n: sql<number>`count(*)` }).from(categories),
  ]);
  const nTools = Number(toolCount[0]?.n ?? 0);
  const nCats = Number(catCount[0]?.n ?? 0);
  // Empty local preview D1 (workerd) must fall back to Convex; real D1 has rows.
  if (nTools === 0 && nCats === 0) return null;
  return {
    settings: Object.fromEntries(settingsRows.map((r) => [r.key, r.value])),
    stats: {
      tools: nTools,
      categories: nCats,
      reviews: 0,
      comments: 0,
    },
  };
}

export async function d1Homepage(): Promise<{
  counts: { slug: string; count: number }[];
  picks: {
    slug: string;
    name: string;
    tagline: string;
    description?: string | null;
    logoEmoji: string;
    logoGradient: string;
    logoUrl: string | null;
    pricingModel: string;
    startingPrice?: string | null;
    pricingNote?: string | null;
    hasApi?: boolean;
    githubUrl?: string | null;
    tags?: string[];
    curated?: boolean;
    claimed?: boolean;
    category: { slug: string; name: string; emoji: string };
  }[];
  tagCounts: Record<string, number>;
} | null> {
  const db = await getD1();
  if (!db) return null;
  // Aggregate in SQL. This used to load every live tool row (all columns,
  // descriptions included) to count categories and tags and keep 6 picks,
  // which made the homepage the most CPU-expensive route on the Worker.
  const [catRows, catCounts, tagRows, pickRows] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
    db
      .select({ categoryId: tools.categoryId, n: sql<number>`count(*)` })
      .from(tools)
      .where(eq(tools.status, "live"))
      .groupBy(tools.categoryId),
    db.all<{ tag: string; n: number }>(sql`
      SELECT lower(trim(CAST(j.value AS TEXT))) AS tag, count(*) AS n
      FROM tools, json_each(tools.tags_json) AS j
      WHERE tools.status = 'live'
        AND json_valid(tools.tags_json)
        AND json_type(tools.tags_json) = 'array'
      GROUP BY tag
    `),
    db
      .select()
      .from(tools)
      .where(and(eq(tools.status, "live"), eq(tools.editorsPick, 1)))
      .orderBy(desc(tools.pinned), desc(tools.createdAt))
      .limit(6),
  ]);
  const totalLive = catCounts.reduce((sum, r) => sum + Number(r.n), 0);
  if (totalLive === 0) return null;
  const catById = new Map(catRows.map((c) => [c.id, c]));
  const countByCat = new Map(catCounts.map((r) => [r.categoryId, Number(r.n)]));
  const bySlug = new Map<string, number>(
    catRows.map((c) => [c.slug, countByCat.get(c.id) ?? 0]),
  );
  const tagCounts = new Map<string, number>();
  for (const r of tagRows) if (r.tag) tagCounts.set(r.tag, Number(r.n));
  const picks = pickRows
    .filter((t) => catById.has(t.categoryId))
    .map((t) => {
      const cat = catById.get(t.categoryId)!;
      return {
        slug: t.slug,
        name: t.name,
        tagline: t.tagline,
        description: t.description,
        logoEmoji: t.logoEmoji,
        logoGradient: t.logoGradient,
        logoUrl: t.logoUrl,
        pricingModel: t.pricingModel,
        startingPrice: t.startingPrice,
        pricingNote: t.pricingNote,
        hasApi: t.hasApi === 1,
        githubUrl: t.githubUrl,
        tags: parseArr(t.tagsJson),
        curated: t.curated === 1,
        claimed: t.claimed === 1,
        category: { slug: cat.slug, name: cat.name, emoji: cat.emoji },
      };
    });
  return {
    counts: catRows.map((c) => ({ slug: c.slug, count: bySlug.get(c.slug) ?? 0 })),
    picks,
    tagCounts: Object.fromEntries(tagCounts),
  };
}

export async function d1CategoryDetail(slug: string) {
  const db = await getD1();
  if (!db) return null;
  const cat = (
    await db.select().from(categories).where(eq(categories.slug, slug)).limit(1)
  )[0];
  if (!cat) return { error: "category_not_found" as const };
  const inCat = await db
    .select()
    .from(tools)
    .where(and(eq(tools.status, "live"), eq(tools.categoryId, cat.id)))
    .orderBy(desc(tools.createdAt));
  return {
    category: {
      slug: cat.slug,
      name: cat.name,
      emoji: cat.emoji,
      features: parseArr(cat.featuresJson),
    },
    tools: inCat.map((t) => ({
      slug: t.slug,
      name: t.name,
      tagline: t.tagline,
      logoEmoji: t.logoEmoji,
      logoGradient: t.logoGradient,
      logoUrl: t.logoUrl,
      pricingModel: t.pricingModel,
      startingPrice: t.startingPrice,
      editorsPick: t.editorsPick === 1,
      curated: t.curated === 1,
    })),
  };
}
