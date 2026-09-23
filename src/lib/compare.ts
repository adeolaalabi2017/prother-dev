import { db } from "@/lib/prother";
import { reviewStats } from "@/lib/community";
import type { ReviewAggregate } from "@/lib/community";
import { toolFeaturesByIds } from "@/lib/features";

/**
 * Category-scoped comparison matrix (Task 32) — the data engine behind
 * /compare and GET /api/compare/matrix. Shared by the API route and the
 * SSR page so both surfaces always agree on shape + ranking.
 */

export type CompareMatrixOption = {
  slug: string;
  name: string;
  emoji: string;
  gradient: string;
  tagline: string;
  pricingModel: string;
  editorsPick: boolean;
  pinned: number;
};

export type CompareMatrixTool = {
  slug: string;
  name: string;
  emoji: string;
  gradient: string;
  tagline: string;
  websiteUrl: string;
  pricing: { model: string; price: string | null; note: string | null };
  hasApi: boolean;
  openSource: boolean;
  tags: string[];
  rating: ReviewAggregate | null;
  reviewCount: number;
  features: Record<string, string>;
};

export type CompareMatrix = {
  category: { slug: string; name: string; emoji: string; features: string[] };
  /** Every live tool in the category, featured-first — the picker list. */
  options: CompareMatrixOption[];
  /** The selected tools (2–4), in the caller's order. */
  tools: CompareMatrixTool[];
};

export const MAX_COMPARE_TOOLS = 4;

/**
 * Build the matrix for one category + selected slugs.
 * Returns null when the category does not exist. Unselected/unknown/removed
 * tools are silently dropped from `tools`; `options` always lists the rest.
 */
export async function buildCompareMatrix(
  categorySlug: string,
  selectedSlugs: string[]
): Promise<CompareMatrix | null> {
  const category = await db.category.findUnique({
    where: { slug: categorySlug },
    select: { id: true, slug: true, name: true, emoji: true },
  });
  if (!category) return null;

  const [rawFeatures, options] = await Promise.all([
    db.$queryRaw<{ features: string | null }[]>`
      SELECT features FROM Category WHERE id = ${category.id}`,
    db.tool.findMany({
      where: { categoryId: category.id, status: "live" },
      select: {
        id: true,
        slug: true,
        name: true,
        logoEmoji: true,
        logoGradient: true,
        tagline: true,
        pricingModel: true,
        editorsPick: true,
        pinned: true,
      },
      orderBy: [{ pinned: "desc" }, { editorsPick: "desc" }, { createdAt: "desc" }],
      take: 40,
    }),
  ]);
  const axesRaw = rawFeatures[0]?.features ?? "";

  // Desired selection order preserved; unknown + removed + cross-category
  // slugs fall out naturally via the category filter.
  const wanted = selectedSlugs
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_COMPARE_TOOLS);

  const picked =
    wanted.length > 0
      ? await db.tool.findMany({
          where: { slug: { in: wanted }, categoryId: category.id, status: "live" },
          select: {
            id: true,
            slug: true,
            name: true,
            tagline: true,
            description: true,
            websiteUrl: true,
            logoEmoji: true,
            logoGradient: true,
            pricingModel: true,
            startingPrice: true,
            pricingNote: true,
            hasApi: true,
            tags: true,
          },
        })
      : [];

  // Map<slug, tool> so the response mirrors the requested order.
  const bySlug = new Map(picked.map((t) => [t.slug, t]));
  const ordered = wanted.map((s) => bySlug.get(s)).filter((t) => t != null);
  const ids = ordered.map((t) => t!.id);

  const [featureMaps, stats] = await Promise.all([
    toolFeaturesByIds(ids),
    Promise.all(ordered.map((t) => reviewStats(t!.id))),
  ]);

  return {
    category: {
      slug: category.slug,
      name: category.name,
      emoji: category.emoji,
      features: (axesRaw || "")
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 12),
    },
    options: options.map((o) => ({
      slug: o.slug,
      name: o.name,
      emoji: o.logoEmoji,
      gradient: o.logoGradient,
      tagline: o.tagline,
      pricingModel: o.pricingModel,
      editorsPick: o.editorsPick,
      pinned: o.pinned,
    })),
    tools: ordered.map((t, i) => ({
      slug: t!.slug,
      name: t!.name,
      emoji: t!.logoEmoji,
      gradient: t!.logoGradient,
      tagline: t!.tagline,
      websiteUrl: t!.websiteUrl,
      pricing: {
        model: t!.pricingModel,
        price: t!.startingPrice,
        note: t!.pricingNote,
      },
      hasApi: t!.hasApi,
      openSource: t!.pricingModel === "open_source",
      tags: t!.tags.split("|").filter(Boolean).slice(0, 5),
      rating: stats[i].aggregate,
      reviewCount: stats[i].count,
      features: featureMaps.get(t!.id) ?? {},
    })),
  };
}

/** Universal (non-feature) rows shown above the category axes. */
export const UNIVERSAL_ROWS = ["Pricing", "Rating", "Reviews", "API access"] as const;
