/**
 * Convex read: unified discovery search.
 * Shadows GET /api/search — same token matcher (./shared.ts, ported from
 * lib/match.ts), same ranking, same slices (10 tools / 4 categories / 3
 * posts). Compatibility notes:
 * - Prisma tags are pipe STRINGS; Convex stores arrays — joined with "|" so
 *   matching semantics are identical.
 * - Category `count` uses ALL tools per category (Prisma _count has no
 *   status filter); the tool query itself is live-only.
 */
import { query } from "./_generated/server";
import { v } from "convex/values";
import { matchTokens, relevanceScore, tokenize } from "./shared";

export const search = query({
  args: { q: v.string() },
  handler: async (ctx, { q }) => {
    const [liveTools, categories, allTools, posts] = await Promise.all([
      ctx.db
        .query("tools")
        .withIndex("by_status_category", (q) => q.eq("status", "live"))
        .collect(),
      ctx.db.query("categories").collect(),
      ctx.db.query("tools").collect(),
      ctx.db
        .query("posts")
        .withIndex("by_status", (q) => q.eq("status", "published"))
        .collect(),
    ]);

    const toolTotal = liveTools.length;
    const postTotal = posts.length;
    if (!q) {
      return {
        q,
        tools: [],
        categories: [],
        posts: [],
        counts: { tools: toolTotal, posts: postTotal },
      };
    }

    const tokens = tokenize(q);
    const catById = new Map(categories.map((c) => [c._id, c]));
    const countByCat = new Map<string, number>();
    for (const t of allTools) {
      countByCat.set(t.categoryId, (countByCat.get(t.categoryId) ?? 0) + 1);
    }

    const toolHits = liveTools
      .filter((t) =>
        matchTokens(
          [t.name, t.tagline, t.tags.join("|"), t.description ?? null],
          tokens,
        ),
      )
      .map((t) => ({
        t,
        score: relevanceScore(tokens, {
          name: t.name,
          tagline: t.tagline,
          tags: t.tags.join("|"),
          description: t.description ?? null,
        }),
      }))
      .sort(
        (a, b) =>
          b.score - a.score ||
          Number(b.t.editorsPick) - Number(a.t.editorsPick) ||
          b.t.createdAt - a.t.createdAt ||
          a.t._creationTime - b.t._creationTime,
      )
      .slice(0, 10)
      .map(({ t }) => ({
        slug: t.slug,
        name: t.name,
        tagline: t.tagline,
        emoji: t.logoEmoji,
        gradient: t.logoGradient,
        editorsPick: t.editorsPick,
        pricing: { model: t.pricingModel, price: t.startingPrice ?? null },
        category: {
          slug: catById.get(t.categoryId)!.slug,
          name: catById.get(t.categoryId)!.name,
          emoji: catById.get(t.categoryId)!.emoji,
        },
      }));

    const categoryHits = categories
      .filter((c) => matchTokens([c.name, c.slug], tokens))
      .sort(
        (a, b) =>
          (countByCat.get(b._id) ?? 0) - (countByCat.get(a._id) ?? 0) ||
          a.sortOrder - b.sortOrder,
      )
      .slice(0, 4)
      .map((c) => ({
        slug: c.slug,
        name: c.name,
        emoji: c.emoji,
        count: countByCat.get(c._id) ?? 0,
      }));

    const publishedSorted = [...posts].sort(
      (a, b) =>
        (b.publishedAt ?? -1) - (a.publishedAt ?? -1) ||
        a._creationTime - b._creationTime,
    );
    const postHits = publishedSorted
      .filter((p) =>
        matchTokens([p.title, p.excerpt, p.tags.join("|")], tokens),
      )
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
  },
});
