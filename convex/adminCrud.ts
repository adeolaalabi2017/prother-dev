/**
 * Convex admin CRUD (Phase 4 step 6).
 *
 * TRUST MODEL: editor-key auth is enforced route-side (guard()) before any
 * call here — same as community.ts/submissions.ts. Secrets (integration
 * configJson) are accepted whole-object and NEVER returned verbatim; reads
 * apply the same masking as lib/integrations.ts.
 *
 * DUAL-WRITE CONTRACT: routes generate ids/timestamps once and pass them to
 * both stores (tools/categories/posts/campaigns carry Prisma cuids as
 * legacyId; integrations and settings are key-addressed so no id sharing
 * is needed). Reads served from Convex when flagged; Prisma stays the
 * rollback source until Phase 5.
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { isoFromMs } from "./shared";
import { mapCampaign } from "./ads";

function docId<T extends { legacyId?: string; _id: string }>(d: T): string {
  return d.legacyId ?? d._id;
}

function ciContains(haystack: string | null | undefined, needle: string): boolean {
  return (haystack ?? "").toLowerCase().includes(needle.toLowerCase());
}

// ── Tools table (GET /api/admin/tools) ──
// (Already covered by queries in convex/admin.ts → toolsTable.)

// ── Tool create / patch / remove ──

const toolEditorial = v.object({
  longDescription: v.optional(v.union(v.string(), v.null())),
  useCases: v.optional(v.array(v.object({ title: v.string(), body: v.string() }))),
  pros: v.optional(v.array(v.string())),
  cons: v.optional(v.array(v.string())),
  alternatives: v.optional(v.array(v.string())),
  pricingChecked: v.optional(v.boolean()),
});

function applyEditorial(
  current: {
    longDescription?: string;
    useCases: { title: string; body: string }[];
    pros: string[];
    cons: string[];
    alternatives: string[];
    pricingCheckedAt?: number;
    contentUpdatedAt?: number;
  },
  patch: {
    longDescription?: string | null;
    useCases?: { title: string; body: string }[];
    pros?: string[];
    cons?: string[];
    alternatives?: string[];
    pricingChecked?: boolean;
  },
  nowMs: number,
): boolean {
  let touched = false;
  if (patch.longDescription !== undefined) {
    const t = (patch.longDescription ?? "").trim();
    current.longDescription = t.length > 0 ? t : undefined;
    touched = true;
  }
  if (patch.useCases !== undefined) {
    current.useCases = patch.useCases;
    touched = true;
  }
  if (patch.pros !== undefined) {
    current.pros = patch.pros;
    touched = true;
  }
  if (patch.cons !== undefined) {
    current.cons = patch.cons;
    touched = true;
  }
  if (patch.alternatives !== undefined) {
    current.alternatives = patch.alternatives;
    touched = true;
  }
  if (patch.pricingChecked !== undefined) {
    current.pricingCheckedAt = patch.pricingChecked ? nowMs : undefined;
    touched = true;
  }
  if (touched) current.contentUpdatedAt = nowMs;
  return touched;
}

export const toolCreate = mutation({
  args: {
    id: v.string(),
    slug: v.string(),
    name: v.string(),
    tagline: v.string(),
    description: v.optional(v.string()),
    websiteUrl: v.string(),
    categoryLegacyId: v.string(),
    pricingModel: v.string(),
    startingPrice: v.optional(v.string()),
    pricingNote: v.optional(v.string()),
    hasApi: v.boolean(),
    logoEmoji: v.string(),
    logoGradient: v.string(),
    tagsPipe: v.string(),
    makerHandle: v.string(),
    status: v.string(),
    editorsPick: v.boolean(),
    curated: v.boolean(),
    logoUrl: v.optional(v.union(v.string(), v.null())),
    screenshotUrls: v.optional(v.array(v.string())),
    editorial: v.optional(toolEditorial),
    features: v.optional(v.record(v.string(), v.string())),
    createdAt: v.number(),
  },
  handler: async (ctx, a) => {
    const [tools, categories] = await Promise.all([
      ctx.db.query("tools").collect(),
      ctx.db.query("categories").collect(),
    ]);
    if (tools.some((t) => t.slug === a.slug)) throw new Error("slug_taken");
    const cat = categories.find((c) => docId(c) === a.categoryLegacyId);
    if (!cat) throw new Error("category_not_found");
    const nowMs = a.createdAt;
    const doc: {
      longDescription?: string;
      useCases: { title: string; body: string }[];
      pros: string[];
      cons: string[];
      alternatives: string[];
      pricingCheckedAt?: number;
      contentUpdatedAt?: number;
    } = { useCases: [], pros: [], cons: [], alternatives: [] };
    if (a.editorial) {
      applyEditorial(doc, a.editorial, nowMs);
    }
    const id = await ctx.db.insert("tools", {
      slug: a.slug,
      name: a.name,
      tagline: a.tagline,
      description: a.description,
      websiteUrl: a.websiteUrl,
      logoEmoji: a.logoEmoji,
      logoGradient: a.logoGradient,
      logoUrl: a.logoUrl ?? undefined,
      screenshotUrls: a.screenshotUrls ?? [],
      longDescription: doc.longDescription,
      useCases: doc.useCases,
      pros: doc.pros,
      cons: doc.cons,
      alternatives: doc.alternatives,
      pricingCheckedAt: doc.pricingCheckedAt,
      contentUpdatedAt: doc.contentUpdatedAt,
      pricingModel: a.pricingModel,
      startingPrice: a.startingPrice,
      pricingNote: a.pricingNote,
      hasApi: a.hasApi,
      tags: a.tagsPipe.split("|").map((t) => t.trim()).filter(Boolean),
      features: a.features ?? {},
      track: "editor_seed",
      editorsPick: a.editorsPick,
      curated: a.curated,
      claimed: false,
      makerHandle: a.makerHandle,
      status: a.status,
      pinned: 0,
      categoryId: cat._id,
      commentCount: 0,
      reviewCount: 0,
      ratingSumX100: 0,
      legacyId: a.id,
      createdAt: a.createdAt,
    });
    const t = (await ctx.db.get(id))!;
    return { id: docId(t), slug: t.slug };
  },
});

export const toolPatch = mutation({
  args: {
    toolLegacyId: v.string(),
    data: v.object({
      name: v.optional(v.string()),
      tagline: v.optional(v.string()),
      description: v.optional(v.union(v.string(), v.null())),
      websiteUrl: v.optional(v.string()),
      logoEmoji: v.optional(v.string()),
      logoGradient: v.optional(v.string()),
      pricingModel: v.optional(v.string()),
      startingPrice: v.optional(v.union(v.string(), v.null())),
      pricingNote: v.optional(v.union(v.string(), v.null())),
      hasApi: v.optional(v.boolean()),
      githubUrl: v.optional(v.union(v.string(), v.null())),
      docsUrl: v.optional(v.union(v.string(), v.null())),
      twitterUrl: v.optional(v.union(v.string(), v.null())),
      tagsPipe: v.optional(v.string()),
      status: v.optional(v.string()),
      pinned: v.optional(v.number()),
      editorsPick: v.optional(v.boolean()),
      curated: v.optional(v.boolean()),
      claimed: v.optional(v.boolean()),
      makerHandle: v.optional(v.string()),
      categoryLegacyId: v.optional(v.string()),
      verifiedAt: v.optional(v.number()),
    }),
    features: v.optional(v.record(v.string(), v.string())),
    logoUrl: v.optional(v.union(v.string(), v.null())),
    screenshotUrls: v.optional(v.array(v.string())),
    editorial: v.optional(toolEditorial),
    nowMs: v.number(),
  },
  handler: async (ctx, a) => {
    const tools = await ctx.db.query("tools").collect();
    const tool = tools.find((t) => docId(t) === a.toolLegacyId);
    if (!tool) throw new Error("not_found");
    const patch: Record<string, unknown> = {};
    const d = a.data;
    if (d.name !== undefined) patch.name = d.name;
    if (d.tagline !== undefined) patch.tagline = d.tagline;
    if (d.description !== undefined) patch.description = d.description ?? undefined;
    if (d.websiteUrl !== undefined) patch.websiteUrl = d.websiteUrl;
    if (d.logoEmoji !== undefined) patch.logoEmoji = d.logoEmoji;
    if (d.logoGradient !== undefined) patch.logoGradient = d.logoGradient;
    if (d.pricingModel !== undefined) patch.pricingModel = d.pricingModel;
    if (d.startingPrice !== undefined) patch.startingPrice = d.startingPrice ?? undefined;
    if (d.pricingNote !== undefined) patch.pricingNote = d.pricingNote ?? undefined;
    if (d.hasApi !== undefined) patch.hasApi = d.hasApi;
    if (d.githubUrl !== undefined) patch.githubUrl = d.githubUrl ?? undefined;
    if (d.docsUrl !== undefined) patch.docsUrl = d.docsUrl ?? undefined;
    if (d.twitterUrl !== undefined) patch.twitterUrl = d.twitterUrl ?? undefined;
    if (d.tagsPipe !== undefined) {
      patch.tags = d.tagsPipe.split("|").map((t) => t.trim()).filter(Boolean);
    }
    if (d.status !== undefined) patch.status = d.status;
    if (d.pinned !== undefined) patch.pinned = d.pinned;
    if (d.editorsPick !== undefined) patch.editorsPick = d.editorsPick;
    if (d.curated !== undefined) patch.curated = d.curated;
    if (d.claimed !== undefined) patch.claimed = d.claimed;
    if (d.makerHandle !== undefined) patch.makerHandle = d.makerHandle;
    if (d.verifiedAt !== undefined) patch.verifiedAt = d.verifiedAt;
    if (d.categoryLegacyId !== undefined) {
      const categories = await ctx.db.query("categories").collect();
      const cat = categories.find((c) => docId(c) === d.categoryLegacyId);
      if (!cat) throw new Error("not_found");
      patch.categoryId = cat._id;
    }
    if (a.features !== undefined) patch.features = a.features;
    if (a.logoUrl !== undefined) patch.logoUrl = a.logoUrl ?? undefined;
    if (a.screenshotUrls !== undefined) patch.screenshotUrls = a.screenshotUrls;
    if (a.editorial) {
      const current = {
        longDescription: tool.longDescription,
        useCases: tool.useCases,
        pros: tool.pros,
        cons: tool.cons,
        alternatives: tool.alternatives,
        pricingCheckedAt: tool.pricingCheckedAt,
        contentUpdatedAt: tool.contentUpdatedAt,
      };
      if (applyEditorial(current, a.editorial, a.nowMs)) {
        patch.longDescription = current.longDescription;
        patch.useCases = current.useCases;
        patch.pros = current.pros;
        patch.cons = current.cons;
        patch.alternatives = current.alternatives;
        patch.pricingCheckedAt = current.pricingCheckedAt;
        patch.contentUpdatedAt = current.contentUpdatedAt;
      }
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(tool._id, patch as never);
    }
    const fresh = (await ctx.db.get(tool._id))!;
    return { slug: fresh.slug };
  },
});

export const toolRemove = mutation({
  args: { toolLegacyId: v.string() },
  handler: async (ctx, { toolLegacyId }) => {
    const tools = await ctx.db.query("tools").collect();
    const tool = tools.find((t) => docId(t) === toolLegacyId);
    if (!tool) throw new Error("not_found");
    await ctx.db.patch(tool._id, { status: "removed" });
    return { slug: tool.slug };
  },
});

// ── Categories table + CRUD ──

export const categoriesTable = query({
  args: {},
  handler: async (ctx) => {
    const [categories, tools] = await Promise.all([
      ctx.db.query("categories").collect(),
      ctx.db.query("tools").collect(),
    ]);
    const countByCat = new Map<string, number>();
    for (const t of tools) {
      countByCat.set(t.categoryId, (countByCat.get(t.categoryId) ?? 0) + 1);
    }
    return {
      categories: [...categories]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((c) => ({
          id: docId(c),
          slug: c.slug,
          name: c.name,
          emoji: c.emoji,
          sortOrder: c.sortOrder,
          toolCount: countByCat.get(c._id) ?? 0,
          features: c.features.join("|"),
        })),
    };
  },
});

export const categoryUpsert = mutation({
  args: {
    legacyId: v.string(),
    slug: v.string(),
    name: v.string(),
    emoji: v.string(),
    sortOrder: v.optional(v.number()),
    featuresPipe: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const categories = await ctx.db.query("categories").collect();
    const axes = (a.featuresPipe ?? "")
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12);
    const byId = categories.find((c) => docId(c) === a.legacyId);
    if (byId) {
      const patch: Record<string, unknown> = {
        slug: a.slug,
        name: a.name,
        emoji: a.emoji,
      };
      if (a.sortOrder !== undefined) patch.sortOrder = a.sortOrder;
      if (a.featuresPipe !== undefined) patch.features = axes;
      await ctx.db.patch(byId._id, patch as never);
      return { id: docId(byId) };
    }
    // Create path: the route generates the shared cuid up front and always
    // resolves sortOrder (max+1); the fallback only guards direct callers.
    if (categories.some((c) => c.slug === a.slug)) throw new Error("slug_taken");
    const id = await ctx.db.insert("categories", {
      slug: a.slug,
      name: a.name,
      emoji: a.emoji,
      sortOrder: a.sortOrder ?? 0,
      features: axes,
      legacyId: a.legacyId,
    });
    const c = (await ctx.db.get(id))!;
    return { id: docId(c) };
  },
});

export const categoryDelete = mutation({
  args: { legacyId: v.string() },
  handler: async (ctx, { legacyId }) => {
    const categories = await ctx.db.query("categories").collect();
    const cat = categories.find((c) => docId(c) === legacyId);
    if (!cat) throw new Error("not_found");
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_status_category")
      .collect();
    const attached = tools.filter((t) => t.categoryId === cat._id).length;
    if (attached > 0) throw new Error(`has_tools:${attached}`);
    await ctx.db.delete(cat._id);
    return { slug: cat.slug };
  },
});

// ── Posts table + CRUD ──

export const postsTable = query({
  args: { status: v.string() },
  handler: async (ctx, { status }) => {
    const posts = await ctx.db.query("posts").collect();
    const filtered =
      status && status !== "all" ? posts.filter((p) => p.status === status) : posts;
    return {
      posts: [...filtered]
        .sort((a, b) => b.updatedAt - a.updatedAt || a._creationTime - b._creationTime)
        .map((p) => ({
          id: docId(p),
          slug: p.slug,
          title: p.title,
          excerpt: p.excerpt,
          category: p.category,
          tags: p.tags.join("|"),
          coverEmoji: p.coverEmoji,
          coverGradient: p.coverGradient,
          status: p.status,
          author: p.author,
          readingMinutes: p.readingMinutes,
          views: p.views,
          seoTitle: p.seoTitle ?? null,
          seoDescription: p.seoDescription ?? null,
          keywords: p.keywords ?? null,
          publishedAt: p.publishedAt != null ? isoFromMs(p.publishedAt) : null,
          updatedAt: isoFromMs(p.updatedAt),
          createdAt: isoFromMs(p.createdAt),
          coverUrl: p.coverUrl ?? null,
        })),
    };
  },
});

export const postCreate = mutation({
  args: {
    id: v.string(),
    slug: v.string(),
    title: v.string(),
    excerpt: v.string(),
    body: v.string(),
    category: v.string(),
    tagsPipe: v.string(),
    coverEmoji: v.string(),
    coverGradient: v.string(),
    author: v.string(),
    status: v.string(),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    keywords: v.optional(v.string()),
    coverUrl: v.optional(v.union(v.string(), v.null())),
    readingMinutes: v.number(),
    publishedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, a) => {
    const posts = await ctx.db.query("posts").collect();
    if (posts.some((p) => p.slug === a.slug)) throw new Error("slug_taken");
    const id = await ctx.db.insert("posts", {
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      body: a.body,
      coverEmoji: a.coverEmoji,
      coverGradient: a.coverGradient,
      coverUrl: a.coverUrl ?? undefined,
      category: a.category,
      tags: a.tagsPipe.split("|").map((t) => t.trim()).filter(Boolean),
      status: a.status,
      author: a.author,
      readingMinutes: a.readingMinutes,
      views: 0,
      seoTitle: a.seoTitle,
      seoDescription: a.seoDescription,
      keywords: a.keywords,
      publishedAt: a.publishedAt,
      legacyId: a.id,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    });
    const p = (await ctx.db.get(id))!;
    return { id: docId(p), slug: p.slug };
  },
});

export const postPatch = mutation({
  args: {
    postLegacyId: v.string(),
    data: v.object({
      title: v.optional(v.string()),
      slug: v.optional(v.string()),
      excerpt: v.optional(v.string()),
      body: v.optional(v.string()),
      category: v.optional(v.string()),
      tagsPipe: v.optional(v.string()),
      coverEmoji: v.optional(v.string()),
      coverGradient: v.optional(v.string()),
      author: v.optional(v.string()),
      status: v.optional(v.string()),
      seoTitle: v.optional(v.union(v.string(), v.null())),
      seoDescription: v.optional(v.union(v.string(), v.null())),
      keywords: v.optional(v.union(v.string(), v.null())),
      readingMinutes: v.optional(v.number()),
      publishedAt: v.optional(v.union(v.number(), v.null())),
      // Optional: cover-only writes (setPostCover) preserve updatedAt.
      updatedAt: v.optional(v.number()),
    }),
    coverUrl: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, a) => {
    const posts = await ctx.db.query("posts").collect();
    const post = posts.find((p) => docId(p) === a.postLegacyId);
    if (!post) throw new Error("not_found");
    const d = a.data;
    const patch: Record<string, unknown> = {};
    if (d.updatedAt !== undefined) patch.updatedAt = d.updatedAt;
    if (d.title !== undefined) patch.title = d.title;
    if (d.slug !== undefined) patch.slug = d.slug;
    if (d.excerpt !== undefined) patch.excerpt = d.excerpt;
    if (d.body !== undefined) patch.body = d.body;
    if (d.category !== undefined) patch.category = d.category;
    if (d.tagsPipe !== undefined) {
      patch.tags = d.tagsPipe.split("|").map((t) => t.trim()).filter(Boolean);
    }
    if (d.coverEmoji !== undefined) patch.coverEmoji = d.coverEmoji;
    if (d.coverGradient !== undefined) patch.coverGradient = d.coverGradient;
    if (d.author !== undefined) patch.author = d.author;
    if (d.status !== undefined) patch.status = d.status;
    if (d.seoTitle !== undefined) patch.seoTitle = d.seoTitle ?? undefined;
    if (d.seoDescription !== undefined) patch.seoDescription = d.seoDescription ?? undefined;
    if (d.keywords !== undefined) patch.keywords = d.keywords ?? undefined;
    if (d.readingMinutes !== undefined) patch.readingMinutes = d.readingMinutes;
    if (d.publishedAt !== undefined) patch.publishedAt = d.publishedAt ?? undefined;
    if (a.coverUrl !== undefined) patch.coverUrl = a.coverUrl ?? undefined;
    await ctx.db.patch(post._id, patch as never);
    const fresh = (await ctx.db.get(post._id))!;
    return { slug: fresh.slug };
  },
});

export const postDelete = mutation({
  args: { postLegacyId: v.string() },
  handler: async (ctx, { postLegacyId }) => {
    const posts = await ctx.db.query("posts").collect();
    const post = posts.find((p) => docId(p) === postLegacyId);
    if (!post) throw new Error("not_found");
    await ctx.db.delete(post._id);
    return { slug: post.slug };
  },
});

// ── Users table + moderation ──

export const usersTable = query({
  args: { q: v.string(), status: v.string(), role: v.string() },
  handler: async (ctx, { q, status, role }) => {
    const needle = q.trim().toLowerCase();
    const [users, threads, replies, reviews, bookmarks, reports] =
      await Promise.all([
        ctx.db.query("users").collect(),
        ctx.db.query("forumThreads").collect(),
        ctx.db.query("forumReplies").collect(),
        ctx.db.query("reviews").collect(),
        ctx.db.query("bookmarks").collect(),
        ctx.db.query("reports").collect(),
      ]);
    const matching = users.filter((u) => {
      if (
        needle &&
        !(
          ciContains(u.name, needle) ||
          ciContains(u.email, needle) ||
          ciContains(u.handle, needle)
        )
      )
        return false;
      if (status && u.status !== status) return false;
      if (role && u.role !== role) return false;
      return true;
    });
    const countBy = (rows: { [k: string]: unknown }[], key: string, id: string) =>
      rows.filter((r) => (r[key] as string) === id).length;
    const lastActivity = new Map<string, number>();
    for (const t of threads) {
      if (t.authorId) lastActivity.set(t.authorId, Math.max(lastActivity.get(t.authorId) ?? 0, t.createdAt));
    }
    for (const r of replies) {
      if (r.authorId) lastActivity.set(r.authorId, Math.max(lastActivity.get(r.authorId) ?? 0, r.createdAt));
    }
    const rows = [...matching]
      // Deterministic tiebreak mirrors the Prisma ORDER BY (createdAt DESC,
      // id ASC) — SQLite leaves ties in planner order.
      .sort(
        (a, b) =>
          b.createdAt - a.createdAt ||
          (docId(a) < docId(b) ? -1 : docId(a) > docId(b) ? 1 : 0),
      )
      .slice(0, 300)
      .map((u) => ({
        id: docId(u),
        name: u.name ?? null,
        email: u.email ?? null,
        handle: u.handle ?? null,
        image: u.image ?? null,
        role: ["member", "moderator", "admin"].includes(u.role) ? u.role : "member",
        status: u.status === "banned" ? "banned" : "active",
        createdAt: isoFromMs(u.createdAt),
        threads: countBy(threads, "authorId", u.legacyId ?? u._id),
        replies: countBy(replies, "authorId", u.legacyId ?? u._id),
        reviews: reviews.filter((r) => r.userId === (u.legacyId ?? u._id)).length,
        // Mirrors the raw SQL exactly: 'user:' concatenated with the STORED
        // email (no lowercasing — a NULL/cased email simply matches nothing).
        bookmarks: bookmarks.filter(
          (b) => b.ownerKey === `user:${u.email ?? ""}`,
        ).length,
        reportsFiled: reports.filter((r) => r.reporterEmail === u.email).length,
        lastActivityAt: (() => {
          const at = lastActivity.get(u.legacyId ?? u._id);
          return at ? isoFromMs(at) : null;
        })(),
      }));
    const stats = { total: users.length, banned: 0, moderators: 0, admins: 0 };
    for (const u of users) {
      if (u.status === "banned") stats.banned += 1;
      if (u.role === "moderator") stats.moderators += 1;
      if (u.role === "admin") stats.admins += 1;
    }
    return { users: rows, stats };
  },
});

export const userModerate = mutation({
  args: {
    userLegacyId: v.string(),
    role: v.optional(v.string()),
    status: v.optional(v.string()),
    image: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, a) => {
    const users = await ctx.db.query("users").collect();
    const user = users.find((u) => docId(u) === a.userLegacyId);
    if (!user) throw new Error("not_found");
    const patch: Record<string, unknown> = {};
    if (a.role !== undefined) patch.role = a.role;
    if (a.status !== undefined) patch.status = a.status;
    if (a.image !== undefined) patch.image = a.image ?? undefined;
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(user._id, patch as never);
    }
    return { ok: true as const };
  },
});

// ── Reports table + resolve ──

function maskReporter(email?: string, key?: string): string {
  if (email) return email;
  if (!key) return "anonymous";
  return key.length > 10 ? `${key.slice(0, 8)}…` : key;
}

export const reportsTable = query({
  args: { status: v.string() },
  handler: async (ctx, { status }) => {
    const where = status === "open" || status === "resolved" || status === "dismissed" ? status : "";
    const [reports, threads, replies, tools, posts] = await Promise.all([
      ctx.db.query("reports").collect(),
      ctx.db.query("forumThreads").collect(),
      ctx.db.query("forumReplies").collect(),
      ctx.db.query("tools").collect(),
      ctx.db.query("posts").collect(),
    ]);
    const byLegacy = new Map<string, { slug?: string; hidden?: boolean; href?: string }>();
    for (const t of threads) {
      byLegacy.set(docId(t), { slug: t.slug, hidden: t.hidden, href: `/forums/${t.slug}` });
    }
    for (const r of replies) {
      const parent = threads.find((t) => t._id === r.threadId);
      byLegacy.set(docId(r), {
        hidden: r.hidden,
        href: parent ? `/forums/${parent.slug}` : "",
      });
    }
    for (const t of tools) {
      byLegacy.set(docId(t), {
        slug: t.slug,
        hidden: t.status === "removed",
        href: `/?tool=${t.slug}`,
      });
    }
    for (const p of posts) {
      byLegacy.set(docId(p), {
        slug: p.slug,
        hidden: p.status !== "published",
        href: `/?post=${p.slug}`,
      });
    }
    const rows = reports
      .filter((r) => !where || r.status === where)
      .sort(
        (a, b) =>
          (a.status === "open" ? 0 : 1) - (b.status === "open" ? 0 : 1) ||
          b.createdAt - a.createdAt ||
          a._creationTime - b._creationTime,
      )
      .slice(0, 300)
      .map((r) => {
        const target = byLegacy.get(r.targetId);
        return {
          id: docId(r),
          targetType: ["thread", "reply", "tool", "post", "review"].includes(r.targetType)
            ? r.targetType
            : "other",
          targetId: r.targetId,
          targetLabel: r.targetLabel || r.targetId,
          targetHref: target?.href ?? "",
          targetHidden: target?.hidden ?? false,
          reason: r.reason,
          details: r.details ?? null,
          status: r.status === "resolved" || r.status === "dismissed" ? r.status : "open",
          reporter: maskReporter(r.reporterEmail, r.reporterKey),
          resolutionNote: r.resolutionNote ?? null,
          createdAt: isoFromMs(r.createdAt),
          resolvedAt: r.resolvedAt != null ? isoFromMs(r.resolvedAt) : null,
        };
      });
    const counts = { open: 0, resolved: 0, dismissed: 0 };
    for (const r of reports) {
      if (r.status === "open") counts.open += 1;
      else if (r.status === "resolved") counts.resolved += 1;
      else if (r.status === "dismissed") counts.dismissed += 1;
    }
    return { reports: rows, counts };
  },
});

export const reportResolve = mutation({
  args: {
    reportLegacyId: v.string(),
    status: v.string(),
    note: v.optional(v.string()),
    hideTarget: v.optional(v.boolean()),
    nowMs: v.number(),
  },
  handler: async (ctx, a) => {
    const reports = await ctx.db.query("reports").collect();
    const report = reports.find((r) => docId(r) === a.reportLegacyId);
    if (!report) throw new Error("not_found");
    if (a.hideTarget) {
      if (report.targetType === "thread" || report.targetType === "reply") {
        const table = report.targetType === "thread" ? "forumThreads" : "forumReplies";
        const docs = await ctx.db.query(table).collect();
        const target = docs.find((d) => docId(d) === report.targetId);
        if (target) await ctx.db.patch(target._id, { hidden: true });
      } else if (report.targetType === "tool") {
        const docs = await ctx.db.query("tools").collect();
        const target = docs.find((d) => docId(d) === report.targetId);
        if (target) await ctx.db.patch(target._id, { status: "removed" });
      } else if (report.targetType === "post") {
        const docs = await ctx.db.query("posts").collect();
        const target = docs.find((d) => docId(d) === report.targetId);
        if (target) await ctx.db.patch(target._id, { status: "draft" });
      }
    }
    await ctx.db.patch(report._id, {
      status: a.status,
      resolutionNote: a.note,
      resolvedAt: a.nowMs,
    });
    return { targetType: report.targetType, targetId: report.targetId };
  },
});

// ── Campaigns table + CRUD (list shape reuses ads.ts mapCampaign) ──

export const campaignsTable = query({
  args: {},
  handler: async (ctx) => {
    const [campaigns, stats] = await Promise.all([
      ctx.db.query("adCampaigns").collect(),
      ctx.db.query("adServeStats").collect(),
    ]);
    void stats;
    const order = { active: 0, paused: 1, draft: 2 };
    const rows = [...campaigns]
      .sort(
        (a, b) =>
          (order[a.status as keyof typeof order] ?? 3) -
            (order[b.status as keyof typeof order] ?? 3) ||
          b.createdAt - a.createdAt ||
          a._creationTime - b._creationTime,
      )
      .slice(0, 200)
      .map(mapCampaign);
    const impressions = rows.reduce((s, c) => s + c.impressions, 0);
    const clicks = rows.reduce((s, c) => s + c.clicks, 0);
    return {
      campaigns: rows,
      stats: {
        total: rows.length,
        active: rows.filter((c) => c.status === "active").length,
        impressions,
        clicks,
        ctr: impressions > 0 ? Math.round((clicks / impressions) * 1000) / 10 : 0,
      },
    };
  },
});

export const campaignCreate = mutation({
  args: {
    id: v.string(),
    name: v.string(),
    advertiser: v.string(),
    placement: v.string(),
    headline: v.string(),
    body: v.string(),
    clickUrl: v.string(),
    emoji: v.string(),
    gradient: v.string(),
    targetCategory: v.optional(v.union(v.string(), v.null())),
    weight: v.number(),
    startsAt: v.optional(v.union(v.number(), v.null())),
    endsAt: v.optional(v.union(v.number(), v.null())),
    totalBudgetCents: v.number(),
    dailyBudgetCents: v.number(),
    status: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, a) => {
    const id = await ctx.db.insert("adCampaigns", {
      name: a.name,
      advertiser: a.advertiser,
      placement: a.placement,
      status: a.status,
      headline: a.headline,
      body: a.body,
      clickUrl: a.clickUrl,
      emoji: a.emoji,
      gradient: a.gradient,
      targetCategory: a.targetCategory ?? undefined,
      weight: a.weight,
      startsAt: a.startsAt ?? undefined,
      endsAt: a.endsAt ?? undefined,
      totalBudgetCents: a.totalBudgetCents,
      dailyBudgetCents: a.dailyBudgetCents,
      impressions: 0,
      clicks: 0,
      viewableImpressions: 0,
      legacyId: a.id,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    });
    const c = (await ctx.db.get(id))!;
    return { id: docId(c) };
  },
});

export const campaignPatch = mutation({
  args: {
    campaignLegacyId: v.string(),
    patch: v.object({
      name: v.optional(v.string()),
      advertiser: v.optional(v.string()),
      placement: v.optional(v.string()),
      status: v.optional(v.string()),
      headline: v.optional(v.string()),
      body: v.optional(v.string()),
      clickUrl: v.optional(v.string()),
      emoji: v.optional(v.string()),
      gradient: v.optional(v.string()),
      targetCategory: v.optional(v.union(v.string(), v.null())),
      weight: v.optional(v.number()),
      startsAt: v.optional(v.union(v.string(), v.null())),
      endsAt: v.optional(v.union(v.string(), v.null())),
      totalBudgetCents: v.optional(v.number()),
      dailyBudgetCents: v.optional(v.number()),
    }),
    nowMs: v.number(),
  },
  handler: async (ctx, a) => {
    const campaigns = await ctx.db.query("adCampaigns").collect();
    const campaign = campaigns.find((c) => docId(c) === a.campaignLegacyId);
    if (!campaign) throw new Error("not_found");
    const p = a.patch;
    const doc: Record<string, unknown> = { updatedAt: a.nowMs };
    if (p.name !== undefined) doc.name = p.name;
    if (p.advertiser !== undefined) doc.advertiser = p.advertiser;
    if (p.placement !== undefined) doc.placement = p.placement;
    if (p.status !== undefined) doc.status = p.status;
    if (p.headline !== undefined) doc.headline = p.headline;
    if (p.body !== undefined) doc.body = p.body;
    if (p.clickUrl !== undefined) doc.clickUrl = p.clickUrl;
    if (p.emoji !== undefined) doc.emoji = p.emoji;
    if (p.gradient !== undefined) doc.gradient = p.gradient;
    if (p.targetCategory !== undefined) doc.targetCategory = p.targetCategory ?? undefined;
    if (p.weight !== undefined) doc.weight = p.weight;
    // Route passes ISO datetime strings (z.string().datetime()); stored ms.
    if (p.startsAt !== undefined) {
      doc.startsAt = p.startsAt ? new Date(p.startsAt).getTime() : undefined;
    }
    if (p.endsAt !== undefined) {
      doc.endsAt = p.endsAt ? new Date(p.endsAt).getTime() : undefined;
    }
    if (p.totalBudgetCents !== undefined) doc.totalBudgetCents = p.totalBudgetCents;
    if (p.dailyBudgetCents !== undefined) doc.dailyBudgetCents = p.dailyBudgetCents;
    await ctx.db.patch(campaign._id, doc as never);
    return { ok: true as const };
  },
});

export const campaignDelete = mutation({
  args: { campaignLegacyId: v.string() },
  handler: async (ctx, { campaignLegacyId }) => {
    const campaigns = await ctx.db.query("adCampaigns").collect();
    const campaign = campaigns.find((c) => docId(c) === campaignLegacyId);
    if (!campaign) throw new Error("not_found");
    await ctx.db.delete(campaign._id);
    return { ok: true as const };
  },
});

// ── Integrations table + upsert/delete (masked reads, whole-state writes) ──

const SECRET_FIELD_RE = /secret|token|api[-_]?key|api[-_]?id|password|private/i;
const SECRET_SENTINEL = "__MASKED__";
const INTEGRATION_CATEGORIES = [
  "ai",
  "payment",
  "cdn",
  "storage",
  "email",
  "analytics",
  "other",
] as const;

function isSecretField(field: string): boolean {
  return SECRET_FIELD_RE.test(field);
}

function maskConfig(config: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [field, value] of Object.entries(config)) {
    if (isSecretField(field) && value) {
      out[field] = value.length > 4 ? `${SECRET_SENTINEL}:${value.slice(-4)}` : SECRET_SENTINEL;
    } else {
      out[field] = value;
    }
  }
  return out;
}

function parseConfig(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [k, val] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof val === "string" && k.trim()) out[k.trim()] = val;
    }
    return out;
  } catch {
    return {};
  }
}

export const integrationsTable = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("integrations").collect();
    return {
      integrations: [...rows]
        .sort((a, b) => a.createdAt - b.createdAt || a._creationTime - b._creationTime)
        .map((r) => ({
          id: docId(r),
          key: r.key,
          name: r.name,
          category: (INTEGRATION_CATEGORIES as readonly string[]).includes(r.category)
            ? r.category
            : "other",
          enabled: r.enabled,
          config: maskConfig(parseConfig(r.configJson)),
          notes: r.notes,
          createdAt: isoFromMs(r.createdAt),
          updatedAt: isoFromMs(r.updatedAt),
        })),
      categories: [...INTEGRATION_CATEGORIES],
    };
  },
});

/**
 * Raw stored configJson for one integration (server-only sentinel merge).
 * NEVER returned to clients — the route merges masked echoes against this
 * and writes the result back via integrationUpsert. Masked table reads
 * cannot serve the merge because secrets never leave the server.
 */
