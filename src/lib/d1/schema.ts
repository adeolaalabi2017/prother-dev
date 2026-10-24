/**
 * D1 (SQLite) schema for Prother - 1:1 port of convex/schema.ts.
 *
 * Conventions:
 * - Convex `_id` -> `id` TEXT PRIMARY KEY (keeps all existing id references).
 * - `legacyId` preserved for API contracts that still pass cUIDs around.
 * - DateTime (epoch ms) -> INTEGER. Booleans -> INTEGER 0/1.
 * - Arrays / maps / records -> JSON TEXT (parsed at the data layer).
 * - Convex indexes recreated as SQLite indexes below.
 */
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const id = () => text("id").primaryKey();
const legacyId = () => text("legacy_id");
const createdAt = () => integer("created_at").notNull();
const optInt = (name: string) => integer(name);
const optText = (name: string) => text(name);
const reqText = (name: string) => text(name).notNull();
const reqInt = (name: string) => integer(name).notNull();
const boolInt = (name: string) => integer(name).notNull().default(0);

export const categories = sqliteTable(
  "categories",
  {
    id: id(),
    slug: reqText("slug"),
    name: reqText("name"),
    emoji: reqText("emoji"),
    sortOrder: reqInt("sort_order"),
    featuresJson: text("features_json").notNull().default("[]"),
    legacyId: legacyId(),
  },
  (t) => [index("categories_by_slug").on(t.slug)],
);

export const tools = sqliteTable(
  "tools",
  {
    id: id(),
    slug: reqText("slug"),
    name: reqText("name"),
    tagline: reqText("tagline"),
    description: optText("description"),
    websiteUrl: reqText("website_url"),
    logoEmoji: reqText("logo_emoji"),
    logoGradient: reqText("logo_gradient"),
    logoUrl: optText("logo_url"),
    screenshotUrlsJson: text("screenshot_urls_json").notNull().default("[]"),
    longDescription: optText("long_description"),
    useCasesJson: text("use_cases_json").notNull().default("[]"),
    prosJson: text("pros_json").notNull().default("[]"),
    consJson: text("cons_json").notNull().default("[]"),
    alternativesJson: text("alternatives_json").notNull().default("[]"),
    pricingCheckedAt: optInt("pricing_checked_at"),
    contentUpdatedAt: optInt("content_updated_at"),
    pricingModel: reqText("pricing_model"),
    startingPrice: optText("starting_price"),
    pricingNote: optText("pricing_note"),
    hasApi: boolInt("has_api"),
    githubUrl: optText("github_url"),
    docsUrl: optText("docs_url"),
    twitterUrl: optText("twitter_url"),
    tagsJson: text("tags_json").notNull().default("[]"),
    featuresJson: text("features_json").notNull().default("{}"),
    makerEmail: optText("maker_email"),
    track: reqText("track"),
    editorsPick: boolInt("editors_pick"),
    curated: boolInt("curated"),
    claimed: boolInt("claimed"),
    makerHandle: reqText("maker_handle"),
    status: reqText("status"),
    pinned: reqInt("pinned"),
    verifiedAt: optInt("verified_at"),
    categoryId: reqText("category_id"),
    submissionId: optText("submission_id"),
    commentCount: reqInt("comment_count").default(0),
    reviewCount: reqInt("review_count").default(0),
    ratingSumX100: reqInt("rating_sum_x100").default(0),
    legacyId: legacyId(),
    createdAt: createdAt(),
  },
  (t) => [
    index("tools_by_slug").on(t.slug),
    index("tools_by_status_category").on(t.status, t.categoryId),
    index("tools_by_category_featured").on(t.categoryId, t.pinned, t.editorsPick),
    index("tools_by_submission").on(t.submissionId),
  ],
);

