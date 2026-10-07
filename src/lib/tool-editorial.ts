/**
 * Tool editorial content (Task 35) — rich listing data the Admin Console
 * writes and the public tool pages render: long description, use cases,
 * pros/cons, alternatives, pricing fact-check and update timestamps.
 *
 * Phase B (2026-10-07): all bodies rewired to Convex via
 * requireServerConvexClient(); the Prisma/custom.db path is gone.
 */

import { api } from "../../convex/_generated/api.js";
import { requireServerConvexClient } from "@/lib/convex";

export interface ToolUseCase {
  title: string;
  body: string;
}

export interface ToolEditorial {
  longDescription: string | null;
  useCases: ToolUseCase[];
  pros: string[];
  cons: string[];
  alternativeSlugs: string[];
  pricingCheckedAt: Date | null;
  contentUpdatedAt: Date | null;
}

const EMPTY: ToolEditorial = {
  longDescription: null,
  useCases: [],
  pros: [],
  cons: [],
  alternativeSlugs: [],
  pricingCheckedAt: null,
  contentUpdatedAt: null,
};

/** Editorial fields for many tools, keyed by tool id. Missing ids map to EMPTY. */
export async function editorialByToolIds(
  ids: string[]
): Promise<Map<string, ToolEditorial>> {
  const client = requireServerConvexClient();
  const map = new Map<string, ToolEditorial>();
  if (ids.length === 0) return map;
  for (const id of ids) {
    const doc = (await client.query(api.import.byLegacy, {
      table: "tools",
      legacyId: id,
    })) as any;
    if (!doc) {
      map.set(id, { ...EMPTY });
      continue;
    }
    map.set(id, {
      longDescription: doc.longDescription ?? null,
      useCases: Array.isArray(doc.useCases)
        ? doc.useCases
            .filter(
              (u: any) =>
                u && typeof u.title === "string" && typeof u.body === "string"
            )
            .map((u: any) => ({ title: u.title, body: u.body }))
        : [],
      pros: Array.isArray(doc.pros) ? doc.pros : [],
      cons: Array.isArray(doc.cons) ? doc.cons : [],
      alternativeSlugs: Array.isArray(doc.alternatives) ? doc.alternatives : [],
      pricingCheckedAt: doc.pricingCheckedAt != null ? new Date(doc.pricingCheckedAt) : null,
      contentUpdatedAt: doc.contentUpdatedAt != null ? new Date(doc.contentUpdatedAt) : null,
    });
  }
  return map;
}

export interface AlternativeRow {
  slug: string;
  name: string;
  tagline: string;
  logoEmoji: string;
  logoGradient: string;
  logoUrl: string | null;
  pricingModel: string;
  startingPrice: string | null;
  editorsPick: boolean;
}

/** Resolve alternative slugs (in the given order) to directory card rows.
 *  Skips unknown slugs and `excludeSlug` (a tool never lists itself). */
export async function resolveAlternatives(
  slugs: string[],
  excludeSlug?: string
): Promise<AlternativeRow[]> {
  const client = requireServerConvexClient();
  const wanted = [...new Set(slugs)].filter((s) => s && s !== excludeSlug);
  if (wanted.length === 0) return [];
  const bySlug = new Map<string, AlternativeRow>();
  for (const s of wanted) {
    const d = (await client.query(api.tools.detail, { slug: s })) as any;
    if (!d || "error" in d) continue;
    bySlug.set(s, {
      slug: d.slug,
      name: d.name,
      tagline: d.tagline,
      logoEmoji: d.emoji,
      logoGradient: d.gradient,
      logoUrl: d.logoUrl ?? null,
      pricingModel: d.pricing?.model ?? "",
      startingPrice: d.pricing?.price ?? null,
      editorsPick: d.badges?.editorsPick === true,
    });
  }
  // Preserve the editorial order from the alternatives column.
  return wanted
    .map((s) => bySlug.get(s))
    .filter((r): r is AlternativeRow => r != null);
}

