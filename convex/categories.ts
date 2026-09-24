/**
 * Convex category pages (Phase 5): dedicated-route detail + homepage needs.
 * Ordering mirrors src/app/categories/[slug]/page.tsx exactly (pinned,
 * Editor's Picks, newest — NOTE: no curated tier, unlike /api/tools).
 */
import { query } from "./_generated/server";
import { v } from "convex/values";
import { isoFromMs } from "./shared";

function docId<T extends { legacyId?: string; _id: string }>(d: T): string {
  return d.legacyId ?? d._id;
}

const PRICING_LABEL: Record<string, string> = {
  free: "Free",
  freemium: "Freemium",
  paid: "Paid",
  open_source: "Open Source",
};

function pricingChip(model: string, price?: string): string {
  const label = PRICING_LABEL[model] ?? "Free";
  if ((model === "paid" || model === "freemium") && price) {
    return `${label} ${price}`;
  }
  return label;
}

export const detail = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const category = await ctx.db
      .query("categories")
      .withIndex("by_slug", (i) => i.eq("slug", slug))
      .unique();
    if (!category) return { error: "not_found" as const };
    const tools = (
      await ctx.db
        .query("tools")
        .withIndex("by_status_category", (i) => i.eq("status", "live"))
        .collect()
    )
      .filter((t) => t.categoryId === category._id)
      .sort(
        (a, b) =>
          b.pinned - a.pinned ||
          Number(b.editorsPick) - Number(a.editorsPick) ||
          b.createdAt - a.createdAt ||
          a._creationTime - b._creationTime,
      );
    return {
      category: {
        id: docId(category),
        slug: category.slug,
        name: category.name,
        emoji: category.emoji,
        toolCount: tools.length,
      },
      tools: tools.map((t) => ({
        slug: t.slug,
        name: t.name,
        tagline: t.tagline,
        emoji: t.logoEmoji,
        gradient: t.logoGradient,
        pricing: pricingChip(t.pricingModel, t.startingPrice),
        editorsPick: t.editorsPick,
      })),
    };
  },
});