export const submissions = sqliteTable(
  "submissions",
  {
    id: id(),
    email: reqText("email"),
    websiteUrl: reqText("website_url"),
    domain: reqText("domain"),
    name: reqText("name"),
    tagline: reqText("tagline"),
    description: reqText("description"),
    categorySlug: reqText("category_slug"),
    tagsJson: text("tags_json").notNull().default("[]"),
    pricingModel: reqText("pricing_model"),
    startingPrice: optText("starting_price"),
    pricingNote: optText("pricing_note"),
    hasApi: boolInt("has_api"),
    githubUrl: optText("github_url"),
    docsUrl: optText("docs_url"),
    twitterUrl: optText("twitter_url"),
    logoEmoji: reqText("logo_emoji"),
    logoGradient: reqText("logo_gradient"),
    isOwner: boolInt("is_owner"),
    confirmedLive: boolInt("confirmed_live"),
    agreedStandards: boolInt("agreed_standards"),
    status: reqText("status"),
    reviewNote: optText("review_note"),
    legacyId: legacyId(),
    createdAt: createdAt(),
  },
  (t) => [
    index("submissions_by_email").on(t.email),
    index("submissions_by_status_created").on(t.status, t.createdAt),
    index("submissions_by_domain").on(t.domain),
  ],
);

export const comments = sqliteTable(
  "comments",
  {
    id: id(),
    toolId: reqText("tool_id"),
    author: reqText("author"),
    body: reqText("body"),
    isMaker: boolInt("is_maker"),
    legacyId: legacyId(),
    createdAt: createdAt(),
  },
  (t) => [index("comments_by_tool_created").on(t.toolId, t.createdAt)],
);

export const posts = sqliteTable(
  "posts",
  {
    id: id(),
    slug: reqText("slug"),
    title: reqText("title"),
    excerpt: reqText("excerpt"),
    body: reqText("body"),
    coverEmoji: reqText("cover_emoji"),
    coverGradient: reqText("cover_gradient"),
    coverUrl: optText("cover_url"),
    category: reqText("category"),
    tagsJson: text("tags_json").notNull().default("[]"),
    status: reqText("status"),
    author: reqText("author"),
    readingMinutes: reqInt("reading_minutes"),
    views: reqInt("views").default(0),
    seoTitle: optText("seo_title"),
    seoDescription: optText("seo_description"),
    keywords: optText("keywords"),
    publishedAt: optInt("published_at"),
    legacyId: legacyId(),
    createdAt: createdAt(),
    updatedAt: reqInt("updated_at"),
  },
  (t) => [index("posts_by_slug").on(t.slug), index("posts_by_status").on(t.status)],
);

export const siteSettings = sqliteTable(
  "site_settings",
  {
    id: id(),
    key: reqText("key"),
    value: reqText("value"),
    updatedAt: optInt("updated_at"),
    // Mirrors the Convex _creationTime fallback for the admin console's
    // "updatedAt" column; 0 for legacy rows created before the column.
    createdAt: integer("created_at").notNull().default(0),
  },
  (t) => [index("site_settings_by_key").on(t.key)],
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: id(),
    action: reqText("action"),
    entity: reqText("entity"),
    entityId: reqText("entity_id"),
    meta: reqText("meta"),
    actor: optText("actor"),
    legacyId: legacyId(),
    createdAt: createdAt(),
  },
  (t) => [index("audit_logs_by_created").on(t.createdAt)],
);

export const users = sqliteTable(
  "users",
  {
    id: id(),
    email: optText("email"),
    name: optText("name"),
    handle: optText("handle"),
    image: optText("image"),
    bio: optText("bio"),
    coverImage: optText("cover_image"),
    role: reqText("role"),
    status: reqText("status"),
    emailVerified: optInt("email_verified"),
    externalAuthId: optText("external_auth_id"),
    legacyId: legacyId(),
    createdAt: createdAt(),
  },
  (t) => [
    index("users_by_email").on(t.email),
    index("users_by_handle").on(t.handle),
    index("users_by_external_auth").on(t.externalAuthId),
  ],
);

