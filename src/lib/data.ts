/**
 * Application data-access layer (ex-Convex shadow adapters, Phase 5).
 *
 * Every export here is a thin call into a Convex function plus the
 * presentation constants that stay Next-side (STANDARD_DEFS, blurbs).
 * Routes and server components call these — never Convex directly — so the
 * call graph stays greppable and the client contract lives in one place.
 */
/**
 * Phase 3 originals below — kept verbatim through the cutover so every
 * adapter diffs cleanly against its Prisma predecessor (see worklog).
 */
import type { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api.js";
import { STANDARD_DEFS } from "@/lib/standards";
import { blurbFor } from "@/lib/category-blurbs";

type Client = ConvexHttpClient;

export function shadowSite(c: Client) {
  return c.query(api.site.get, {});
}

export function shadowTrending(c: Client, window: "week" | "month", limit: number) {
  return c.query(api.trending.list, { window, limit });
}

export function shadowBlog(c: Client, limit: number, category: string | null) {
  return c.query(api.posts.list, { limit, category: category ?? undefined });
}

export function shadowSearch(c: Client, q: string) {
  return c.query(api.search.search, { q });
}

export async function shadowToolsDirectory(
  c: Client,
  args: {
    categorySlug: string | null;
    q: string | null;
    pricing: string | null;
    tag: string | null;
    sort: "featured" | "newest" | "top-rated" | "trending";
    page: number;
    pageSize: number;
  },
) {
  const res = await c.query(api.tools.directory, {
    categorySlug: args.categorySlug ?? undefined,
    q: args.q ?? undefined,
    pricing: args.pricing ?? undefined,
    tag: args.tag ?? undefined,
    sort: args.sort,
    page: args.page,
    pageSize: args.pageSize,
  });
  if ("error" in res) return res;
  // categoryMeta is ABSENT (not null) when unscoped — mirror the route.
  // The blurb stays a Next-side presentation constant (lib/category-blurbs).
  const { categoryMeta, ...rest } = res;
  return {
    ...rest,
    ...(categoryMeta
      ? {
          categoryMeta: {
            ...categoryMeta,
            blurb: blurbFor(categoryMeta.slug, categoryMeta.name),
          },
        }
      : {}),
  };
}

export async function shadowToolDetail(
  c: Client,
  slug: string,
  viewer?: { id: string; email: string; handle: string } | null,
) {
  const res = await c.query(api.tools.detail, {
    slug,
    viewerEmail: viewer?.email,
    viewerUserId: viewer?.id,
  });
  if ("error" in res) return res;
  const { viewer: v, ...rest } = res;
  return {
    ...rest,
    standards: STANDARD_DEFS.map((s) => ({ ...s, passed: true })),
    // Shadow covers anonymous traffic only (no cookies) — viewer is null.
    viewer:
      v && viewer
        ? {
            isMaker:
              (v.maker.claimed && v.maker.makerEmail === viewer.email) ||
              v.maker.makerHandle === `@${viewer.handle}`,
            following: v.following,
            claim: v.claim,
            myReview: v.myReview,
            savedIn: v.savedIn,
          }
        : null,
  };
}

export function shadowCompareMatrix(
  c: Client,
  category: string,
  tools: string[],
) {
  if (!category) return Promise.resolve({ error: "category_required" });
  return c.query(api.compare.matrix, { category, tools });
}

export function shadowCompareCategories(c: Client) {
  return c.query(api.compare.categories, {});
}

export function shadowForumList(
  c: Client,
  topic: string,
  sort: "hot" | "new" | "top",
  voterKey?: string,
) {
  return c.query(api.forum.list, { topic, sort, voterKey });
}

export function shadowAdminOverview(c: Client) {
  return c.query(api.admin.overview, {});
}

export function shadowAdminTools(
  c: Client,
  q: string,
  status: string,
  category: string,
) {
  return c.query(api.admin.toolsTable, { q, status, category });
}

// ── Phase 4 step 3 — community reads (dual-write verification + cutover) ──

export function shadowComments(c: Client, toolSlug: string) {
  return c.query(api.community.commentsList, { toolSlug });
}

export function shadowCommentsLastAge(
  c: Client,
  toolSlug: string,
  author: string,
) {
  return c.query(api.community.commentsLastAge, { toolSlug, author });
}

export function shadowReviewsData(
  c: Client,
  toolSlug: string,
  viewerUserId?: string,
) {
  return c.query(api.community.reviewsData, {
    toolSlug,
    viewerUserId,
  });
}

export function shadowForumThread(
  c: Client,
  slug: string,
  voterKey?: string,
) {
  return c.query(api.community.forumThread, { slug, voterKey });
}

export function shadowBookmarks(c: Client, ownerKey: string) {
  return c.query(api.community.bookmarksList, { ownerKey });
}

export function shadowFollows(c: Client, userEmail: string) {
  return c.query(api.community.followsList, { userEmail });
}

export function shadowCollectionsMine(c: Client, ownerEmail?: string) {
  return c.query(api.community.collectionsMine, {
    ownerEmail,
  });
}

export function shadowCollectionDetail(
  c: Client,
  slug: string,
  viewerEmail?: string,
) {
  return c.query(api.community.collectionDetail, { slug, viewerEmail });
}

export function shadowCompareView(
  c: Client,
  aSlug: string,
  bSlug: string,
  limit: number,
) {
  return c.query(api.community.compareView, { aSlug, bSlug, limit });
}

export function shadowToolPageData(c: Client, slug: string) {
  return c.query(api.tools.pageData, { slug });
}

// ── Phase 5 — claims flow ──

export function shadowClaimState(
  c: Client,
  toolSlug: string,
  userEmail?: string,
) {
  return c.query(api.claims.claimState, { toolSlug, userEmail });
}

export function shadowClaimLatest(
  c: Client,
  toolSlug: string,
  userEmail: string,
) {
  return c.query(api.claims.claimLatest, { toolSlug, userEmail });
}

export function shadowClaimById(c: Client, id: string) {
  return c.query(api.claims.claimByIdQ, { id });
}

export function convexClaimInsert(
  c: Client,
  args: {
    id: string;
    toolSlug: string;
    userEmail: string;
    userName: string;
    method: string;
    token: string;
    status: string;
    note?: string | null;
    verifiedAt?: number;
    createdAt: number;
    transfer?: { email: string; handle: string };
    nowMs?: number;
  },
) {
  return c.mutation(api.claims.claimInsert, args);
}

export function convexClaimSettle(
  c: Client,
  args: {
    claimLegacyId: string;
    status: string;
    note?: string | null;
    verifiedAt?: number;
    transfer?: { email: string; handle: string };
    nowMs: number;
  },
) {
  return c.mutation(api.claims.claimSettle, args);
}

// ── Phase 5 — media library ──

export function shadowMediaTable(
  c: Client,
  args: { kind?: string; purpose?: string; take: number },
) {
  return c.query(api.media.mediaTable, args);
}

export function shadowMediaById(c: Client, id: string) {
  return c.query(api.media.mediaById, { id });
}

export function convexMediaCreate(
  c: Client,
  args: {
    id: string;
    kind: string;
    mimeType: string;
    size: number;
    originalName: string;
    storedName: string;
    width?: number | null;
    height?: number | null;
    purpose: string;
    ownerKey: string;
    createdAt: number;
  },
) {
  return c.mutation(api.media.mediaCreate, args);
}

export function convexMediaDeleteFull(c: Client, args: { id: string }) {
  return c.mutation(api.media.mediaDeleteFull, args);
}

// ── Phase 5 — remaining SSR surfaces ──

export function shadowCategoryDetail(c: Client, slug: string) {
  return c.query(api.categories.detail, { slug });
}

export function shadowHomepage(c: Client) {
  return c.query(api.tools.homepage, {});
}

export function shadowSerp(
  c: Client,
  args: { q: string; page: number; pageSize: number },
) {
  return c.query(api.tools.serp, args);
}

export function shadowAdvertiseStats(c: Client) {
  return c.query(api.seo.advertiseStats, {});
}

export function shadowMetaEntities(
  c: Client,
  args: {
    toolSlug?: string;
    postSlug?: string;
    categorySlug?: string;
    collectionSlug?: string;
    compareA?: string;
    compareB?: string;
  },
) {
  return c.query(api.seo.metaEntities, args);
}

export function shadowJournalList(c: Client, limit: number) {
  return c.query(api.posts.list, { limit });
}

// ── Phase 4 step 7 — SEO reads + bridge-adjacent writes ──

export function shadowSitemapData(c: Client) {
  return c.query(api.seo.sitemapData, {});
}

export function shadowRssPosts(c: Client, limit: number) {
  return c.query(api.seo.rssPosts, { limit });
}

export function shadowOgTool(c: Client, slug: string) {
  return c.query(api.seo.ogTool, { slug });
}

export function shadowOgPost(c: Client, slug: string) {
  return c.query(api.seo.ogPost, { slug });
}

export function shadowBlogDetail(c: Client, slug: string) {
  return c.query(api.seo.blogDetail, { slug });
}

export function convexPostBumpViews(c: Client, args: { slug: string }) {
  return c.mutation(api.seo.postBumpViews, args);
}

// ── Phase 4 step 6 — admin console reads ──

export function shadowAdminCategories(c: Client) {
  return c.query(api.adminCrud.categoriesTable, {});
}

export function shadowAdminPosts(c: Client, status: string) {
  return c.query(api.adminCrud.postsTable, { status });
}

export function shadowAdminUsers(
  c: Client,
  args: { q: string; status: string; role: string },
) {
  return c.query(api.adminCrud.usersTable, args);
}

export function shadowAdminReports(c: Client, status: string) {
  return c.query(api.adminCrud.reportsTable, { status });
}

export function shadowAdminAds(c: Client) {
  return c.query(api.adminCrud.campaignsTable, {});
}

export function shadowAdminIntegrations(c: Client) {
  return c.query(api.adminCrud.integrationsTable, {});
}

/**
 * Raw stored configJson for the sentinel merge (server-only — never sent
 * to clients; see convex/adminCrud.ts integrationRaw).
 */
export function shadowAdminIntegrationRaw(c: Client, key: string) {
  return c.query(api.adminCrud.integrationRaw, { key });
}

export function shadowAdminSettings(c: Client) {
  return c.query(api.adminCrud.settingsTable, {});
}

// ── Phase 4 step 6 — admin console writes (dual-write; editor-key enforced
// route-side, ids/timestamps generated once route-side and shared) ──

export function convexToolCreate(
  c: Client,
  args: {
    id: string;
    slug: string;
    name: string;
    tagline: string;
    description?: string;
    websiteUrl: string;
    categoryLegacyId: string;
    pricingModel: string;
    startingPrice?: string;
    pricingNote?: string;
    hasApi: boolean;
    logoEmoji: string;
    logoGradient: string;
    tagsPipe: string;
    makerHandle: string;
    status: string;
    editorsPick: boolean;
    curated: boolean;
    logoUrl?: string | null;
    screenshotUrls?: string[];
    editorial?: {
      longDescription?: string | null;
      useCases?: { title: string; body: string }[];
      pros?: string[];
      cons?: string[];
      alternatives?: string[];
      pricingChecked?: boolean;
    };
    features?: Record<string, string>;
    createdAt: number;
  },
) {
  return c.mutation(api.adminCrud.toolCreate, args);
}

export function convexToolPatch(
  c: Client,
  args: {
    toolLegacyId: string;
    data: Record<string, unknown>;
    features?: Record<string, string>;
    logoUrl?: string | null;
    screenshotUrls?: string[];
    editorial?: {
      longDescription?: string | null;
      useCases?: { title: string; body: string }[];
      pros?: string[];
      cons?: string[];
      alternatives?: string[];
      pricingChecked?: boolean;
    };
    nowMs: number;
  },
) {
  // The route's ORM-shaped patch maps 1:1 onto the mutation's data fields
  // (tagsPipe/categoryLegacyId/verifiedAt converted by the caller).
  return c.mutation(api.adminCrud.toolPatch, args as never);
}

export function convexToolRemove(c: Client, args: { toolLegacyId: string }) {
  return c.mutation(api.adminCrud.toolRemove, args);
}

export function convexCategoryUpsert(
  c: Client,
  args: {
    legacyId: string;
    slug: string;
    name: string;
    emoji: string;
    sortOrder?: number;
    featuresPipe?: string;
  },
) {
  return c.mutation(api.adminCrud.categoryUpsert, args);
}

export function convexCategoryDelete(c: Client, args: { legacyId: string }) {
  return c.mutation(api.adminCrud.categoryDelete, args);
}

export function convexPostCreate(
  c: Client,
  args: {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    body: string;
    category: string;
    tagsPipe: string;
    coverEmoji: string;
    coverGradient: string;
    author: string;
    status: string;
    seoTitle?: string;
    seoDescription?: string;
    keywords?: string;
    coverUrl?: string | null;
    readingMinutes: number;
    publishedAt?: number;
    createdAt: number;
    updatedAt: number;
  },
) {
  return c.mutation(api.adminCrud.postCreate, args);
}

export function convexPostPatch(
  c: Client,
  args: {
    postLegacyId: string;
    data: Record<string, unknown>;
    coverUrl?: string | null;
  },
) {
  return c.mutation(api.adminCrud.postPatch, args as never);
}

export function convexPostDelete(c: Client, args: { postLegacyId: string }) {
  return c.mutation(api.adminCrud.postDelete, args);
}

export function convexUserModerate(
  c: Client,
  args: {
    userLegacyId: string;
    role?: string;
    status?: string;
    image?: string | null;
  },
) {
  return c.mutation(api.adminCrud.userModerate, args);
}

export function convexReportResolve(
  c: Client,
  args: {
    reportLegacyId: string;
    status: string;
    note?: string;
    hideTarget?: boolean;
    nowMs: number;
  },
) {
  return c.mutation(api.adminCrud.reportResolve, args);
}

export function convexCampaignCreate(
  c: Client,
  args: {
    id: string;
    name: string;
    advertiser: string;
    placement: string;
    headline: string;
    body: string;
    clickUrl: string;
    emoji: string;
    gradient: string;
    targetCategory?: string | null;
    weight: number;
    startsAt?: number | null;
    endsAt?: number | null;
    totalBudgetCents: number;
    dailyBudgetCents: number;
    status: string;
    createdAt: number;
    updatedAt: number;
  },
) {
  return c.mutation(api.adminCrud.campaignCreate, args);
}

export function convexCampaignPatch(
  c: Client,
  args: {
    campaignLegacyId: string;
    patch: Record<string, unknown>;
    nowMs: number;
  },
) {
  return c.mutation(api.adminCrud.campaignPatch, args as never);
}

export function convexCampaignDelete(
  c: Client,
  args: { campaignLegacyId: string },
) {
  return c.mutation(api.adminCrud.campaignDelete, args);
}

export function convexIntegrationUpsert(
  c: Client,
  args: {
    legacyId: string;
    key: string;
    name: string;
    category: string;
    enabled: boolean;
    configJson: string;
    notes: string;
    createdAt: number;
    updatedAt: number;
  },
) {
  return c.mutation(api.adminCrud.integrationUpsert, args);
}

export function convexIntegrationDelete(c: Client, args: { key: string }) {
  return c.mutation(api.adminCrud.integrationDelete, args);
}

export function convexSettingsPut(
  c: Client,
  args: { entries: { key: string; value: string }[] },
) {
  return c.mutation(api.adminCrud.settingsPut, args);
}

// ── Phase 4 step 5 — ads + analytics ──

export function convexAdServe(
  c: Client,
  args: { placement: string; category?: string },
) {
  return c.mutation(api.ads.serve, args);
}

export function convexAdClick(c: Client, args: { id: string }) {
  return c.mutation(api.ads.registerClick, args);
}

export function convexAdViewable(c: Client, args: { id: string }) {
  return c.mutation(api.ads.recordViewable, args);
}

export function convexPageView(
  c: Client,
  args: { path: string; day: string; nowMs: number },
) {
  return c.mutation(api.ads.recordPageView, args);
}

export function shadowTrafficReadout(c: Client) {
  return c.query(api.ads.trafficReadout, {});
}

export function shadowPlacementMeasurement(c: Client) {
  return c.query(api.ads.placementMeasurement, {});
}

// ── Phase 4 step 4 — submit flow + editor console ──

export function shadowSubmitCheck(c: Client, domain: string) {
  return c.query(api.submissions.checkDuplicate, { domain });
}

export function shadowSubmissionCountSince(
  c: Client,
  email: string,
  sinceMs: number,
) {
  return c.query(api.submissions.submissionCountSince, { email, sinceMs });
}

export function shadowSubmissionsByEmail(c: Client, email: string) {
  return c.query(api.submissions.submissionsByEmail, { email });
}

export function shadowEditorQueue(c: Client) {
  return c.query(api.submissions.editorQueue, {});
}

export function convexSubmissionCreate(
  c: Client,
  args: {
    id: string;
    email: string;
    websiteUrl: string;
    domain: string;
    name: string;
    tagline: string;
    description: string;
    categorySlug: string;
    tags: string[];
    pricingModel: string;
    startingPrice?: string;
    pricingNote?: string;
    hasApi: boolean;
    githubUrl?: string;
    docsUrl?: string;
    twitterUrl?: string;
    logoEmoji: string;
    logoGradient: string;
    isOwner: boolean;
    confirmedLive: boolean;
    agreedStandards: boolean;
    createdAt: number;
  },
) {
  return c.mutation(api.submissions.submissionCreate, args);
}

export function convexEditorDecide(
  c: Client,
  args: {
    submissionId: string;
    decision: "approve" | "reject";
    reviewNote?: string;
    toolId?: string;
    toolSlug?: string;
    categorySlug?: string;
    makerHandle?: string;
    createdAt?: number;
  },
) {
  return c.mutation(api.submissions.editorDecide, args);
}

export function convexArbitrateClaim(
  c: Client,
  args: {
    claimId: string;
    action: "verify" | "dismiss";
    note?: string;
    email?: string;
    handle?: string;
    now: number;
  },
) {
  return c.mutation(api.submissions.arbitrateClaim, args);
}

export function convexArbitrateReview(
  c: Client,
  args: {
    reviewId: string;
    action: "publish" | "spam";
    now: number;
  },
) {
  return c.mutation(api.submissions.arbitrateReview, args);
}

// ── Phase 4 step 3 — community writes (dual-write).
// The route generates id/timestamps ONCE and passes them to both stores.
// Mutations trust route-enforced auth (see convex/community.ts header).

export function convexCommentAdd(
  c: Client,
  args: {
    id: string;
    toolSlug: string;
    author: string;
    body: string;
    createdAt: number;
  },
) {
  return c.mutation(api.community.commentAdd, args);
}

export function convexReviewUpsert(
  c: Client,
  args: {
    id: string;
    toolSlug: string;
    userId: string;
    author: string;
    ease: number;
    power: number;
    value: number;
    body: string;
    status: string;
    createdAt: number;
    updatedAt: number;
  },
) {
  return c.mutation(api.community.reviewUpsert, args);
}

export function convexThreadCreate(
  c: Client,
  args: {
    id: string;
    slug: string;
    title: string;
    body: string;
    topic: string;
    author: string;
    authorId?: string;
    createdAt: number;
    updatedAt: number;
  },
) {
  return c.mutation(api.community.threadCreate, args);
}

export function convexReplyCreate(
  c: Client,
  args: {
    id: string;
    threadSlug: string;
    author: string;
    authorId?: string;
    body: string;
    createdAt: number;
  },
) {
  return c.mutation(api.community.replyCreate, args);
}

export function convexVoteToggle(
  c: Client,
  args: { threadSlug: string; voterKey: string },
) {
  return c.mutation(api.community.voteToggle, args);
}

export function convexBookmarkToggle(
  c: Client,
  args: {
    id: string;
    ownerKey: string;
    targetType: string;
    targetId: string;
    targetLabel?: string;
    targetHref?: string;
    action?: string;
    createdAt: number;
  },
) {
  return c.mutation(api.community.bookmarkToggle, args);
}

export function convexFollowToggle(
  c: Client,
  args: {
    userEmail: string;
    targetType: string;
    targetId: string;
    targetLabel: string;
  },
) {
  return c.mutation(api.community.followToggle, args);
}

export function convexCollectionCreate(
  c: Client,
  args: {
    id: string;
    slug: string;
    name: string;
    description: string;
    isPublic: boolean;
    ownerEmail: string;
    ownerName: string;
    createdAt: number;
  },
) {
  return c.mutation(api.community.collectionCreate, args);
}

export function convexCollectionUpdate(
  c: Client,
  args: {
    slug: string;
    name?: string;
    description?: string;
    isPublic?: boolean;
  },
) {
  return c.mutation(api.community.collectionUpdate, args);
}

export function convexCollectionDelete(c: Client, args: { slug: string }) {
  return c.mutation(api.community.collectionDelete, args);
}

export function convexCollectionItemToggle(
  c: Client,
  args: {
    id: string;
    collectionSlug: string;
    toolSlug: string;
    createdAt: number;
  },
) {
  return c.mutation(api.community.collectionItemToggle, args);
}

export function convexReportCreate(
  c: Client,
  args: {
    id: string;
    targetType: string;
    targetId: string;
    reason: string;
    details?: string;
    reporterEmail?: string;
    reporterKey?: string;
    createdAt: number;
  },
) {
  return c.mutation(api.community.reportCreate, args);
}

export function convexCompareBump(
  c: Client,
  args: { aSlug: string; bSlug: string },
) {
  return c.mutation(api.community.compareBump, args);
}
