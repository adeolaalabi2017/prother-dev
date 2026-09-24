/**
 * Convex read: trending tools over a rolling window.
 * Shadows GET /api/trending — score formula mirrors lib/trending.ts exactly:
 *   recentComments*3 + recentReviews*5 + recentSaves*4 + editorial + total*0.5
 * (rounded 1dp). Reads live documents (not the denormalized counters) so the
 * shadow also validates the Phase 2 counter backfill indirectly via scores.
 */
import { query } from "./_generated/server";
import { v } from "convex/values";
import { round1 } from "./shared";

export const list = query({
  args: {
    window: v.union(v.literal("week"), v.literal("month")),
    limit: v.number(),
  },
  handler: async (ctx, { window, limit }) => {
    const days = window === "month" ? 30 : 7;
    const sinceMs = Date.now() - days * 86_400_000;

    const [tools, categories, comments, reviews, items, totalReviews] =
      await Promise.all([
        ctx.db
          .query("tools")
          .withIndex("by_status_category", (q) => q.eq("status", "live"))
          .collect(),
        ctx.db.query("categories").collect(),
        ctx.db.query("comments").collect(),
        ctx.db.query("reviews").collect(),
        ctx.db.query("collectionItems").collect(),
        ctx.db
          .query("reviews")
          .withIndex("by_tool_status")
          .collect()
          .then((rows) => rows.filter((r) => r.status === "published")),
      ]);

    const catById = new Map(categories.map((c) => [c._id, c]));

    const recentComments = new Map<string, number>();
    for (const c of comments) {
      if (c.createdAt < sinceMs) continue;
      recentComments.set(c.toolId, (recentComments.get(c.toolId) ?? 0) + 1);
    }
    const recentReviews = new Map<string, number>();
    for (const r of reviews) {
      if (r.status !== "published" || r.createdAt < sinceMs) continue;
      recentReviews.set(r.toolId, (recentReviews.get(r.toolId) ?? 0) + 1);
    }
    const recentSaves = new Map<string, number>();
    for (const i of items) {
      if (i.createdAt < sinceMs) continue;
      recentSaves.set(i.toolId, (recentSaves.get(i.toolId) ?? 0) + 1);
    }
    const totalByTool = new Map<string, number>();
    for (const r of totalReviews) {
      totalByTool.set(r.toolId, (totalByTool.get(r.toolId) ?? 0) + 1);
    }

    // Stable score-desc sort over insertion order: _creationTime replays
    // the SQLite rowid scan order behind Prisma's unordered findMany, so
    // score ties resolve identically on both paths.
    const ranked = tools
      .map((t) => ({ t, creation: t._creationTime }))
      .sort((a, b) => a.creation - b.creation);
    const scoreOf = new Map<string, number>();
    for (const { t } of ranked) {
      const commentsN = recentComments.get(t._id) ?? 0;
      const reviewsN = recentReviews.get(t._id) ?? 0;
      const savesN = recentSaves.get(t._id) ?? 0;
      const editorial = (t.editorsPick ? 2 : 0) + (t.curated ? 1 : 0);
      const base = (totalByTool.get(t._id) ?? 0) * 0.5;
      scoreOf.set(
        t._id,
        round1(commentsN * 3 + reviewsN * 5 + savesN * 4 + editorial + base),
      );
    }
    ranked.sort((a, b) => scoreOf.get(b.t._id)! - scoreOf.get(a.t._id)!);
    const rows = ranked.slice(0, limit).map(({ t }) => {
      const cat = catById.get(t.categoryId)!;
      return {
        slug: t.slug,
        name: t.name,
        tagline: t.tagline,
        emoji: t.logoEmoji,
        gradient: t.logoGradient,
        score: scoreOf.get(t._id)!,
        signals: {
          comments: recentComments.get(t._id) ?? 0,
          reviews: recentReviews.get(t._id) ?? 0,
          saves: recentSaves.get(t._id) ?? 0,
        },
        category: { slug: cat.slug, name: cat.name, emoji: cat.emoji },
      };
    });
    return { window, rows };
  },
});
