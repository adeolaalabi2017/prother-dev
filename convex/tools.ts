/**
 * Convex reads: tool directory + tool detail.
 * Shadows GET /api/tools and GET /api/tools/[slug].
 *
 * Compatibility notes (all deliberate, verified by the shadow harness):
 * - Prisma `contains` on SQLite is ASCII case-insensitive; every substring
 *   filter here lowercases both sides. Tag matching joins the array with
 *   "|" first so semantics match the pipe-string column exactly.
 * - Review aggregates are computed LIVE from published reviews (same
 *   COUNT/SUM semantics as lib/community.ts) — the denormalized counters
 *   stay a pure read optimization, never the source of truth here.
 * - Media/editorial fields are plain doc columns in Convex (they were
 *   POST-boot raw-SQL columns in SQLite) — same values, no joins.
 * - `detail` omits `standards` (static defs live Next-side in the adapter)
 *   and `viewer` (auth-dependent; shadow covers anonymous only).
 */
import { query } from "./_generated/server";
import type { GenericQueryCtx } from "convex/server";
import type { DataModel } from "./_generated/dataModel";
import { v } from "convex/values";
import {
  isoFromMs,
  matchTokens,
  relevanceScore,
  reviewAggregate,
  round1,
  tokenize,
} from "./shared";

const SORTS = v.union(
  v.literal("featured"),
  v.literal("newest"),
  v.literal("top-rated"),
  v.literal("trending"),
);

