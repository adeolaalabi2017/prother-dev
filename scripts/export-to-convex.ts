/**
 * Phase 2 SQLite → Convex import (plan §Phase 2, mapping §5).
 *
 * Usage:  node scripts/export-to-convex.ts
 *         (or `npm run convex:import`)
 *
 * Requires: `npx convex dev` running (local :3210 or cloud), `.env.local`
 * with NEXT_PUBLIC_CONVEX_URL, and DATABASE_URL in `.env`.
 *
 * - Reads every table from SQLite through a FRESH PrismaClient (no
 *   stale-client issue outside the long-running dev server).
 * - Transforms per §5: DateTime → epoch ms, pipes → arrays, JSON strings →
 *   typed values, booleans stay booleans, nulls → undefined for optionals.
 * - Backfills denormalized counters (tool commentCount/reviewCount/
 *   ratingSumX100, forum replyCount/voteCount) from the same GROUP BY
 *   semantics the live code uses.
 * - Idempotent: clears all data tables first, then inserts parents before
 *   children, resolving legacyId → Convex _id maps client-side.
 * - Verifies: per-table counts, 20-doc deep-compare via `import:byLegacy`,
 *   slug spot-checks, counter checks. Exits non-zero on mismatch.
 *
 * NextAuth tables (Account/Session/VerificationToken) are SKIPPED on
 * purpose — auth stays on SQLite through Phase 4 (plan §3.5).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

// ── Env ──
function loadDotLocal(path: string): void {
  let text = "";
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}
loadDotLocal(fileURLToPath(new URL("../.env.local", import.meta.url)));

const CONVEX_URL = (process.env.NEXT_PUBLIC_CONVEX_URL ?? "").trim();
if (!CONVEX_URL) {
  console.error("NEXT_PUBLIC_CONVEX_URL is not set — is `npx convex dev` running?");
  process.exit(1);
}

// ── Transform helpers (§5) ──
const ms = (d: Date | null | undefined): number | undefined =>
  d ? new Date(d).getTime() : undefined;
const msReq = (d: Date): number => new Date(d).getTime();
const nil = <T>(v: T | null | undefined): T | undefined => v ?? undefined;
const pipe = (s: string | null | undefined): string[] =>
  (s ?? "")
    .split(/[|,]/)
    .map((t) => t.trim())
    .filter(Boolean);
function jsonObj(s: string | null | undefined): Record<string, string> {
  try {
    const v = JSON.parse(s ?? "{}");
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const out: Record<string, string> = {};
      for (const [k, val] of Object.entries(v)) out[k] = String(val);
      return out;
    }
  } catch {
    /* fall through */
  }
  return {};
}
function jsonStrArr(s: string | null | undefined): string[] {
  try {
    const v = JSON.parse(s ?? "[]");
    if (Array.isArray(v)) return v.map(String);
  } catch {
    /* fall through */
  }
  return [];
}
function jsonUseCases(
  s: string | null | undefined,
): { title: string; body: string }[] {
  try {
    const v = JSON.parse(s ?? "[]");
    if (Array.isArray(v)) {
      return v
        .filter((u) => u && typeof u === "object")
        .map((u) => ({ title: String(u.title ?? ""), body: String(u.body ?? "") }))
        .filter((u) => u.title || u.body);
    }
  } catch {
    /* fall through */
  }
  return [];
}

const BATCH = 20;
async function batched<T>(rows: T[], fn: (batch: T[]) => Promise<unknown>): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH) {
    await fn(rows.slice(i, i + BATCH));
  }
}

type Receipt = { legacyId: string | null; id: string };
function toMap(receipts: Receipt[][]): Map<string, string> {
  const m = new Map<string, string>();
  for (const batch of receipts)
    for (const r of batch) if (r.legacyId) m.set(r.legacyId, r.id as string);
  return m;
}

// ── Main ──
const db = new PrismaClient({ log: [] });
const client = new ConvexHttpClient(CONVEX_URL);
let failures = 0;
const fail = (msg: string): void => {
  failures += 1;
  console.error(`  ✖ ${msg}`);
};
const ok = (msg: string): void => console.log(`  ✓ ${msg}`);

