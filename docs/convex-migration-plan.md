# Convex Migration Plan: Prother Backend

Status: proposal, not yet approved for execution
Date: 2026 (prepared against the Task 27 to 33 state of the repo)
Scope: replace the Prisma + SQLite data layer and the ~50 Next.js route handlers with Convex functions, while keeping the Next.js 16 App Router frontend, the Cloudflare OpenNext deploy target, and the SEO surface intact.
Rule for this document: no em dashes anywhere, matching the Task 31 editorial standard.

---

## 1. Executive summary

Convex is a reactive backend platform: a document database with ACID transactions, a TypeScript function layer (queries, mutations, actions), generated typed clients, websocket subscriptions for realtime UI, built-in cron and scheduled functions, and integrated file storage. You define tables and validators in a `convex/schema.ts` file, write functions in TypeScript, and the CLI generates end-to-end types. Reads are strongly consistent; any subscribed client updates automatically when the data it reads changes.

Why migrating makes sense for Prother:

1. Realtime for free. Today the ⌘K palette, forum threads, the admin console, the submission tracker, and ad measurement all poll or re-fetch. Convex `useQuery` pushes changes over an open websocket. This is the single largest product win.
2. No more client drift. Roughly 14 server libs in this repo (`forum.ts`, `community.ts`, `features.ts`, `ads.ts`, `analytics.ts`, `ad-measure.ts`, `users.ts`, `reports.ts`, `bookmarks.ts`, `discussion.ts`, `trending.ts`, `auth.ts`, `prother.ts`, `search.ts`) exist in their raw-SQL form because of one recurring operational problem: a long-running `next dev` caches a stale PrismaClient that cannot see new models, so everything after boot went through `$queryRaw`. Convex has one generated, versioned client and atomic deploys. That entire class of workaround disappears.
3. One language end to end. Table definitions, validators, and functions are TypeScript. Schema drift becomes a compile error instead of a runtime surprise.
4. Multi-table transactions. The editor approval flow (approve a Submission, create a Tool, link `submissionId`, write an AuditLog) is currently spread across several calls with raw SQL glue. In Convex it is one mutation, one transaction.
5. Built-in scheduler. Ad campaign flight windows, analytics rollups, and token cleanup become cron jobs instead of request-time side effects.

Honest costs and risks:

1. Deployment topology changes. Convex does not run inside Cloudflare Workers. The Next.js app stays on OpenNext for Cloudflare, and all data access goes over HTTPS/WebSocket to a Convex backend, either Convex cloud (managed, free dev tier, paid production tiers) or the open source self-hosted backend (Docker, newer and less turnkey). `ConvexHttpClient` is fetch-based and works on the Workers runtime, so the deploy target survives, but the data plane now has a network hop to a different provider.
2. Port effort is real. About 3,900 lines of server-side lib code plus 51 route files encode real business logic (trending scores, review moderation windows, weighted ad serving, MRC viewability, claim verification, submission queue positions). Every rule must be re-expressed in Convex functions. This is the bulk of the migration cost.
3. Lock-in is moderate. The data lives in Convex's storage format, not vanilla SQLite. Mitigation: Convex provides `npx convex export` snapshots, the schema is plain TypeScript, and the self-hosted OSS backend is a genuine (if operationally heavier) exit path.
4. Cost at scale is unknown until measured. The free tier is generous for a directory of this size, but two hot paths (pageview pings, ad serve) currently do one write per request; each becomes one Convex mutation call. At Prother's current scale (46 tools, hobby traffic) this is effectively free. Verify current published limits before launch.
5. Auth is the riskiest seam. NextAuth v4 with a custom raw-SQL adapter powers email magic links (with a dev inbox instead of SMTP) and Google OAuth. There is no drop-in NextAuth adapter for Convex. The plan keeps NextAuth during the transition behind a session bridge, then optionally moves to Convex Auth.

Recommendation: proceed, in the phased shape below, with Phase 1 to 3 being low risk (parallel, no behavior change), and the route-by-route cutover gated behind per-route feature flags with the Prisma path intact until Phase 5.

---

## 2. Current backend inventory (ground truth)

### 2.1 Prisma models (25 today, 27 in flight)

Source: `prisma/schema.prisma`, SQLite at `db/custom.db`, pushed via `bun run db:push`. Task 34 (another agent, in progress) is adding Media and Integration models plus an `uploads/` file flow; the plan reserves tables for them.

