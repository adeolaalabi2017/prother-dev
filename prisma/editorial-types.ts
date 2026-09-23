/**
 * Editorial content contracts (Task 35) — shared between the enrichment
 * runner (prisma/enrich-tools.ts) and the per-batch data files
 * (prisma/editorial-data-a.ts / -b.ts). Pure types: no imports.
 *
 * Storage mapping (Tool table, post-boot columns — raw SQL only):
 * - longDescription  TEXT  NULL  — 2-3 paragraphs separated by \n\n
 * - useCases         TEXT  ''    — JSON array of {title, body}
 * - pros             TEXT  ''    — JSON array of strings
 * - cons             TEXT  ''    — JSON array of strings
 * - alternatives     TEXT  ''    — pipe-separated directory slugs
 * - pricingCheckedAt DATETIME NULL — set when pricing was fact-checked
 * - contentUpdatedAt DATETIME NULL — editorial content last update
 */

export interface EditorialUseCase {
  /** Short label, imperative mood ("Automate lead routing"). ≤ 60 chars. */
  title: string;
  /** One or two sentences of concrete context. ≤ 240 chars. */
  body: string;
}

/** Optional verified-pricing overrides applied with the enrichment. */
export interface EditorialPricing {
  model?: "free" | "freemium" | "paid" | "open_source";
  startingPrice?: string | null;
  note?: string | null;
}

export interface EditorialEntry {
  slug: string;
  /** 2-3 paragraphs separated by \n\n. Factual, no em dashes, 120-220 words. */
  longDescription: string;
  /** 3-4 items. */
  useCases: EditorialUseCase[];
  /** 3-4 honest strengths, each ≤ 140 chars. */
  pros: string[];
  /** 3-4 honest limitations, each ≤ 140 chars. */
  cons: string[];
  /** 2-3 alternative directory slugs (must exist in the tools table). */
  alternatives: string[];
  /** Fact-checked pricing (marks the entry pricing-checked on apply). */
  pricing?: EditorialPricing;
}
