/**
 * D1 read ports, wave 2: directory, search, sitemap, category detail.
 * Return shapes match convex/tools.ts (patched), convex/search.ts,
 * convex/seo.ts sitemapData, and convex/categories.ts detail so
 * src/lib/data.ts can swap backends without touching callers.
 */
import { eq } from "drizzle-orm";
import { getD1 } from "./client";
import { categories, forumThreads, posts, tools } from "./schema";

export function parseArr(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function isoFromMs(ms: number): string {
  return new Date(ms).toISOString();
}

function docId(d: { id: string; legacyId: string | null }): string {
  return d.legacyId ?? d.id;
}

// ── Token matcher (convex/shared.ts verbatim semantics) ──
function tokenize(q: string): string[] {
  return Array.from(
    new Set(
      q
        .toLowerCase()
        .split(/[^a-z0-9+#.]+/)
        .filter((t) => t.length > 0),
    ),
  );
}

function stem(token: string): string {
  if (token.length < 5) return token;
  const stripped = token.replace(/(ing|ed|es|s)$/, "");
  return stripped.length >= 3 ? stripped : token;
}

function hitsField(token: string, field: string | null | undefined): boolean {
  if (!field) return false;
  const f = field.toLowerCase();
  if (f.includes(token)) return true;
  const s = stem(token);
  return s !== token && f.includes(s);
}

function matchTokens(fields: (string | null | undefined)[], tokens: string[]): boolean {
  if (tokens.length === 0) return false;
  return tokens.every((tok) => fields.some((f) => hitsField(tok, f)));
}

function scoreVariant(v: string, name: string, tagline: string, tags: string, description: string): number {
  if (name.startsWith(v)) return 100;
  if (name.includes(v)) return 80;
  if (tagline.includes(v)) return 55;
  if (tags.includes(v)) return 40;
  if (description.includes(v)) return 25;
  return 0;
}

function relevanceScore(
  tokens: string[],
  fields: { name: string; tagline: string; tags: string; description: string | null },
): number {
  const n = fields.name.toLowerCase();
  const tg = fields.tagline.toLowerCase();
  const tgs = fields.tags.toLowerCase();
  const d = (fields.description ?? "").toLowerCase();
  let sum = 0;
  for (const tok of tokens) {
    const s = stem(tok);
    const score = Math.max(
      scoreVariant(tok, n, tg, tgs, d),
      s !== tok ? scoreVariant(s, n, tg, tgs, d) : 0,
    );
    sum += score > 0 ? score : 10;
  }
  return sum;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function ciContains(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

const PRICING_LABEL: Record<string, string> = {
  free: "Free",
  freemium: "Freemium",
  paid: "Paid",
  open_source: "Open Source",
};

function pricingChip(model: string, price?: string | null): string {
  const label = PRICING_LABEL[model] ?? "Free";
  if ((model === "paid" || model === "freemium") && price) return `${label} ${price}`;
  return label;
}

type ToolRow = typeof tools.$inferSelect;
type CatRow = typeof categories.$inferSelect;

function avgDenorm(t: ToolRow): number | null {
  return t.reviewCount > 0 ? t.ratingSumX100 / 100 / t.reviewCount : null;
}

// ── Directory ──
export async function d1Directory(args: {
  categorySlug: string | null;
  q: string | null;
  pricing: string | null;
  tag: string | null;
  sort: "featured" | "newest" | "top-rated" | "trending";
  page: number;
  pageSize: number;
}) {
  const db = await getD1();
  if (!db) return null;
  const { categorySlug, q, pricing, tag, sort, page, pageSize } = args;
  const safePageSize = Math.min(Math.max(1, pageSize), 48);
  const safePage = Math.min(Math.max(1, page), 100);

  const [catRows, live] = await Promise.all([
    db.select().from(categories),
    db.select().from(tools).where(eq(tools.status, "live")),
  ]);
  if (live.length === 0) return null;
  const catById = new Map(catRows.map((c) => [c.id, c]));
  const category = categorySlug ? (catRows.find((c) => c.slug === categorySlug) ?? null) : null;
  if (categorySlug && !category) return { error: "category_not_found" as const };

  const qTokens = q ? tokenize(q) : [];
  const matching = live.filter((t) => {
    if (category && t.categoryId !== category.id) return false;
    if (pricing && t.pricingModel !== pricing) return false;
    if (tag && !ciContains(parseArr(t.tagsJson).join("|"), tag)) return false;
    if (
      qTokens.length > 0 &&
      !matchTokens([t.name, t.tagline, parseArr(t.tagsJson).join(" "), t.description], qTokens)
    )
      return false;
    return true;
  });

  if (sort === "newest") {
    matching.sort((a, b) => b.createdAt - a.createdAt);
  } else if (sort === "top-rated") {
    matching.sort((a, b) => {
      const aa = avgDenorm(a);
      const bb = avgDenorm(b);
      if (aa == null && bb == null) return b.createdAt - a.createdAt;
      if (aa == null) return 1;
      if (bb == null) return -1;
      return bb - aa || b.createdAt - a.createdAt;
    });
  } else if (sort === "trending") {
    const score = (t: ToolRow) => t.commentCount * 3 + t.reviewCount * 5 + t.reviewCount * 0.5;
    matching.sort((a, b) => round1(score(b)) - round1(score(a)) || b.createdAt - a.createdAt);
  } else {
    matching.sort((a, b) => {
      if (qTokens.length > 0) {
        const scoreA = relevanceScore(qTokens, {
          name: a.name,
          tagline: a.tagline,
          tags: parseArr(a.tagsJson).join(" "),
          description: a.description,
        });
        const scoreB = relevanceScore(qTokens, {
          name: b.name,
          tagline: b.tagline,
          tags: parseArr(b.tagsJson).join(" "),
          description: b.description,
        });
        if (scoreB !== scoreA) return scoreB - scoreA;
      }
      return (
        Number(b.pinned) - Number(a.pinned) ||
        Number(b.editorsPick) - Number(a.editorsPick) ||
        Number(b.curated) - Number(a.curated) ||
        b.createdAt - a.createdAt
      );
    });
  }

  const total = matching.length;
  const pages = Math.max(1, Math.ceil(total / safePageSize));
  const pageTools = matching.slice((safePage - 1) * safePageSize, safePage * safePageSize);
  const rows = pageTools.map((t) => {
    const cat = catById.get(t.categoryId)!;
    const commentCount = t.commentCount ?? 0;
    const editorsPick = t.editorsPick === 1;
    const curated = t.curated === 1;
    return {
      slug: t.slug,
      name: t.name,
      tagline: t.tagline,
      emoji: t.logoEmoji,
      gradient: t.logoGradient,
      pricing: { model: t.pricingModel, price: t.startingPrice, note: t.pricingNote },
      category: { slug: cat.slug, name: cat.name, emoji: cat.emoji },
      editorsPick,
      curated,
      badges: {
        editorsPick,
        curated,
        unclaimed: !t.claimed,
        hasApi: t.hasApi === 1,
        openSource: t.pricingModel === "open_source",
      },
      logoUrl: t.logoUrl,
      ...(commentCount > 0 ? { comments: commentCount } : {}),
      listedAt: isoFromMs(t.createdAt),
      reviews: { count: t.reviewCount ?? 0 },
    };
  });

  return {
    rows,
    total,
    page: safePage,
    pages,
    ...(category
      ? {
          categoryMeta: {
            slug: category.slug,
            name: category.name,
            emoji: category.emoji,
            count: live.filter((t) => t.categoryId === category.id).length,
          },
        }
      : {}),
  };
}

// ── Search ──
export async function d1Search(q: string) {
  const db = await getD1();
  if (!db) return null;
  const [catRows, allTools, pubPosts] = await Promise.all([
    db.select().from(categories),
    db.select().from(tools),
    db.select().from(posts).where(eq(posts.status, "published")),
  ]);
  if (allTools.length === 0) return null;
  const liveTools = allTools.filter((t) => t.status === "live");
  const toolTotal = liveTools.length;
  const postTotal = pubPosts.length;
  if (!q) {
    return { q, tools: [], categories: [], posts: [], counts: { tools: toolTotal, posts: postTotal } };
  }
  const tokens = tokenize(q);
  const catById = new Map(catRows.map((c) => [c.id, c]));
  const countByCat = new Map<string, number>();
  for (const t of allTools) countByCat.set(t.categoryId, (countByCat.get(t.categoryId) ?? 0) + 1);

  const toolHits = liveTools
    .filter((t) => {
      const cat = catById.get(t.categoryId);
      return matchTokens(
        [t.name, t.tagline, parseArr(t.tagsJson).join(" "), t.description, cat?.name, cat?.slug],
        tokens,
      );
    })
    .map((t) => ({
      t,
      score: relevanceScore(tokens, {
        name: t.name,
        tagline: t.tagline,
        tags: parseArr(t.tagsJson).join(" "),
        description: t.description,
      }),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.t.editorsPick) - Number(a.t.editorsPick) ||
        b.t.createdAt - a.t.createdAt,
    )
    .slice(0, 10)
    .map(({ t }) => {
      const cat = catById.get(t.categoryId)!;
      return {
        slug: t.slug,
        name: t.name,
        tagline: t.tagline,
        emoji: t.logoEmoji,
        gradient: t.logoGradient,
        logoUrl: t.logoUrl,
        editorsPick: t.editorsPick === 1,
        pricing: { model: t.pricingModel, price: t.startingPrice },
        category: { slug: cat.slug, name: cat.name, emoji: cat.emoji },
      };
    });

  const categoryHits = catRows
    .filter((c) => matchTokens([c.name, c.slug], tokens))
    .sort(
      (a, b) =>
        (countByCat.get(b.id) ?? 0) - (countByCat.get(a.id) ?? 0) || a.sortOrder - b.sortOrder,
    )
    .slice(0, 4)
    .map((c) => ({ slug: c.slug, name: c.name, emoji: c.emoji, count: countByCat.get(c.id) ?? 0 }));

  const postHits = [...pubPosts]
    .sort((a, b) => (b.publishedAt ?? -1) - (a.publishedAt ?? -1))
    .filter((p) => matchTokens([p.title, p.excerpt, parseArr(p.tagsJson).join("|")], tokens))
    .slice(0, 3)
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      coverEmoji: p.coverEmoji,
      coverGradient: p.coverGradient,
      category: p.category,
      readingMinutes: p.readingMinutes,
    }));

  return {
    q,
    tools: toolHits,
    categories: categoryHits,
    posts: postHits,
    counts: { tools: toolTotal, posts: postTotal },
  };
}

// ── Sitemap ──
export async function d1SitemapData() {
  const db = await getD1();
  if (!db) return null;
  const [liveTools, catRows, pubPosts, threads] = await Promise.all([
    db.select().from(tools).where(eq(tools.status, "live")),
    db.select().from(categories),
    db.select().from(posts).where(eq(posts.status, "published")),
    db.select().from(forumThreads),
  ]);
  if (liveTools.length === 0) return null;
  return {
    tools: liveTools
      .slice(0, 5000)
      .map((t) => ({ slug: t.slug, createdAt: isoFromMs(t.createdAt) })),
    categories: catRows.map((c) => ({ slug: c.slug })),
    posts: pubPosts.slice(0, 1000).map((p) => ({
      slug: p.slug,
      updatedAt: isoFromMs(p.updatedAt),
      publishedAt: p.publishedAt != null ? isoFromMs(p.publishedAt) : null,
    })),
    threads: threads
      .filter((t) => !t.hidden)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 500)
      .map((t) => ({
        slug: t.slug,
        createdAt: isoFromMs(t.createdAt),
        updatedAt: isoFromMs(t.updatedAt),
      })),
  };
}

// ── Category detail (matches convex/categories.ts detail exactly) ──
export async function d1CategoryDetail2(slug: string) {
  const db = await getD1();
  if (!db) return null;
  const cat = (await db.select().from(categories).where(eq(categories.slug, slug)).limit(1))[0] as
    | CatRow
    | undefined;
  if (!cat) return { error: "not_found" as const };
  const live = await db.select().from(tools).where(eq(tools.status, "live"));
  if (live.length === 0 && (await db.select({ id: categories.id }).from(categories)).length === 0)
    return null;
  const inCat = live
    .filter((t) => t.categoryId === cat.id)
    .sort(
      (a, b) =>
        b.pinned - a.pinned ||
        Number(b.editorsPick) - Number(a.editorsPick) ||
        b.createdAt - a.createdAt,
    );
  return {
    category: {
      id: docId(cat),
      slug: cat.slug,
      name: cat.name,
      emoji: cat.emoji,
      toolCount: inCat.length,
    },
    tools: inCat.map((t) => ({
      slug: t.slug,
      name: t.name,
      tagline: t.tagline,
      emoji: t.logoEmoji,
      gradient: t.logoGradient,
      logoUrl: t.logoUrl,
      pricing: pricingChip(t.pricingModel, t.startingPrice),
      editorsPick: t.editorsPick === 1,
    })),
  };
}