export const integrationRaw = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const rows = await ctx.db.query("integrations").collect();
    const row = rows.find((r) => r.key === key.trim().toLowerCase());
    return row ? { configJson: row.configJson } : null;
  },
});

export const integrationUpsert = mutation({
  args: {
    legacyId: v.string(),
    key: v.string(),
    name: v.string(),
    category: v.string(),
    enabled: v.boolean(),
    // Fully-merged configJson (the route merges sentinel echoes against the
    // Prisma-stored secrets first, then writes the result to both stores).
    configJson: v.string(),
    notes: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, a) => {
    const key = a.key.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(key)) throw new Error("key must be 2-41 chars");
    const rows = await ctx.db.query("integrations").collect();
    const existing = rows.find((r) => r.key === key);
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: a.name,
        category: a.category,
        enabled: a.enabled,
        configJson: a.configJson,
        notes: a.notes,
        updatedAt: a.updatedAt,
      });
      return { key };
    }
    await ctx.db.insert("integrations", {
      key,
      name: a.name,
      category: a.category,
      enabled: a.enabled,
      configJson: a.configJson,
      notes: a.notes,
      legacyId: a.legacyId,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    });
    return { key };
  },
});

export const integrationDelete = mutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const rows = await ctx.db.query("integrations").collect();
    const row = rows.find((r) => r.key === key);
    if (!row) throw new Error("not_found");
    await ctx.db.delete(row._id);
    return { ok: true as const };
  },
});