function ciContains(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function docId<T extends { legacyId?: string; _id: string }>(d: T): string {
  return d.legacyId ?? d._id;
}

type Ctx = GenericQueryCtx<DataModel>;

async function publishedReviewsByTool(ctx: Ctx, toolIds: string[]) {
  const all = await ctx.db.query("reviews").collect();
  const byTool = new Map<string, { ease: number; power: number; value: number }[]>();
  for (const r of all) {
    if (r.status !== "published" || !toolIds.includes(r.toolId)) continue;
    const list = byTool.get(r.toolId) ?? [];
    list.push({ ease: r.ease, power: r.power, value: r.value });
    byTool.set(r.toolId, list);
  }
  return byTool;
}

async function commentCounts(ctx: Ctx, toolIds: string[]) {
  const all = await ctx.db.query("comments").collect();
  const counts = new Map<string, number>();
  for (const c of all) {
    if (!toolIds.includes(c.toolId)) continue;
    counts.set(c.toolId, (counts.get(c.toolId) ?? 0) + 1);
  }
  return counts;
}

export const directory = query({
  args: {
    categorySlug: v.optional(v.string()),
    q: v.optional(v.string()),
    pricing: v.optional(v.string()),
    tag: v.optional(v.string()),
    sort: SORTS,
    page: v.number(),
    pageSize: v.number(),
  },
  handler: async (ctx, args) => {
    const { q, pricing, tag, sort, page, pageSize } = args;

    let category: {
      _id: string;
      slug: string;
      name: string;
      emoji: string;
    } | null = null;
    if (args.categorySlug) {
      const found = await ctx.db
        .query("categories")
        .withIndex("by_slug", (i) => i.eq("slug", args.categorySlug!))
        .unique();
      if (!found) return { error: "category_not_found" as const };
      category = found;
    }

    const all = await ctx.db
      .query("tools")
      .withIndex("by_status_category", (i) => i.eq("status", "live"))
      .collect();
    const categories = await ctx.db.query("categories").collect();
    const catById = new Map(categories.map((c) => [c._id, c]));

    let matching = all.filter((t) => {
      if (category && t.categoryId !== category._id) return false;
      if (pricing && t.pricingModel !== pricing) return false;
      if (tag && !ciContains(t.tags.join("|"), tag)) return false;
      if (
        q &&
        !(ciContains(t.name, q) || ciContains(t.tagline, q))
      )
        return false;
      return true;
    });

    const matchingIds = matching.map((t) => t._id);
    const [reviewsByTool, counts] = await Promise.all([
      publishedReviewsByTool(ctx, matchingIds),
      commentCounts(ctx, matchingIds),
    ]);

    if (sort === "newest") {
      matching.sort(
        (a, b) => b.createdAt - a.createdAt || a._creationTime - b._creationTime,
      );
    } else if (sort === "top-rated") {
      const avg = (id: string): number | null => {
        const list = reviewsByTool.get(id) ?? [];
        if (list.length === 0) return null;
        return (
          list.reduce((s, r) => s + (r.ease + r.power + r.value) / 3, 0) /
          list.length
        );
      };
      matching.sort((a, b) => {
        const aa = avg(a._id);
        const bb = avg(b._id);
        if (aa == null && bb == null)
          return b.createdAt - a.createdAt || a._creationTime - b._creationTime;
        if (aa == null) return 1;
        if (bb == null) return -1;
        return (
          bb - aa || b.createdAt - a.createdAt || a._creationTime - b._creationTime
        );
      });
    } else if (sort === "trending") {
      const sinceMs = Date.now() - 7 * 86_400_000;
      const [comments, reviews, items] = await Promise.all([
        ctx.db.query("comments").collect(),
        ctx.db.query("reviews").collect(),
        ctx.db.query("collectionItems").collect(),
      ]);
      const recent = new Map<string, number>();
      const bump = (id: string, w: number, at: number) => {
        if (at < sinceMs) return;
        recent.set(id, (recent.get(id) ?? 0) + w);
      };
      for (const c of comments) bump(c.toolId, 3, c.createdAt);
      for (const r of reviews)
        if (r.status === "published") bump(r.toolId, 5, r.createdAt);
      for (const i of items) bump(i.toolId, 4, i.createdAt);
      const score = (id: string, editorsPick: boolean, curated: boolean) =>
        (recent.get(id) ?? 0) +
        (editorsPick ? 2 : 0) +
        (curated ? 1 : 0) +
        ((reviewsByTool.get(id) ?? []).length * 0.5);
      matching.sort(
        (a, b) =>
          round1(score(b._id, b.editorsPick, b.curated)) -
            round1(score(a._id, a.editorsPick, a.curated)) ||
          b.createdAt - a.createdAt ||
          a._creationTime - b._creationTime,
      );
    } else {
      matching.sort(
        (a, b) =>
          Number(b.pinned) - Number(a.pinned) ||
          Number(b.editorsPick) - Number(a.editorsPick) ||
          Number(b.curated) - Number(a.curated) ||
          b.createdAt - a.createdAt ||
          a._creationTime - b._creationTime,
      );
    }

    const total = matching.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const pageTools = matching.slice((page - 1) * pageSize, page * pageSize);

    const rows = pageTools.map((t) => {
      const commentCount = counts.get(t._id) ?? 0;
      const cat = catById.get(t.categoryId)!;
      return {
        slug: t.slug,
        name: t.name,
        tagline: t.tagline,
        emoji: t.logoEmoji,
        gradient: t.logoGradient,
        pricing: {
          model: t.pricingModel,
          price: t.startingPrice ?? null,
          note: t.pricingNote ?? null,
        },
        category: { slug: cat.slug, name: cat.name, emoji: cat.emoji },
        editorsPick: t.editorsPick,
        curated: t.curated,
        badges: {
          editorsPick: t.editorsPick,
          curated: t.curated,
          unclaimed: !t.claimed,
          hasApi: t.hasApi,
          openSource: t.pricingModel === "open_source",
        },
        logoUrl: t.logoUrl ?? null,
        ...(commentCount > 0 ? { comments: commentCount } : {}),
        listedAt: isoFromMs(t.createdAt),
        reviews: { count: (reviewsByTool.get(t._id) ?? []).length },
      };
    });

    let categoryMeta: {
      slug: string;
      name: string;
      emoji: string;
      count: number;
    } | null = null;
    if (category) {
      const count = all.filter((t) => t.categoryId === category!._id).length;
      categoryMeta = {
        slug: category.slug,
        name: category.name,
        emoji: category.emoji,
        count,
      };
    }

    return { rows, total, page, pages, categoryMeta };
  },
});
export const detail = query({
  args: {
    slug: v.string(),
    viewerEmail: v.optional(v.string()),
    viewerUserId: v.optional(v.string()),
  },
  handler: async (ctx, { slug, viewerEmail, viewerUserId }) => {
    const tool = await ctx.db
      .query("tools")
      .withIndex("by_slug", (i) => i.eq("slug", slug))
      .unique();
    if (!tool) return { error: "Tool not found" as const };

    const categories = await ctx.db.query("categories").collect();
    const catById = new Map(categories.map((c) => [c._id, c]));
    const cat = catById.get(tool.categoryId)!;

    const [relatedDocs, allLive, reviews, comments, toolCount, follows, claims, collections, items] =
      await Promise.all([
        ctx.db
          .query("tools")
          .withIndex("by_status_category", (i) => i.eq("status", "live"))
          .collect()
          .then((rows) =>
            rows
              .filter(
                (t) => t.categoryId === tool.categoryId && t.slug !== tool.slug,
              )
              .sort(
                (a, b) =>
                  Number(b.editorsPick) - Number(a.editorsPick) ||
                  b.createdAt - a.createdAt ||
                  a._creationTime - b._creationTime,
              )
              .slice(0, 3),
          ),
        ctx.db
          .query("tools")
          .withIndex("by_status_category", (i) => i.eq("status", "live"))
          .collect(),
        ctx.db.query("reviews").collect(),
        ctx.db.query("comments").collect(),
        ctx.db
          .query("tools")
          .withIndex("by_status_category", (i) => i.eq("status", "live"))
          .collect()
          .then((rows) => rows.filter((t) => t.categoryId === tool.categoryId).length),
        viewerEmail != null
          ? ctx.db
              .query("follows")
              .withIndex("by_triple", (i) =>
                i
                  .eq("userEmail", viewerEmail)
                  .eq("targetType", "tool")
                  .eq("targetId", tool.slug),
              )
              .collect()
          : Promise.resolve([]),
        viewerEmail != null
          ? ctx.db.query("claims").collect().then((rows) =>
              rows
                .filter((c) => c.toolId === tool._id && c.userEmail === viewerEmail)
                .sort((a, b) => b.createdAt - a.createdAt)
                .slice(0, 1),
            )
          : Promise.resolve([]),
        viewerEmail != null
          ? ctx.db
              .query("collections")
              .withIndex("by_owner", (i) => i.eq("ownerEmail", viewerEmail))
              .collect()
          : Promise.resolve([]),
        viewerEmail != null
          ? ctx.db.query("collectionItems").collect()
          : Promise.resolve([]),
      ]);

    const published = reviews
      .filter((r) => r.toolId === tool._id && r.status === "published")
      .map((r) => ({ ease: r.ease, power: r.power, value: r.value }));
    const stats = reviewAggregate(published);

    const liveBySlug = new Map(allLive.map((t) => [t.slug, t]));
    const wanted = [...new Set(tool.alternatives)].filter(
      (s) => s && s !== tool.slug,
    );
    const alternatives = wanted
      .map((s) => liveBySlug.get(s))
      .filter((t) => t != null)
      .map((t) => ({
        slug: t!.slug,
        name: t!.name,
        tagline: t!.tagline,
        logoEmoji: t!.logoEmoji,
        logoGradient: t!.logoGradient,
        logoUrl: t!.logoUrl ?? null,
        pricingModel: t!.pricingModel,
        startingPrice: t!.startingPrice ?? null,
        editorsPick: t!.editorsPick,
      }));

    return {
      slug: tool.slug,
      name: tool.name,
      tagline: tool.tagline,
      description: tool.description ?? null,
      websiteUrl: tool.websiteUrl,
      emoji: tool.logoEmoji,
      gradient: tool.logoGradient,
      logoUrl: tool.logoUrl ?? null,
      screenshots: tool.screenshotUrls,
      longDescription: tool.longDescription ?? null,
      useCases: tool.useCases,
      pros: tool.pros,
      cons: tool.cons,
      alternatives,
      pricingCheckedAt:
        tool.pricingCheckedAt != null ? isoFromMs(tool.pricingCheckedAt) : null,
      contentUpdatedAt:
        tool.contentUpdatedAt != null ? isoFromMs(tool.contentUpdatedAt) : null,
      pricing: {
        model: tool.pricingModel,
        price: tool.startingPrice ?? null,
        note: tool.pricingNote ?? null,
      },
      category: {
        slug: cat.slug,
        name: cat.name,
        emoji: cat.emoji,
        toolCount,
      },
      maker: tool.makerHandle,
      track: tool.track === "community" ? "community" : "editor_seed",
      badges: {
        editorsPick: tool.editorsPick,
        curated: tool.curated,
        unclaimed: !tool.claimed,
        hasApi: tool.hasApi,
        openSource: tool.pricingModel === "open_source",
      },
      links: {
        github: tool.githubUrl ?? null,
        docs: tool.docsUrl ?? null,
        twitter: tool.twitterUrl ?? null,
      },
      submittedAt: isoFromMs(tool.createdAt),
      verified: tool.verifiedAt != null,
      related: relatedDocs.map((r) => ({
        slug: r.slug,
        name: r.name,
        emoji: r.logoEmoji,
        gradient: r.logoGradient,
        tagline: r.tagline,
        editorsPick: r.editorsPick,
      })),
      reviews: { count: stats.count, aggregate: stats.aggregate },
      comments: comments.filter((c) => c.toolId === tool._id).length,
      viewer: (() => {
        if (viewerEmail == null) return null;
        const myReview =
          viewerUserId != null
            ? (reviews.find(
                (r) => r.toolId === tool._id && r.userId === viewerUserId,
              ) ?? null)
            : null;
        const savedIn = collections
          .flatMap((c) => {
            const positions = items
              .filter((i) => i.collectionId === c._id && i.toolId === tool._id)
              .map((i) => i.position);
            if (c.ownerEmail !== viewerEmail || positions.length === 0) return [];
            return [{ slug: c.slug, name: c.name, position: Math.min(...positions) }];
          })
          .sort((a, b) => a.position - b.position)
          .slice(0, 50)
          .map(({ slug, name }) => ({ slug, name }));
        return {
          following: follows.length > 0,
          claim: claims[0]
            ? {
                id: claims[0].legacyId ?? claims[0]._id,
                status: claims[0].status,
                method: claims[0].method,
                token: claims[0].token,
                note: claims[0].note ?? null,
                createdAt: isoFromMs(claims[0].createdAt),
                verifiedAt:
                  claims[0].verifiedAt != null
                    ? isoFromMs(claims[0].verifiedAt)
                    : null,
              }
            : null,
          myReview: myReview
            ? {
                id: myReview.legacyId ?? myReview._id,
                ease: myReview.ease,
                power: myReview.power,
                value: myReview.value,
                body: myReview.body,
                status: myReview.status,
              }
            : null,
          savedIn,
          // Maker + identity inputs for the route's isMaker check (the
          // makerEmail itself never leaves the server).
          maker: {
            claimed: tool.claimed,
            makerEmail: tool.makerEmail ?? null,
            makerHandle: tool.makerHandle,
          },
        };
      })(),
    };
  },
});

/**
 * Full SSR bundle for /tools/[slug] (page + metadata). Shadows the page's
 * Promise.all block field-for-field: header columns, live review stats,
 * latest 10 published reviews, 3 name-mentioning threads, related rows,
 * media/editorial columns, alternatives, and the category live count.
 * Timestamps ship as ISO strings; tags as arrays (the Next adapter reshapes
 * the two Date-expected spots and the pipe-split call sites).
 */export const pageData = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const tool = await ctx.db
      .query("tools")
      .withIndex("by_slug", (i) => i.eq("slug", slug))
      .unique();
    if (!tool) return { error: "not_found" as const };

    const [categories, reviews, threads, liveTools] = await Promise.all([
      ctx.db.query("categories").collect(),
      ctx.db.query("reviews").collect(),
      ctx.db.query("forumThreads").collect(),
      ctx.db
        .query("tools")
        .withIndex("by_status_category", (i) => i.eq("status", "live"))
        .collect(),
    ]);
    const catById = new Map(categories.map((c) => [c._id, c]));
    const cat = catById.get(tool.categoryId)!;

    const published = reviews
      .filter((r) => r.toolId === tool._id && r.status === "published")
      .sort((a, b) => b.createdAt - a.createdAt || a._creationTime - b._creationTime);
    const stats = reviewAggregate(
      published.map((r) => ({ ease: r.ease, power: r.power, value: r.value })),
    );

    const nameLower = tool.name.toLowerCase();
    const mentions = threads
      .filter(
        (t) =>
          !t.hidden &&
          (t.title.toLowerCase().includes(nameLower) ||
            t.body.toLowerCase().includes(nameLower)),
      )
      .sort((a, b) => b.createdAt - a.createdAt || a._creationTime - b._creationTime)
      .slice(0, 3)
      .map((t) => ({
        slug: t.slug,
        title: t.title,
        author: t.author,
        createdAt: isoFromMs(t.createdAt),
      }));

    const related = liveTools
      .filter((t) => t.categoryId === tool.categoryId && t.slug !== tool.slug)
      .sort(
        (a, b) =>
          Number(b.editorsPick) - Number(a.editorsPick) ||
          b.createdAt - a.createdAt ||
          a._creationTime - b._creationTime,
      )
      .slice(0, 3);

    const liveBySlug = new Map(liveTools.map((t) => [t.slug, t]));
    const alternatives = [...new Set(tool.alternatives)]
      .filter((s) => s && s !== tool.slug)
      .map((s) => liveBySlug.get(s))
      .filter((t) => t != null)
      .map((t) => ({
        slug: t!.slug,
        name: t!.name,
        tagline: t!.tagline,
        logoEmoji: t!.logoEmoji,
        logoGradient: t!.logoGradient,
        logoUrl: t!.logoUrl ?? null,
        pricingModel: t!.pricingModel,
        startingPrice: t!.startingPrice ?? null,
        editorsPick: t!.editorsPick,
      }));

    return {
      tool: {
        id: tool.legacyId ?? tool._id,
        slug: tool.slug,
        status: tool.status,
        name: tool.name,
        tagline: tool.tagline,
        description: tool.description ?? null,
        websiteUrl: tool.websiteUrl,
        logoEmoji: tool.logoEmoji,
        logoGradient: tool.logoGradient,
        pricingModel: tool.pricingModel,
        startingPrice: tool.startingPrice ?? null,
        pricingNote: tool.pricingNote ?? null,
        tags: tool.tags,
        makerHandle: tool.makerHandle,
        track: tool.track,
        editorsPick: tool.editorsPick,
        curated: tool.curated,
        claimed: tool.claimed,
        hasApi: tool.hasApi,
        githubUrl: tool.githubUrl ?? null,
        docsUrl: tool.docsUrl ?? null,
        twitterUrl: tool.twitterUrl ?? null,
        categoryId: tool.categoryId,
        createdAt: isoFromMs(tool.createdAt),
        category: { slug: cat.slug, name: cat.name, emoji: cat.emoji },
      },
      stats,
      reviews: published.slice(0, 10).map((r) => ({
        id: docId(r),
        author: r.author,
        ease: r.ease,
        power: r.power,
        value: r.value,
        body: r.body,
        createdAt: isoFromMs(r.createdAt),
      })),
      threads: mentions,
      related: related.map((r) => ({
        slug: r.slug,
        name: r.name,
        logoEmoji: r.logoEmoji,
        logoGradient: r.logoGradient,
        tagline: r.tagline,
        editorsPick: r.editorsPick,
      })),
      logoUrl: tool.logoUrl ?? null,
      screenshots: tool.screenshotUrls,
      editorial: {
        longDescription: tool.longDescription ?? null,
        useCases: tool.useCases,
        pros: tool.pros,
        cons: tool.cons,
        alternativeSlugs: tool.alternatives,
        pricingCheckedAt:
          tool.pricingCheckedAt != null ? isoFromMs(tool.pricingCheckedAt) : null,
        contentUpdatedAt:
          tool.contentUpdatedAt != null ? isoFromMs(tool.contentUpdatedAt) : null,
      },
      alternatives,
      categoryToolCount: liveTools.filter((t) => t.categoryId === tool.categoryId).length,
    };
  },
});