export interface ToolEditorialPatch {
  longDescription?: string | null;
  useCases?: ToolUseCase[];
  pros?: string[];
  cons?: string[];
  alternatives?: string[];
  /** true = stamp now, false = clear. */
  pricingChecked?: boolean;
}

const MAX_USE_CASES = 6;
const MAX_LIST_ITEMS = 6;
const MAX_LIST_CHARS = 160;
const MAX_USE_CASE_TITLE = 80;
const MAX_USE_CASE_BODY = 400;

/** Validation errors as human-readable strings; empty array = valid. */
export function validateEditorialPatch(patch: ToolEditorialPatch): string[] {
  const errors: string[] = [];
  if (patch.longDescription != null) {
    const t = patch.longDescription.trim();
    if (t.length > 0 && t.length < 40) {
      errors.push("Long description must be at least 40 characters when provided.");
    }
    if (t.length > 5000) errors.push("Long description must be 5000 characters or fewer.");
  }
  if (patch.useCases != null) {
    if (patch.useCases.length > MAX_USE_CASES) {
      errors.push(`Use cases are limited to ${MAX_USE_CASES}.`);
    }
    patch.useCases.forEach((u, i) => {
      if (!u.title.trim()) errors.push(`Use case ${i + 1} needs a title.`);
      if (u.title.length > MAX_USE_CASE_TITLE) {
        errors.push(`Use case ${i + 1} title must be ${MAX_USE_CASE_TITLE} characters or fewer.`);
      }
      if (!u.body.trim()) errors.push(`Use case ${i + 1} needs a description.`);
      if (u.body.length > MAX_USE_CASE_BODY) {
        errors.push(`Use case ${i + 1} body must be ${MAX_USE_CASE_BODY} characters or fewer.`);
      }
    });
  }
  for (const [label, list] of [
    ["Pros", patch.pros],
    ["Cons", patch.cons],
  ] as const) {
    if (list != null) {
      if (list.length > MAX_LIST_ITEMS) {
        errors.push(`${label} are limited to ${MAX_LIST_ITEMS} items.`);
      }
      list.forEach((s, i) => {
        if (!s.trim()) errors.push(`${label} item ${i + 1} is empty.`);
        if (s.length > MAX_LIST_CHARS) {
          errors.push(`${label} item ${i + 1} must be ${MAX_LIST_CHARS} characters or fewer.`);
        }
      });
    }
  }
  if (patch.alternatives != null) {
    if (patch.alternatives.length > MAX_LIST_ITEMS) {
      errors.push(`Alternatives are limited to ${MAX_LIST_ITEMS}.`);
    }
    if (patch.alternatives.some((s) => !/^[a-z0-9-]+$/.test(s))) {
      errors.push("Alternatives must be directory slugs (lowercase letters, digits, dashes).");
    }
  }
  return errors;
}

/** Apply an editorial patch (already validated) and stamp contentUpdatedAt.
 *  Pass a patch with only pricingChecked to touch just the pricing check. */
export async function applyToolEditorial(
  toolId: string,
  patch: ToolEditorialPatch
): Promise<void> {
  const client = requireServerConvexClient();
  const touches =
    patch.longDescription !== undefined ||
    patch.useCases !== undefined ||
    patch.pros !== undefined ||
    patch.cons !== undefined ||
    patch.alternatives !== undefined ||
    patch.pricingChecked !== undefined;
  if (!touches) return;
  await client.mutation(api.adminCrud.toolPatch, {
    toolLegacyId: toolId,
    data: {},
    editorial: {
      ...(patch.longDescription !== undefined
        ? { longDescription: patch.longDescription?.trim() ? patch.longDescription.trim() : null }
        : {}),
      ...(patch.useCases !== undefined ? { useCases: patch.useCases } : {}),
      ...(patch.pros !== undefined ? { pros: patch.pros } : {}),
      ...(patch.cons !== undefined ? { cons: patch.cons } : {}),
      ...(patch.alternatives !== undefined ? { alternatives: patch.alternatives } : {}),
      ...(patch.pricingChecked !== undefined ? { pricingChecked: patch.pricingChecked } : {}),
    },
    nowMs: Date.now(),
  } as any);
}