// ── Settings table + put (key-addressed; no id sharing needed) ──

export const settingsTable = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("siteSettings").collect();
    const asc = [...rows].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    return {
      settings: Object.fromEntries(asc.map((r) => [r.key, r.value])),
      updatedAt: Object.fromEntries(
        asc.map((r) => [r.key, isoFromMs(r.updatedAt ?? r._creationTime)]),
      ),
    };
  },
});

export const settingsPut = mutation({
  args: { entries: v.array(v.object({ key: v.string(), value: v.string() })) },
  handler: async (ctx, { entries }) => {
    const rows = await ctx.db.query("siteSettings").collect();
    const byKey = new Map(rows.map((r) => [r.key, r]));
    const nowMs = Date.now();
    for (const { key, value } of entries) {
      const existing = byKey.get(key);
      if (existing) {
        await ctx.db.patch(existing._id, { value, updatedAt: nowMs });
      } else {
        await ctx.db.insert("siteSettings", { key, value, updatedAt: nowMs });
      }
    }
    return { ok: true as const, updated: entries.length };
  },
});

/** Remove settings keys (admin cleanup — complements settingsPut). */
export const settingsRemove = mutation({
  args: { keys: v.array(v.string()) },
  handler: async (ctx, { keys }) => {
    const rows = await ctx.db.query("siteSettings").collect();
    const wanted = new Set(keys);
    let removed = 0;
    for (const r of rows) {
      if (wanted.has(r.key)) {
        await ctx.db.delete(r._id);
        removed++;
      }
    }
    return { ok: true as const, removed };
  },
});