async function main(): Promise<void> {
  console.log(`→ Target: ${CONVEX_URL}`);

  // 0. Clear (idempotent rerun).
  const cleared = await client.mutation(api.import.clearTables, {
    tables: [
      "categories", "tools", "submissions", "comments", "posts",
      "siteSettings", "auditLogs", "users", "reviews", "claims",
      "collections", "collectionItems", "follows", "comparisons",
      "forumThreads", "forumReplies", "forumThreadVotes", "reports",
      "bookmarks", "adCampaigns", "adServeStats", "pageViewDaily",
      "media", "integrations", "authSessions",
    ],
  });
  ok(`cleared (${Object.values(cleared).reduce((a, b) => a + (b as number), 0)} docs)`);

  // 1. Parents: categories, submissions, users, forumThreads, collections.
  const cats = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
  const catR: Receipt[][] = [];
  await batched(cats, async (b) => {
    catR.push(
      (await client.mutation(api.import.importCategories, {
        rows: b.map((c) => ({
          slug: c.slug, name: c.name, emoji: c.emoji,
          sortOrder: c.sortOrder, features: pipe(c.features), legacyId: c.id,
        })),
      })) as Receipt[],
    );
  });
  const catMap = toMap(catR);
  ok(`categories: ${cats.length}`);

  const subs = await db.submission.findMany();
  const subR: Receipt[][] = [];
  await batched(subs, async (b) => {
    subR.push(
      (await client.mutation(api.import.importSubmissions, {
        rows: b.map((s) => ({
          email: s.email, websiteUrl: s.websiteUrl, domain: s.domain,
          name: s.name, tagline: s.tagline, description: s.description,
          categorySlug: s.categorySlug, tags: pipe(s.tags),
          pricingModel: s.pricingModel, startingPrice: nil(s.startingPrice),
          pricingNote: nil(s.pricingNote), hasApi: s.hasApi,
          githubUrl: nil(s.githubUrl), docsUrl: nil(s.docsUrl),
          twitterUrl: nil(s.twitterUrl), logoEmoji: s.logoEmoji,
          logoGradient: s.logoGradient, isOwner: s.isOwner,
          confirmedLive: s.confirmedLive, agreedStandards: s.agreedStandards,
          status: s.status, reviewNote: nil(s.reviewNote),
          legacyId: s.id, createdAt: msReq(s.createdAt),
        })),
      })) as Receipt[],
    );
  });
  const subMap = toMap(subR);
  ok(`submissions: ${subs.length}`);

  const users = await db.user.findMany();
  await batched(users, async (b) => {
    await client.mutation(api.import.importUsers, {
      rows: b.map((u) => ({
        email: nil(u.email), name: nil(u.name), handle: nil(u.handle),
        image: nil(u.image), bio: nil(u.bio), role: u.role, status: u.status,
        emailVerified: ms(u.emailVerified),
        legacyId: u.id, createdAt: msReq(u.createdAt),
      })),
    });
  });
  ok(`users: ${users.length}`);

  // Counter inputs (GROUP BY semantics matching lib/trending.ts + admin reads).
  const [commentGroups, reviewGroups, saveGroups, replyGroups, voteGroups] =
    await Promise.all([
      db.comment.groupBy({ by: ["toolId"], _count: { _all: true } }),
      db.$queryRaw<{ toolId: string; ease: number; power: number; value: number }[]>`
        SELECT toolId, ease, power, value FROM Review WHERE status = 'published'`,
      db.$queryRaw<{ toolId: string; n: number }[]>`
        SELECT ci.toolId as toolId, COUNT(*) as n FROM CollectionItem ci GROUP BY ci.toolId`,
      db.forumReply.groupBy({
        by: ["threadId"], _count: { _all: true }, where: { hidden: false },
      }),
      db.forumThreadVote.groupBy({ by: ["threadId"], _count: { _all: true } }),
    ]);
  const commentsByTool = new Map(commentGroups.map((g) => [g.toolId, g._count._all]));
  const reviewsByTool = new Map<string, { count: number; sumX100: number }>();
  for (const r of reviewGroups) {
    const e = reviewsByTool.get(r.toolId) ?? { count: 0, sumX100: 0 };
    e.count += 1;
    e.sumX100 += ((Number(r.ease) + Number(r.power) + Number(r.value)) / 3) * 100;
    reviewsByTool.set(r.toolId, e);
  }
  const savesByTool = new Map(saveGroups.map((g) => [g.toolId, Number(g.n)]));
  void savesByTool; // trending-time signal; not stored (recomputed from items)
  const repliesByThread = new Map(replyGroups.map((g) => [g.threadId, g._count._all]));
  const votesByThread = new Map(voteGroups.map((g) => [g.threadId, g._count._all]));

  const threads = await db.forumThread.findMany();
  const threadR: Receipt[][] = [];
  await batched(threads, async (b) => {
    threadR.push(
      (await client.mutation(api.import.importForumThreads, {
        rows: b.map((t) => ({
          slug: t.slug, title: t.title, body: t.body, topic: t.topic,
          author: t.author, authorId: nil(t.authorId),
          pinned: t.pinned, hidden: t.hidden, baseUpvotes: t.baseUpvotes,
          replyCount: repliesByThread.get(t.id) ?? 0,
          voteCount: votesByThread.get(t.id) ?? 0,
          legacyId: t.id, createdAt: msReq(t.createdAt),
          updatedAt: msReq(t.updatedAt),
        })),
      })) as Receipt[],
    );
  });
  const threadMap = toMap(threadR);
  ok(`forumThreads: ${threads.length}`);

  const cols = await db.collection.findMany();
  const colR: Receipt[][] = [];
  await batched(cols, async (b) => {
    colR.push(
      (await client.mutation(api.import.importCollections, {
        rows: b.map((c) => ({
          slug: c.slug, name: c.name, description: c.description,
          isPublic: c.isPublic, ownerEmail: c.ownerEmail,
          ownerName: c.ownerName, legacyId: c.id,
          createdAt: msReq(c.createdAt),
        })),
      })) as Receipt[],
    );
  });
  const colMap = toMap(colR);
  ok(`collections: ${cols.length}`);

  // 2. Tools (needs category + submission maps).
  const tools = await db.tool.findMany();
  const toolR: Receipt[][] = [];
  let toolsSkipped = 0;
  await batched(tools, async (b) => {
    const rows: any[] = [];
    for (const t of b) {
      const categoryId = catMap.get(t.categoryId);
      if (!categoryId) {
        toolsSkipped += 1;
        console.error(`  ! tool ${t.slug}: unknown categoryId ${t.categoryId}, skipped`);
        continue;
      }
      const rc = reviewsByTool.get(t.id) ?? { count: 0, sumX100: 0 };
      rows.push({
        slug: t.slug, name: t.name, tagline: t.tagline,
        description: nil(t.description), websiteUrl: t.websiteUrl,
        logoEmoji: t.logoEmoji, logoGradient: t.logoGradient,
        logoUrl: nil(t.logoUrl), screenshotUrls: pipe(t.screenshotUrls),
        longDescription: nil(t.longDescription),
        useCases: jsonUseCases(t.useCases as string | null),
        pros: jsonStrArr(t.pros as string | null),
        cons: jsonStrArr(t.cons as string | null),
        alternatives: pipe(t.alternatives),
        pricingCheckedAt: ms(t.pricingCheckedAt),
        contentUpdatedAt: ms(t.contentUpdatedAt),
        pricingModel: t.pricingModel, startingPrice: nil(t.startingPrice),
        pricingNote: nil(t.pricingNote), hasApi: t.hasApi,
        githubUrl: nil(t.githubUrl), docsUrl: nil(t.docsUrl),
        twitterUrl: nil(t.twitterUrl), tags: pipe(t.tags),
        features: jsonObj(t.features as string | null),
        makerEmail: nil(t.makerEmail), track: t.track,
        editorsPick: t.editorsPick, curated: t.curated, claimed: t.claimed,
        makerHandle: t.makerHandle, status: t.status, pinned: t.pinned,
        verifiedAt: ms(t.verifiedAt), categoryId: categoryId as never,
        submissionId: (t.submissionId ? subMap.get(t.submissionId) : undefined) as never,
        commentCount: commentsByTool.get(t.id) ?? 0,
        reviewCount: rc.count, ratingSumX100: rc.sumX100,
        legacyId: t.id, createdAt: msReq(t.createdAt),
      });
    }
    if (rows.length > 0) {
      toolR.push((await client.mutation(api.import.importTools, { rows })) as Receipt[]);
    }
  });
  const toolMap = toMap(toolR);
  ok(`tools: ${tools.length - toolsSkipped}${toolsSkipped ? ` (${toolsSkipped} skipped)` : ""}`);

  // 3. Children with tool refs.
  const comments = await db.comment.findMany();
  await batched(comments, async (b) => {
    const rows: any[] = [];
    for (const c of b) {
      const toolId = toolMap.get(c.toolId);
      if (!toolId) { console.error(`  ! comment ${c.id}: orphan tool, skipped`); continue; }
      rows.push({
        toolId: toolId as never, author: c.author, body: c.body,
        isMaker: c.isMaker, legacyId: c.id, createdAt: msReq(c.createdAt),
      });
    }
    if (rows.length > 0) await client.mutation(api.import.importComments, { rows });
  });
  ok(`comments: ${comments.length}`);

  const reviews = await db.review.findMany();
  await batched(reviews, async (b) => {
    const rows: any[] = [];
    for (const r of b) {
      const toolId = toolMap.get(r.toolId);
      if (!toolId) { console.error(`  ! review ${r.id}: orphan tool, skipped`); continue; }
      rows.push({
        toolId: toolId as never, userId: r.userId, author: r.author,
        ease: r.ease, power: r.power, value: r.value, body: r.body,
        status: r.status, legacyId: r.id,
        createdAt: msReq(r.createdAt), updatedAt: msReq(r.updatedAt),
      });
    }
    if (rows.length > 0) await client.mutation(api.import.importReviews, { rows });
  });
  ok(`reviews: ${reviews.length}`);

  const claims = await db.claim.findMany();
  await batched(claims, async (b) => {
    const rows: any[] = [];
    for (const c of b) {
      const toolId = toolMap.get(c.toolId);
      if (!toolId) continue;
      rows.push({
        toolId: toolId as never, userEmail: c.userEmail, userName: c.userName,
        method: c.method, token: c.token, status: c.status,
        note: nil(c.note), verifiedAt: ms(c.verifiedAt),
        legacyId: c.id, createdAt: msReq(c.createdAt),
      });
    }
    if (rows.length > 0) await client.mutation(api.import.importClaims, { rows });
  });
  ok(`claims: ${claims.length}`);

  const items = await db.collectionItem.findMany();
  await batched(items, async (b) => {
    const rows: any[] = [];
    for (const i of b) {
      const collectionId = colMap.get(i.collectionId);
      const toolId = toolMap.get(i.toolId);
      if (!collectionId || !toolId) {
        console.error(`  ! collectionItem ${i.id}: orphan ref, skipped`); continue;
      }
      rows.push({
        collectionId: collectionId as never, toolId: toolId as never,
        position: i.position, legacyId: i.id, createdAt: msReq(i.createdAt),
      });
    }
    if (rows.length > 0) await client.mutation(api.import.importCollectionItems, { rows });
  });
  ok(`collectionItems: ${items.length}`);

  // 4. Forum children.
  const replies = await db.forumReply.findMany();
  await batched(replies, async (b) => {
    const rows: any[] = [];
    for (const r of b) {
      const threadId = threadMap.get(r.threadId);
      if (!threadId) { console.error(`  ! reply ${r.id}: orphan thread, skipped`); continue; }
      rows.push({
        threadId: threadId as never, author: r.author,
        authorId: nil(r.authorId), body: r.body, hidden: r.hidden,
        legacyId: r.id, createdAt: msReq(r.createdAt),
      });
    }
    if (rows.length > 0) await client.mutation(api.import.importForumReplies, { rows });
  });
  ok(`forumReplies: ${replies.length}`);

  const votes = await db.forumThreadVote.findMany();
  await batched(votes, async (b) => {
    const rows: any[] = [];
    for (const v of b) {
      const threadId = threadMap.get(v.threadId);
      if (!threadId) continue;
      rows.push({ threadId: threadId as never, voterKey: v.voterKey });
    }
    if (rows.length > 0) await client.mutation(api.import.importForumThreadVotes, { rows });
  });
  ok(`forumThreadVotes: ${votes.length}`);

  // 5. Ref-free tables.
  const posts = await db.post.findMany();
  await batched(posts, async (b) => {
    await client.mutation(api.import.importPosts, {
      rows: b.map((p) => ({
        slug: p.slug, title: p.title, excerpt: p.excerpt, body: p.body,
        coverEmoji: p.coverEmoji, coverGradient: p.coverGradient,
        coverUrl: nil(p.coverUrl), category: p.category,
        tags: pipe(p.tags), status: p.status, author: p.author,
        readingMinutes: p.readingMinutes, views: p.views,
        seoTitle: nil(p.seoTitle), seoDescription: nil(p.seoDescription),
        keywords: nil(p.keywords), publishedAt: ms(p.publishedAt),
        legacyId: p.id, createdAt: msReq(p.createdAt),
        updatedAt: msReq(p.updatedAt),
      })),
    });
  });
  ok(`posts: ${posts.length}`);

  const settings = await db.siteSetting.findMany();
  await batched(settings, async (b) => {
    await client.mutation(api.import.importSiteSettings, {
      rows: b.map((s) => ({
        key: s.key,
        value: s.value,
        updatedAt: msReq(s.updatedAt),
      })),
    });
  });
  ok(`siteSettings: ${settings.length}`);

  const logs = await db.auditLog.findMany();
  await batched(logs, async (b) => {
    await client.mutation(api.import.importAuditLogs, {
      rows: b.map((l) => ({
        action: l.action, entity: l.entity, entityId: l.entityId,
        meta: l.meta, actor: undefined, legacyId: l.id,
        createdAt: msReq(l.createdAt),
      })),
    });
  });
  ok(`auditLogs: ${logs.length}`);

  const follows = await db.follow.findMany();
  await batched(follows, async (b) => {
    await client.mutation(api.import.importFollows, {
      rows: b.map((f) => ({
        userEmail: f.userEmail, targetType: f.targetType,
        targetId: f.targetId, targetLabel: f.targetLabel,
        createdAt: msReq(f.createdAt),
      })),
    });
  });
  ok(`follows: ${follows.length}`);

  const comps = await db.comparison.findMany();
  await batched(comps, async (b) => {
    await client.mutation(api.import.importComparisons, {
      rows: b.map((c) => ({
        aSlug: c.aSlug, bSlug: c.bSlug, views: c.views,
        createdAt: msReq(c.createdAt),
      })),
    });
  });
  ok(`comparisons: ${comps.length}`);

  const reports = await db.report.findMany();
  await batched(reports, async (b) => {
    await client.mutation(api.import.importReports, {
      rows: b.map((r) => ({
        reporterEmail: nil(r.reporterEmail),
        reporterKey: nil(r.reporterKey), targetType: r.targetType,
        targetId: r.targetId, targetLabel: r.targetLabel,
        reason: r.reason, details: nil(r.details), status: r.status,
        resolutionNote: nil(r.resolutionNote),
        resolvedAt: ms(r.resolvedAt), legacyId: r.id,
        createdAt: msReq(r.createdAt),
      })),
    });
  });
  ok(`reports: ${reports.length}`);

  const bookmarks = await db.bookmark.findMany();
  await batched(bookmarks, async (b) => {
    await client.mutation(api.import.importBookmarks, {
      rows: b.map((x) => ({
        ownerKey: x.ownerKey, targetType: x.targetType,
        targetId: x.targetId, targetLabel: x.targetLabel,
        targetHref: x.targetHref, legacyId: x.id,
        createdAt: msReq(x.createdAt),
      })),
    });
  });
  ok(`bookmarks: ${bookmarks.length}`);

  const campaigns = await db.adCampaign.findMany();
  await batched(campaigns, async (b) => {
    await client.mutation(api.import.importAdCampaigns, {
      rows: b.map((a) => ({
        name: a.name, advertiser: a.advertiser, placement: a.placement,
        status: a.status, headline: a.headline, body: a.body,
        clickUrl: a.clickUrl, emoji: a.emoji, gradient: a.gradient,
        targetCategory: nil(a.targetCategory), weight: a.weight,
        startsAt: ms(a.startsAt), endsAt: ms(a.endsAt),
        totalBudgetCents: a.totalBudgetCents,
        dailyBudgetCents: a.dailyBudgetCents,
        impressions: a.impressions, clicks: a.clicks,
        viewableImpressions: a.viewableImpressions,
        legacyId: a.id, createdAt: msReq(a.createdAt),
        updatedAt: msReq(a.updatedAt),
      })),
    });
  });
  ok(`adCampaigns: ${campaigns.length}`);

  const serveStats = await db.adServeStat.findMany();
  await batched(serveStats, async (b) => {
    await client.mutation(api.import.importAdServeStats, {
      rows: b.map((s) => ({
        placement: s.placement, day: s.day, served: s.served,
        house: s.house, unfilled: s.unfilled,
        createdAt: msReq(s.createdAt), updatedAt: msReq(s.updatedAt),
      })),
    });
  });
  ok(`adServeStats: ${serveStats.length}`);

  const pageViews = await db.pageViewDaily.findMany();
  await batched(pageViews, async (b) => {
    await client.mutation(api.import.importPageViews, {
      rows: b.map((p) => ({
        path: p.path, day: p.day, views: p.views,
        updatedAt: msReq(p.updatedAt),
      })),
    });
  });
  ok(`pageViewDaily: ${pageViews.length}`);

  const mediaRows = await db.media.findMany();
  const { existsSync } = await import("node:fs");
  let mediaMissing = 0;
  await batched(mediaRows, async (b) => {
    await client.mutation(api.import.importMedia, {
      rows: b.map((m) => {
        if (m.storedName && !existsSync(new URL(`../uploads/${m.storedName}`, import.meta.url))) {
          mediaMissing += 1;
        }
        return {
          kind: m.kind, mimeType: m.mimeType, size: m.size,
          originalName: m.originalName, storedName: nil(m.storedName),
          width: nil(m.width), height: nil(m.height),
          purpose: m.purpose, ownerKey: m.ownerKey,
          legacyId: m.id, createdAt: msReq(m.createdAt),
        };
      }),
    });
  });
  ok(`media: ${mediaRows.length}${mediaMissing ? ` (${mediaMissing} files missing from uploads/ — storage upload deferred to §3.6)` : ""}`);

  const integrations = await db.integration.findMany();
  await batched(integrations, async (b) => {
    await client.mutation(api.import.importIntegrations, {
      rows: b.map((g) => ({
        key: g.key, name: g.name, category: g.category,
        enabled: g.enabled, configJson: g.configJson, notes: g.notes,
        legacyId: g.id, createdAt: msReq(g.createdAt),
        updatedAt: msReq(g.updatedAt),
      })),
    });
  });
  ok(`integrations: ${integrations.length}`);

  // ── Verification ──
  console.log("→ Verifying…");
  const expected: Record<string, number> = {
    categories: cats.length, tools: tools.length - toolsSkipped,
    submissions: subs.length, comments: comments.length, posts: posts.length,
    siteSettings: settings.length, auditLogs: logs.length, users: users.length,
    reviews: reviews.length, claims: claims.length, collections: cols.length,
    collectionItems: items.length, follows: follows.length,
    comparisons: comps.length, forumThreads: threads.length,
    forumReplies: replies.length, forumThreadVotes: votes.length,
    reports: reports.length, bookmarks: bookmarks.length,
    adCampaigns: campaigns.length, adServeStats: serveStats.length,
    pageViewDaily: pageViews.length, media: mediaRows.length,
    integrations: integrations.length,
  };
  const actual = (await client.query(api.import.stats, {})) as Record<string, number>;
  for (const [table, want] of Object.entries(expected)) {
    const got = actual[table] ?? -1;
    if (got !== want) fail(`${table}: want ${want}, got ${got}`);
    else ok(`${table}: ${got}`);
  }

  // Slug spot-checks across entity types.
  const slugChecks: { table: "tools" | "posts" | "categories" | "forumThreads"; slug: string }[] = [
    ...tools.slice(0, 3).map((t) => ({ table: "tools" as const, slug: t.slug })),
    ...posts.slice(0, 2).map((p) => ({ table: "posts" as const, slug: p.slug })),
    ...cats.slice(0, 2).map((c) => ({ table: "categories" as const, slug: c.slug })),
    ...threads.slice(0, 2).map((t) => ({ table: "forumThreads" as const, slug: t.slug })),
  ];
  for (const { table, slug } of slugChecks) {
    const rows =
      table === "tools" ? tools :
      table === "posts" ? posts :
      table === "categories" ? cats : threads;
    const src = rows.find((r) => r.slug === slug);
    const doc = (await client.query(api.import.byLegacy, {
      table, legacyId: src!.id,
    })) as { slug?: string } | null;
    if (!doc || doc.slug !== slug) fail(`${table}/${slug}: slug mismatch`);
    else ok(`${table}/${slug} resolves`);
  }

  // 20-doc deep-compare (name/title + key scalars).
  const pool: { table: "tools" | "posts" | "categories" | "forumThreads"; id: string; want: Record<string, unknown> }[] = [
    ...tools.slice(0, 8).map((t) => ({
      table: "tools" as const, id: t.id,
      want: { slug: t.slug, name: t.name, pricingModel: t.pricingModel, status: t.status },
    })),
    ...posts.slice(0, 4).map((p) => ({
      table: "posts" as const, id: p.id,
      want: { slug: p.slug, title: p.title, status: p.status },
    })),
    ...cats.slice(0, 4).map((c) => ({
      table: "categories" as const, id: c.id,
      want: { slug: c.slug, name: c.name },
    })),
    ...threads.slice(0, 4).map((t) => ({
      table: "forumThreads" as const, id: t.id,
      want: { slug: t.slug, title: t.title, topic: t.topic },
    })),
  ].slice(0, 20);
  for (const { table, id, want } of pool) {
    const doc = (await client.query(api.import.byLegacy, { table, legacyId: id })) as Record<string, unknown> | null;
    if (!doc) { fail(`${table}:${id.slice(0, 8)}… missing`); continue; }
    const bad = Object.entries(want).filter(([k, v]) => doc[k] !== v);
    if (bad.length > 0) fail(`${table}:${id.slice(0, 8)}… field mismatch ${JSON.stringify(bad)}`);
  }
  if (failures === 0) ok(`deep-compare: ${pool.length}/${pool.length} docs match`);

  // Counter checks on the first two commented tools.
  for (const g of commentGroups.slice(0, 2)) {
    const src = tools.find((t) => t.id === g.toolId);
    const doc = (await client.query(api.import.byLegacy, {
      table: "tools", legacyId: g.toolId,
    })) as { slug?: string; commentCount?: number } | null;
    if (!doc || doc.commentCount !== g._count._all) {
      fail(`counter ${src?.slug}: want comments=${g._count._all}, got ${doc?.commentCount}`);
    } else ok(`counter ${src?.slug}: comments=${doc.commentCount}`);
  }

  await db.$disconnect();
  if (failures > 0) {
    console.error(`✖ IMPORT FAILED with ${failures} mismatch(es)`);
    process.exit(1);
  }
  console.log("✔ IMPORT COMPLETE — all counts, slugs, spot-checks and counters match");
}

main().catch(async (e) => {
  console.error("Import crashed:", e);
  try { await db.$disconnect(); } catch { /* noop */ }
  process.exit(1);
});
