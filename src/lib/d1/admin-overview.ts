/**
 * D1 port of convex/admin.ts `overview` (admin dashboard KPIs + charts).
 *
 * Production reads and writes moved to D1, so the Convex overview had gone
 * stale (e.g. 190 live tools shown vs 869 real, 59 pending vs 282). Every
 * number here is a SQL aggregate: no table is loaded into the Worker.
 *
 * Shape matches the Convex query field-for-field except `audit`, which the
 * caller fills from Convex (logAudit still writes there).
 *
 * Bucket math: 14 UTC days, index 13 = today (same as the Convex version).
 */
import { and, asc, eq, gte, sql } from "drizzle-orm";
import { getD1 } from "./client";
import {
  adCampaigns,
  categories,
  comments,
  pageViewDaily,
  posts,
  reports,
  reviews,
  submissions,
  tools,
} from "./schema";

const DAY_MS = 86_400_000;

/** Map `{ day: 'YYYY-MM-DD', n }` rows onto a 14-slot array ending today. */
export function bucketDays(
  rows: ReadonlyArray<{ day: string; n: number }>,
  todayStartMs: number
): number[] {
  const windowStartMs = todayStartMs - 13 * DAY_MS;
  const out = new Array<number>(14).fill(0);
  for (const r of rows) {
    const idx = Math.floor((Date.parse(`${r.day}T00:00:00Z`) - windowStartMs) / DAY_MS);
    if (idx >= 0 && idx < 14) out[idx] += Number(r.n);
  }
  return out;
}

export async function d1AdminOverview(nowMs: number = Date.now()) {
  const db = await getD1();
  if (!db) return null;

  const now = new Date(nowMs);
  const todayStartMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const todayKey = new Date(todayStartMs).toISOString().slice(0, 10);
  const windowStartMs = todayStartMs - 13 * DAY_MS;

  const count = sql<number>`count(*)`;
  const dayOf = (col: typeof tools.createdAt | typeof reviews.createdAt) =>
    sql<string>`strftime('%Y-%m-%d', ${col} / 1000, 'unixepoch')`;

  const live = eq(tools.status, "live");
  const [
    toolsLive,
    pendingSubs,
    postsPublished,
    commentCount,
    reviewsPublished,
    reportsOpen,
    ads,
    pvToday,
    catRows,
    liveByCat,
    pricing,
    listingDays,
    reviewDays,
    oldest,
  ] = await Promise.all([
    db.select({ n: count }).from(tools).where(live),
    db.select({ n: count }).from(submissions).where(eq(submissions.status, "pending")),
    db.select({ n: count }).from(posts).where(eq(posts.status, "published")),
    db.select({ n: count }).from(comments),
    db.select({ n: count }).from(reviews).where(eq(reviews.status, "published")),
    db.select({ n: count }).from(reports).where(eq(reports.status, "open")),
    db
      .select({
        active: sql<number>`coalesce(sum(case when ${adCampaigns.status} = 'active' then 1 else 0 end), 0)`,
        impressions: sql<number>`coalesce(sum(${adCampaigns.impressions}), 0)`,
        clicks: sql<number>`coalesce(sum(${adCampaigns.clicks}), 0)`,
      })
      .from(adCampaigns),
    db
      .select({ n: sql<number>`coalesce(sum(${pageViewDaily.views}), 0)` })
      .from(pageViewDaily)
      .where(eq(pageViewDaily.day, todayKey)),
    db.select({ id: categories.id, name: categories.name }).from(categories),
    db.select({ categoryId: tools.categoryId, n: count }).from(tools).where(live).groupBy(tools.categoryId),
    db.select({ model: tools.pricingModel, n: count }).from(tools).where(live).groupBy(tools.pricingModel),
    db
      .select({ day: dayOf(tools.createdAt), n: count })
      .from(tools)
      .where(and(live, gte(tools.createdAt, windowStartMs)))
      .groupBy(dayOf(tools.createdAt)),
    db
      .select({ day: dayOf(reviews.createdAt), n: count })
      .from(reviews)
      .where(and(eq(reviews.status, "published"), gte(reviews.createdAt, windowStartMs)))
      .groupBy(dayOf(reviews.createdAt)),
    db
      .select({ name: submissions.name, createdAt: submissions.createdAt })
      .from(submissions)
      .where(eq(submissions.status, "pending"))
      .orderBy(asc(submissions.createdAt))
      .limit(1),
  ]);

  const n = (rows: { n: number }[]) => Number(rows[0]?.n ?? 0);
  // Empty local preview D1 (workerd) falls back to Convex; real D1 has rows.
  if (n(toolsLive) === 0 && catRows.length === 0) return null;

  const byCat = new Map(liveByCat.map((r) => [r.categoryId, Number(r.n)]));
  const categoryMix = catRows
    .map((c) => ({ name: c.name, count: byCat.get(c.id) ?? 0 }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
  const pricingMix = pricing
    .map((r) => ({ model: r.model, count: Number(r.n) }))
    .sort((a, b) => b.count - a.count);

  const oldestPending = oldest[0];
  return {
    kpis: {
      toolsLive: n(toolsLive),
      pendingSubs: n(pendingSubs),
      postsPublished: n(postsPublished),
      comments: n(commentCount),
      reviewsPublished: n(reviewsPublished),
      reportsOpen: n(reportsOpen),
      adsActive: Number(ads[0]?.active ?? 0),
      adImpressions: Number(ads[0]?.impressions ?? 0),
      adClicks: Number(ads[0]?.clicks ?? 0),
      pageviewsToday: n(pvToday),
      categories: catRows.length,
    },
    listingsByDay: bucketDays(listingDays, todayStartMs),
    reviewsByDay: bucketDays(reviewDays, todayStartMs),
    categoryMix,
    pricingMix,
    queueAgeH: oldestPending ? Math.floor((nowMs - oldestPending.createdAt) / 3_600_000) : 0,
    oldestPending: oldestPending?.name ?? null,
  };
}
