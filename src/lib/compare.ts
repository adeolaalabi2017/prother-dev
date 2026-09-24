import type { ReviewAggregate } from "@/lib/community";

/**
 * Category-scoped comparison matrix SHAPES (Task 32) — shared contract
 * between convex/compare.ts (the data engine), /compare, and
 * GET /api/compare/matrix. Types only; the Prisma builder was retired
 * with the Convex cutover.
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