| Model | Role | Owning API routes | Server libs |
| --- | --- | --- | --- |
| Category | 7-category taxonomy, `features` pipe string holds compare axes | /api/tools, /api/admin/categories, /api/compare/matrix | prother.ts, features.ts, compare.ts |
| Tool | Directory listing, status lifecycle (draft, pending_review, approved, live, removed), `features` JSON map, pinned/editorsPick/curated | /api/tools, /api/tools/[slug], /api/search, /api/trending, /api/compare, /api/admin/tools, /api/editor/decision | prother.ts, search.ts, trending.ts, compare.ts, community.ts, features.ts |
| Submission | Submit wizard queue, 1 per domain rate limit, status tracking | /api/submit, /api/submit/check, /api/submit/status, /api/editor/queue, /api/editor/decision | prother.ts (raw SQL), submit.ts |
| Comment | Auth-lite discussion on listings | /api/tools/[slug]/comments | discussion.ts |
| Post | Journal (SEO workhorse), draft or published, SEO fields | /api/blog, /api/blog/[slug], /api/rss, /api/admin/posts, /api/search, /api/sitemap | markdown.ts |
| SiteSetting | KV store the admin console writes, the site reads (hero, footer, SEO, ad kill switches) | /api/site, /api/admin/settings, /api/ads/serve (via ad-config.ts) | ad-config.ts, use-site-settings.ts |
| AuditLog | Admin/editor action trail | written by lib/admin.ts logAudit from every admin route | admin.ts |
| User | NextAuth user + handle, bio, role (member/moderator/admin), status (active/banned) | /api/auth/[...nextauth], /api/admin/users | auth.ts (raw SQL adapter), users.ts |
| Account | NextAuth OAuth account link | /api/auth/[...nextauth] | auth.ts |
| Session | NextAuth database sessions | /api/auth/[...nextauth] | auth.ts |
| VerificationToken | NextAuth magic-link tokens | /api/auth/[...nextauth], /api/auth/dev-inbox | auth.ts (dev inbox on globalThis) |
| Review | 3 ratings (ease/power/value), 1 per user per tool, published or filtered (<48h soft moderation) | /api/reviews, /api/compare, /api/tools/[slug] | community.ts, trending.ts, compare.ts |
| Claim | Ownership verification, meta_tag or email_domain method | /api/claims, /api/claims/[id]/verify | community.ts |
| Collection | Personal or public curated lists | /api/collections, /api/collections/[slug] | community.ts |
| CollectionItem | Ordered tool membership in a collection | /api/collections/[slug]/items | community.ts |
| Follow | Follow tools, categories, makers | /api/follows | community.ts |
| Comparison | Comparison view log, powers popular comparisons | /api/compare | community.ts |
| ForumThread | Forum threads, 4 topics, hidden flag, baseUpvotes | /api/forum, /api/forum/[slug], /api/forum/[slug]/vote | forum.ts (raw SQL), prother.ts types |
| ForumReply | Thread replies, hidden flag | /api/forum/[slug]/reply | forum.ts |
| ForumThreadVote | Anonymous voterKey votes, unique per thread | /api/forum/[slug]/vote | forum.ts |
| Report | Community flagging of threads/replies/tools/posts/reviews | /api/reports, /api/admin/reports | reports.ts |
| Bookmark | Saved items, ownerKey is user:{email} or anon:{visitorKey} | /api/bookmarks | bookmarks.ts |
| AdCampaign | Direct-sold campaigns, 4 placements, weighted rotation, impressions/clicks/viewableImpressions counters | /api/admin/ads, /api/ads/serve, /api/ads/click, /api/ads/viewable | ads.ts, ad-measure.ts |
| AdServeStat | Daily fill accounting per placement (served, house, unfilled) | /api/ads/serve, /api/admin/ads, /api/admin/analytics | ad-measure.ts |
| PageViewDaily | Cookieless pageview counters, one row per path per UTC day | /api/analytics/pv, /api/admin/analytics | analytics.ts |
| Media (Task 34, in flight) | Uploaded assets for listings | upload API route under /api | new lib planned |
| Integration (Task 34, in flight) | Per-tool API integration credentials, used by AI actions | planned | planned |

### 2.2 API surface (51 route files, 21 route groups)

Groups under `src/app/api`: admin (12 files), ads (3), analytics (1), auth (2), blog (2), bookmarks (1), claims (2), collections (3), compare (2), editor (3), follows (1), forum (4), og (1), reports (1), reviews (1), rss (1), root (1), search (1), site (1), submit (3), tools (3), trending (1).

Shared patterns every route follows:

- `export const dynamic = "force-dynamic"` and `Cache-Control: no-store` on dynamic data.
- Zod validation on admin/editor write routes.
- Admin auth: `guard(req)` from `src/lib/admin.ts` compares the `x-editor-key` header against `EDITOR_KEY` ("ember-dev") from `src/lib/prother.ts`. One key, no user-level admin auth yet.
- Audit trail via fire-and-forget `logAudit(action, entity, entityId, meta)`.
- Explicit `select` lists on ORM reads because full-row reads break on a stale cached client.
- Raw `$queryRaw`/`$executeRaw` for everything added after server boot (see 2.3).

Representative examples verified by reading the code:

- `src/app/api/tools/route.ts`: GET with q/category/pricing/tag/page/pageSize/sort (featured, newest, top-rated, trending). top-rated is a raw SQL LEFT JOIN averaging published reviews; trending merges `trendingScores("week")` in JS. Returns DirectoryRow payloads.
- `src/app/api/admin/tools/route.ts`: GET table with grouped raw-SQL comment/review counts plus `toolFeaturesByIds`; POST create with slugify + unique loop; PATCH partial edit including whole-object features replace via raw SQL; DELETE soft delete (status = removed). Zod in, audit out.
- `src/app/api/search/route.ts`: loads up to 500 live tools + all categories + 100 published posts, then filters and ranks in JS with the shared token matcher (`src/lib/match.ts`: tokenize, light stemming, AND semantics, field-weighted relevanceScore). Candidate set is small, so JS filtering is deliberate.
- `src/app/api/ads/serve/route.ts`: kill-switch check first (SiteSetting keys ads.master, ads.placement.<key>), then `serveAd` weighted-random pick over active campaigns in flight window, impression counted per serve, fill outcome recorded (served or house), click href points at /api/ads/click.

### 2.3 Server-side data libraries

| Lib | Role | Raw SQL? |
| --- | --- | --- |
| src/lib/db.ts | PrismaClient singleton with SCHEMA_VERSION guard (v7) | no |
| src/lib/prother.ts | Domain types, submission helpers, editor queue helpers, forum types, re-exports db and EDITOR_KEY | mostly raw |
| src/lib/search.ts | SERP (/tools?q=) filtering + pagination over live tools | ORM + JS |
| src/lib/match.ts | Shared token matcher for hero search and SERP | pure JS |
| src/lib/features.ts | Compare axes (Category.features pipe) and tool feature maps (Tool.features JSON) | all raw |
| src/lib/forum.ts | Threads, replies, anon votes, hot/top/new sorts | all raw |
| src/lib/community.ts | Reviews, claims, collections, follows, compare helpers, reviewStats, maker self-block, ban checks | mostly raw |
| src/lib/ads.ts | Campaign CRUD payloads, eligibleWhere, weighted serveAd | mostly raw |
| src/lib/ad-measure.ts | Fill accounting upserts, viewable increments, 7-day readout | all raw |
| src/lib/ad-config.ts | Serving kill switches from SiteSetting KV | ORM |
| src/lib/analytics.ts | trackablePath, recordPageView upsert, 14-day traffic readout | all raw |
| src/lib/auth.ts | NextAuth v4 options, Email + Google providers, custom adapter over raw SQL, dev magic-link inbox | adapter all raw |
| src/lib/compare.ts | buildCompareMatrix shared by /api/compare/matrix and the SSR /compare page | ORM + raw features |
| src/lib/users.ts, reports.ts, bookmarks.ts, discussion.ts, trending.ts, submit.ts | Admin users, reports, bookmarks, comments, trending scores, wizard constants | mixed |
| src/lib/og.ts, markdown.ts, site-url.ts, breadcrumbs.tsx, category-blurbs.ts, standards.ts, forum-topics.ts, utils.ts | Presentation helpers, no DB or read-only | n/a |

