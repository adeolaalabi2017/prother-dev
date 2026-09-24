/**
 * Phase 2 data-import module — DEV ONLY, deleted at Phase 5.
 *
 * Batched insert mutations plus verification queries, driven by
 * `scripts/export-to-convex.ts`. Design notes:
 *
 * - Parent references are resolved CLIENT-side: the script inserts parents
 *   first, builds legacyId → Convex _id maps from the returned receipts,
 *   and passes real `v.id()` values for child rows.
 * - Every row carries `legacyId` (the Prisma cuid) so reruns and spot
 *   checks can address documents deterministically.
 * - Idempotent rerun = `clearTables` (all data tables) followed by a fresh
 *   import. The local dev deployment is disposable until Phase 5.
 * - NextAuth tables (Account/Session/VerificationToken) are intentionally
 *   absent: auth stays on SQLite through Phase 4 (plan §3.5).
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { campaignLifecycleTick } from "./cronlib.js";

const TABLE_NAMES = v.union(
  v.literal("categories"),
  v.literal("tools"),
  v.literal("submissions"),
  v.literal("comments"),
  v.literal("posts"),
  v.literal("siteSettings"),
  v.literal("auditLogs"),
  v.literal("users"),
  v.literal("reviews"),
  v.literal("claims"),
  v.literal("collections"),
  v.literal("collectionItems"),
  v.literal("follows"),
  v.literal("comparisons"),
  v.literal("forumThreads"),
  v.literal("forumReplies"),
  v.literal("forumThreadVotes"),
  v.literal("reports"),
  v.literal("bookmarks"),
  v.literal("adCampaigns"),
  v.literal("adServeStats"),
  v.literal("pageViewDaily"),
  v.literal("media"),
  v.literal("integrations"),
  v.literal("authSessions"),
);

/** Wipe data tables (or a subset) so a rerun starts clean. */
export const clearTables = mutation({  args: { tables: v.array(TABLE_NAMES) },
  handler: async (ctx, { tables }) => {
    const cleared: Record<string, number> = {};
    for (const table of tables) {
      const docs = await ctx.db.query(table).collect();
      await Promise.all(docs.map((d) => ctx.db.delete(d._id)));
      cleared[table] = docs.length;
    }
    return cleared;
  },
});

/** Row counts per table — import verification (Phase 2 exit criteria). */
export const stats = query({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "categories",
      "tools",
      "submissions",
      "comments",
      "posts",
      "siteSettings",
      "auditLogs",
      "users",
      "reviews",
      "claims",
      "collections",
      "collectionItems",
      "follows",
      "comparisons",
      "forumThreads",
      "forumReplies",
      "forumThreadVotes",
      "reports",
      "bookmarks",
      "adCampaigns",
      "adServeStats",
      "pageViewDaily",
      "media",
      "integrations",
    ] as const;
    const out: Record<string, number> = {};
    for (const table of tables) {
      const docs = await ctx.db.query(table).collect();
      out[table] = docs.length;
    }
    return out;
  },
});

/** Fetch one document by legacyId — powers the 20-doc deep-compare check. */
export const byLegacy = query({
  args: { table: TABLE_NAMES, legacyId: v.string() },
  handler: async (ctx, { table, legacyId }) => {
    if (table === "authSessions") return null;
    const docs = await ctx.db
      .query(table)
      .filter((q) => q.eq(q.field("legacyId"), legacyId))
      .collect();
    return docs[0] ?? null;
  },
});

// ── Per-table batched inserts (validators mirror convex/schema.ts) ──

