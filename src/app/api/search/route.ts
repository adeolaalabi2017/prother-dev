import { NextResponse } from "next/server";
import { db } from "@/lib/prother";

export const dynamic = "force-dynamic";

/** A scored tool hit for the hero search dropdown. */
export type SearchToolHit = {
  slug: string;
  name: string;
  tagline: string;
  emoji: string;
  gradient: string;
  editorsPick: boolean;
  pricing: { model: string; price: string | null };
  category: { slug: string; name: string; emoji: string };
};

export type SearchCategoryHit = {
  slug: string;
  name: string;
  emoji: string;
  count: number;
};

export type SearchPostHit = {
  slug: string;
  title: string;
  excerpt: string;
  coverEmoji: string;
  coverGradient: string;
  category: string;
  readingMinutes: number;
};

export type SearchResponse = {
  q: string;
  tools: SearchToolHit[];
  categories: SearchCategoryHit[];
  posts: SearchPostHit[];
  counts: { tools: number; posts: number };
};

/** Relevance score — name hits outrank tagline hits outrank tags/description. */
function relevance(ql: string, name: string, tagline: string, tags: string, description: string | null): number {
  const n = name.toLowerCase();
  if (n.startsWith(ql)) return 100;
  if (n.includes(ql)) return 80;
  if (tagline.toLowerCase().includes(ql)) return 55;
  if (tags.toLowerCase().includes(ql)) return 40;
  if ((description ?? "").toLowerCase().includes(ql)) return 25;
  return 10;
}

/**
 * GET /api/search?q=<query> — unified discovery search for the hero search
 * bar (discovery-first moat). Returns grouped hits across the three searchable
 * surfaces: live tools (directory), categories (taxonomy) and the journal.
 * Only status="live" tools are matched, same as the public directory.
 */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 64);

  const liveToolWhere = { status: "live" as const };

  const [toolTotal, postTotal] = await Promise.all([
    db.tool.count({ where: liveToolWhere }),
    db.post.count({ where: { status: "published" } }),
  ]);

  if (!q) {
    const empty: SearchResponse = {
      q,
      tools: [],
      categories: [],
      posts: [],
      counts: { tools: toolTotal, posts: postTotal },
    };
    return NextResponse.json(empty, { headers: { "Cache-Control": "no-store" } });
  }

  const ql = q.toLowerCase();

  const [tools, categories, posts] = await Promise.all([
    db.tool.findMany({
      where: {
        ...liveToolWhere,
        OR: [
          { name: { contains: q } },
          { tagline: { contains: q } },
          { tags: { contains: q } },
          { description: { contains: q } },
        ],
      },
      select: {
        slug: true,
        name: true,
        tagline: true,
        logoEmoji: true,
        logoGradient: true,
        editorsPick: true,
        pricingModel: true,
        startingPrice: true,
        tags: true,
        description: true,
        createdAt: true,
        category: { select: { slug: true, name: true, emoji: true } },
      },
      take: 40,
    }),
    db.category.findMany({
      include: { _count: { select: { tools: true } } },
    }),
    db.post.findMany({
      where: {
        status: "published",
        OR: [
          { title: { contains: q } },
          { excerpt: { contains: q } },
          { tags: { contains: q } },
        ],
      },
      orderBy: { publishedAt: "desc" },
      take: 3,
    }),
  ]);

  const toolHits: SearchToolHit[] = tools
    .map((t) => ({
      t,
      score: relevance(ql, t.name, t.tagline, t.tags, t.description),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.t.editorsPick) - Number(a.t.editorsPick) ||
        b.t.createdAt.getTime() - a.t.createdAt.getTime()
    )
    .slice(0, 10)
    .map(({ t }) => ({
      slug: t.slug,
      name: t.name,
      tagline: t.tagline,
      emoji: t.logoEmoji,
      gradient: t.logoGradient,
      editorsPick: t.editorsPick,
      pricing: { model: t.pricingModel, price: t.startingPrice },
      category: t.category,
    }));

  const categoryHits: SearchCategoryHit[] = categories
    .filter((c) => c.name.toLowerCase().includes(ql) || c.slug.includes(ql))
    .sort((a, b) => b._count.tools - a._count.tools)
    .slice(0, 4)
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      emoji: c.emoji,
      count: c._count.tools,
    }));

  const postHits: SearchPostHit[] = posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    coverEmoji: p.coverEmoji,
    coverGradient: p.coverGradient,
    category: p.category,
    readingMinutes: p.readingMinutes,
  }));

  const payload: SearchResponse = {
    q,
    tools: toolHits,
    categories: categoryHits,
    posts: postHits,
    counts: { tools: toolTotal, posts: postTotal },
  };

  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
