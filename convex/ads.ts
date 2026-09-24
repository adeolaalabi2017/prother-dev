/**
 * Convex ads + analytics (Phase 4 step 5).
 *
 * TRUST MODEL: mutations are called from Next.js routes that enforce
 * validation (placement allow-list, uuid-shaped ids, trackable paths) and
 * kill switches BEFORE calling. The serve mutation re-checks kill switches
 * internally so direct callers can never spend impressions on a dead slot.
 *
 * PARITY NOTES (all verified by counter comparison, not payload diffs —
 * picks are weighted-random by design):
 * - Eligibility + budget pacing mirror lib/ads.ts serveAd line-for-line
 *   (active, placement, targetCategory, flight window, impressions <
 *   totalBudgetCents*1000/10). SQLite compares ISO strings; Convex compares
 *   epoch ms — same instants.
 * - Served payloads carry PRE-increment counters (the Prisma increment is
 *   fire-and-forget after the pick) and legacyId ids (the click route
 *   addresses campaigns by cuid in both stores).
 * - Fill accounting (served/house/unfilled per placement per UTC day) and
 *   the viewable/pageview upserts mirror lib/ad-measure.ts + lib/analytics.ts
 *   (upsert-by-unique-key, fire-and-forget safe).
 * - Disabled placements record NOTHING (an off switch is not an unfilled
 *   slot) — same as the Prisma path.
 */
import { mutation, query } from "./_generated/server";
import type { GenericMutationCtx } from "convex/server";
import type { DataModel } from "./_generated/dataModel";
import { v } from "convex/values";
import { isoFromMs } from "./shared";

type MutCtx = GenericMutationCtx<DataModel>;

const PLACEMENTS = [
  "journal_bar",
  "category_spotlight",
  "directory_banner",
  "serp_footer",
] as const;

const CPM_CENTS = 10;

function docId<T extends { legacyId?: string; _id: string }>(d: T): string {
  return d.legacyId ?? d._id;
}

function utcDay(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

export function mapCampaign(r: {  legacyId?: string;
  _id: string;
  name: string;
  advertiser: string;
  placement: string;
  status: string;
  headline: string;
  body: string;
  clickUrl: string;
  emoji: string;
  gradient: string;
  targetCategory?: string;
  weight: number;
  startsAt?: number;
  endsAt?: number;
  totalBudgetCents: number;
  dailyBudgetCents: number;
  impressions: number;
  clicks: number;
  viewableImpressions: number;
}) {
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
    placement: (PLACEMENTS as readonly string[]).includes(r.placement)
      ? r.placement
      : "directory_banner",
    status: ["draft", "active", "paused", "ended"].includes(r.status)
      ? r.status
      : "draft",
    headline: r.headline,
    body: r.body,
    clickUrl: r.clickUrl,
    emoji: r.emoji,
    gradient: r.gradient,
    targetCategory: r.targetCategory ?? null,
    weight: r.weight,
    startsAt,
    endsAt,
    totalBudgetCents: r.totalBudgetCents,
    dailyBudgetCents: r.dailyBudgetCents,
    impressions,
    clicks,
    viewableImpressions: viewable,
    ctr: impressions > 0 ? Math.round((clicks / impressions) * 1000) / 10 : 0,
    vRate:
      impressions > 0 ? Math.round((viewable / impressions) * 1000) / 10 : 0,
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
  ctx: MutCtx,
  placement: string,
): Promise<boolean> {
  const rows = await ctx.db.query("siteSettings").collect();
  const map = new Map(rows.map((r) => [r.key, r.value]));
  if (map.get("ads.master") === "0") return false;
  return map.get(`ads.placement.${placement}`) !== "0";
}

async function recordFill(
  ctx: MutCtx,
  placement: string,
  outcome: "served" | "house" | "unfilled",
  nowMs: number,
): Promise<void> {
  const day = utcDay(nowMs);
  const rows = await ctx.db
    .query("adServeStats")
    .withIndex("by_placement_day", (q) =>
      q.eq("placement", placement).eq("day", day),
    )
    .collect();
  const row = rows[0];
  if (!row) {
    await ctx.db.insert("adServeStats", {
      placement,
      day,
      served: outcome === "served" ? 1 : 0,
      house: outcome === "house" ? 1 : 0,
      unfilled: outcome === "unfilled" ? 1 : 0,
      createdAt: nowMs,
      updatedAt: nowMs,
    });
    return;
  }
  await ctx.db.patch(row._id, {
    served: row.served + (outcome === "served" ? 1 : 0),
    house: row.house + (outcome === "house" ? 1 : 0),
    unfilled: row.unfilled + (outcome === "unfilled" ? 1 : 0),
    updatedAt: nowMs,
  });
}

/**
 * Ad serve (GET /api/ads/serve). Mutation because it writes: one
 * impression + one fill row per call, atomically with the pick.
 */
export const serve = mutation({
  args: { placement: v.string(), category: v.optional(v.string()) },
  handler: async (ctx, { placement, category }) => {
    const nowMs = Date.now();
    if (!(await servingEnabled(ctx, placement))) {
      return { ad: null, fallback: "none" as const };
    }
    const campaigns = await ctx.db
      .query("adCampaigns")
      .withIndex("by_placement_status", (i) =>
        i.eq("placement", placement).eq("status", "active"),
      )
      .collect();
    const eligible = campaigns.filter(
      (c) =>
        (c.targetCategory == null || c.targetCategory === (category ?? "")) &&
        (c.startsAt == null || c.startsAt <= nowMs) &&
        (c.endsAt == null || c.endsAt >= nowMs) &&
        (c.totalBudgetCents === 0 ||
          c.impressions < (c.totalBudgetCents * 1000.0) / CPM_CENTS),
    );
    if (eligible.length === 0) {
      await recordFill(ctx, placement, "house", nowMs);
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
    await ctx.db.patch(picked._id, { impressions: picked.impressions + 1 });
    await recordFill(ctx, placement, "served", nowMs);
    return {
      ad: payload,
      clickHref: `/api/ads/click?id=${payload.id}`,
      outcome: "served" as const,
    };
  },
});

/** Click register (GET /api/ads/click issues the 302 itself). */
export const registerClick = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const all = await ctx.db.query("adCampaigns").collect();
    const c = all.find((x) => docId(x) === id);
    if (!c) return { clickUrl: null };
    await ctx.db.patch(c._id, { clicks: c.clicks + 1 });
    return { clickUrl: c.clickUrl };
  },
});

