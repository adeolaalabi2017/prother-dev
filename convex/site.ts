/**
 * Convex read: site settings + headline stats.
 * Shadows GET /api/site (data-pure half; the route's never-500 fallback
 * stays Next-side in Phase 4).
 */
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getSetting = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const rows = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .take(1);
    return rows[0]?.value ?? null;
  },
});

export const get = query({
  args: {},
  handler: async (ctx) => {
    // I/O HOTFIX: was live tools + all reviews + all comments per header
    // load. Headline hero only needs tools/categories; reviews/comments
    // counts are served as 0 to avoid 2 full-table scans on every page.
    const [settings, tools, categories] = await Promise.all([
      ctx.db.query("siteSettings").collect(),
      ctx.db
        .query("tools")
        .withIndex("by_status_category", (q) => q.eq("status", "live"))
        .collect(),
      ctx.db.query("categories").collect(),
    ]);
    return {
      settings: Object.fromEntries(settings.map((r) => [r.key, r.value])),
      stats: {
        tools: tools.length,
        categories: categories.length,
        reviews: 0,
        comments: 0,
      },
    };
  },
});
