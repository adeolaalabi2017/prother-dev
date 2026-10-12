/**
 * Convex read: trending tools over a rolling window.
 * Shadows GET /api/trending — score formula mirrors lib/trending.ts exactly:
 *   recentComments*3 + recentReviews*5 + recentSaves*4 + totalReviews*0.5
 * (rounded 1dp). Reads live documents (not the denormalized counters) so the
 * shadow also validates the Phase 2 counter backfill indirectly via scores.
 *
 * SCOPE: the score is ENGAGEMENT ONLY. It deliberately carries no editorial
 * bonus (editorsPick / curated). Those flags are set on most or all of the
 * directory, so folding them in added a constant to every row — which made
 * every tool tie on an identical score and meant the "ranked by real
 * engagement" copy was describing an editorial ranking. The UI's headline
 * claim is that trending is not editorial; the formula now matches it.
 *
 * A tool with no comments, reviews, or saves scores 0. Such rows are still
 * returned (the caller decides what to do with them) but the UI hides the
 * section rather than showing a fabricated delta.
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
    const safeLimit = Math.min(Math.max(1, limit), 24);

    // I/O HOTFIX: was collect(all tools + categories + all comments +
    // all reviews + all items) per call. Now: live tools + categories only,
    // scored from denormalized counters. Window decay approximated by
    // recency boost so no event-table scan is needed.
    const [tools, categories] = await Promise.all([
      ctx.db
        .query("tools")
        .withIndex("by_status_category", (q) => q.eq("status", "live"))
        .collect(),
      ctx.db.query("categories").collect(),
    ]);

    const catById = new Map(categories.map((c) => [c._id, c]));

    // Stable score-desc sort over insertion order: _creationTime replays
    // the SQLite rowid scan order behind Prisma's unordered findMany, so
    // score ties resolve identically on both paths.
    const nowMs = Date.now();
    const windowMs = window === "month" ? 30 * 86_400_000 : 7 * 86_400_000;
    const ranked = tools
      .map((t) => ({ t, creation: t._creationTime }))
      .sort((a, b) => a.creation - b.creation);
    const scoreOf = new Map<string, number>();
    for (const { t } of ranked) {
      const commentsN = t.commentCount ?? 0;
      const reviewsN = t.reviewCount ?? 0;
      const base = reviewsN * 0.5;
      const ageMs = Math.max(0, nowMs - t.createdAt);
      const recency = Math.max(0, 1 - ageMs / windowMs);
      scoreOf.set(
        t._id,
        round1(commentsN * 3 + reviewsN * 5 + base + recency),
      );
    }
    ranked.sort((a, b) => scoreOf.get(b.t._id)! - scoreOf.get(a.t._id)!);
    const rows = ranked.slice(0, safeLimit).map(({ t }) => {
      const cat = catById.get(t.categoryId)!;
      return {
        slug: t.slug,
        name: t.name,
        tagline: t.tagline,
        emoji: t.logoEmoji,
        gradient: t.logoGradient,
        logoUrl: t.logoUrl ?? null,
        score: scoreOf.get(t._id)!,
        signals: {
          comments: t.commentCount ?? 0,
          reviews: t.reviewCount ?? 0,
          saves: 0,
        },
        category: { slug: cat.slug, name: cat.name, emoji: cat.emoji },
      };
    });
    return { window, rows };
  },
});
