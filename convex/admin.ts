/**
 * Convex reads: admin overview dashboard + admin listings table.
 * Shadows GET /api/admin/overview and GET /api/admin/tools (GET only —
 * writes stay Prisma-side through Phase 4).
 *
 * Compatibility notes:
 * - `overview` intentionally OMITS the `logAudit("admin.view", …)` side
 *   effect: shadow traffic must not pollute the audit trail (the served
 *   Prisma response still logs exactly once per request, as today).
 * - `toolsTable` mirrors the `...t` spread field-for-field: `tags` stays a
 *   PIPE STRING and dates ship as ISO strings (Phase 4 console switches to
 *   arrays; the shadow pins today's contract). Row `id` is the cuid.
 * - Bucket math (14 UTC-day window, index 13 = today) and queueAgeH floor
 *   match the route line-for-line.
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { isoFromMs } from "./shared";

const DAY_MS = 86_400_000;

/** Audit-trail append (lib/admin.ts logAudit — Convex-first since step 7). */
export const appendAudit = mutation({
  args: {
    action: v.string(),
    entity: v.string(),
    entityId: v.string(),
    meta: v.string(),
    actor: v.optional(v.string()),
    createdAt: v.number(),
  },
  handler: async (ctx, a) => {
    await ctx.db.insert("auditLogs", {
      action: a.action,
      entity: a.entity,
      entityId: a.entityId,
      meta: a.meta,
      actor: a.actor,
      createdAt: a.createdAt,
    });
    return { ok: true as const };
  },
});

export const overview = query({
  args: {},
  handler: async (ctx) => {
    const nowMs = Date.now();
    const now = new Date(nowMs);
    const todayStartMs = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    );
    const todayKey = new Date(todayStartMs).toISOString().slice(0, 10);
    const windowStartMs = todayStartMs - 13 * DAY_MS;

    const [
      tools,
      submissions,
      comments,
      posts,
      categories,
      auditLogs,
      reviews,
      reports,
      campaigns,
      pageViews,
    ] = await Promise.all([
      ctx.db.query("tools").collect(),
      ctx.db.query("submissions").collect(),
      ctx.db.query("comments").collect(),
      ctx.db.query("posts").collect(),
      ctx.db.query("categories").collect(),
      ctx.db.query("auditLogs").collect(),
      ctx.db.query("reviews").collect(),
      ctx.db.query("reports").collect(),
      ctx.db.query("adCampaigns").collect(),
      ctx.db.query("pageViewDaily").collect(),
    ]);

    const liveTools = tools.filter((t) => t.status === "live");
    const pendingSubs = submissions.filter((s) => s.status === "pending");
    const publishedPosts = posts.filter((p) => p.status === "published");
    const publishedReviews = reviews.filter((r) => r.status === "published");
    const openReports = reports.filter((r) => r.status === "open");

    const oldestPending = [...pendingSubs].sort(
      (a, b) => a.createdAt - b.createdAt,
    )[0];

    const bucketByDay = (createdAts: number[]): number[] => {
      const counts = new Array<number>(14).fill(0);
      for (const at of createdAts) {
        const idx = Math.floor((at - windowStartMs) / DAY_MS);
        if (idx >= 0 && idx < 14) counts[idx]++;
      }
      return counts;
    };
    const listingsByDay = bucketByDay(
      liveTools.filter((t) => t.createdAt >= windowStartMs).map((t) => t.createdAt),
    );
    const reviewsByDay = bucketByDay(
      publishedReviews
        .filter((r) => r.createdAt >= windowStartMs)
        .map((r) => r.createdAt),
    );

    const liveByCat = new Map<string, number>();
    for (const t of liveTools) {
      liveByCat.set(t.categoryId, (liveByCat.get(t.categoryId) ?? 0) + 1);
    }
    const categoryMix = categories
      .map((c) => ({ name: c.name, count: liveByCat.get(c._id) ?? 0 }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count);

    const pricingCount = new Map<string, number>();
    for (const t of liveTools) {
      pricingCount.set(t.pricingModel, (pricingCount.get(t.pricingModel) ?? 0) + 1);
    }
    const pricingMix = [...pricingCount.entries()]
      .map(([model, count]) => ({ model, count }))
      .sort((a, b) => b.count - a.count);

    const audit = [...auditLogs]
      .sort(
        (a, b) => b.createdAt - a.createdAt || a._creationTime - b._creationTime,
      )
      .slice(0, 14)
      .map((a) => ({
        id: a.legacyId ?? a._id,
        action: a.action,
        entity: a.entity,
        entityId: a.entityId,
        meta: a.meta,
        at: isoFromMs(a.createdAt),
      }));

    return {
      kpis: {
        toolsLive: liveTools.length,
        pendingSubs: pendingSubs.length,
        postsPublished: publishedPosts.length,
        comments: comments.length,
        reviewsPublished: publishedReviews.length,
        reportsOpen: openReports.length,
        adsActive: campaigns.filter((c) => c.status === "active").length,
        adImpressions: campaigns.reduce((s, c) => s + c.impressions, 0),
        adClicks: campaigns.reduce((s, c) => s + c.clicks, 0),
        pageviewsToday: pageViews
          .filter((p) => p.day === todayKey)
          .reduce((s, p) => s + p.views, 0),
        categories: categories.length,
      },
      listingsByDay,
      reviewsByDay,
      categoryMix,
      pricingMix,
      queueAgeH: oldestPending
        ? Math.floor((nowMs - oldestPending.createdAt) / 3_600_000)
        : 0,
      oldestPending: oldestPending?.name ?? null,
      audit,
    };
  },
});