export const importCategories = mutation({
  args: {
    rows: v.array(
      v.object({
        slug: v.string(),
        name: v.string(),
        emoji: v.string(),
        sortOrder: v.number(),
        features: v.array(v.string()),
        legacyId: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { rows }) =>
    Promise.all(
      rows.map(async (r) => ({
        legacyId: r.legacyId ?? null,
        id: await ctx.db.insert("categories", r),
      })),
    ),
});

export const importTools = mutation({
  args: {
    rows: v.array(
      v.object({
        slug: v.string(),
        name: v.string(),
        tagline: v.string(),
        description: v.optional(v.string()),
        websiteUrl: v.string(),
        logoEmoji: v.string(),
        logoGradient: v.string(),
        logoUrl: v.optional(v.string()),
        screenshotUrls: v.array(v.string()),
        longDescription: v.optional(v.string()),
        useCases: v.array(v.object({ title: v.string(), body: v.string() })),
        pros: v.array(v.string()),
        cons: v.array(v.string()),
        alternatives: v.array(v.string()),
        pricingCheckedAt: v.optional(v.number()),
        contentUpdatedAt: v.optional(v.number()),
        pricingModel: v.string(),
        startingPrice: v.optional(v.string()),
        pricingNote: v.optional(v.string()),
        hasApi: v.boolean(),
        githubUrl: v.optional(v.string()),
        docsUrl: v.optional(v.string()),
        twitterUrl: v.optional(v.string()),
        tags: v.array(v.string()),
        features: v.record(v.string(), v.string()),
        makerEmail: v.optional(v.string()),
        track: v.string(),
        editorsPick: v.boolean(),
        curated: v.boolean(),
        claimed: v.boolean(),
        makerHandle: v.string(),
        status: v.string(),
        pinned: v.number(),
        verifiedAt: v.optional(v.number()),
        categoryId: v.id("categories"),
        submissionId: v.optional(v.id("submissions")),
        commentCount: v.number(),
        reviewCount: v.number(),
        ratingSumX100: v.number(),
        legacyId: v.optional(v.string()),
        createdAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { rows }) =>
    Promise.all(
      rows.map(async (r) => ({
        legacyId: r.legacyId ?? null,
        id: await ctx.db.insert("tools", r),
      })),
    ),
});

export const importSubmissions = mutation({
  args: {
    rows: v.array(
      v.object({
        email: v.string(),
        websiteUrl: v.string(),
        domain: v.string(),
        name: v.string(),
        tagline: v.string(),
        description: v.string(),
        categorySlug: v.string(),
        tags: v.array(v.string()),
        pricingModel: v.string(),
        startingPrice: v.optional(v.string()),
        pricingNote: v.optional(v.string()),
        hasApi: v.boolean(),
        githubUrl: v.optional(v.string()),
        docsUrl: v.optional(v.string()),
        twitterUrl: v.optional(v.string()),
        logoEmoji: v.string(),
        logoGradient: v.string(),
        isOwner: v.boolean(),
        confirmedLive: v.boolean(),
        agreedStandards: v.boolean(),
        status: v.string(),
        reviewNote: v.optional(v.string()),
        legacyId: v.optional(v.string()),
        createdAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { rows }) =>
    Promise.all(
      rows.map(async (r) => ({
        legacyId: r.legacyId ?? null,
        id: await ctx.db.insert("submissions", r),
      })),
    ),
});

export const importComments = mutation({
  args: {
    rows: v.array(
      v.object({
        toolId: v.id("tools"),
        author: v.string(),
        body: v.string(),
        isMaker: v.boolean(),
        legacyId: v.optional(v.string()),
        createdAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { rows }) =>
    Promise.all(
      rows.map(async (r) => ({
        legacyId: r.legacyId ?? null,
        id: await ctx.db.insert("comments", r),
      })),
    ),
});

export const importPosts = mutation({
  args: {
    rows: v.array(
      v.object({
        slug: v.string(),
        title: v.string(),
        excerpt: v.string(),
        body: v.string(),
        coverEmoji: v.string(),
        coverGradient: v.string(),
        coverUrl: v.optional(v.string()),
        category: v.string(),
        tags: v.array(v.string()),
        status: v.string(),
        author: v.string(),
        readingMinutes: v.number(),
        views: v.number(),
        seoTitle: v.optional(v.string()),
        seoDescription: v.optional(v.string()),
        keywords: v.optional(v.string()),
        publishedAt: v.optional(v.number()),
        legacyId: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { rows }) =>
    Promise.all(
      rows.map(async (r) => ({
        legacyId: r.legacyId ?? null,
        id: await ctx.db.insert("posts", r),
      })),
    ),
});

export const importSiteSettings = mutation({
  args: {
    rows: v.array(
      v.object({ key: v.string(), value: v.string(), updatedAt: v.number() }),
    ),
  },
  handler: async (ctx, { rows }) =>
    Promise.all(rows.map((r) => ctx.db.insert("siteSettings", r))),
});

export const importAuditLogs = mutation({
  args: {
    rows: v.array(
      v.object({
        action: v.string(),
        entity: v.string(),
        entityId: v.string(),
        meta: v.string(),
        actor: v.optional(v.string()),
        legacyId: v.optional(v.string()),
        createdAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { rows }) =>
    Promise.all(
      rows.map(async (r) => ({
        legacyId: r.legacyId ?? null,
        id: await ctx.db.insert("auditLogs", r),
      })),
    ),
});

export const importUsers = mutation({
  args: {
    rows: v.array(
      v.object({
        email: v.optional(v.string()),
        name: v.optional(v.string()),
        handle: v.optional(v.string()),
        image: v.optional(v.string()),
        bio: v.optional(v.string()),
        role: v.string(),
        status: v.string(),
        emailVerified: v.optional(v.number()),
        externalAuthId: v.optional(v.string()),
        legacyId: v.optional(v.string()),
        createdAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { rows }) =>
    Promise.all(
      rows.map(async (r) => ({
        legacyId: r.legacyId ?? null,
        id: await ctx.db.insert("users", r),
      })),
    ),
});

export const importReviews = mutation({
  args: {
    rows: v.array(
      v.object({
        toolId: v.id("tools"),
        userId: v.string(),
        author: v.string(),
        ease: v.number(),
        power: v.number(),
        value: v.number(),
        body: v.string(),
        status: v.string(),
        legacyId: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { rows }) =>
    Promise.all(
      rows.map(async (r) => ({
        legacyId: r.legacyId ?? null,
        id: await ctx.db.insert("reviews", r),
      })),
    ),
});

export const importClaims = mutation({
  args: {
    rows: v.array(
      v.object({
        toolId: v.id("tools"),
        userEmail: v.string(),
        userName: v.string(),
        method: v.string(),
        token: v.string(),
        status: v.string(),
        note: v.optional(v.string()),
        verifiedAt: v.optional(v.number()),
        legacyId: v.optional(v.string()),
        createdAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { rows }) =>
    Promise.all(
      rows.map(async (r) => ({
        legacyId: r.legacyId ?? null,
        id: await ctx.db.insert("claims", r),
      })),
    ),
});

export const importCollections = mutation({
  args: {
    rows: v.array(
      v.object({
        slug: v.string(),
        name: v.string(),
        description: v.string(),
        isPublic: v.boolean(),
        ownerEmail: v.string(),
        ownerName: v.string(),
        legacyId: v.optional(v.string()),
        createdAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { rows }) =>
    Promise.all(
      rows.map(async (r) => ({
        legacyId: r.legacyId ?? null,
        id: await ctx.db.insert("collections", r),
      })),
    ),
});

export const importCollectionItems = mutation({
  args: {
    rows: v.array(
      v.object({
        collectionId: v.id("collections"),
        toolId: v.id("tools"),
        position: v.number(),
        legacyId: v.optional(v.string()),
        createdAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { rows }) =>
    Promise.all(
      rows.map(async (r) => ({
        legacyId: r.legacyId ?? null,
        id: await ctx.db.insert("collectionItems", r),
      })),
    ),
});

export const importFollows = mutation({
  args: {
    rows: v.array(
      v.object({
        userEmail: v.string(),
        targetType: v.string(),
        targetId: v.string(),
        targetLabel: v.string(),
        createdAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { rows }) =>
    Promise.all(rows.map((r) => ctx.db.insert("follows", r))),
});

export const importComparisons = mutation({
  args: {
    rows: v.array(
      v.object({
        aSlug: v.string(),
        bSlug: v.string(),
        views: v.number(),
        createdAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { rows }) =>
    Promise.all(rows.map((r) => ctx.db.insert("comparisons", r))),
});

export const importForumThreads = mutation({
  args: {
    rows: v.array(
      v.object({
        slug: v.string(),
        title: v.string(),
        body: v.string(),
        topic: v.string(),
        author: v.string(),
        authorId: v.optional(v.string()),
        pinned: v.boolean(),
        hidden: v.boolean(),
        baseUpvotes: v.number(),
        replyCount: v.number(),
        voteCount: v.number(),
        legacyId: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { rows }) =>
    Promise.all(
      rows.map(async (r) => ({
        legacyId: r.legacyId ?? null,
        id: await ctx.db.insert("forumThreads", r),
      })),
    ),
});

export const importForumReplies = mutation({
  args: {
    rows: v.array(
      v.object({
        threadId: v.id("forumThreads"),
        author: v.string(),
        authorId: v.optional(v.string()),
        body: v.string(),
        hidden: v.boolean(),
        legacyId: v.optional(v.string()),
        createdAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { rows }) =>
    Promise.all(
      rows.map(async (r) => ({
        legacyId: r.legacyId ?? null,
        id: await ctx.db.insert("forumReplies", r),
      })),
    ),
});

export const importForumThreadVotes = mutation({
  args: {
    rows: v.array(
      v.object({ threadId: v.id("forumThreads"), voterKey: v.string() }),
    ),
  },
  handler: async (ctx, { rows }) =>
    Promise.all(rows.map((r) => ctx.db.insert("forumThreadVotes", r))),
});

export const importReports = mutation({
  args: {
    rows: v.array(
      v.object({
        reporterEmail: v.optional(v.string()),
        reporterKey: v.optional(v.string()),
        targetType: v.string(),
        targetId: v.string(),
        targetLabel: v.string(),
        reason: v.string(),
        details: v.optional(v.string()),
        status: v.string(),
        resolutionNote: v.optional(v.string()),
        resolvedAt: v.optional(v.number()),
        legacyId: v.optional(v.string()),
        createdAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { rows }) =>
    Promise.all(
      rows.map(async (r) => ({
        legacyId: r.legacyId ?? null,
        id: await ctx.db.insert("reports", r),
      })),
    ),
});

export const importBookmarks = mutation({
  args: {
    rows: v.array(
      v.object({
        ownerKey: v.string(),
        targetType: v.string(),
        targetId: v.string(),
        targetLabel: v.string(),
        targetHref: v.string(),
        legacyId: v.optional(v.string()),
        createdAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { rows }) =>
    Promise.all(
      rows.map(async (r) => ({
        legacyId: r.legacyId ?? null,
        id: await ctx.db.insert("bookmarks", r),
      })),
    ),
});

export const importAdCampaigns = mutation({
  args: {
    rows: v.array(
      v.object({
        name: v.string(),
        advertiser: v.string(),
        placement: v.string(),
        status: v.string(),
        headline: v.string(),
        body: v.string(),
        clickUrl: v.string(),
        emoji: v.string(),
        gradient: v.string(),
        targetCategory: v.optional(v.string()),
        weight: v.number(),
        startsAt: v.optional(v.number()),
        endsAt: v.optional(v.number()),
        totalBudgetCents: v.number(),
        dailyBudgetCents: v.number(),
        impressions: v.number(),
        clicks: v.number(),
        viewableImpressions: v.number(),
        legacyId: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { rows }) =>
    Promise.all(
      rows.map(async (r) => ({
        legacyId: r.legacyId ?? null,
        id: await ctx.db.insert("adCampaigns", r),
      })),
    ),
});

export const importAdServeStats = mutation({
  args: {
    rows: v.array(
      v.object({
        placement: v.string(),
        day: v.string(),
        served: v.number(),
        house: v.number(),
        unfilled: v.number(),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { rows }) =>
    Promise.all(rows.map((r) => ctx.db.insert("adServeStats", r))),
});

export const importPageViews = mutation({
  args: {
    rows: v.array(
      v.object({
        path: v.string(),
        day: v.string(),
        views: v.number(),
        updatedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { rows }) =>
    Promise.all(rows.map((r) => ctx.db.insert("pageViewDaily", r))),
});

export const importMedia = mutation({
  args: {
    rows: v.array(
      v.object({
        kind: v.string(),
        mimeType: v.string(),
        size: v.number(),
        originalName: v.string(),
        storedName: v.optional(v.string()),
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        purpose: v.string(),
        ownerKey: v.string(),
        legacyId: v.optional(v.string()),
        createdAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { rows }) =>
    Promise.all(
      rows.map(async (r) => ({
        legacyId: r.legacyId ?? null,
        id: await ctx.db.insert("media", r),
      })),
    ),
});

export const importIntegrations = mutation({
  args: {
    rows: v.array(
      v.object({
        key: v.string(),
        name: v.string(),
        category: v.string(),
        enabled: v.boolean(),
        configJson: v.string(),
        notes: v.string(),
        legacyId: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { rows }) =>
    Promise.all(
      rows.map(async (r) => ({
        legacyId: r.legacyId ?? null,
        id: await ctx.db.insert("integrations", r),
      })),
    ),
});

/**
 * DEV ONLY (deleted at Phase 5): delete documents by legacyId — test
 * cleanup for dual-write verification probes. Never called by app code.
 */
export const devDeleteDocs = mutation({
  args: { table: TABLE_NAMES, legacyIds: v.array(v.string()) },
  handler: async (ctx, { table, legacyIds }) => {
    if (table === "authSessions") return { deleted: 0 };
    let deleted = 0;
    for (const legacyId of legacyIds) {
      const docs = await ctx.db
        .query(table)
        .filter((q) => q.eq(q.field("legacyId"), legacyId))
        .collect();
      for (const d of docs) {
        await ctx.db.delete(d._id);
        deleted += 1;
      }
    }
    return { deleted };
  },
});

/**
 * DEV ONLY: delete siteSettings by key (they carry no legacyId).
 */
export const devDeleteSettings = mutation({
  args: { keys: v.array(v.string()) },
  handler: async (ctx, { keys }) => {
    let deleted = 0;
    for (const key of keys) {
      const rows = await ctx.db
        .query("siteSettings")
        .withIndex("by_key", (i) => i.eq("key", key))
        .collect();
      for (const r of rows) {
        await ctx.db.delete(r._id);
        deleted += 1;
      }
    }
    return { deleted };
  },
});

/**
 * DEV ONLY manual QA trigger for the campaign-lifecycle cron (plan §3.8
 * requires one per job). Runs the same shared tick the schedule calls.
 */
export const devCampaignTick = mutation({
  args: {},
  handler: async (ctx) => campaignLifecycleTick(ctx),
});
