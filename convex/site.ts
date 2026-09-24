/**
 * Convex read: site settings + headline stats.
 * Shadows GET /api/site (data-pure half; the route's never-500 fallback
 * stays Next-side in Phase 4).
 */
import { query } from "./_generated/server";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const [settings, tools, categories, reviews, comments] = await Promise.all([
      ctx.db.query("siteSettings").collect(),
      ctx.db
        .query("tools")
        .withIndex("by_status_category", (q) => q.eq("status", "live"))
        .collect(),
      ctx.db.query("categories").collect(),
      ctx.db
        .query("reviews")
        .withIndex("by_tool_status")
        .collect()
        .then((rows) => rows.filter((r) => r.status === "published")),
      ctx.db.query("comments").collect(),
    ]);
    return {
      settings: Object.fromEntries(settings.map((r) => [r.key, r.value])),
      stats: {
        tools: tools.length,
        categories: categories.length,
        reviews: reviews.length,
        comments: comments.length,
      },
    };
  },
});