export const toolsTable = query({
  args: {
    q: v.string(),
    status: v.string(),
    category: v.string(),
  },
  handler: async (ctx, { q, status, category }) => {
    const [tools, categories, comments, reviews] = await Promise.all([
      ctx.db.query("tools").collect(),
      ctx.db.query("categories").collect(),
      ctx.db.query("comments").collect(),
      ctx.db.query("reviews").collect(),
    ]);

    const needle = q.toLowerCase();
    const matching = tools.filter((t) => {
      if (
        q &&
        !(
          t.name.toLowerCase().includes(needle) ||
          t.tagline.toLowerCase().includes(needle) ||
          t.slug.toLowerCase().includes(needle)
        )
      )
        return false;
      if (status && status !== "all" && t.status !== status) return false;
      if (category && t.categoryId !== category) return false;
      return true;
    });

    matching.sort(
      (a, b) => b.createdAt - a.createdAt || a._creationTime - b._creationTime,
    );
    const page = matching.slice(0, 200);
    const ids = new Set(page.map((t) => t._id));

    const commentCount = new Map<string, number>();
    for (const c of comments) {
      if (!ids.has(c.toolId)) continue;
      commentCount.set(c.toolId, (commentCount.get(c.toolId) ?? 0) + 1);
    }
    const reviewCount = new Map<string, number>();
    for (const r of reviews) {
      if (r.status !== "published" || !ids.has(r.toolId)) continue;
      reviewCount.set(r.toolId, (reviewCount.get(r.toolId) ?? 0) + 1);
    }

    const catById = new Map(categories.map((c) => [c._id, c]));
    return {
      tools: page.map((t) => {
        const cat = catById.get(t.categoryId)!;
        return {
          id: t.legacyId ?? t._id,
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
          hasApi: t.hasApi,
          githubUrl: t.githubUrl ?? null,
          docsUrl: t.docsUrl ?? null,
          twitterUrl: t.twitterUrl ?? null,
          // Compat shim: the console consumes the pipe string today.
          tags: t.tags.join("|"),
          track: t.track,
          status: t.status,
          pinned: t.pinned,
          editorsPick: t.editorsPick,
          curated: t.curated,
          claimed: t.claimed,
          makerHandle: t.makerHandle,
          verifiedAt:
            t.verifiedAt != null ? isoFromMs(t.verifiedAt) : null,
          createdAt: isoFromMs(t.createdAt),
          category: {
            id: cat.legacyId ?? cat._id,
            name: cat.name,
            emoji: cat.emoji,
            slug: cat.slug,
          },
          features: t.features,
          logoUrl: t.logoUrl ?? null,
          screenshotUrls: t.screenshotUrls,
          longDescription: t.longDescription ?? null,
          useCases: t.useCases,
          pros: t.pros,
          cons: t.cons,
          alternatives: t.alternatives,
          pricingCheckedAt:
            t.pricingCheckedAt != null ? isoFromMs(t.pricingCheckedAt) : null,
          contentUpdatedAt:
            t.contentUpdatedAt != null ? isoFromMs(t.contentUpdatedAt) : null,
          comments: commentCount.get(t._id) ?? 0,
          reviews: reviewCount.get(t._id) ?? 0,
        };
      }),
    };
  },
});
