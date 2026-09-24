/**
 * Advertising — campaign management + serving for the placements
 * sold on /advertise: directory_banner (sponsored row in the tools
 * directory), journal_bar, category_spotlight, serp_footer.
 *
 * Serving picks a weighted-random ACTIVE campaign whose flight window covers
 * "now" (and whose total budget, when set, isn't exhausted by impressions ×
 * assumed $8 CPM... no — budgets gate on impressions alone: 1000 impressions
 * per totalBudgetCents/CPM_CENTS; see eligibleWhere). Impressions/clicks are
 * counters on the row; CTR computed on read.
 *
 * Store-independent constants only — campaign data lives in Convex
 * (convex/ads.ts); the Prisma serving layer was retired with the cutover.
 */
export const AD_PLACEMENTS = [
  "journal_bar",
  "category_spotlight",
  "directory_banner",
  "serp_footer",
] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];

export const AD_STATUSES = ["draft", "active", "paused", "ended"] as const;
export type AdStatus = (typeof AD_STATUSES)[number];
