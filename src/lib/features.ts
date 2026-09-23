import { Prisma } from "@prisma/client";
import { db } from "@/lib/prother";

/**
 * Feature-matrix data helpers (Task 32).
 *
 * Category.features (pipe-separated axes) and Tool.features (JSON map) are
 * POST-boot columns: the long-running dev server holds a cached pre-v6
 * PrismaClient that does not know them, so EVERY read/write here goes through
 * raw SQL (same rule as Review/AdServeStat/PageViewDaily — see lib/forum.ts
 * and worklog Task 27). Standalone seed scripts may use the ORM freely.
 */

/** Parse a Tool.features JSON blob into a safe object (never throws). */
export function parseFeatures(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string" && k.trim()) out[k.trim()] = v;
    }
    return out;
  } catch {
    return {};
  }
}

/** Parse a Category.features pipe string into axis labels (deduped, trimmed). */
export function parseFeatureAxes(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean)
    )
  ).slice(0, 12);
}

/** Feature values for the given tool ids: Map<toolId, features object>. */
export async function toolFeaturesByIds(
  ids: string[]
): Promise<Map<string, Record<string, string>>> {
  if (ids.length === 0) return new Map();
  const rows = await db.$queryRaw<{ id: string; features: string | null }[]>`
    SELECT id, features FROM Tool WHERE id IN (${Prisma.join(ids)})`;
  return new Map(rows.map((r) => [r.id, parseFeatures(r.features)]));
}

/** Feature axes for the given category ids: Map<categoryId, string[]>. */
export async function categoryFeaturesByIds(
  ids: string[]
): Promise<Map<string, string[]>> {
  if (ids.length === 0) return new Map();
  const rows = await db.$queryRaw<{ id: string; features: string | null }[]>`
    SELECT id, features FROM Category WHERE id IN (${Prisma.join(ids)})`;
  return new Map(rows.map((r) => [r.id, parseFeatureAxes(r.features)]));
}

/** Persist one tool's feature map (whole-object replace). */
export async function setToolFeatures(
  id: string,
  features: Record<string, string>
): Promise<void> {
  const json = JSON.stringify(features);
  await db.$executeRaw`UPDATE Tool SET features = ${json} WHERE id = ${id}`;
}

/** Persist one category's feature axes (pipe-joined whole replace). */
export async function setCategoryFeatures(
  id: string,
  axes: string[]
): Promise<void> {
  const pipe = axes.join("|");
  await db.$executeRaw`UPDATE Category SET features = ${pipe} WHERE id = ${id}`;
}