export const reviews = sqliteTable(
  "reviews",
  {
    id: id(),
    toolId: reqText("tool_id"),
    userId: reqText("user_id"),
    author: reqText("author"),
    ease: reqInt("ease"),
    power: reqInt("power"),
    value: reqInt("value"),
    body: reqText("body"),
    status: reqText("status"),
    legacyId: legacyId(),
    createdAt: createdAt(),
    updatedAt: reqInt("updated_at"),
  },
  (t) => [
    index("reviews_by_tool_status").on(t.toolId, t.status),
    index("reviews_by_tool_user").on(t.toolId, t.userId),
  ],
);

export const claims = sqliteTable(
  "claims",
  {
    id: id(),
    toolId: reqText("tool_id"),
    userEmail: reqText("user_email"),
    userName: reqText("user_name"),
    method: reqText("method"),
    token: reqText("token"),
    status: reqText("status"),
    note: optText("note"),
    verifiedAt: optInt("verified_at"),
    legacyId: legacyId(),
    createdAt: createdAt(),
  },
  (t) => [index("claims_by_token").on(t.token), index("claims_by_tool").on(t.toolId)],
);

export const collections = sqliteTable(
  "collections",
  {
    id: id(),
    slug: reqText("slug"),
    name: reqText("name"),
    description: reqText("description"),
    isPublic: boolInt("is_public"),
    ownerEmail: reqText("owner_email"),
    ownerName: reqText("owner_name"),
    legacyId: legacyId(),
    createdAt: createdAt(),
  },
  (t) => [index("collections_by_slug").on(t.slug), index("collections_by_owner").on(t.ownerEmail)],
);

export const collectionItems = sqliteTable(
  "collection_items",
  {
    id: id(),
    collectionId: reqText("collection_id"),
    toolId: reqText("tool_id"),
    position: reqInt("position"),
    legacyId: legacyId(),
    createdAt: createdAt(),
  },
  (t) => [
    index("collection_items_by_collection").on(t.collectionId),
    index("collection_items_by_collection_tool").on(t.collectionId, t.toolId),
  ],
);

export const follows = sqliteTable(
  "follows",
  {
    id: id(),
    userEmail: reqText("user_email"),
    targetType: reqText("target_type"),
    targetId: reqText("target_id"),
    targetLabel: reqText("target_label"),
    createdAt: createdAt(),
  },
  (t) => [
    index("follows_by_owner").on(t.userEmail),
    index("follows_by_triple").on(t.userEmail, t.targetType, t.targetId),
  ],
);

export const comparisons = sqliteTable(
  "comparisons",
  {
    id: id(),
    aSlug: reqText("a_slug"),
    bSlug: reqText("b_slug"),
    views: reqInt("views").default(0),
    createdAt: createdAt(),
  },
  (t) => [
    index("comparisons_by_pair").on(t.aSlug, t.bSlug),
    index("comparisons_by_views").on(t.views),
    uniqueIndex("comparisons_pair_uq").on(t.aSlug, t.bSlug),
  ],
);

export const forumThreads = sqliteTable(
  "forum_threads",
  {
    id: id(),
    slug: reqText("slug"),
    title: reqText("title"),
    body: reqText("body"),
    topic: reqText("topic"),
    author: reqText("author"),
    authorId: optText("author_id"),
    pinned: boolInt("pinned"),
    hidden: boolInt("hidden"),
    baseUpvotes: reqInt("base_upvotes").default(0),
    replyCount: reqInt("reply_count").default(0),
    voteCount: reqInt("vote_count").default(0),
    legacyId: legacyId(),
    createdAt: createdAt(),
    updatedAt: reqInt("updated_at"),
  },
  (t) => [
    index("forum_threads_by_slug").on(t.slug),
    index("forum_threads_by_topic_created").on(t.topic, t.createdAt),
    index("forum_threads_by_created").on(t.createdAt),
  ],
);

export const forumReplies = sqliteTable(
  "forum_replies",
  {
    id: id(),
    threadId: reqText("thread_id"),
    author: reqText("author"),
    authorId: optText("author_id"),
    body: reqText("body"),
    hidden: boolInt("hidden"),
    legacyId: legacyId(),
    createdAt: createdAt(),
  },
  (t) => [index("forum_replies_by_thread_created").on(t.threadId, t.createdAt)],
);

