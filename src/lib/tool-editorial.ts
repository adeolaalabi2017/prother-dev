/**
 * Tool editorial content (Task 35) — rich listing data the Admin Console
 * writes and the public tool pages render: long description, use cases,
 * pros/cons, alternatives, pricing fact-check and update timestamps.
 *
 * Post-boot columns (longDescription, useCases, pros, cons, alternatives,
 * pricingCheckedAt, contentUpdatedAt) are invisible to the cached
 * PrismaClient — ALL access here is raw SQL (stale-PrismaClient rule,
 * see the note in lib/features.ts).
 */

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { toolMediaByIds } from "@/lib/media";

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

function parseStringArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function parseUseCases(raw: string | null): ToolUseCase[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v
      .filter(
        (x): x is ToolUseCase =>
          x != null &&
          typeof x === "object" &&
          typeof (x as ToolUseCase).title === "string" &&
          typeof (x as ToolUseCase).body === "string"
      )
      .map((u) => ({ title: u.title, body: u.body }));
  } catch {
    return [];
  }
}

function iso(v: unknown): Date | null {
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

/** Editorial fields for many tools, keyed by tool id. Missing ids map to EMPTY. */
export async function editorialByToolIds(
  ids: string[]
): Promise<Map<string, ToolEditorial>> {
  const map = new Map<string, ToolEditorial>();
  if (ids.length === 0) return map;
  const rows = await db.$queryRaw<{
    id: string;
    longDescription: string | null;
    useCases: string | null;
    pros: string | null;
    cons: string | null;
    alternatives: string | null;
    pricingCheckedAt: Date | string | null;
    contentUpdatedAt: Date | string | null;
  }[]>`
    SELECT id, longDescription, useCases, pros, cons, alternatives,
           pricingCheckedAt, contentUpdatedAt
    FROM Tool
    WHERE id IN (${Prisma.join(ids)})`;

  for (const r of rows) {
    map.set(r.id, {
      longDescription: r.longDescription,
      useCases: parseUseCases(r.useCases),
      pros: parseStringArray(r.pros),
      cons: parseStringArray(r.cons),
      alternativeSlugs: (r.alternatives ?? "")
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean),
      pricingCheckedAt: iso(r.pricingCheckedAt),
      contentUpdatedAt: iso(r.contentUpdatedAt),
    });
  }
  for (const id of ids) {
    if (!map.has(id)) map.set(id, { ...EMPTY });
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
  const wanted = [...new Set(slugs)].filter((s) => s && s !== excludeSlug);
  if (wanted.length === 0) return [];
  const rows = await db.$queryRaw<{
    id: string;
    slug: string;
    name: string;
    tagline: string;
    logoEmoji: string;
    logoGradient: string;
    pricingModel: string;
    startingPrice: string | null;
    editorsPick: boolean;
  }[]>`
    SELECT id, slug, name, tagline, logoEmoji, logoGradient, pricingModel,
           startingPrice, editorsPick
    FROM Tool
    WHERE slug IN (${Prisma.join(wanted)}) AND status = 'live'`;
  // toolMediaByIds is keyed by Tool.id (cuid), so resolve media per id.
  const media = await toolMediaByIds(rows.map((r) => r.id));
  const bySlug = new Map(
    rows.map((r) => [
      r.slug,
      {
        slug: r.slug,
        name: r.name,
        tagline: r.tagline,
        logoEmoji: r.logoEmoji,
        logoGradient: r.logoGradient,
        pricingModel: r.pricingModel,
        startingPrice: r.startingPrice,
        editorsPick: r.editorsPick,
        logoUrl: media.get(r.id)?.logoUrl ?? null,
      },
    ])
  );
  // Preserve the editorial order from the alternatives column.
  return wanted
    .map((s) => bySlug.get(s))
    .filter((r): r is AlternativeRow & { logoUrl: string | null } => r != null);
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
  const sets: string[] = [];
  const args: (string | null | Date)[] = [];

  if (patch.longDescription !== undefined) {
    const t = patch.longDescription?.trim() ?? "";
    sets.push("longDescription = ?");
    args.push(t.length > 0 ? t : null);
  }
  if (patch.useCases !== undefined) {
    sets.push("useCases = ?");
    args.push(JSON.stringify(patch.useCases));
  }
  if (patch.pros !== undefined) {
    sets.push("pros = ?");
    args.push(JSON.stringify(patch.pros));
  }
  if (patch.cons !== undefined) {
    sets.push("cons = ?");
    args.push(JSON.stringify(patch.cons));
  }
  if (patch.alternatives !== undefined) {
    sets.push("alternatives = ?");
    args.push(patch.alternatives.join("|"));
  }
  if (patch.pricingChecked !== undefined) {
    sets.push("pricingCheckedAt = ?");
    args.push(patch.pricingChecked ? new Date() : null);
  }

  // Only editorial saves stamp the content update date.
  const editorialTouch =
    patch.longDescription !== undefined ||
    patch.useCases !== undefined ||
    patch.pros !== undefined ||
    patch.cons !== undefined ||
    patch.alternatives !== undefined ||
    patch.pricingChecked !== undefined;
  if (sets.length === 0) return;
  if (editorialTouch) {
    sets.push("contentUpdatedAt = ?");
    args.push(new Date());
  }

  args.push(toolId);
  await db.$executeRawUnsafe(
    `UPDATE Tool SET ${sets.join(", ")} WHERE id = ?`,
    ...args
  );
}