/** Viewable-impression ping (POST /api/ads/viewable). Unknown ids no-op. */
export const recordViewable = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const all = await ctx.db.query("adCampaigns").collect();
    const c = all.find((x) => docId(x) === id);
    if (!c) return { ok: true as const };
    await ctx.db.patch(c._id, {
      viewableImpressions: (c.viewableImpressions ?? 0) + 1,
    });
    return { ok: true as const };
  },
});

/** Pageview ping (POST /api/analytics/pv). Upsert by (path, day). */
export const recordPageView = mutation({
  args: { path: v.string(), day: v.string(), nowMs: v.number() },
  handler: async (ctx, { path, day, nowMs }) => {
    const rows = await ctx.db
      .query("pageViewDaily")
      .withIndex("by_path_day", (i) => i.eq("path", path).eq("day", day))
      .collect();
    const row = rows[0];
    if (!row) {
      await ctx.db.insert("pageViewDaily", {
        path,
        day,
        views: 1,
        updatedAt: nowMs,
      });
      return { ok: true as const };
    }
    await ctx.db.patch(row._id, { views: row.views + 1, updatedAt: nowMs });
    return { ok: true as const };
  },
});

/** 14-day traffic readout (GET /api/admin/analytics). */
export const trafficReadout = query({
  args: {},
  handler: async (ctx) => {
    const todayMs = Date.now();
    const days: string[] = [];
    for (let i = 13; i >= 0; i--) {
      days.push(
        new Date(todayMs - i * 86_400_000).toISOString().slice(0, 10),
      );
    }
    const rows = (await ctx.db.query("pageViewDaily").collect()).filter(
      (r) => r.day >= days[0],
    );
    const byDay = new Map<string, number>();
    const byPath = new Map<string, number>();
    for (const r of rows) {
      byDay.set(r.day, (byDay.get(r.day) ?? 0) + r.views);
      byPath.set(r.path, (byPath.get(r.path) ?? 0) + r.views);
    }
    const top = [...byPath.entries()]
      // Tertiary path-ASC mirrors the Prisma ORDER BY (views DESC, path
      // ASC): SQLite hash-grouping leaves view ties in planner order, so
      // both paths need the deterministic tiebreak to agree.
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, 8)
      .map(([path, views]) => ({ path, views }));
    return {
      days: days.map((d) => ({ day: d, views: byDay.get(d) ?? 0 })),
      total: [...byDay.values()].reduce((s, n) => s + n, 0),
      top,
    };
  },
});

/** 7-day fill measurement (admin Measurement card data source). */
export const placementMeasurement = query({
  args: {},
  handler: async (ctx) => {
    const placements = [...PLACEMENTS];
    const todayMs = Date.now();
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      days.push(
        new Date(todayMs - i * 86_400_000).toISOString().slice(0, 10),
      );
    }
    const rows = (await ctx.db.query("adServeStats").collect()).filter(
      (r) => r.day >= days[0]! && r.day <= days[days.length - 1]!,
    );
    const rate = (served: number, house: number, unfilled: number) => {
      const requested = served + house + unfilled;
      return requested > 0
        ? Math.round(((house + unfilled) / requested) * 1000) / 10
        : 0;
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
        grid.push({
          placement: p,
          day: d,
          served,
          house,
          unfilled,
          unfillRate: rate(served, house, unfilled),
        });
      }
    }
    const dayRows = days.map((d) => ({
      day: d,
      date: new Date(`${d}T00:00:00.000Z`).toUTCString().slice(0, 11),
    }));
    return { days: dayRows, rows: grid, perPlacement };
  },
});