export const forumThreadVotes = sqliteTable(
  "forum_thread_votes",
  { id: id(), threadId: reqText("thread_id"), voterKey: reqText("voter_key") },
  (t) => [index("forum_thread_votes_by_thread_voter").on(t.threadId, t.voterKey)],
);

export const reports = sqliteTable(
  "reports",
  {
    id: id(),
    reporterEmail: optText("reporter_email"),
    reporterKey: optText("reporter_key"),
    targetType: reqText("target_type"),
    targetId: reqText("target_id"),
    targetLabel: reqText("target_label"),
    reason: reqText("reason"),
    details: optText("details"),
    status: reqText("status"),
    resolutionNote: optText("resolution_note"),
    resolvedAt: optInt("resolved_at"),
    legacyId: legacyId(),
    createdAt: createdAt(),
  },
  (t) => [
    index("reports_by_status_created").on(t.status, t.createdAt),
    index("reports_by_target").on(t.targetType, t.targetId),
  ],
);

export const bookmarks = sqliteTable(
  "bookmarks",
  {
    id: id(),
    ownerKey: reqText("owner_key"),
    targetType: reqText("target_type"),
    targetId: reqText("target_id"),
    targetLabel: reqText("target_label"),
    targetHref: reqText("target_href"),
    legacyId: legacyId(),
    createdAt: createdAt(),
  },
  (t) => [
    index("bookmarks_by_owner_created").on(t.ownerKey),
    index("bookmarks_by_triple").on(t.ownerKey, t.targetType, t.targetId),
  ],
);

export const adCampaigns = sqliteTable(
  "ad_campaigns",
  {
    id: id(),
    name: reqText("name"),
    advertiser: reqText("advertiser"),
    placement: reqText("placement"),
    status: reqText("status"),
    headline: reqText("headline"),
    body: reqText("body"),
    clickUrl: reqText("click_url"),
    emoji: reqText("emoji"),
    gradient: reqText("gradient"),
    targetCategory: optText("target_category"),
    weight: reqInt("weight"),
    startsAt: optInt("starts_at"),
    endsAt: optInt("ends_at"),
    totalBudgetCents: reqInt("total_budget_cents"),
    dailyBudgetCents: reqInt("daily_budget_cents"),
    impressions: reqInt("impressions").default(0),
    clicks: reqInt("clicks").default(0),
    viewableImpressions: reqInt("viewable_impressions").default(0),
    legacyId: legacyId(),
    createdAt: createdAt(),
    updatedAt: reqInt("updated_at"),
  },
  (t) => [index("ad_campaigns_by_placement_status").on(t.placement, t.status)],
);

export const adServeStats = sqliteTable(
  "ad_serve_stats",
  {
    id: id(),
    placement: reqText("placement"),
    day: reqText("day"),
    served: reqInt("served").default(0),
    house: reqInt("house").default(0),
    unfilled: reqInt("unfilled").default(0),
    createdAt: createdAt(),
    updatedAt: reqInt("updated_at"),
  },
  (t) => [
    index("ad_serve_stats_by_placement_day").on(t.placement, t.day),
    uniqueIndex("ad_serve_stats_placement_day_uq").on(t.placement, t.day),
  ],
);

export const pageViewDaily = sqliteTable(
  "page_view_daily",
  {
    id: id(),
    path: reqText("path"),
    day: reqText("day"),
    views: reqInt("views").default(0),
    updatedAt: reqInt("updated_at"),
  },
  (t) => [
    index("page_view_daily_by_path_day").on(t.path, t.day),
    index("page_view_daily_by_day").on(t.day),
    uniqueIndex("page_view_daily_path_day_uq").on(t.path, t.day),
  ],
);

