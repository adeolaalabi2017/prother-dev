/**
 * Convex SEO reads (Phase 4 step 7): sitemap, RSS, OG cards, blog detail.
 * Data-pure mirrors of the Prisma selects; timestamps ship as ISO strings
 * and the routes convert back to Dates where builders demand them.
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { isoFromMs } from "./shared";

function docId<T extends { legacyId?: string; _id: string }>(d: T): string {
  return d.legacyId ?? d._id;
}

export const sitemapData = query({
  args: {},
  handler: async (ctx) => {
    const [tools, categories, posts, threads] = await Promise.all([
      ctx.db
        .query("tools")
        .withIndex("by_status_category", (i) => i.eq("status", "live"))
        .collect(),
      ctx.db.query("categories").collect(),
      ctx.db
        .query("posts")
        .withIndex("by_status", (i) => i.eq("status", "published"))
        .collect(),
      ctx.db.query("forumThreads").collect(),
    ]);
    return {
      tools: tools
        .slice(0, 5000)
        .map((t) => ({ slug: t.slug, createdAt: isoFromMs(t.createdAt) })),
      categories: categories.map((c) => ({ slug: c.slug })),
      posts: posts.slice(0, 1000).map((p) => ({
        slug: p.slug,
        updatedAt: isoFromMs(p.updatedAt),
        publishedAt: p.publishedAt != null ? isoFromMs(p.publishedAt) : null,
      })),
      threads: threads
        .filter((t) => !t.hidden)
        .sort((a, b) => b.createdAt - a.createdAt || a._creationTime - b._creationTime)
        .slice(0, 500)
        .map((t) => ({
          slug: t.slug,
          createdAt: isoFromMs(t.createdAt),
          updatedAt: isoFromMs(t.updatedAt),
        })),
    };
  },
});

export const rssPosts = query({
  args: { limit: v.number() },
  handler: async (ctx, { limit }) => {
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_status", (i) => i.eq("status", "published"))
      .collect();
    return posts
      .sort(
        (a, b) =>
          (b.publishedAt ?? -1) - (a.publishedAt ?? -1) ||
          a._creationTime - b._creationTime,
      )
      .slice(0, limit)
      .map((p) => ({
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        category: p.category,
        publishedAt: p.publishedAt != null ? isoFromMs(p.publishedAt) : null,
        updatedAt: isoFromMs(p.updatedAt),
      }));
  },
});

export const ogTool = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const tool = await ctx.db
      .query("tools")
      .withIndex("by_slug", (i) => i.eq("slug", slug))
      .unique();
    if (!tool) return null;
    const categories = await ctx.db.query("categories").collect();
    const cat = categories.find((c) => c._id === tool.categoryId)!;
    return {
      name: tool.name,
      tagline: tool.tagline,
      emoji: tool.logoEmoji,
      gradient: tool.logoGradient,
      category: { slug: cat.slug, name: cat.name, emoji: cat.emoji },
      editorsPick: tool.editorsPick,
    };
  },
});

export const ogPost = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const post = await ctx.db
      .query("posts")
      .withIndex("by_slug", (i) => i.eq("slug", slug))
      .unique();
    if (!post || post.status !== "published") return null;
    return {
      title: post.title,
      excerpt: post.excerpt,
      emoji: post.coverEmoji,
      gradient: post.coverGradient,
      category: post.category,
      readingMinutes: post.readingMinutes,
    };
  },
});

export const blogDetail = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const post = await ctx.db
      .query("posts")
      .withIndex("by_slug", (i) => i.eq("slug", slug))
      .unique();
    if (!post || post.status !== "published") {
      return { error: "Post not found" as const };
    }
    const related = (await ctx.db.query("posts").collect())
      .filter(
        (p) =>
          p.status === "published" &&
          p.category === post.category &&
          p.slug !== post.slug,
      )
      .sort(
        (a, b) =>
          (b.publishedAt ?? -1) - (a.publishedAt ?? -1) ||
          a._creationTime - b._creationTime,
      )
      .slice(0, 3)
      .map((r) => ({
        id: docId(r),
        slug: r.slug,
        title: r.title,
        coverEmoji: r.coverEmoji,
        coverGradient: r.coverGradient,
        readingMinutes: r.readingMinutes,
        category: r.category,
        coverUrl: r.coverUrl ?? null,
      }));
    return {
      post: {
        id: docId(post),
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        body: post.body,
        category: post.category,
        tags: post.tags,
        coverEmoji: post.coverEmoji,
        coverGradient: post.coverGradient,
        author: post.author,
        status: post.status,
        readingMinutes: post.readingMinutes,
        views: post.views,
        seoTitle: post.seoTitle ?? null,
        seoDescription: post.seoDescription ?? null,
        keywords: post.keywords ?? null,
        publishedAt: post.publishedAt != null ? isoFromMs(post.publishedAt) : null,
        updatedAt: isoFromMs(post.updatedAt),
        coverUrl: post.coverUrl ?? null,
      },
      related,
    };
  },
});

export const postBumpViews = mutation({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const post = await ctx.db
      .query("posts")
      .withIndex("by_slug", (i) => i.eq("slug", slug))
      .unique();
    if (!post) return { ok: false as const };
    await ctx.db.patch(post._id, { views: post.views + 1 });
    return { ok: true as const };
  },
});

/** Advertise-page pitch stats (live tools, published reviews + posts). */
export const advertiseStats = query({
  args: {},
  handler: async (ctx) => {
    const [tools, reviews, posts] = await Promise.all([
      ctx.db
        .query("tools")
        .withIndex("by_status_category", (i) => i.eq("status", "live"))
        .collect(),
      ctx.db.query("reviews").collect(),
      ctx.db
        .query("posts")
        .withIndex("by_status", (i) => i.eq("status", "published"))
        .collect(),
    ]);
    return {
      tools: tools.length,
      reviews: reviews.filter((r) => r.status === "published").length,
      posts: posts.length,
    };
  },
});

