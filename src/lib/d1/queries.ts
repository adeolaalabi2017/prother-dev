/**
 * D1 read ports of the hottest Convex queries (migration wave 1).
 * Same return shapes as convex/tools.ts homepage + convex/site.ts get so
 * src/lib/data.ts can swap backends without touching callers.
 */
import { asc, desc, eq } from "drizzle-orm";
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
  const [settingsRows, toolRows, catRows] = await Promise.all([
    db.select().from(siteSettings),
    db.select({ id: tools.id }).from(tools).where(eq(tools.status, "live")),
    db.select({ id: categories.id }).from(categories),
  ]);
  // Empty local preview D1 (workerd) must fall back to Convex; real D1 has rows.
  if (toolRows.length === 0 && catRows.length === 0) return null;
  return {
    settings: Object.fromEntries(settingsRows.map((r) => [r.key, r.value])),
    stats: {
      tools: toolRows.length,
      categories: catRows.length,
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
    logoEmoji: string;
    logoGradient: string;
    logoUrl: string | null;
    pricingModel: string;
    category: { slug: string; name: string; emoji: string };
  }[];
  tagCounts: Record<string, number>;
} | null> {
  const db = await getD1();
  if (!db) return null;
  const [catRows, live] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
    db.select().from(tools).where(eq(tools.status, "live")),
  ]);
  if (live.length === 0) return null;
  const catById = new Map(catRows.map((c) => [c.id, c]));
  const bySlug = new Map<string, number>();
  const tagCounts = new Map<string, number>();
  for (const t of live) {
    const slug = catById.get(t.categoryId)?.slug;
    if (slug) bySlug.set(slug, (bySlug.get(slug) ?? 0) + 1);
    for (const raw of parseArr(t.tagsJson)) {
      const tag = raw.trim().toLowerCase();
      if (tag) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const picks = live
    .filter((t) => t.editorsPick === 1)
    .sort((a, b) => b.pinned - a.pinned || b.createdAt - a.createdAt)
    .slice(0, 6)
    .map((t) => {
      const cat = catById.get(t.categoryId)!;
      return {
        slug: t.slug,
        name: t.name,
        tagline: t.tagline,
        logoEmoji: t.logoEmoji,
        logoGradient: t.logoGradient,
        logoUrl: t.logoUrl,
        pricingModel: t.pricingModel,
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
  const live = await db
    .select()
    .from(tools)
    .where(eq(tools.status, "live"))
    .orderBy(desc(tools.createdAt));
  const inCat = live.filter((t) => t.categoryId === cat.id);
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