/** Traffic sources: referrer host × coarse device × day. Cookieless. */
export const pvSourceDaily = sqliteTable(
  "pv_source_daily",
  {
    id: id(),
    /** Referrer hostname or "direct" */
    source: reqText("source"),
    /** desktop | mobile | tablet | other */
    device: reqText("device"),
    day: reqText("day"),
    views: reqInt("views").default(0),
    updatedAt: reqInt("updated_at"),
  },
  (t) => [
    index("pv_source_daily_by_day_source_device").on(t.day, t.source, t.device),
    index("pv_source_daily_by_day").on(t.day),
    uniqueIndex("pv_source_daily_uq").on(t.source, t.device, t.day),
  ],
);

/** On-site search demand: normalized query × day counters. */
export const searchDaily = sqliteTable(
  "search_daily",
  {
    id: id(),
    /** Trimmed, lowercased, max 60 chars */
    query: reqText("query"),
    day: reqText("day"),
    count: reqInt("count").default(0),
    /** Searches that returned zero results */
    zeroCount: reqInt("zero_count").default(0),
    updatedAt: reqInt("updated_at"),
  },
  (t) => [
    index("search_daily_by_day_query").on(t.day, t.query),
    index("search_daily_by_day").on(t.day),
    uniqueIndex("search_daily_query_day_uq").on(t.query, t.day),
  ],
);

export const media = sqliteTable(
  "media",
  {
    id: id(),
    // R2 object key after migration (Convex storageId during transition).
    storageKey: optText("storage_key"),
    kind: reqText("kind"),
    mimeType: reqText("mime_type"),
    size: reqInt("size"),
    originalName: reqText("original_name"),
    storedName: optText("stored_name"),
    width: optInt("width"),
    height: optInt("height"),
    purpose: reqText("purpose"),
    ownerKey: reqText("owner_key"),
    legacyId: legacyId(),
    createdAt: createdAt(),
  },
  (t) => [
    index("media_by_kind_created").on(t.kind),
    index("media_by_purpose_created").on(t.purpose),
  ],
);

export const integrations = sqliteTable(
  "integrations",
  {
    id: id(),
    key: reqText("key"),
    name: reqText("name"),
    category: reqText("category"),
    enabled: boolInt("enabled"),
    // Secrets live in D1 only, served to server routes, never to clients.
    configJson: reqText("config_json"),
    notes: reqText("notes"),
    legacyId: legacyId(),
    createdAt: createdAt(),
    updatedAt: reqInt("updated_at"),
  },
  (t) => [index("integrations_by_key").on(t.key)],
);

export const authAccounts = sqliteTable(
  "auth_accounts",
  {
    id: id(),
    userLegacyId: reqText("user_legacy_id"),
    type: reqText("type"),
    provider: reqText("provider"),
    providerAccountId: reqText("provider_account_id"),
    refreshToken: optText("refresh_token"),
    accessToken: optText("access_token"),
    expiresAt: optInt("expires_at"),
    tokenType: optText("token_type"),
    scope: optText("scope"),
    idToken: optText("id_token"),
    sessionState: optText("session_state"),
  },
  (t) => [
    index("auth_accounts_by_provider_account").on(t.provider, t.providerAccountId),
    index("auth_accounts_by_user").on(t.userLegacyId),
  ],
);

export const authSessions = sqliteTable(
  "auth_sessions",
  {
    id: id(),
    sessionToken: reqText("session_token"),
    userLegacyId: reqText("user_legacy_id"),
    expires: reqInt("expires"),
  },
  (t) => [
    index("auth_sessions_by_token").on(t.sessionToken),
    index("auth_sessions_by_user").on(t.userLegacyId),
  ],
);

export const authVerificationTokens = sqliteTable(
  "auth_verification_tokens",
  {
    id: id(),
    identifier: reqText("identifier"),
    token: reqText("token"),
    expires: reqInt("expires"),
  },
  (t) => [
    index("auth_vt_by_token").on(t.token),
    index("auth_vt_by_identifier_token").on(t.identifier, t.token),
  ],
);
