import { NextResponse } from "next/server";
import { db } from "@/lib/prother";
import { matchTokens, relevanceScore, tokenize } from "@/lib/match";

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

/**
 * GET /api/search?q=<query> — unified discovery search for the hero search
 * bar (discovery-first moat). Returns grouped hits across the three searchable
 * surfaces: live tools (directory), categories (taxonomy) and the journal.
 * Only status="live" tools are matched, same as the public directory.
 *
 * Matching is TOKEN-based (shared matcher in lib/match): the query is split
 * into tokens and every token must hit some field, so the placeholder's own
 * suggested example — “translate video” — finds HeyGen instead of dead-ending.
 * The candidate set is small (the whole live directory), so filtering happens
 * in JS: deterministic case-insensitivity for free on SQLite.
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

  const tokens = tokenize(q);

  const [tools, categories, posts] = await Promise.all([
    db.tool.findMany({
      where: liveToolWhere,
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
      take: 500,
    }),
    db.category.findMany({
      include: { _count: { select: { tools: true } } },
    }),
    db.post.findMany({
      where: { status: "published" },
      orderBy: { publishedAt: "desc" },
      select: {
        slug: true,
        title: true,
        excerpt: true,
        coverEmoji: true,
        coverGradient: true,
        category: true,
        readingMinutes: true,
        tags: true,
      },
      take: 100,
    }),
  ]);

  const toolHits: SearchToolHit[] = tools
    .filter((t) =>
      matchTokens([t.name, t.tagline, t.tags, t.description], tokens)
    )
    .map((t) => ({
      t,
      score: relevanceScore(tokens, {
        name: t.name,
        tagline: t.tagline,
        tags: t.tags,
        description: t.description,
      }),
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
    .filter((c) => matchTokens([c.name, c.slug], tokens))
    .sort((a, b) => b._count.tools - a._count.tools)
    .slice(0, 4)
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      emoji: c.emoji,
      count: c._count.tools,
    }));

  const postHits: SearchPostHit[] = posts
    .filter((p) => matchTokens([p.title, p.excerpt, p.tags], tokens))
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

  const payload: SearchResponse = {
    q,
    tools: toolHits,
    categories: categoryHits,
    posts: postHits,
    counts: { tools: toolTotal, posts: postTotal },
  };

  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
