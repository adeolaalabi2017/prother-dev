/**
 * D1 port of convex/admin.ts `toolsTable` (admin Listings tab).
 *
 * The Convex version read stale data after the D1 cutover (about 190 tools
 * vs 869 live) and collected four whole tables per request. This filters,
 * sorts and limits in SQL, then counts comments and published reviews only
 * for the returned page.
 *
 * Shape matches the Convex query field-for-field (tags stay a pipe string,
 * dates ship as ISO strings), plus `total`: how many rows matched before the
 * 200-row page cap.
 */
import { and, desc, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import { getD1 } from "./client";
import { categories, comments, reviews, tools } from "./schema";

const PAGE = 200;
/** Ids per IN (...) list: under D1's 100-bound-parameter cap with room for others. */
const ID_BATCH = 90;

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function arr<T = string>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

function obj(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

const iso = (ms: number | null | undefined) => (ms != null ? new Date(ms).toISOString() : null);

/** Escape LIKE wildcards so a search for "100%" matches literally. */
export function likeNeedle(q: string): string {
  return `%${q.toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export async function d1AdminTools(args: { q: string; status: string; category: string }) {
  const db = await getD1();
  if (!db) return null;

  const catRows = await db.select().from(categories);
  if (catRows.length === 0) return null; // empty local preview D1: use Convex

  const where: SQL[] = [];
  const q = args.q.trim();
  if (q) {
    const needle = likeNeedle(q);
    const ci = (col: typeof tools.name) => sql`lower(${col}) LIKE ${needle} ESCAPE '\\'`;
    where.push(or(ci(tools.name), ci(tools.tagline), ci(tools.slug))!);
  }
  if (args.status && args.status !== "all") where.push(eq(tools.status, args.status));
  if (args.category) {
    // The console sends the category's doc id (legacyId ?? id).
    const cat = catRows.find((c) => c.id === args.category || c.legacyId === args.category);
    where.push(eq(tools.categoryId, cat?.id ?? args.category));
  }
  const cond = where.length ? and(...where) : undefined;

  const [rows, totalRows] = await Promise.all([
    db.select().from(tools).where(cond).orderBy(desc(tools.createdAt)).limit(PAGE),
    db.select({ n: sql<number>`count(*)` }).from(tools).where(cond),
  ]);

  // D1 allows at most 100 bound parameters per query, so a 200-row page
  // can't go into one IN (...) list. Count in batches instead.
  const batches = chunk(
    rows.map((t) => t.id),
    ID_BATCH
  );
  const [commentBatches, reviewBatches] = await Promise.all([
    Promise.all(
      batches.map((ids) =>
        db
          .select({ toolId: comments.toolId, n: sql<number>`count(*)` })
          .from(comments)
          .where(inArray(comments.toolId, ids))
          .groupBy(comments.toolId)
      )
    ),
    Promise.all(
      batches.map((ids) =>
        db
          .select({ toolId: reviews.toolId, n: sql<number>`count(*)` })
          .from(reviews)
          .where(and(inArray(reviews.toolId, ids), eq(reviews.status, "published")))
          .groupBy(reviews.toolId)
      )
    ),
  ]);
  const commentCounts = commentBatches.flat();
  const reviewCounts = reviewBatches.flat();
  const cByTool = new Map(commentCounts.map((r) => [r.toolId, Number(r.n)]));
  const rByTool = new Map(reviewCounts.map((r) => [r.toolId, Number(r.n)]));
  const catById = new Map(catRows.map((c) => [c.id, c]));

  return {
    total: Number(totalRows[0]?.n ?? 0),
    tools: rows.map((t) => {
      const cat = catById.get(t.categoryId);
      return {
        id: t.legacyId ?? t.id,
        slug: t.slug,
        name: t.name,
        tagline: t.tagline,
        description: t.description ?? null,
        websiteUrl: t.websiteUrl,
        logoEmoji: t.logoEmoji,
        logoGradient: t.logoGradient,
        pricingModel: t.pricingModel,
        startingPrice: t.startingPrice ?? null,
        pricingNote: t.pricingNote ?? null,
        hasApi: t.hasApi === 1,
        githubUrl: t.githubUrl ?? null,
        docsUrl: t.docsUrl ?? null,
        twitterUrl: t.twitterUrl ?? null,
        // Compat shim: the console consumes the pipe string today.
        tags: arr(t.tagsJson).map(String).join("|"),
        track: t.track,
        status: t.status,
        pinned: t.pinned,
        editorsPick: t.editorsPick === 1,
        curated: t.curated === 1,
        claimed: t.claimed === 1,
        makerHandle: t.makerHandle,
        verifiedAt: iso(t.verifiedAt),
        createdAt: iso(t.createdAt),
        category: {
          id: cat ? (cat.legacyId ?? cat.id) : t.categoryId,
          name: cat?.name ?? "Unknown",
          emoji: cat?.emoji ?? "",
          slug: cat?.slug ?? "",
        },
        features: obj(t.featuresJson),
        logoUrl: t.logoUrl ?? null,
        screenshotUrls: arr(t.screenshotUrlsJson),
        longDescription: t.longDescription ?? null,
        useCases: arr<{ title: string; body: string }>(t.useCasesJson),
        pros: arr(t.prosJson),
        cons: arr(t.consJson),
        alternatives: arr(t.alternativesJson),
        pricingCheckedAt: iso(t.pricingCheckedAt),
        contentUpdatedAt: iso(t.contentUpdatedAt),
        comments: cByTool.get(t.id) ?? 0,
        reviews: rByTool.get(t.id) ?? 0,
      };
    }),
  };
}