### 2.4 Architectural constraints the plan must respect

1. SSR for SEO. Listing pages, category pages, /compare, the homepage sections, and journal pages are server components with `force-dynamic` that read the DB directly (for example `buildCompareMatrix` in `src/lib/compare.ts`, `directoryInitialRows` in `src/app/tools/page.tsx`). The migration must keep first-paint server-rendered data with the same shapes.
2. Client islands fetch JSON APIs. The admin console (`admin-console.tsx`, `editor-console.tsx`, `admin-ads.tsx`, `admin-users.tsx`, `admin-reports.tsx`) is a client component gated by the x-editor-key header. Hero search, ⌘K palette, forum actions, reviews, bookmarks, reports, collections, submit wizard all call the /api routes. During migration the routes stay as the contract; their internals switch to Convex.
3. The stale-PrismaClient raw-SQL rule (worklog Task 27 and every lib note above). Any new model added after server boot must be raw SQL until restart. This is pure overhead Convex removes.
4. Local file uploads (Task 34) land in an `uploads/` directory served through API routes. Workers have no filesystem, so this is the part of Task 34 most affected by the migration: Convex file storage is the natural replacement.
5. Deployment: OpenNext for Cloudflare (`wrangler.jsonc`, `open-next.config.ts`, `cf:*` scripts, DEPLOY.md). DEPLOY.md already documents the database-on-Workers blocker: Prisma + a local SQLite file cannot run on Workers. Convex resolves that blocker in a different way than D1/Turso: the app calls out to Convex's cloud over fetch.

---

## 3. Target architecture

### 3.1 Deployment topology

```
Browser
  |  websockets + HTTPS
  |                 \
Next.js 16 App Router      ConvexReactClient (client islands:
on Cloudflare Workers       useQuery / useMutation subscriptions)
  |  server components
  |  and route handlers
ConvexHttpClient (fetch, Workers-safe)
                     \
                      Convex backend (cloud or self-hosted OSS)
                        tables, functions, storage, cron
```

- Client components talk to Convex directly with `ConvexReactClient` using `NEXT_PUBLIC_CONVEX_URL`.
- Server components and any remaining route handlers use `ConvexHttpClient` (works on Workers; fetch-based, no Node APIs required).
- Convex cloud hosts the backend; the Next.js app never embeds the database. The self-hosted OSS backend is a supported alternative if the team wants data co-location or cost control, at the price of running the open source server in Docker.
- `npx convex dev` runs alongside `bun run dev` during development; codegen writes `convex/_generated`.

