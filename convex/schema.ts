/**
 * Convex schema for Prother (Phase 1 of the Convex migration).
 *
 * 1:1 translation of `prisma/schema.prisma` (SQLite) into Convex tables,
 * following the data-mapping rules in `docs/convex-migration-plan.md` §5:
 *
 * - Prisma `String @id @default(cuid())` → Convex `_id` + optional
 *   `legacyId` (kept where API contracts still pass cUIDs around).
 * - `DateTime` → `v.number()` epoch milliseconds.
 * - Pipe-separated strings (tags, screenshotUrls, Category.features,
 *   alternatives, Post.tags) → `v.array(v.string())`, normalized at import.
 * - `Tool.features` JSON-string map → `v.record(v.string(), v.string())`.
 * - `useCases`/`pros`/`cons` JSON-string arrays → typed arrays.
 * - Booleans stored 0/1 in raw-SQL reads → `v.boolean()`.
 * - Relations → `v.id("<table>")`. No FK enforcement: parent deletes must
 *   cascade manually in mutations (mirrors today's `onDelete: Cascade`).
 * - No unique constraints in Convex: every "unique" is an index + a guard
 *   inside the mutation (race-free, single transaction).
 * - Denormalized counters (`commentCount`, `reviewCount`, `ratingSumX100`,
 *   forum `replyCount`/`voteCount`) replace the raw-SQL GROUP BY joins on
 *   every listing read. Backfilled by the Phase 2 import script.
 *
 * Auth transition (plan §3.5): NextAuth keeps using SQLite in Phases 1-4.
 * Only `users` (keyed by `externalAuthId` = NextAuth user id) and the
 * `authSessions` bridge table live here until the optional Convex Auth move.
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  categories: defineTable({
    slug: v.string(),
    name: v.string(),
    emoji: v.string(),
    sortOrder: v.number(),
    /** Was pipe-separated; normalized to an array at import. */
    features: v.array(v.string()),
    legacyId: v.optional(v.string()),
  }).index("by_slug", ["slug"]),

  tools: defineTable({
    slug: v.string(),
    name: v.string(),
    tagline: v.string(),
    description: v.optional(v.string()),
    websiteUrl: v.string(),
    logoEmoji: v.string(),
    logoGradient: v.string(),
    /** Uploaded logo URL; null → emoji tile. Was POST-boot raw-SQL column. */
    logoUrl: v.optional(v.string()),
    /** Was pipe-separated; normalized to an array at import. */
    screenshotUrls: v.array(v.string()),
    // ── Editorial enrichment (Task 35) ──
    longDescription: v.optional(v.string()),
    useCases: v.array(v.object({ title: v.string(), body: v.string() })),
    pros: v.array(v.string()),
    cons: v.array(v.string()),
    /** Was pipe-separated slugs; normalized to an array at import. */
    alternatives: v.array(v.string()),
    pricingCheckedAt: v.optional(v.number()),
    contentUpdatedAt: v.optional(v.number()),
    /** free | freemium | paid | open_source */
    pricingModel: v.string(),
    startingPrice: v.optional(v.string()),
    pricingNote: v.optional(v.string()),
    hasApi: v.boolean(),
    githubUrl: v.optional(v.string()),
    docsUrl: v.optional(v.string()),
    twitterUrl: v.optional(v.string()),
    /** Was pipe-separated, max 5; normalized to an array at import. */
    tags: v.array(v.string()),
    /** Was a JSON-string map; validated at write time now. */
    features: v.record(v.string(), v.string()),
    makerEmail: v.optional(v.string()),
    /** editor_seed | community */
    track: v.string(),
    editorsPick: v.boolean(),
    curated: v.boolean(),
    claimed: v.boolean(),
    makerHandle: v.string(),
    /** draft | pending_review | approved | live | removed */
    status: v.string(),
    /** Editorial pin rank 0-3 (0 = unpinned). */
    pinned: v.number(),
    verifiedAt: v.optional(v.number()),
    categoryId: v.id("categories"),
    submissionId: v.optional(v.id("submissions")),
    // ── Denormalized counters (maintained by mutations) ──
    commentCount: v.number(),
    reviewCount: v.number(),
    /** Sum of per-review (ease+power+value)/3 * 100 over published reviews. */
    ratingSumX100: v.number(),
    legacyId: v.optional(v.string()),
    /** Epoch ms carried over from the SQLite import. */
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status_category", ["status", "categoryId"])
    .index("by_category_featured", ["categoryId", "pinned", "editorsPick"])
    .index("by_submission", ["submissionId"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["status", "pricingModel"],
    }),

  submissions: defineTable({
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
    /** pending | approved | rejected */
    status: v.string(),
    reviewNote: v.optional(v.string()),
    legacyId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_status_created", ["status", "createdAt"])
    .index("by_domain", ["domain"]),

  comments: defineTable({
    toolId: v.id("tools"),
    author: v.string(),
    body: v.string(),
    isMaker: v.boolean(),
    legacyId: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_tool_created", ["toolId", "createdAt"]),

  posts: defineTable({
    slug: v.string(),
    title: v.string(),
    excerpt: v.string(),
    body: v.string(),
    coverEmoji: v.string(),
    coverGradient: v.string(),
    /** Uploaded cover URL; null → emoji/gradient. Was POST-boot column. */
    coverUrl: v.optional(v.string()),
    category: v.string(),
    tags: v.array(v.string()),
    /** draft | published */
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
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"]),

  siteSettings: defineTable({
    key: v.string(),
    value: v.string(),
    // Optional: pre-backfill docs predate the field; reads fall back to
    // _creationTime (import rewrites every doc with the real value).
    updatedAt: v.optional(v.number()),
  }).index("by_key", ["key"]),

  auditLogs: defineTable({
    action: v.string(),
    entity: v.string(),
    entityId: v.string(),
    meta: v.string(),
    actor: v.optional(v.string()),
    legacyId: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_created", ["createdAt"]),

  users: defineTable({
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    handle: v.optional(v.string()),
    image: v.optional(v.string()),
    bio: v.optional(v.string()),
    /** member | moderator | admin */
    role: v.string(),
    /** active | banned */
    status: v.string(),
    emailVerified: v.optional(v.number()),
    /** NextAuth user id bridge (plan §3.5). */
    externalAuthId: v.optional(v.string()),
    legacyId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_handle", ["handle"])
    .index("by_external_auth", ["externalAuthId"]),

  reviews: defineTable({
    toolId: v.id("tools"),
    userId: v.string(),
    author: v.string(),
    ease: v.number(),
    power: v.number(),
    value: v.number(),
    body: v.string(),
    /** published | filtered (<48h soft-moderation) */
    status: v.string(),
    legacyId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tool_status", ["toolId", "status"])
    .index("by_tool_user", ["toolId", "userId"]),

  claims: defineTable({
    toolId: v.id("tools"),
    userEmail: v.string(),
    userName: v.string(),
    /** meta_tag | email_domain */
    method: v.string(),
    token: v.string(),
    /** pending | verified | failed | disputed */
    status: v.string(),
    note: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
    legacyId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_tool", ["toolId"]),

  collections: defineTable({
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    isPublic: v.boolean(),
    ownerEmail: v.string(),
    ownerName: v.string(),
    legacyId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_owner", ["ownerEmail"]),

  collectionItems: defineTable({
    collectionId: v.id("collections"),
    toolId: v.id("tools"),
    position: v.number(),
    legacyId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_collection", ["collectionId"])
    .index("by_collection_tool", ["collectionId", "toolId"]),

  follows: defineTable({
    userEmail: v.string(),
    /** tool | category | maker */
    targetType: v.string(),
    targetId: v.string(),
    targetLabel: v.string(),
    createdAt: v.number(),
  })
    .index("by_owner", ["userEmail"])
    .index("by_triple", ["userEmail", "targetType", "targetId"]),

  comparisons: defineTable({
    aSlug: v.string(),
    bSlug: v.string(),
    views: v.number(),
    createdAt: v.number(),
  })
    .index("by_pair", ["aSlug", "bSlug"])
    .index("by_views", ["views"]),

  forumThreads: defineTable({
    slug: v.string(),
    title: v.string(),
    body: v.string(),
    /** general | vibecoding | show | introduce */
    topic: v.string(),
    author: v.string(),
    authorId: v.optional(v.string()),
    pinned: v.boolean(),
    hidden: v.boolean(),
    baseUpvotes: v.number(),
    /** Denormalized for list reads (backfilled at import). */
    replyCount: v.number(),
    voteCount: v.number(),
    legacyId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_topic_created", ["topic", "createdAt"])
    .index("by_created", ["createdAt"]),

  forumReplies: defineTable({
    threadId: v.id("forumThreads"),
    author: v.string(),
    authorId: v.optional(v.string()),
    body: v.string(),
    hidden: v.boolean(),
    legacyId: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_thread_created", ["threadId", "createdAt"]),

  forumThreadVotes: defineTable({
    threadId: v.id("forumThreads"),
    voterKey: v.string(),
  }).index("by_thread_voter", ["threadId", "voterKey"]),

  reports: defineTable({
    reporterEmail: v.optional(v.string()),
    reporterKey: v.optional(v.string()),
    /** thread | reply | tool | post | review */
    targetType: v.string(),
    targetId: v.string(),
    targetLabel: v.string(),
    /** spam | harassment | inappropriate | misleading | broken | other */
    reason: v.string(),
    details: v.optional(v.string()),
    /** open | resolved | dismissed */
    status: v.string(),
    resolutionNote: v.optional(v.string()),
    resolvedAt: v.optional(v.number()),
    legacyId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_status_created", ["status", "createdAt"])
    .index("by_target", ["targetType", "targetId"]),

  bookmarks: defineTable({
    ownerKey: v.string(),
    /** tool | thread | post */
    targetType: v.string(),
    targetId: v.string(),
    targetLabel: v.string(),
    targetHref: v.string(),
    legacyId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_owner_created", ["ownerKey"])
    .index("by_triple", ["ownerKey", "targetType", "targetId"]),

  adCampaigns: defineTable({
    name: v.string(),
    advertiser: v.string(),
    /** directory_banner | journal_bar | category_spotlight */
    placement: v.string(),
    /** draft | active | paused | ended */
    status: v.string(),
    headline: v.string(),
    body: v.string(),
    clickUrl: v.string(),
    emoji: v.string(),
    gradient: v.string(),
    targetCategory: v.optional(v.string()),
    /** Rotation weight 1-10. */
    weight: v.number(),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    /** Budgets in cents, 0 = uncapped. */
    totalBudgetCents: v.number(),
    dailyBudgetCents: v.number(),
    impressions: v.number(),
    clicks: v.number(),
    viewableImpressions: v.number(),
    legacyId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_placement_status", ["placement", "status"]),

  adServeStats: defineTable({
    placement: v.string(),
    /** YYYY-MM-DD (UTC) */
    day: v.string(),
    served: v.number(),
    house: v.number(),
    unfilled: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_placement_day", ["placement", "day"]),

  pageViewDaily: defineTable({
    path: v.string(),
    /** YYYY-MM-DD (UTC) */
    day: v.string(),
    views: v.number(),
    updatedAt: v.number(),
  })
    .index("by_path_day", ["path", "day"])
    .index("by_day", ["day"]),

  media: defineTable({
    /** Convex file storage id. Set by the Phase 2 upload migration;
     *  empty until then (SQLite-era rows carry storedName instead). */
    storageId: v.optional(v.id("_storage")),
    /** image | video */
    kind: v.string(),
    mimeType: v.string(),
    size: v.number(),
    originalName: v.string(),
    /** SQLite-era disk filename inside uploads/ (pre-storage-migration). */
    storedName: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    /** tool-logo | tool-screenshot | post-cover | avatar | gallery */
    purpose: v.string(),
    /** "admin" | "user:{email}" */
    ownerKey: v.string(),
    legacyId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_kind_created", ["kind"])
    .index("by_purpose_created", ["purpose"]),

  integrations: defineTable({
    /** Stable slug: openai | stripe | cloudflare-r2 | custom-<slug> … */
    key: v.string(),
    name: v.string(),
    /** ai | payment | cdn | storage | email | analytics | other */
    category: v.string(),
    enabled: v.boolean(),
    /** JSON object; may contain secrets — actions only, never to clients. */
    configJson: v.string(),
    notes: v.string(),
    legacyId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  // ── NextAuth bridge (transition only, plan §3.5; dropped at Phase 5) ──
  authSessions: defineTable({
    nextAuthSessionToken: v.string(),
    userId: v.id("users"),
    expiresAt: v.number(),
  }).index("by_token", ["nextAuthSessionToken"]),
});
