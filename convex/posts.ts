/**
 * Convex read: published journal posts.
 * Shadows GET /api/blog — published only, publishedAt desc, limit + optional
 * category filter. coverUrl/tags shapes match the route's mapping exactly.
 */
import { query } from "./_generated/server";
import { v } from "convex/values";
import { isoFromMs } from "./shared";

export const list = query({
  args: { limit: v.number(), category: v.optional(v.string()) },
  handler: async (ctx, { limit, category }) => {
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();
    const filtered =
      category != null && category !== ""
        ? posts.filter((p) => p.category === category)
        : posts;
    // SQLite ORDER BY publishedAt DESC (ties → rowid); same here.
    filtered.sort(
      (a, b) =>
        (b.publishedAt ?? -1) - (a.publishedAt ?? -1) ||
        a._creationTime - b._creationTime,
    );
    return {
      posts: filtered.slice(0, limit).map((p) => ({
        // The route spreads the Prisma row, so `id` (cuid) ships — same here.
        id: p.legacyId ?? p._id,
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        category: p.category,
        tags: p.tags,
        coverEmoji: p.coverEmoji,
        coverGradient: p.coverGradient,
        author: p.author,
        readingMinutes: p.readingMinutes,
        publishedAt: p.publishedAt != null ? isoFromMs(p.publishedAt) : null,
        coverUrl: p.coverUrl ?? null,
      })),
    };
  },
});