/**
 * Homepage server sections (Phase 5): live counts per category +
 * Editor's Picks (pinned first, then newest, max 6). Mirrors
 * liveCountByCategory/getEditorsPicks in src/app/page.tsx.
 */
export const homepage = query({
  args: {},
  handler: async (ctx) => {
    const [categories, live] = await Promise.all([
      ctx.db.query("categories").collect(),
      ctx.db
        .query("tools")
        .withIndex("by_status_category", (i) => i.eq("status", "live"))
        .collect(),
    ]);
    const catById = new Map(categories.map((c) => [c._id, c]));
    const counts: { slug: string; count: number }[] = [];
    const bySlug = new Map<string, number>();
    for (const t of live) {
      const slug = catById.get(t.categoryId)?.slug;
      if (slug) bySlug.set(slug, (bySlug.get(slug) ?? 0) + 1);
    }
    for (const c of categories) {
      counts.push({ slug: c.slug, count: bySlug.get(c.slug) ?? 0 });
    }
    const picks = live
      .filter((t) => t.editorsPick)
      .sort((a, b) => b.pinned - a.pinned || b.createdAt - a.createdAt)
      .slice(0, 6)
      .map((t) => {
        const cat = catById.get(t.categoryId)!;
        return {
          slug: t.slug,
          name: t.name,
          tagline: t.tagline,
          logoEmoji: t.logoEmoji,
          logoGradient: t.logoGradient,
          pricingModel: t.pricingModel,
          category: { slug: cat.slug, name: cat.name, emoji: cat.emoji },
        };
      });
    return { counts, picks };
  },
});

