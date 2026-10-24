/**
 * D1 ports of convex/ads.ts + analytics-adjacent mutations (migration wave 3).
 *
 * Writes are D1-primary with Convex fallback in src/lib/data.ts. Once these
 * ship, the Convex pageViewDaily / adServeStats / comparisons tables go stale
 * by design (reads move here too).
 */
import { and, desc, eq, gte, or, sql } from "drizzle-orm";
import { getD1 } from "./client";
import { parseArr } from "./queries2";
import {
  adCampaigns,
  adServeStats,
  categories,
  comments,
  comparisons,
  errorDaily,
  pageViewDaily,
  posts,
  pvSourceDaily,
  reviews,
  searchDaily,
  siteSettings,
  tools,
} from "./schema";

function isoFromMs(ms: number): string {
  return new Date(ms).toISOString();
}

function utcDay(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function docId(d: { id: string; legacyId: string | null }): string {
  return d.legacyId ?? d.id;
}

const PLACEMENTS = ["journal_bar", "category_spotlight", "directory_banner", "serp_footer"] as const;
const CPM_CENTS = 10;

type Campaign = typeof adCampaigns.$inferSelect;

export function mapCampaign(r: Campaign) {
  const impressions = r.impressions;
  const clicks = r.clicks;
  const startsAt = r.startsAt != null ? isoFromMs(r.startsAt) : null;
  const endsAt = r.endsAt != null ? isoFromMs(r.endsAt) : null;
  const viewable = r.viewableImpressions ?? 0;
  const now = Date.now();
  const start = startsAt ? new Date(startsAt).getTime() : null;
  const end = endsAt ? new Date(endsAt).getTime() : null;
  return {
    id: docId(r),
    name: r.name,
    advertiser: r.advertiser,
    placement: (PLACEMENTS as readonly string[]).includes(r.placement) ? r.placement : "directory_banner",
    status: ["draft", "active", "paused", "ended"].includes(r.status) ? r.status : "draft",
    headline: r.headline,
    body: r.body,
    clickUrl: r.clickUrl,
    emoji: r.emoji,
    gradient: r.gradient,
    targetCategory: r.targetCategory,
    weight: r.weight,
    startsAt,
    endsAt,
    totalBudgetCents: r.totalBudgetCents,
    dailyBudgetCents: r.dailyBudgetCents,
    impressions,
    clicks,
    viewableImpressions: viewable,
    ctr: impressions > 0 ? Math.round((clicks / impressions) * 1000) / 10 : 0,
    vRate: impressions > 0 ? Math.round((viewable / impressions) * 1000) / 10 : 0,
    windowState:
      !startsAt && !endsAt
        ? ("none" as const)
        : start && now < start
          ? ("scheduled" as const)
          : end && now > end
            ? ("finished" as const)
            : ("running" as const),
  };
}

async function servingEnabled(
  db: NonNullable<Awaited<ReturnType<typeof getD1>>>,
  placement: string,
): Promise<boolean> {
  const rows = await db.select().from(siteSettings);
  const map = new Map(rows.map((r) => [r.key, r.value]));
  if (map.get("ads.master") === "0") return false;
  return map.get(`ads.placement.${placement}`) !== "0";
}

async function recordFill(
  db: NonNullable<Awaited<ReturnType<typeof getD1>>>,
  placement: string,
  outcome: "served" | "house" | "unfilled",
  nowMs: number,
): Promise<void> {
  const day = utcDay(nowMs);
  await db
    .insert(adServeStats)
    .values({
      id: `ads-${placement}-${day}`,
      placement,
      day,
      served: outcome === "served" ? 1 : 0,
      house: outcome === "house" ? 1 : 0,
      unfilled: outcome === "unfilled" ? 1 : 0,
      createdAt: nowMs,
      updatedAt: nowMs,
    })
    .onConflictDoUpdate({
      target: [adServeStats.placement, adServeStats.day],
      set: {
        served: sql`${adServeStats.served} + ${outcome === "served" ? 1 : 0}`,
        house: sql`${adServeStats.house} + ${outcome === "house" ? 1 : 0}`,
        unfilled: sql`${adServeStats.unfilled} + ${outcome === "unfilled" ? 1 : 0}`,
        updatedAt: nowMs,
      },
    });
}

export async function d1AdServe(placement: string, category?: string) {
  const db = await getD1();
  if (!db) return null;
  const nowMs = Date.now();
  if (!(await servingEnabled(db, placement))) {
    return { ad: null, fallback: "none" as const };
  }
  const active = await db
    .select()
    .from(adCampaigns)
    .where(and(eq(adCampaigns.placement, placement), eq(adCampaigns.status, "active")));
  const eligible = active.filter(
    (c) =>
      (c.targetCategory == null || c.targetCategory === (category ?? "")) &&
      (c.startsAt == null || c.startsAt <= nowMs) &&
      (c.endsAt == null || c.endsAt >= nowMs) &&
      (c.totalBudgetCents === 0 || c.impressions < (c.totalBudgetCents * 1000.0) / CPM_CENTS),
  );
  if (eligible.length === 0) {
    await recordFill(db, placement, "house", nowMs);
    return { ad: null, fallback: "house" as const };
  }
  const weights = eligible.map((r) => Math.max(1, r.weight || 1));
  const total = weights.reduce((s, w) => s + w, 0);
  let roll = Math.random() * total;
  let picked = eligible[0]!;
  for (let i = 0; i < eligible.length; i++) {
    roll -= weights[i]!;
    if (roll <= 0) {
      picked = eligible[i]!;
      break;
    }
  }
  const payload = mapCampaign(picked);
  await db
    .update(adCampaigns)
    .set({ impressions: picked.impressions + 1 })
    .where(eq(adCampaigns.id, picked.id));
  await recordFill(db, placement, "served", nowMs);
  return { ad: payload, clickHref: `/api/ads/click?id=${payload.id}`, outcome: "served" as const };
}

async function findCampaign(db: NonNullable<Awaited<ReturnType<typeof getD1>>>, id: string) {
  const byId = (await db.select().from(adCampaigns).where(eq(adCampaigns.id, id)).limit(1))[0];
  if (byId) return byId;
  return (await db.select().from(adCampaigns).where(eq(adCampaigns.legacyId, id)).limit(1))[0] ?? null;
}

export async function d1AdClick(id: string) {
  const db = await getD1();
  if (!db) return null;
  const c = await findCampaign(db, id);
  if (!c) return { clickUrl: null };
  await db
    .update(adCampaigns)
    .set({ clicks: c.clicks + 1 })
    .where(eq(adCampaigns.id, c.id));
  return { clickUrl: c.clickUrl };
}

export async function d1AdViewable(id: string) {
  const db = await getD1();
  if (!db) return null;
  const c = await findCampaign(db, id);
  if (!c) return { ok: true as const };
  await db
    .update(adCampaigns)
    .set({ viewableImpressions: (c.viewableImpressions ?? 0) + 1 })
    .where(eq(adCampaigns.id, c.id));
  return { ok: true as const };
}

export async function d1RecordPageView(path: string, day: string, nowMs: number) {
  const db = await getD1();
  if (!db) return null;
  await db
    .insert(pageViewDaily)
    .values({ id: `pv:${day}:${path}`, path, day, views: 1, updatedAt: nowMs })
    .onConflictDoUpdate({
      target: [pageViewDaily.path, pageViewDaily.day],
      set: { views: sql`${pageViewDaily.views} + 1`, updatedAt: nowMs },
    });
  return { ok: true as const };
}

export async function d1RecordPageViewSource(
  source: string,
  device: string,
  day: string,
  nowMs: number
) {
  const db = await getD1();
  if (!db) return null;
  await db
    .insert(pvSourceDaily)
    .values({ id: `pvs:${day}:${device}:${source}`, source, device, day, views: 1, updatedAt: nowMs })
    .onConflictDoUpdate({
      target: [pvSourceDaily.source, pvSourceDaily.device, pvSourceDaily.day],
      set: { views: sql`${pvSourceDaily.views} + 1`, updatedAt: nowMs },
    });
  return { ok: true as const };
}

export async function d1RecordSearch(
  query: string,
  zero: boolean,
  day: string,
  nowMs: number
) {
  const db = await getD1();
  if (!db) return null;
  await db
    .insert(searchDaily)
    .values({
      id: `sq:${day}:${query}`,
      query,
      day,
      count: 1,
      zeroCount: zero ? 1 : 0,
      updatedAt: nowMs,
    })
    .onConflictDoUpdate({
      target: [searchDaily.query, searchDaily.day],
      set: {
        count: sql`${searchDaily.count} + 1`,
        zeroCount: sql`${searchDaily.zeroCount} + ${zero ? 1 : 0}`,
        updatedAt: nowMs,
      },
    });
  return { ok: true as const };
}

export async function d1RecordError(sig: string, day: string, nowMs: number) {
  const db = await getD1();
  if (!db) return null;
  await db
    .insert(errorDaily)
    .values({ id: `err:${day}:${sig}`, sig, day, count: 1, updatedAt: nowMs })
    .onConflictDoUpdate({
      target: [errorDaily.sig, errorDaily.day],
      set: { count: sql`${errorDaily.count} + 1`, updatedAt: nowMs },
    });
  return { ok: true as const };
}

export async function d1TrafficReadout() {
  const db = await getD1();
  if (!db) return null;
  const todayMs = Date.now();
  const days: string[] = [];
  for (let i = 13; i >= 0; i--) days.push(new Date(todayMs - i * 86_400_000).toISOString().slice(0, 10));
  const rows = await db.select().from(pageViewDaily).where(gte(pageViewDaily.day, days[0]!));
  if (rows.length === 0) return null;
  const byDay = new Map<string, number>();
  const byPath = new Map<string, number>();
  for (const r of rows) {
    byDay.set(r.day, (byDay.get(r.day) ?? 0) + r.views);
    byPath.set(r.path, (byPath.get(r.path) ?? 0) + r.views);
  }
  const top = [...byPath.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .slice(0, 8)
    .map(([path, views]) => ({ path, views }));
  // Sources × devices + search demand over the same window.
  const [sourceRows, searchRows] = await Promise.all([
    db.select().from(pvSourceDaily).where(gte(pvSourceDaily.day, days[0]!)),
    db.select().from(searchDaily).where(gte(searchDaily.day, days[0]!)),
  ]);
  const bySource = new Map<string, number>();
  const byDevice = new Map<string, number>();
  let totalSourceViews = 0;
  for (const r of sourceRows) {
    bySource.set(r.source, (bySource.get(r.source) ?? 0) + r.views);
    byDevice.set(r.device, (byDevice.get(r.device) ?? 0) + r.views);
    totalSourceViews += r.views;
  }
  const sources = {
    rows: [...bySource.entries()]
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, 6)
      .map(([source, views]) => ({ source, views })),
    total: totalSourceViews,
  };
  const devices = [...byDevice.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([device, views]) => ({ device, views }));
  const byQuery = new Map<string, { count: number; zero: number }>();
  for (const r of searchRows) {
    const cur = byQuery.get(r.query) ?? { count: 0, zero: 0 };
    byQuery.set(r.query, { count: cur.count + r.count, zero: cur.zero + r.zeroCount });
  }
  const searches = {
    queries: [...byQuery.entries()]
      .sort((a, b) => b[1].count - a[1].count || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, 10)
      .map(([query, v]) => ({ query, count: v.count, zero: v.zero })),
    totals: {
      searches: [...byQuery.values()].reduce((s, v) => s + v.count, 0),
      zero: [...byQuery.values()].reduce((s, v) => s + v.zero, 0),
    },
  };
  const errorRows = await db.select().from(errorDaily).where(gte(errorDaily.day, days[0]!));
  const bySig = new Map<string, number>();
  for (const r of errorRows) {
    bySig.set(r.sig, (bySig.get(r.sig) ?? 0) + r.count);
  }
  return {
    days: days.map((d) => ({ day: d, views: byDay.get(d) ?? 0 })),
    total: [...byDay.values()].reduce((s, n) => s + n, 0),
    top,
    sources,
    devices,
    searches,
    errors: {
      total: [...bySig.values()].reduce((s, n) => s + n, 0),
      rows: [...bySig.entries()]
        .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
        .slice(0, 6)
        .map(([sig, count]) => ({ sig, count })),
    },
  };
}

export async function d1PlacementMeasurement() {
  const db = await getD1();
  if (!db) return null;
  const placements = [...PLACEMENTS];
  const todayMs = Date.now();
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) days.push(new Date(todayMs - i * 86_400_000).toISOString().slice(0, 10));
  const rows = await db
    .select()
    .from(adServeStats)
    .where(and(gte(adServeStats.day, days[0]!), sql`${adServeStats.day} <= ${days[days.length - 1]!}`));
  if (rows.length === 0 && (await db.select({ id: adServeStats.id }).from(adServeStats).limit(1)).length === 0)
    return null;
  const rate = (served: number, house: number, unfilled: number) => {
    const requested = served + house + unfilled;
    return requested > 0 ? Math.round(((house + unfilled) / requested) * 1000) / 10 : 0;
  };
  const perPlacement = placements.map((p) => {
    const agg = { served: 0, house: 0, unfilled: 0 };
    for (const r of rows) {
      if (r.placement !== p) continue;
      agg.served += r.served;
      agg.house += r.house;
      agg.unfilled += r.unfilled;
    }
    return { placement: p, ...agg, unfillRate: rate(agg.served, agg.house, agg.unfilled) };
  });
  const grid: {
    placement: string;
    day: string;
    served: number;
    house: number;
    unfilled: number;
    unfillRate: number;
  }[] = [];
  for (const p of placements) {
    for (const d of days) {
      const r = rows.find((x) => x.placement === p && x.day === d);
      const served = r?.served ?? 0;
      const house = r?.house ?? 0;
      const unfilled = r?.unfilled ?? 0;
      grid.push({ placement: p, day: d, served, house, unfilled, unfillRate: rate(served, house, unfilled) });
    }
  }
  return {
    days: days.map((d) => ({ day: d, date: new Date(`${d}T00:00:00.000Z`).toUTCString().slice(0, 11) })),
    rows: grid,
    perPlacement,
  };
}