/**
 * Homepage deep-link metadata entities (Phase 5): single query for the
 * ?tool= ?post= ?category= ?collection= ?compare= unfurl branches in
 * src/app/page.tsx generateMetadata. Returns only the fields each branch
 * reads; absent entities come back null.
 */
export const metaEntities = query({
  args: {
    toolSlug: v.optional(v.string()),
    postSlug: v.optional(v.string()),
    categorySlug: v.optional(v.string()),
    collectionSlug: v.optional(v.string()),
    compareA: v.optional(v.string()),
    compareB: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const [tools, posts, categories, collections, items] = await Promise.all([
      a.toolSlug || a.compareA || a.compareB
        ? ctx.db.query("tools").collect()
        : Promise.resolve([]),
      a.postSlug
        ? ctx.db
            .query("posts")
            .withIndex("by_status", (i) => i.eq("status", "published"))
            .collect()
        : Promise.resolve([]),
      a.categorySlug
        ? ctx.db.query("categories").collect()
        : Promise.resolve([]),
      a.collectionSlug
        ? ctx.db.query("collections").collect()
        : Promise.resolve([]),
      a.collectionSlug
        ? ctx.db.query("collectionItems").collect()
        : Promise.resolve([]),
    ]);
    const toolBySlug = new Map(tools.map((t) => [t.slug, t]));
    const catById = new Map(categories.map((c) => [c._id, c]));
    const pickTool = (slug?: string) => {
      const t = slug ? toolBySlug.get(slug) : undefined;
      if (!t) return null;
      return {
        slug: t.slug,
        name: t.name,
        tagline: t.tagline,
        description: t.description ?? null,
        pricingModel: t.pricingModel,
        category: { name: catById.get(t.categoryId)?.name ?? "" },
      };
    };
    const post = a.postSlug
      ? (posts.find((p) => p.slug === a.postSlug) ?? null)
      : null;
    const category = a.categorySlug
      ? (categories.find((c) => c.slug === a.categorySlug) ?? null)
      : null;
    const collection = a.collectionSlug
      ? (collections.find((c) => c.slug === a.collectionSlug) ?? null)
      : null;
    return {
      tool: pickTool(a.toolSlug),
      post: post
        ? {
            slug: post.slug,
            title: post.title,
            excerpt: post.excerpt,
            seoTitle: post.seoTitle ?? null,
            seoDescription: post.seoDescription ?? null,
            keywords: post.keywords ?? null,
            status: post.status,
            author: post.author,
            publishedAt:
              post.publishedAt != null ? isoFromMs(post.publishedAt) : null,
          }
        : null,
      category: category
        ? {
            slug: category.slug,
            name: category.name,
            toolCount: tools.filter((t) => t.categoryId === category._id).length,
          }
        : null,
      collection: collection
        ? {
            slug: collection.slug,
            name: collection.name,
            description: collection.description,
            isPublic: collection.isPublic,
            ownerName: collection.ownerName,
            itemCount: items.filter((i) => i.collectionId === collection._id).length,
          }
        : null,
      compareA: pickTool(a.compareA),
      compareB: pickTool(a.compareB),
    };
  },
});