### 3.2 Schema sketch (abridged, `convex/schema.ts`)

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  categories: defineTable({
    slug: v.string(),
    name: v.string(),
    emoji: v.string(),
    sortOrder: v.number(),
    // was pipe-separated; normalized to an array
    features: v.array(v.string()),
  }).index("by_slug", ["slug"]),

  tools: defineTable({
    slug: v.string(),
    name: v.string(),
    tagline: v.string(),
    description: v.optional(v.string()),
    websiteUrl: v.string(),
    logoEmoji: v.string(),
    logoGradient: v.string(),
    pricingModel: v.string(),       // free | freemium | paid | open_source
    startingPrice: v.optional(v.string()),
    pricingNote: v.optional(v.string()),
    hasApi: v.boolean(),
    githubUrl: v.optional(v.string()),
    docsUrl: v.optional(v.string()),
    twitterUrl: v.optional(v.string()),
    tags: v.array(v.string()),      // was pipe-separated, max 5
    features: v.record(v.string(), v.string()), // was JSON string
    makerEmail: v.optional(v.string()),
    track: v.string(),              // editor_seed | community
    editorsPick: v.boolean(),
    curated: v.boolean(),
    claimed: v.boolean(),
    makerHandle: v.string(),
    status: v.string(),             // draft|pending_review|approved|live|removed
    pinned: v.number(),             // 0..3
    verifiedAt: v.optional(v.number()),
    categoryId: v.id("categories"),
    submissionId: v.optional(v.id("submissions")),
    // denormalized counters maintained by mutations (replaces raw JOINs)
    commentCount: v.number(),
    reviewCount: v.number(),
    ratingSumX100: v.optional(v.number()), // sum of (ease+power+value)/3 * 100
    legacyId: v.optional(v.string()),      // Prisma cuid for parity checks
    createdAt: v.number(),                 // epoch ms from SQLite import
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
    // ... wizard fields mirroring the Prisma model
    status: v.string(),            // pending | approved | rejected
    reviewNote: v.optional(v.string()),
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
    createdAt: v.number(),
  }).index("by_tool_created", ["toolId", "createdAt"]),

  posts: defineTable({
    slug: v.string(),
    title: v.string(),
    excerpt: v.string(),
    body: v.string(),
    // ... journal + SEO fields mirroring the Prisma model
    status: v.string(),
    publishedAt: v.optional(v.number()),
    tags: v.array(v.string()),
  }).index("by_slug", ["slug"]).index("by_status", ["status"]),

  siteSettings: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),

  auditLogs: defineTable({
    action: v.string(),
    entity: v.string(),
    entityId: v.string(),
    meta: v.string(),
    actor: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_created", ["createdAt"]),

  users: defineTable({
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    handle: v.optional(v.string()),
    image: v.optional(v.string()),
    bio: v.optional(v.string()),
    role: v.string(),              // member | moderator | admin
    status: v.string(),            // active | banned
    emailVerified: v.optional(v.number()),
    externalAuthId: v.optional(v.string()), // NextAuth user id bridge
    legacyId: v.optional(v.string()),
  }).index("by_email", ["email"]).index("by_handle", ["handle"]),

  reviews: defineTable({
    toolId: v.id("tools"),
    userId: v.string(),
    author: v.string(),
    ease: v.number(),
    power: v.number(),
    value: v.number(),
    body: v.string(),
    status: v.string(),            // published | filtered
    createdAt: v.number(),
  })
    .index("by_tool_status", ["toolId", "status"])
    .index("by_tool_user", ["toolId", "userId"]),

  claims: defineTable({
    toolId: v.id("tools"),
    userEmail: v.string(),
    method: v.string(),
    token: v.string(),
    status: v.string(),
    createdAt: v.number(),
    verifiedAt: v.optional(v.number()),
  }).index("by_token", ["token"]).index("by_tool", ["toolId"]),

  collections: defineTable({
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    isPublic: v.boolean(),
    ownerEmail: v.string(),
  }).index("by_slug", ["slug"]).index("by_owner", ["ownerEmail"]),

  collectionItems: defineTable({
    collectionId: v.id("collections"),
    toolId: v.id("tools"),
    position: v.number(),
  })
    .index("by_collection", ["collectionId"])
    .index("by_collection_tool", ["collectionId", "toolId"]),

  follows: defineTable({
    userEmail: v.string(),
    targetType: v.string(),
    targetId: v.string(),
    targetLabel: v.string(),
  }).index("by_owner", ["userEmail"])
    .index("by_triple", ["userEmail", "targetType", "targetId"]),

  comparisons: defineTable({
    aSlug: v.string(),
    bSlug: v.string(),
    views: v.number(),
  }).index("by_pair", ["aSlug", "bSlug"]).index("by_views", ["views"]),

  forumThreads: defineTable({
    slug: v.string(),
    title: v.string(),
    body: v.string(),
    topic: v.string(),
    author: v.string(),
    authorId: v.optional(v.string()),
    pinned: v.boolean(),
    hidden: v.boolean(),
    baseUpvotes: v.number(),
    replyCount: v.number(),        // denormalized for list reads
    voteCount: v.number(),         // denormalized
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
    createdAt: v.number(),
  }).index("by_thread_created", ["threadId", "createdAt"]),

  forumThreadVotes: defineTable({
    threadId: v.id("forumThreads"),
    voterKey: v.string(),
  }).index("by_thread_voter", ["threadId", "voterKey"]),

  reports: defineTable({
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
    createdAt: v.number(),
  }).index("by_status_created", ["status", "createdAt"])
    .index("by_target", ["targetType", "targetId"]),

  bookmarks: defineTable({
    ownerKey: v.string(),
    targetType: v.string(),
    targetId: v.string(),
    targetLabel: v.string(),
    targetHref: v.string(),
  }).index("by_owner_created", ["ownerKey"])
    .index("by_triple", ["ownerKey", "targetType", "targetId"]),

  adCampaigns: defineTable({
    name: v.string(),
    advertiser: v.string(),
    placement: v.string(),
    status: v.string(),
    // ... creative, budgets, window fields mirroring the Prisma model
    impressions: v.number(),
    clicks: v.number(),
    viewableImpressions: v.number(),
  }).index("by_placement_status", ["placement", "status"]),

  adServeStats: defineTable({
    placement: v.string(),
    day: v.string(),               // YYYY-MM-DD UTC
    served: v.number(),
    house: v.number(),
    unfilled: v.number(),
  }).index("by_placement_day", ["placement", "day"]),

  pageViewDaily: defineTable({
    path: v.string(),
    day: v.string(),
    views: v.number(),
  }).index("by_path_day", ["path", "day"]).index("by_day", ["day"]),

  // Task 34 in-flight models, reserved here so the schema lands once
  media: defineTable({
    storageId: v.id("_storage"),   // Convex file storage
    toolId: v.optional(v.id("tools")),
    kind: v.string(),              // screenshot | logo | cover
    mimeType: v.string(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  }).index("by_tool", ["toolId"]),

  integrations: defineTable({
    toolId: v.id("tools"),
    provider: v.string(),
    encryptedConfig: v.string(),   // written and read only from actions
    enabled: v.boolean(),
  }).index("by_tool", ["toolId"]),

  // NextAuth bridge tables during the transition (Phase 4c); dropped at Phase 5
  authSessions: defineTable({
    nextAuthSessionToken: v.string(),
    userId: v.id("users"),
    expiresAt: v.number(),
  }).index("by_token", ["nextAuthSessionToken"]),
});
```

Notes on the sketch: Convex reserves `_id` and `_creationTime` on every document; explicit `createdAt` fields are kept only where imported SQLite timestamps must survive parity checks. Denormalized counters replace the raw-SQL GROUP BY joins the current code performs on every listing read. There are no unique constraints in Convex; every "unique" becomes an index plus a guard inside the mutation, which is safe because a mutation is one transaction.

### 3.3 Function split (queries, mutations, actions)

- Queries (read-only, cacheable, realtime-subscribable): directory listing, tool detail, search, trending, compare matrix, journal posts, site settings and stats, submission status, collections, follows, bookmarks list, forum list and thread, admin tables, admin overview, analytics readouts, ad campaign list.
- Mutations (transactional writes): reviews upsert, comments add, submissions create, editor decisions (approve creates the Tool in the same transaction), admin CRUD for tools/categories/posts/users/settings/reports/ads, forum thread/reply/vote, bookmarks toggle, follows toggle, collections CRUD, claims create, comparison view increment, pageview increment, ad impression/click/viewable increments, ad serve outcome accounting.
- Actions (external I/O, run outside the transactional context): claim verification (fetch the maker's site and match the meta tag), email sending (magic links via Resend/Postmark when SMTP arrives, replacing the dev inbox), future AI actions using the Integration model (Task 34: call provider APIs, then persist through an internal mutation), scheduled aggregations if they ever need external calls.
- Convex cron jobs (scheduled functions): daily ad campaign window transitions (active to ended past endsAt), daily analytics and fill-stat compaction if needed, expired verification token cleanup, review auto-promotion if the 48h soft-moderation policy ever needs a timer (today it is evaluated on read).

### 3.4 Endpoint mapping

| Current endpoint | Convex target | Kind |
| --- | --- | --- |
| GET /api/site | site:getSettingsAndStats | query |
| GET /api/tools | tools:directory | query |
| GET /api/tools/[slug] | tools:detail | query |
| GET + POST /api/tools/[slug]/comments | comments:list / comments:add | query / mutation |
| GET /api/search | search:search | query |
| GET /api/trending | trending:list | query |
| GET /api/compare, /api/compare/matrix | compare:matrix | query |
| POST /api/compare (view log) | compare:logView | mutation |
| GET /api/blog, /api/blog/[slug] | posts:list / posts:getBySlug | query |
| POST /api/submit, /api/submit/check, /api/submit/status | submissions:create / submissions:checkDuplicate / submissions:listByEmail | mutation / query / query |
| GET + POST /api/reviews | reviews:list / reviews:upsert | query / mutation |
| POST /api/claims | claims:create | mutation |
| POST /api/claims/[id]/verify | claims:verify | action (external fetch) |
| GET + POST + PATCH + DELETE /api/collections* | collections:list, get, create, update, delete, addItem, removeItem | queries / mutations |
| GET + POST + DELETE /api/follows | follows:list / follows:toggle | query / mutation |
| GET + POST /api/forum, /api/forum/[slug], /reply, /vote | forum:list, thread, createThread, createReply, vote | queries / mutations |
| GET + POST + DELETE /api/bookmarks | bookmarks:list / bookmarks:toggle | query / mutation |
| POST /api/reports | reports:create | mutation |
| GET /api/editor/queue | editor:queue | query (admin identity) |
| POST /api/editor/decision, /api/editor/arbitrate | editor:decide / editor:arbitrate | mutation |
| /api/admin/* (tools, categories, posts, users, reports, settings, ads, overview, analytics) | admin:* modules mirroring the 12 route files | queries / mutations (admin identity) |
| GET /api/ads/serve | ads:serve | mutation (counts an impression and returns the pick; the client's fetch stays a POST-shaped RPC) |
| GET /api/ads/click | ads:registerClick mutation, then Next route issues the 302 | mutation + thin Next redirect route |
| POST /api/ads/viewable | ads:recordViewable | mutation |
| POST /api/analytics/pv | analytics:recordPageView | mutation |
| /api/auth/* | stays NextAuth in Phases 1 to 4 (bridge in 3.5); optional Convex Auth later | n/a |
| GET /api/og | stays in Next (satori); reads data via ConvexHttpClient | Next-only |
| GET /api/rss | stays in Next; reads posts via ConvexHttpClient | Next-only |
| /api/route.ts (hello world) | delete | n/a |

Serving note: today /api/ads/serve is a GET that writes (impression + fill stat). In Convex a function that writes must be a mutation. The AdSlot island keeps its fetch call shape (POST /api/ads/serve via a route handler during dual-run, then direct useMutation), so the impression contract and StrictMode dedupe guards stay intact.

### 3.5 Auth mapping

Current state: NextAuth v4, EmailProvider (magic links, dev-inbox stand-in for SMTP at `src/lib/auth.ts`), GoogleProvider when env vars exist, a custom raw-SQL adapter over User/Account/Session/VerificationToken, database sessions.

Target, in two steps:

1. Transition (Phases 2 to 4): keep NextAuth exactly as is in Next.js. Add a bridge: on session fetch, a Convex mutation upserts the Convex `users` document keyed by `externalAuthId` (the NextAuth user id) and returns the Convex identity. Convex mutations that need auth (reviews, forum posts, collections, admin) receive `externalAuthId` plus a proof: the simplest safe bridge is a Convex action that validates the NextAuth session token against the authSessions table; the more robust bridge is a short-lived signed JWT minted by a Next route and validated by Convex via ctx.auth with a custom JWT provider. The admin console continues to send the x-editor-key header, which a Next route (or a Convex action) checks against an env secret until user-level admin roles are wired.
2. Long term (optional, post Phase 5): adopt Convex Auth (the first-party library, currently beta) for email magic links and OAuth, dropping NextAuth and the bridge tables. This is deliberately not on the critical path; the magic-link + Google flow works and migrating auth twice is churn.

Moderation and roles (role/status on users, ban checks in community.ts) move into Convex mutations verbatim: check the caller's identity document, reject when banned, maker self-block for reviews.

### 3.6 File storage mapping

Task 34 introduces local uploads into an `uploads/` directory served through API routes. Convex replaces this wholesale:

- Upload flow: the client posts the file to a Convex mutation that calls `ctx.storage.generateUploadUrl`, the client PUTs the bytes, then a second mutation creates the `media` document with the returned `storageId`.
- Serving: use `ctx.storage.getUrl(storageId)` (returns a hosted URL) or proxy through a Next route if a stable same-origin URL is needed for OG or caching.
- Tool covers/screenshots attach to `media.toolId`; the tools:detail query joins the latest media document per tool.
- Migration of any files already uploaded under `uploads/`: a one-time script (Phase 2) reads each file, uploads it through the same generate-upload-url flow, and records the media document. Files stay small (screenshots), so volume is trivial.

### 3.7 Realtime wins (concrete, per surface)

1. ⌘K palette and hero search (`tool-explorer.tsx`, `hero-search.tsx`): switch from debounced /api/search fetches to `useQuery(search:search)`. Results, category counts, and post hits update as editors change listings, with zero request storms while typing (Convex re-runs the query server-side only when the underlying data changed).
2. Forum threads (`/forums/[slug]`, `forum-thread-actions.tsx`): replies and votes appear live for every reader; the reply POST becomes a mutation and the thread query just updates. Vote counts stop being stale by one request.
3. Admin console: queue, reports, listings, users, ads tables, and the overview KPI cards become `useQuery` subscriptions. The editor sees new submissions the moment a maker submits; the overview traffic and ad cards tick without polling.
4. Submission status tracker: queue position updates live while the maker keeps the page open.
5. Ad measurement: serve/click/viewable counters propagate to the admin Measurement card in real time during campaign QA.

### 3.8 Convex cron jobs

1. Campaign lifecycle: a daily cron flips expired adCampaigns from active to ended (today window state is computed on read in ads.ts; the cron only normalizes status and can send a report email later).
2. Token hygiene: delete expired VerificationTokens and dev-inbox entries (a scheduled internal mutation).
3. Optional compaction: fold pageViewDaily rows older than N days into a monthly summary table if the path-level granularity stops being useful.

---

## 4. Migration strategy (phases)

The guiding rule: never a big-bang cutover. Convex runs in parallel with Prisma until Phase 5; every route has a flag; the SQLite file and the Prisma code stay the source of truth until the final phase.

### Phase 0: audit and decision record (0.5 to 1 day)

- Freeze this document as the plan of record; walk every route file and lib listed in section 2 and tick off the mapping in 3.4.
- Decide the auth bridge variant (signed JWT vs session-table check) and the Convex backend (cloud vs self-hosted).
- Choose the flag mechanism: one `NEXT_PUBLIC_DATA_BACKEND` default plus per-route overrides in SiteSetting KV (the admin console already edits KV, so cutovers become editor operations).
- Snapshot the SQLite DB and record baseline payload fixtures for the parity harness (tools list with all four sorts, search for 5 queries, compare matrix for 2 categories, forum list, admin overview).
- Exit criteria: mapping reviewed line by line; baseline fixtures captured; backend chosen.
- Rollback: nothing changed; document is the artifact.

### Phase 1: parallel setup (1 to 2 days)

- Install the `convex` package (dev dependency; no app code changes yet), run `npx convex dev`, commit the `convex/` folder with `schema.ts` from 3.2, an empty `convex/` module tree (one file per domain: tools.ts, search.ts, forum.ts, community.ts, ads.ts, admin.ts, site.ts, submissions.ts, posts.ts, analytics.ts, users.ts, media.ts), and codegen output ignored or committed per team taste.
- Set env vars locally (`NEXT_PUBLIC_CONVEX_URL` in `.env.local`, and the same var as a Wrangler secret/vars entry for the Workers deploy).
- Add `src/lib/convex.ts`: server-side `ConvexHttpClient` factory (Workers-safe) and the `ConvexReactClient` provider mounted in `layout.tsx` behind a no-op provider so nothing changes until a component opts in.
- Recreate seed data as Convex seed mutations or reuse the Phase 2 import; verify the dashboard shows tables.
- Exit criteria: `npx convex dev` runs clean next to `bun run dev`; schema deploys; a smoke query returns seeded rows; typegen types compile.
- Rollback: delete the env var and the `convex/` folder; zero app surface was touched.

### Phase 2: data migration script (1 to 2 days)

- Write `scripts/export-to-convex.ts` (Bun): read every table from SQLite through Prisma (or better-sqlite3 directly), transform per section 5, and emit JSONL per table; bulk import with `npx convex import --table <name> <file>.jsonl` for the big tables, or a batched internal mutation when the transform needs cross-table lookups (submissionId linking, counter backfill).
- Transform rules are exactly section 5. Backfill denormalized counters (commentCount, reviewCount, forum replyCount and voteCount, comparison views) in the same script.
- File uploads: migrate anything already in `uploads/` into Convex storage as in 3.6.
- Verification: row counts per table match; 20 random documents deep-compared against SQLite; every slug resolves; counters match raw SQL GROUP BY outputs run against SQLite.
- Exit criteria: counts and spot checks pass; a rerun is idempotent (import is into a fresh dev deployment or upserts by legacyId).
- Rollback: nothing in Next reads Convex yet; drop and re-import the dev deployment freely.

### Phase 3: dual-run shadow reads (2 to 3 days)

- Add a shadow-read harness: when the flag is on, a route handler computes its payload twice (Prisma path, Convex path) and logs a diff (canonical JSON compare) with the route name to a `shadowDiffs` log; the response served is still the Prisma one.
- Cover: /api/tools (all four sorts plus filters), /api/tools/[slug], /api/search (five queries), /api/trending, /api/compare/matrix (two categories), /api/site, /api/blog, /api/forum, /api/admin/overview, /api/admin/tools.
- Fix schema shape or transform bugs until diffs are empty for a full day of local browsing and scripted traffic.
- Known deliberate divergences to whitelist in the comparator: timestamp formatting, map key ordering, and the trending window boundary (hour roll-over).
- Exit criteria: zero unexplained diffs over one day; p95 added latency of the Convex read path measured and acceptable (target under 150 ms from local dev).
- Rollback: flags off; served responses never changed during this phase.

### Phase 4: route-by-route cutover with flags (3 to 5 days)

Order chosen to put the lowest-risk, highest-visibility reads first and the auth-dependent writes last. Each step: flip the route's flag, verify the client contract unchanged, watch the shadow diff log for 24 hours, then leave the Prisma branch in place until Phase 5.

1. Site settings and stats, blog reads, trending, compare matrix (SSR page and API together so /compare stays consistent).
2. Directory reads: /api/tools all sorts, /api/tools/[slug], /api/search, /api/trending. Move the ⌘K palette and hero search to `useQuery` here for the first realtime win.
3. Community writes: comments, reviews, forum (threads, replies, votes), bookmarks, follows, collections, reports, comparison view log. Ban checks, maker self-block, 48h soft moderation, and voterKey uniqueness guards ported into the mutations. SSR pages for forums and tool detail now read Convex.
4. Submit flow and editor console: submissions create/check/status, editor queue, decision, arbitrate. The decision mutation is the showcase: approve creates the Tool, links submissionId, and writes the AuditLog in one transaction.
5. Ads and analytics: serve (now a mutation), click (Next 302 + Convex mutation), viewable, pageview ping, admin analytics and overview; enable the cron jobs.
6. Admin CRUD: tools, categories, posts, users, settings, reports; the admin console switches its fetches to Convex mutations with the x-editor-key gate enforced by a Next proxy route (or a Convex action holding the key in an env var).
7. Auth-dependent flows last, using the bridge from 3.5.
- Exit criteria: every route's flag is on Convex in production-like preview; client-visible contracts byte-identical (except approved realtime behavior changes); QA script (curl matrix from the worklog conventions) passes; `bun run lint` and tsc clean.
- Rollback: per-route flag flips back to the Prisma path in seconds; because Prisma kept receiving the same writes through Phase 4 step 4 onward (dual writes were decided against, so note this carefully), the rollback window per route is bounded by the data the two stores have seen. For write routes, Phase 4 enables dual writes (write both, read Convex) for 48 hours before disabling the Prisma write, so a rollback never loses data.

### Phase 5: decommission Prisma (1 to 2 days)

- Final cutover export: run the Phase 2 script one more time as an import delta into the production deployment (or accept a short maintenance window with the app in read-only), then flip all defaults to Convex.
- Delete: prisma + @prisma/client dependencies, prisma/ directory, db/custom.db, src/lib/db.ts, and the raw-SQL bodies in the libs listed in 2.3 (the libs themselves mostly dissolve into convex/ modules), the auth bridge tables if Convex Auth was adopted, the flag plumbing.
- Replace DEPLOY.md's "Database on Workers" blocker section with the Convex topology; update wrangler.jsonc comments; remove the D1/Turso notes.
- Keep: /api/og, /api/rss, sitemap.ts, robots.ts (rewired to ConvexHttpClient for reads).
- Exit criteria: clean build with zero Prisma imports; `bun run cf:build` succeeds; prod smoke suite passes; worklog entry records the final state.
- Rollback after this phase: restore from the pre-cutover git tag and the SQLite snapshot; plan a maximum one-write-loss window and communicate it in advance.

---

## 5. Data mapping details (SQLite/Prisma to Convex)

| Prisma / SQLite shape | Convex shape | Notes |
| --- | --- | --- |
| `String @id @default(cuid())` | Convex `_id` (system) + optional `legacyId: v.optional(v.string())` | Slugs already serve as public identifiers for tools, posts, categories, collections, threads. Keep the cuid in legacyId where the API contract still passes ids (reports targetId, bookmarks targetId, audit entityId, claims). New documents never need one. |
| `@unique` / compound `@@unique` | `.index()` + guard inside the mutation | Uniqueness is enforced transactionally in the mutation (check-then-insert in the same transaction is race-free in Convex). |
| `DateTime` | `v.number()` epoch milliseconds | SQLite already stores DateTime as INTEGER ms (verified in the worklog), so the export is a direct copy. Prefer `_creationTime` for new rows; keep explicit createdAt only for imported data. |
| `DateTime?` | `v.optional(v.number())` | Same rule. |
| Pipe-separated strings (Tool.tags, Category.features axes, Post.keywords, Post.tags) | `v.array(v.string())` | Normalize at export (`split("|")`, trim, dedupe). Client code that parses pipes (compare.ts, features.ts) is replaced by typed arrays. |
| JSON string map (Tool.features) | `v.record(v.string(), v.string())` | parseFeatures/delete the try-catch; validation happens at write time now. |
| Boolean (stored 0/1 in raw SQL reads) | `v.boolean()` | Exporter converts. |
| Nullable strings | `v.optional(v.string())` or `v.union(v.string(), v.null())` | Pick one convention repo-wide; optional is idiomatic. |
| Enums-as-strings (status, pricingModel, topic, reason, placement) | keep as `v.string()` with `v.pick`-style literals in the mutation validators, or `v.union(v.literal(...))` | Convex has no enum primitive; literal unions give schema-level safety where the value set is small and stable. |
| Relations (`categoryId`, FK fields) | `v.id("categories")` and friends | No FK enforcement; parent deletes must cascade manually in mutations (comments, reviews, collection items, replies, votes already cascade in SQLite today; port the cascade explicitly). |
| `_count` aggregations | denormalized counters maintained by mutations, or index scans | Listing rows read commentCount/reviewCount directly; this deletes the raw GROUP BY blocks in api/tools, api/admin/tools, api/tools/[slug]. |
| Raw SQL LEFT JOIN for top-rated | two options: (a) denormalized ratingSumX100 + ratingCount maintained on review writes, (b) compute at read time in a query | At 46 tools, (b) is fine; (a) is the scale path. Recommend (a) from day one because review writes are rare and it makes the sort a pure index scan. |
| Autoincrement-ish ordering (sortOrder, pinned, position) | unchanged numbers | No change. |
| `crypto.randomUUID()` inserts in raw SQL | Convex `_id` | Stop hand-rolling ids. |
| Auth tables (User/Account/Session/VerificationToken) | users table + authSessions bridge (transition), Convex Auth tables (optional end state) | OAuth provider tokens live only in Next during the transition; Convex never needs refresh tokens. |

---

## 6. Effort estimates

| Phase | Content | Engineer-days |
| --- | --- | --- |
| 0 | Audit, mapping sign-off, fixtures, decisions | 0.5 to 1 |
| 1 | Convex setup, schema, providers, env plumbing | 1 to 2 |
| 2 | Export/transform/import script, uploads migration, verification | 1 to 2 |
| 3 | Shadow-read harness + parity fixes | 2 to 3 |
| 4 | Route-by-route cutover (7 steps), realtime conversions, dual-write window | 3 to 5 |
| 5 | Final cutover, decommission, docs | 1 to 2 |
| Total | | 8.5 to 15 |

Assumptions: one engineer familiar with the codebase; the Task 34 Media/Integration work lands before Phase 4 step 6 or is folded in; no Convex Auth adoption inside this migration (that is follow-on work if chosen); QA reuses the existing curl + agent-browser conventions from the worklog.

---

## 7. Risks and mitigations

1. SEO and SSR latency. Server components now fetch from Convex over the network instead of a local SQLite file. Convex reads are strongly consistent and fast, but the hop adds single-digit to low-double-digit milliseconds per query from a Workers colo. Mitigation: batch related reads into single queries (Convex queries can return multi-shape objects, exactly like buildCompareMatrix does today), keep marketing/about pages static, and keep generateMetadata reads inside the same page-level query. Force-dynamic stays; nothing depends on ISR.
2. Cloudflare Workers compatibility. ConvexHttpClient is fetch-based and documented to run on Workers; websockets are browser-side only. Mitigation: verify in `cf:preview` at the end of Phase 1, before any cutover work, so a surprise surfaces while rollback is trivial.
3. Vendor lock-in. Data leaves SQLite's open format. Mitigation: scheduled `npx convex export` snapshots into a private bucket; the schema and all logic are plain TypeScript; the self-hosted OSS backend is the documented escape hatch; the Phase 2 export script doubles as an exit-tool template (Convex to anywhere).
4. Cost at scale. Two hot paths write per request (pageview ping, ad serve/click/viewable). Convex charges by function calls and database usage on paid tiers. Mitigation: at directory scale this stays inside the free tier; if it does not, batch viewable pings (already one per creative per mount), sample analytics, and cache SERP reads. Re-check published limits at Phase 0.
5. Raw-SQL legacy helpers. ~14 libs of business logic must be re-expressed. Mitigation: they are already the seam; each lib maps one-to-one to a convex module, and the Phase 3 harness catches behavioral drift. The stale-PrismaClient motivation disappears, which is net maintainability.
6. NextAuth session compatibility. Reviews, forum, collections, claims, and admin all behave differently per auth state today. Mitigation: the bridge in 3.5 keeps NextAuth authoritative during the transition; identity checks (ban status, maker self-block, 48h window) are unit-tested Convex functions; admin keeps the editor-key gate until role-based auth is deliberately upgraded.
7. Background jobs. Analytics daily aggregation and campaign windows become crons; dev-inbox magic-link expiry becomes a scheduled mutation. Mitigation: crons are config-plus-function in Convex, deployed with the code, visible in the dashboard; each has a manual trigger for QA.
8. Write-path parity (the subtle one). Ads serving currently counts impressions on GET; pageviews upsert on fire-and-forget promises. In Convex these are mutations inside transactions, so ordering and error semantics change slightly (no dropped writes, but client-visible latency on the ping). Mitigation: keep pings non-blocking in the client; confirm StrictMode dedupe (firedRef) still guarantees one impression per mount.
9. Two runtimes in development. `npx convex dev` must run alongside `bun run dev`. Mitigation: add a `dev:all` script and document it in DEPLOY.md; the Convex dashboard local instance lives at a stable port.

---

## 8. Do not migrate (stays in Next.js)

1. `/api/og` (satori via `next/og`): edge image generation is a Next strength; it will read its tool data through ConvexHttpClient but keep rendering in Next.
2. `/api/rss`, `sitemap.ts`, `robots.ts`: XML/SEO endpoints stay as Next routes; only their data source changes.
3. Static assets, `public/`, the marketing pages (`/about`, `/advertise`), the App Router shell, theming, and all design-system components: untouched by this migration.
4. The NextAuth route handlers during the transition (section 3.5): auth stays put until the Convex Auth decision is made deliberately.
5. The `/api/ads/click` 302 redirect route: a redirect does not need Convex; it calls one mutation then responds 302. Keeping it preserves the exact click contract advertisers were given.
6. `scripts/`, seeds (converted to one-time import tooling in Phase 2, not runtime code), QA artifacts, worklog, docs.

---

## 9. Next steps checklist (for the day the team runs `npx convex dev`)

1. Create the Convex account (convex.dev) and note the team name; decide cloud vs self-hosted for the dev deployment.
2. `bun add convex` (or `npm i convex`), then `npx convex dev`; log in via the browser flow; accept the generated `convex/` folder.
3. Commit `convex/schema.ts` from section 3.2; confirm the dashboard shows the tables.
4. Write `convex/site.ts` (getSettingsAndStats) and `convex/tools.ts` (directory) first; deploy with `npx convex dev`.
5. Set `NEXT_PUBLIC_CONVEX_URL` in `.env.local`; add it to Wrangler vars (`wrangler secret put` or vars in `wrangler.jsonc`) for the Workers deploy; run `bun run cf:preview` to prove the Workers path early.
6. Build `scripts/export-to-convex.ts` and run the Phase 2 import against the dev deployment; verify counts.
7. Stand up the shadow harness behind the flag; capture baseline fixtures first.
8. Walk the Phase 4 order; after each step update the worklog with the route list flipped and the diff status.
9. Enable the two cron jobs (campaign windows, token cleanup) in `convex/crons.ts`.
10. Before Phase 5: schedule a `npx convex export` snapshot job, tag the pre-cutover git commit, and take a fresh SQLite backup.
11. Update DEPLOY.md and the root README with the new topology and the `dev:all` script.

---

## Appendix A: payload contracts worth preserving byte-for-byte

These are the client-facing shapes the cutover must not change (verified against the current code):

- DirectoryRow (api/tools): slug, name, tagline, emoji, gradient, pricing {model, price, note}, category {slug, name, emoji}, editorsPick, curated, badges {editorsPick, curated, unclaimed, hasApi, openSource}, comments (only when > 0), listedAt ISO, reviews {count}; envelope {rows, total, page, pages, categoryMeta?}.
- SearchToolHit / SearchCategoryHit / SearchPostHit and the {q, tools, categories, posts, counts} envelope (api/search).
- TrendingRow {slug, name, tagline, emoji, gradient, category, score, signals {comments, reviews, saves}} (api/trending).
- CompareMatrix {category {slug, name, emoji, features[]}, options[40], tools[<=4]} shared by the SSR page and the API.
- ForumThreadRow / ForumListResponse / ForumThreadDetailResponse (lib/prother.ts).
- SubmissionStatusItem including queuePosition and the rejected resubmit prefill (lib/submit.ts).
- AdServeResponse {ad, clickHref} plus the fallback states {ad: null, fallback: "house" | "none"} (api/ads/serve).
- Admin overview KPI envelope and the 14-day chart buckets (api/admin/overview).