/**
 * Server-rendered SERP (/tools?q= — Phase 5). Mirrors lib/search.ts
 * searchToolsForSerp exactly: token match, score*1000 + editorial ranking
 * (editorsPick*3 + curated*2 + pinned), pagination with clamped page.
 */
export const serp = query({
  args: { q: v.string(), page: v.number(), pageSize: v.number() },
  handler: async (ctx, { q, page, pageSize }) => {
    const tokens = tokenize(q);
    const [live, categories] = await Promise.all([
      ctx.db
        .query("tools")
        .withIndex("by_status_category", (i) => i.eq("status", "live"))
        .collect(),
      ctx.db.query("categories").collect(),
    ]);
    const catById = new Map(categories.map((c) => [c._id, c]));
    const scored = live
      .filter((t) =>
        matchTokens(
          [t.name, t.tagline, t.tags.join("|"), t.description ?? null],
          tokens,
        ),
      )
      .map((t) => ({
        t,
        score: relevanceScore(tokens, {
          name: t.name,
          tagline: t.tagline,
          tags: t.tags.join("|"),
          description: t.description ?? null,
        }),
        editorial:
          (t.editorsPick ? 3 : 0) + (t.curated ? 2 : 0) + (t.pinned ?? 0),
      }))
      .sort((a, b) => b.score * 1000 + b.editorial - (a.score * 1000 + a.editorial));
    const total = scored.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, page), pages);
    const rows = scored
      .slice((safePage - 1) * pageSize, safePage * pageSize)
      .map(({ t }) => {
        const cat = catById.get(t.categoryId)!;
        return {
          slug: t.slug,
          name: t.name,
          tagline: t.tagline,
          emoji: t.logoEmoji,
          gradient: t.logoGradient,
          editorsPick: t.editorsPick,
          pricingModel: t.pricingModel,
          startingPrice: t.startingPrice ?? null,
          category: { slug: cat.slug, name: cat.name, emoji: cat.emoji },
          listedAt: isoFromMs(t.createdAt),
        };
      });
    return { rows, total, page: safePage, pages };
  },
});