export async function d1CompareBump(aSlug: string, bSlug: string) {
  const db = await getD1();
  if (!db) return null;
  await db
    .insert(comparisons)
    .values({ id: `cmp:${aSlug}:${bSlug}`, aSlug, bSlug, views: 1, createdAt: Date.now() })
    .onConflictDoUpdate({
      target: [comparisons.aSlug, comparisons.bSlug],
      set: { views: sql`${comparisons.views} + 1` },
    });
  return { ok: true as const };
}

function reviewAggregate(revs: { ease: number; power: number; value: number }[]) {
  const count = revs.length;
  if (count < 3) return { count, aggregate: null };
  const se = revs.reduce((a, r) => a + r.ease, 0);
  const sp = revs.reduce((a, r) => a + r.power, 0);
  const sv = revs.reduce((a, r) => a + r.value, 0);
  return {
    count,
    aggregate: {
      count,
      ease: round1(se / count),
      power: round1(sp / count),
      value: round1(sv / count),
      overall: round1((se + sp + sv) / (3 * count)),
    },
  };
}

export async function d1CompareView(aSlug: string, bSlug: string, limit: number) {
  const db = await getD1();
  if (!db) return null;
  const [toolA, toolB] = await Promise.all([
    db.select().from(tools).where(eq(tools.slug, aSlug)).limit(1).then((r) => r[0] ?? null),
    db.select().from(tools).where(eq(tools.slug, bSlug)).limit(1).then((r) => r[0] ?? null),
  ]);
  if (!toolA || !toolB) {
    // Still return popular when a/b miss (mirrors convex behavior).
    const cmp = await db.select().from(comparisons).orderBy(desc(comparisons.views)).limit(limit);
    if (cmp.length === 0 && toolA == null) return null;
    const popular = await popularWithNames(db, cmp);
    return { error: "tool_not_found" as const, popular };
  }
  const [catRows, revRows, comRows, cmp] = await Promise.all([
    db.select().from(categories),
    db
      .select()
      .from(reviews)
      .where(
        and(
          or(eq(reviews.toolId, toolA.id), eq(reviews.toolId, toolB.id)),
          eq(reviews.status, "published"),
        ),
      ),
    db
      .select({ id: comments.id, toolId: comments.toolId })
      .from(comments)
      .where(or(eq(comments.toolId, toolA.id), eq(comments.toolId, toolB.id))),
    db.select().from(comparisons).orderBy(desc(comparisons.views)).limit(limit),
  ]);
  const catById = new Map(catRows.map((c) => [c.id, c]));
  const row = (t: NonNullable<typeof toolA>) => {
    const cat = catById.get(t.categoryId)!;
    const pub = revRows
      .filter((r) => r.toolId === t.id)
      .map((r) => ({ ease: r.ease, power: r.power, value: r.value }));
    const stats = reviewAggregate(pub);
    return {
      slug: t.slug,
      name: t.name,
      tagline: t.tagline,
      emoji: t.logoEmoji,
      gradient: t.logoGradient,
      description: t.description,
      websiteUrl: t.websiteUrl,
      pricing: { model: t.pricingModel, price: t.startingPrice, note: t.pricingNote },
      category: { slug: cat.slug, name: cat.name, emoji: cat.emoji },
      tags: parseArr(t.tagsJson),
      links: { github: t.githubUrl, docs: t.docsUrl, twitter: t.twitterUrl },
      rating: stats.aggregate,
      reviewCount: stats.count,
      comments: comRows.filter((c) => c.toolId === t.id).length,
      verified: t.verifiedAt != null,
      claimed: t.claimed === 1,
      hasApi: t.hasApi === 1,
      track: t.track === "community" ? "community" : ("editor_seed" as const),
      maker: t.makerHandle,
    };
  };
  return { a: row(toolA), b: row(toolB), popular: await popularWithNames(db, cmp) };
}

