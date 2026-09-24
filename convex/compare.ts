/**
 * Convex read: category-scoped comparison matrix.
 * Shadows GET /api/compare/matrix — mirrors lib/compare.ts buildCompareMatrix:
 * options (live tools, pinned/editorsPick/createdAt, max 40), ordered picks,
 * per-tool live review stats, feature maps, tag slice(0,5), axes slice(0,12).
 */
import { query } from "./_generated/server";
import { v } from "convex/values";
import { reviewAggregate } from "./shared";

export const MAX_COMPARE_TOOLS = 4;

/** All categories with live listing counts (sortOrder asc) — the SSR picker. */
export const categories = query({
  args: {},
  handler: async (ctx) => {
    const [cats, tools] = await Promise.all([
      ctx.db.query("categories").collect(),
      ctx.db
        .query("tools")
        .withIndex("by_status_category", (i) => i.eq("status", "live"))
        .collect(),
    ]);
    const liveByCat = new Map<string, number>();
    for (const t of tools) {
      liveByCat.set(t.categoryId, (liveByCat.get(t.categoryId) ?? 0) + 1);
    }
    return [...cats]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => ({
        slug: c.slug,
        name: c.name,
        emoji: c.emoji,
        toolCount: liveByCat.get(c._id) ?? 0,
      }));
  },
});

export const matrix = query({
  args: { category: v.string(), tools: v.array(v.string()) },
  handler: async (ctx, { category: categorySlug, tools: selectedSlugs }) => {
    const category = await ctx.db
      .query("categories")
      .withIndex("by_slug", (i) => i.eq("slug", categorySlug))
      .unique();
    if (!category) return { error: "category_not_found" as const };

    const live = await ctx.db
      .query("tools")
      .withIndex("by_status_category", (i) => i.eq("status", "live"))
      .collect();
    const inCategory = live.filter((t) => t.categoryId === category._id);

    const options = [...inCategory]
      .sort(
        (a, b) =>
          b.pinned - a.pinned ||
          Number(b.editorsPick) - Number(a.editorsPick) ||
          b.createdAt - a.createdAt ||
          a._creationTime - b._creationTime,
      )
      .slice(0, 40)
      .map((o) => ({
        slug: o.slug,
        name: o.name,
        emoji: o.logoEmoji,
        gradient: o.logoGradient,
        tagline: o.tagline,
        pricingModel: o.pricingModel,
        editorsPick: o.editorsPick,
        pinned: o.pinned,
      }));

    const wanted = selectedSlugs
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, MAX_COMPARE_TOOLS);
    const bySlug = new Map(inCategory.map((t) => [t.slug, t]));
    const ordered = wanted
      .map((s) => bySlug.get(s))
      .filter((t) => t != null);

    const reviews = await ctx.db.query("reviews").collect();
    const tools = ordered.map((t) => {
      const published = reviews
        .filter((r) => r.toolId === t!._id && r.status === "published")
        .map((r) => ({ ease: r.ease, power: r.power, value: r.value }));
      const stats = reviewAggregate(published);
      return {
        slug: t!.slug,
        name: t!.name,
        emoji: t!.logoEmoji,
        gradient: t!.logoGradient,
        tagline: t!.tagline,
        websiteUrl: t!.websiteUrl,
        pricing: {
          model: t!.pricingModel,
          price: t!.startingPrice ?? null,
          note: t!.pricingNote ?? null,
        },
        hasApi: t!.hasApi,
        openSource: t!.pricingModel === "open_source",
        tags: t!.tags.slice(0, 5),
        rating: stats.aggregate,
        reviewCount: stats.count,
        features: t!.features,
      };
    });

    return {
      category: {
        slug: category.slug,
        name: category.name,
        emoji: category.emoji,
        features: category.features.slice(0, 12),
      },
      options,
      tools,
    };
  },
});