async function popularWithNames(
  db: NonNullable<Awaited<ReturnType<typeof getD1>>>,
  cmp: (typeof comparisons.$inferSelect)[],
) {
  if (cmp.length === 0) return [];
  const slugs = [...new Set(cmp.flatMap((c) => [c.aSlug, c.bSlug]))];
  const found = await db.select().from(tools).where(sql`${tools.slug} IN (${sql.join(slugs.map((s) => sql`${s}`), sql`, `)})`);
  const bySlug = new Map(found.map((t) => [t.slug, t]));
  return cmp.flatMap((c) => {
    const ta = bySlug.get(c.aSlug);
    const tb = bySlug.get(c.bSlug);
    if (!ta || !tb) return [];
    return [
      {
        aSlug: c.aSlug,
        bSlug: c.bSlug,
        views: c.views,
        aName: ta.name,
        aEmoji: ta.logoEmoji,
        bName: tb.name,
        bEmoji: tb.logoEmoji,
      },
    ];
  });
}

export async function d1PostBumpViews(slug: string) {
  const db = await getD1();
  if (!db) return null;
  const post = (await db.select().from(posts).where(eq(posts.slug, slug)).limit(1))[0];
  if (!post) return { ok: false as const };
  await db
    .update(posts)
    .set({ views: post.views + 1 })
    .where(eq(posts.id, post.id));
  return { ok: true as const };
}
