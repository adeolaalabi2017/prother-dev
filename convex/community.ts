/**
 * Convex community reads + writes (Phase 4 step 3).
 *
 * TRUST MODEL (plan §3.5): mutations accept caller identity as plain args
 * (userId, email, handle, owner keys). They are called ONLY from Next.js
 * route handlers that already enforce NextAuth sessions, ban checks,
 * validation and rate limits BEFORE calling. No client component calls
 * these mutations directly until the step 7 auth bridge lands.
 *
 * DUAL-WRITE CONTRACT: routes generate the doc id (cuid) + timestamps ONCE
 * and pass them to BOTH stores, so a row carries the same id everywhere.
 * Reads served from Convex when flagged; Prisma stays the rollback source
 * until Phase 5. Toggle-style ops (vote/bookmark/follow/items/comparison)
 * are naturally atomic here (single mutation) — an improvement over the
 * read-then-write Prisma originals.
 *
 * Output ids are the Prisma cuids (legacyId) with _id fallback, matching
 * the *_Row shapes the routes serialize today.
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { asForumTopic, isoFromMs, reviewAggregate } from "./shared";

function docId<T extends { legacyId?: string; _id: string }>(d: T): string {
  return d.legacyId ?? d._id;
}

// ── Comments ──

export const commentsList = query({  args: { toolSlug: v.string() },
  handler: async (ctx, { toolSlug }) => {
    const tool = await ctx.db
      .query("tools")
      .withIndex("by_slug", (i) => i.eq("slug", toolSlug))
      .unique();
    if (!tool) return { error: "Tool not found" as const };
    const items = (
      await ctx.db
        .query("comments")
        .withIndex("by_tool_created", (i) => i.eq("toolId", tool._id))
        .collect()
    ).map((c) => ({
      id: docId(c),
      author: c.author,
      body: c.body,
      isMaker: c.isMaker,
      createdAt: isoFromMs(c.createdAt),
    }));
    return { items, count: items.length };
  },
});

/** Anti-spam-lite: seconds since the author's last comment on the tool. */
export const commentsLastAge = query({
  args: { toolSlug: v.string(), author: v.string() },
  handler: async (ctx, { toolSlug, author }) => {
    const tool = await ctx.db
      .query("tools")
      .withIndex("by_slug", (i) => i.eq("slug", toolSlug))
      .unique();
    if (!tool) return { ageSec: null };
    const mine = await ctx.db
      .query("comments")
      .withIndex("by_tool_created", (i) => i.eq("toolId", tool._id))
      .collect();
    const last = mine
      .filter((c) => c.author === author)
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    if (!last) return { ageSec: null };
    return { ageSec: Math.max(0, (Date.now() - last.createdAt) / 1000) };
  },
});

export const commentAdd = mutation({
  args: {
    id: v.string(),
    toolSlug: v.string(),
    author: v.string(),
    body: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, a) => {
    const tool = await ctx.db
      .query("tools")
      .withIndex("by_slug", (i) => i.eq("slug", a.toolSlug))
      .unique();
    if (!tool) throw new Error("tool_not_found");
    // Maker badge: author matching makerHandle (±@, case-insensitive).
    const norm = (s: string) => s.replace(/^@/, "").toLowerCase();
    const isMaker = norm(a.author) === norm(tool.makerHandle);
    const id = await ctx.db.insert("comments", {
      toolId: tool._id,
      author: a.author,
      body: a.body,
      isMaker,
      legacyId: a.id,
      createdAt: a.createdAt,
    });
    const c = (await ctx.db.get(id))!;
    return {
      id: docId(c),
      author: c.author,
      body: c.body,
      isMaker: c.isMaker,
      createdAt: isoFromMs(c.createdAt),
    };
  },
});

// ── Reviews ──

export const reviewsData = query({
  args: { toolSlug: v.string(), viewerUserId: v.optional(v.string()) },
  handler: async (ctx, { toolSlug, viewerUserId }) => {
    const tool = await ctx.db
      .query("tools")
      .withIndex("by_slug", (i) => i.eq("slug", toolSlug))
      .unique();
    if (!tool) return { error: "tool_not_found" as const };
    const all = await ctx.db.query("reviews").collect();
    const mine = all.filter((r) => r.toolId === tool._id);
    const published = mine
      .filter((r) => r.status === "published")
      .sort((a, b) => b.createdAt - a.createdAt || a._creationTime - b._creationTime);
    const stats = reviewAggregate(
      mine
        .filter((r) => r.status === "published")
        .map((r) => ({ ease: r.ease, power: r.power, value: r.value })),
    );
    const ser = (r: (typeof mine)[number]) => ({
      id: docId(r),
      userId: r.userId,
      author: r.author,
      ease: r.ease,
      power: r.power,
      value: r.value,
      body: r.body,
      status: r.status,
      createdAt: isoFromMs(r.createdAt),
    });
    const mineRow =
      viewerUserId != null
        ? (mine.find((r) => r.userId === viewerUserId) ?? null)
        : null;
    return {
      tool: {
        claimed: tool.claimed,
        makerEmail: tool.makerEmail ?? null,
        websiteUrl: tool.websiteUrl,
      },
      published: published.map(ser),
      mineRow: mineRow ? ser(mineRow) : null,
      stats,
    };
  },
});

export const reviewUpsert = mutation({
  args: {
    id: v.string(),
    toolSlug: v.string(),
    userId: v.string(),
    author: v.string(),
    ease: v.number(),
    power: v.number(),
    value: v.number(),
    body: v.string(),
    status: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, a) => {
    const tool = await ctx.db
      .query("tools")
      .withIndex("by_slug", (i) => i.eq("slug", a.toolSlug))
      .unique();
    if (!tool) throw new Error("tool_not_found");
    const existing = (
      await ctx.db
        .query("reviews")
        .withIndex("by_tool_user", (i) =>
          i.eq("toolId", tool._id).eq("userId", a.userId),
        )
        .collect()
    )[0];
    if (existing) {
      await ctx.db.patch(existing._id, {
        ease: a.ease,
        power: a.power,
        value: a.value,
        body: a.body,
        status: a.status,
        updatedAt: a.updatedAt,
      });
    } else {
      await ctx.db.insert("reviews", {
        toolId: tool._id,
        userId: a.userId,
        author: a.author,
        ease: a.ease,
        power: a.power,
        value: a.value,
        body: a.body,
        status: a.status,
        legacyId: a.id,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      });
    }
    const row = (
      await ctx.db
        .query("reviews")
        .withIndex("by_tool_user", (i) =>
          i.eq("toolId", tool._id).eq("userId", a.userId),
        )
        .collect()
    )[0]!;
    const allReviews = await ctx.db.query("reviews").collect();
    const stats = reviewAggregate(
      allReviews
        .filter((r) => r.toolId === tool._id && r.status === "published")
        .map((r) => ({ ease: r.ease, power: r.power, value: r.value })),
    );
    return {
      review: {
        id: docId(row),
        author: row.author,
        ease: row.ease,
        power: row.power,
        value: row.value,
        body: row.body,
        status: row.status,
        createdAt: isoFromMs(row.createdAt),
      },
      count: stats.count,
      aggregate: stats.aggregate,
    };
  },
});

// ── Forum writes ──

export const threadCreate = mutation({
  args: {
    id: v.string(),
    slug: v.string(),
    title: v.string(),
    body: v.string(),
    topic: v.string(),
    author: v.string(),
    authorId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, a) => {
    const taken = await ctx.db
      .query("forumThreads")
      .withIndex("by_slug", (i) => i.eq("slug", a.slug))
      .unique();
    if (taken) throw new Error("slug_taken");
    const id = await ctx.db.insert("forumThreads", {
      slug: a.slug,
      title: a.title,
      body: a.body,
      topic: a.topic,
      author: a.author,
      authorId: a.authorId,
      pinned: false,
      hidden: false,
      baseUpvotes: 0,
      replyCount: 0,
      voteCount: 0,
      legacyId: a.id,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    });
    const t = (await ctx.db.get(id))!;
    return {
      id: docId(t),
      slug: t.slug,
      title: t.title,
      body: t.body,
      topic: asForumTopic(t.topic),
      author: t.author,
      pinned: t.pinned,
      votes: t.baseUpvotes,
      voted: false,
      replyCount: 0,
      createdAt: isoFromMs(t.createdAt),
    };
  },
});

export const replyCreate = mutation({
  args: {
    id: v.string(),
    threadSlug: v.string(),
    author: v.string(),
    authorId: v.optional(v.string()),
    body: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, a) => {
    const thread = await ctx.db
      .query("forumThreads")
      .withIndex("by_slug", (i) => i.eq("slug", a.threadSlug))
      .unique();
    if (!thread) throw new Error("thread_not_found");
    const id = await ctx.db.insert("forumReplies", {
      threadId: thread._id,
      author: a.author,
      authorId: a.authorId,
      body: a.body,
      hidden: false,
      legacyId: a.id,
      createdAt: a.createdAt,
    });
    const r = (await ctx.db.get(id))!;
    return {
      id: docId(r),
      author: r.author,
      body: r.body,
      createdAt: isoFromMs(r.createdAt),
    };
  },
});

export const voteToggle = mutation({
  args: { threadSlug: v.string(), voterKey: v.string() },
  handler: async (ctx, { threadSlug, voterKey }) => {
    const thread = await ctx.db
      .query("forumThreads")
      .withIndex("by_slug", (i) => i.eq("slug", threadSlug))
      .unique();
    if (!thread) throw new Error("thread_not_found");
    const existing = (
      await ctx.db
        .query("forumThreadVotes")
        .withIndex("by_thread_voter", (i) =>
          i.eq("threadId", thread._id).eq("voterKey", voterKey),
        )
        .collect()
    )[0];
    let voted: boolean;
    if (existing) {
      await ctx.db.delete(existing._id);
      voted = false;
    } else {
      await ctx.db.insert("forumThreadVotes", {
        threadId: thread._id,
        voterKey,
      });
      voted = true;
    }
    const count = (
      await ctx.db
        .query("forumThreadVotes")
        .withIndex("by_thread_voter", (i) => i.eq("threadId", thread._id))
        .collect()
    ).length;
    const fresh = (await ctx.db.get(thread._id))!;
    return { voted, votes: fresh.baseUpvotes + count };
  },
});

export const forumThread = query({
  args: { slug: v.string(), voterKey: v.optional(v.string()) },
  handler: async (ctx, { slug, voterKey }) => {
    const thread = await ctx.db
      .query("forumThreads")
      .withIndex("by_slug", (i) => i.eq("slug", slug))
      .unique();
    if (!thread) return null;
    // Hidden threads stay addressable for the moderated-notice branch —
    // the page renders a notice, never the content.
    if (thread.hidden) return { hidden: true as const };
    const [replies, votes] = await Promise.all([
      ctx.db
        .query("forumReplies")
        .withIndex("by_thread_created", (i) => i.eq("threadId", thread._id))
        .collect(),
      ctx.db
        .query("forumThreadVotes")
        .withIndex("by_thread_voter", (i) => i.eq("threadId", thread._id))
        .collect(),
    ]);
    const visible = replies
      .filter((r) => !r.hidden)
      .sort((a, b) => a.createdAt - b.createdAt || a._creationTime - b._creationTime)
      .slice(0, 500);
    return {
      thread: {
        id: docId(thread),
        slug: thread.slug,
        title: thread.title,
        body: thread.body,
        topic: asForumTopic(thread.topic),
        author: thread.author,
        pinned: thread.pinned,
        votes: thread.baseUpvotes + votes.length,
        voted: voterKey != null && votes.some((x) => x.voterKey === voterKey),
        replyCount: visible.length,
        createdAt: isoFromMs(thread.createdAt),
        updatedAt: isoFromMs(thread.updatedAt),
      },
      replies: visible.map((r) => ({
        id: docId(r),
        author: r.author,
        body: r.body,
        createdAt: isoFromMs(r.createdAt),
      })),
      voted: voterKey != null && votes.some((x) => x.voterKey === voterKey),
    };
  },
});

// ── Bookmarks ──

export const bookmarksList = query({
  args: { ownerKey: v.string() },
  handler: async (ctx, { ownerKey }) => {
    const rows = await ctx.db
      .query("bookmarks")
      .withIndex("by_owner_created", (i) => i.eq("ownerKey", ownerKey))
      .collect();
    const items = [...rows]
      .sort((a, b) => b.createdAt - a.createdAt || a._creationTime - b._creationTime)
      .slice(0, 200)
      .map((r) => ({
        id: docId(r),
        targetType: ["tool", "thread", "post"].includes(r.targetType)
          ? r.targetType
          : "tool",
        targetId: r.targetId,
        targetLabel: r.targetLabel || r.targetId,
        targetHref: r.targetHref,
        createdAt: isoFromMs(r.createdAt),
      }));
    const [prefix] = ownerKey.split(":");
    return { items, owner: `${prefix}:…` };
  },
});

export const bookmarkToggle = mutation({
  args: {
    id: v.string(),
    ownerKey: v.string(),
    targetType: v.string(),
    targetId: v.string(),
    targetLabel: v.optional(v.string()),
    targetHref: v.optional(v.string()),
    action: v.optional(v.string()),
    createdAt: v.number(),
  },
  handler: async (ctx, a) => {
    const existing = (
      await ctx.db
        .query("bookmarks")
        .withIndex("by_triple", (i) =>
          i
            .eq("ownerKey", a.ownerKey)
            .eq("targetType", a.targetType)
            .eq("targetId", a.targetId),
        )
        .collect()
    )[0];
    const isBookmarked = Boolean(existing);
    const remove =
      a.action === "remove" || (a.action !== "add" && isBookmarked);
    if (remove) {
      if (existing) await ctx.db.delete(existing._id);
      return { bookmarked: false };
    }
    if (!isBookmarked) {
      let label = a.targetLabel ?? "";
      let href = a.targetHref ?? "";
      if (a.targetType === "tool" && (!label || !href)) {
        const t = await ctx.db
          .query("tools")
          .withIndex("by_slug", (i) => i.eq("slug", a.targetId))
          .unique();
        label = label || t?.name || "";
        href = href || (t ? `/?tool=${t.slug}` : "");
      } else if (a.targetType === "thread" && (!label || !href)) {
        const all = await ctx.db.query("forumThreads").collect();
        const t = all.find(
          (x) => docId(x) === a.targetId || x.slug === a.targetId,
        );
        label = label || t?.title || "";
        href = href || (t ? `/forums/${t.slug}` : "");
      } else if (a.targetType === "post" && (!label || !href)) {
        const p = await ctx.db
          .query("posts")
          .withIndex("by_slug", (i) => i.eq("slug", a.targetId))
          .unique();
        label = label || p?.title || "";
        href = href || (p ? `/?post=${p.slug}` : "");
      }
      await ctx.db.insert("bookmarks", {
        ownerKey: a.ownerKey,
        targetType: a.targetType,
        targetId: a.targetId,
        targetLabel: label.slice(0, 160),
        targetHref: href.slice(0, 200),
        legacyId: a.id,
        createdAt: a.createdAt,
      });
    }
    return { bookmarked: true };
  },
});

// ── Follows ──

export const followsList = query({
  args: { userEmail: v.string() },
  handler: async (ctx, { userEmail }) => {
    const rows = await ctx.db
      .query("follows")
      .withIndex("by_owner", (i) => i.eq("userEmail", userEmail))
      .collect();
    const follows = [...rows]
      .sort((a, b) => b.createdAt - a.createdAt || a._creationTime - b._creationTime)
      .slice(0, 500)
      .map((r) => ({
        id: docId(r),
        targetType: r.targetType,
        targetId: r.targetId,
        targetLabel: r.targetLabel,
        createdAt: isoFromMs(r.createdAt),
      }));
    return { follows };
  },
});

export const followToggle = mutation({
  args: {
    userEmail: v.string(),
    targetType: v.string(),
    targetId: v.string(),
    targetLabel: v.string(),
  },
  handler: async (ctx, a) => {
    const existing = (
      await ctx.db
        .query("follows")
        .withIndex("by_triple", (i) =>
          i
            .eq("userEmail", a.userEmail)
            .eq("targetType", a.targetType)
            .eq("targetId", a.targetId),
        )
        .collect()
    )[0];
    if (existing) {
      await ctx.db.delete(existing._id);
      return { following: false };
    }
    await ctx.db.insert("follows", {
      userEmail: a.userEmail,
      targetType: a.targetType,
      targetId: a.targetId,
      targetLabel: a.targetLabel,
      createdAt: Date.now(),
    });
    return { following: true };
  },
});

// ── Collections ──

type CollectionCard = {
  id: string;
  slug: string;
  name: string;
  description: string;
  isPublic: boolean;
  itemCount: number;
  covers: string[];
  ownerName?: string;
};

export const collectionsMine = query({
  args: { ownerEmail: v.optional(v.string()) },
  handler: async (ctx, { ownerEmail }) => {
    const [collections, items, tools] = await Promise.all([
      ctx.db.query("collections").collect(),
      ctx.db.query("collectionItems").collect(),
      ctx.db.query("tools").collect(),
    ]);
    const toolById = new Map(tools.map((t) => [t._id, t]));
    // Cards carry createdAt internally for the featured tiebreak, stripped
    // before return (mirrors toCard in the collections route).
    const card = (
      c: (typeof collections)[number],
    ): CollectionCard & { createdAt: string } => {
      const mine = items
        .filter((i) => i.collectionId === c._id)
        .sort((a, b) => a.position - b.position || a.createdAt - b.createdAt);
      const covers: string[] = [];
      for (const i of mine) {
        const t = toolById.get(i.toolId);
        if (t && covers.length < 3) covers.push(t.logoEmoji);
      }
      const base = {
        id: docId(c),
        slug: c.slug,
        name: c.name,
        description: c.description,
        isPublic: c.isPublic,
        itemCount: mine.length,
        covers,
        createdAt: isoFromMs(c.createdAt),
      };
      return c.isPublic ? { ...base, ownerName: c.ownerName } : base;
    };
    const strip = ({
      createdAt,
      ...rest
    }: CollectionCard & { createdAt: string }): CollectionCard => {
      void createdAt;
      return rest;
    };
    const mine =
      ownerEmail != null
        ? collections
            .filter((c) => c.ownerEmail === ownerEmail)
            .sort((a, b) => b.createdAt - a.createdAt || a._creationTime - b._creationTime)
            .slice(0, 100)
            .map(card)
            .map(strip)
        : [];
    const featured = collections
      .filter((c) => c.isPublic)
      .sort((a, b) => b.createdAt - a.createdAt || a._creationTime - b._creationTime)
      .slice(0, 24)
      .map(card)
      .sort((a, b) => b.itemCount - a.itemCount || b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6)
      .map(strip);
    return { mine, featured };
  },
});

// ── Collections: writes + detail ──

export const collectionCreate = mutation({
  args: {
    id: v.string(),
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    isPublic: v.boolean(),
    ownerEmail: v.string(),
    ownerName: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, a) => {
    const id = await ctx.db.insert("collections", {
      slug: a.slug,
      name: a.name,
      description: a.description,
      isPublic: a.isPublic,
      ownerEmail: a.ownerEmail,
      ownerName: a.ownerName,
      legacyId: a.id,
      createdAt: a.createdAt,
    });
    const c = (await ctx.db.get(id))!;
    return {
      id: docId(c),
      slug: c.slug,
      name: c.name,
      description: c.description,
      isPublic: c.isPublic,
      ownerEmail: c.ownerEmail,
      ownerName: c.ownerName,
      createdAt: isoFromMs(c.createdAt),
    };
  },
});

export const collectionUpdate = mutation({
  args: {
    slug: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, a) => {
    const c = await ctx.db
      .query("collections")
      .withIndex("by_slug", (i) => i.eq("slug", a.slug))
      .unique();
    if (!c) throw new Error("not_found");
    const patch: {
      name?: string;
      description?: string;
      isPublic?: boolean;
    } = {};
    if (a.name !== undefined) patch.name = a.name;
    if (a.description !== undefined) patch.description = a.description;
    if (a.isPublic !== undefined) patch.isPublic = a.isPublic;
    if (Object.keys(patch).length > 0) await ctx.db.patch(c._id, patch);
    const fresh = (await ctx.db.get(c._id))!;
    return {
      id: docId(fresh),
      slug: fresh.slug,
      name: fresh.name,
      description: fresh.description,
      isPublic: fresh.isPublic,
      ownerEmail: fresh.ownerEmail,
      ownerName: fresh.ownerName,
      createdAt: isoFromMs(fresh.createdAt),
    };
  },
});

export const collectionDelete = mutation({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const c = await ctx.db
      .query("collections")
      .withIndex("by_slug", (i) => i.eq("slug", slug))
      .unique();
    if (!c) throw new Error("not_found");
    const items = await ctx.db
      .query("collectionItems")
      .withIndex("by_collection", (i) => i.eq("collectionId", c._id))
      .collect();
    await Promise.all(items.map((i) => ctx.db.delete(i._id)));
    await ctx.db.delete(c._id);
    return { ok: true as const };
  },
});

export const collectionDetail = query({
  args: { slug: v.string(), viewerEmail: v.optional(v.string()) },
  handler: async (ctx, { slug, viewerEmail }) => {
    const c = await ctx.db
      .query("collections")
      .withIndex("by_slug", (i) => i.eq("slug", slug))
      .unique();
    if (!c) return { error: "not_found" as const };
    const isOwner = viewerEmail != null && c.ownerEmail === viewerEmail;
    if (!c.isPublic && !isOwner) return { error: "not_found" as const };
    const [itemRows, tools, categories] = await Promise.all([
      ctx.db
        .query("collectionItems")
        .withIndex("by_collection", (i) => i.eq("collectionId", c._id))
        .collect(),
      ctx.db.query("tools").collect(),
      ctx.db.query("categories").collect(),
    ]);
    const toolById = new Map(tools.map((t) => [t._id, t]));
    const catById = new Map(categories.map((x) => [x._id, x]));
    const items = itemRows
      .sort((a, b) => a.position - b.position || a.createdAt - b.createdAt)
      .slice(0, 200)
      .flatMap((item) => {
        const t = toolById.get(item.toolId);
        if (!t) return [];
        const cat = catById.get(t.categoryId)!;
        return [
          {
            id: docId(item),
            position: item.position,
            tool: {
              slug: t.slug,
              name: t.name,
              tagline: t.tagline,
              emoji: t.logoEmoji,
              gradient: t.logoGradient,
              pricing: { model: t.pricingModel, price: t.startingPrice ?? null },
              category: { slug: cat.slug, name: cat.name, emoji: cat.emoji },
              editorsPick: t.editorsPick,
            },
          },
        ];
      });
    return {
      collection: {
        id: docId(c),
        slug: c.slug,
        name: c.name,
        description: c.description,
        isPublic: c.isPublic,
        ownerName: c.ownerName,
        ...(isOwner ? { ownerEmail: c.ownerEmail } : {}),
        isOwner,
        createdAt: isoFromMs(c.createdAt),
        items,
      },
    };
  },
});

export const collectionItemToggle = mutation({
  args: {
    id: v.string(),
    collectionSlug: v.string(),
    toolSlug: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, a) => {
    const c = await ctx.db
      .query("collections")
      .withIndex("by_slug", (i) => i.eq("slug", a.collectionSlug))
      .unique();
    if (!c) throw new Error("not_found");
    const t = await ctx.db
      .query("tools")
      .withIndex("by_slug", (i) => i.eq("slug", a.toolSlug))
      .unique();
    if (!t) throw new Error("tool_not_found");
    const existing = (
      await ctx.db
        .query("collectionItems")
        .withIndex("by_collection_tool", (i) =>
          i.eq("collectionId", c._id).eq("toolId", t._id),
        )
        .collect()
    )[0];
    if (existing) {
      await ctx.db.delete(existing._id);
    } else {
      const count = (
        await ctx.db
          .query("collectionItems")
          .withIndex("by_collection", (i) => i.eq("collectionId", c._id))
          .collect()
      ).length;
      await ctx.db.insert("collectionItems", {
        collectionId: c._id,
        toolId: t._id,
        position: count,
        legacyId: a.id,
        createdAt: a.createdAt,
      });
    }
    const itemCount = (
      await ctx.db
        .query("collectionItems")
        .withIndex("by_collection", (i) => i.eq("collectionId", c._id))
        .collect()
    ).length;
    return { inCollection: !existing, itemCount };
  },
});

// ── Reports ──

export const reportCreate = mutation({
  args: {
    id: v.string(),
    targetType: v.string(),
    // Tool/post targets arrive as cuids (resolved route-side from slugs,
    // mirroring lib/reports.ts); thread/reply/review arrive as cuids too.
    targetId: v.string(),
    reason: v.string(),
    details: v.optional(v.string()),
    reporterEmail: v.optional(v.string()),
    reporterKey: v.optional(v.string()),
    createdAt: v.number(),
  },
  handler: async (ctx, a) => {
    // Validate the target exists and snapshot the admin-queue label.
    let label: string | null = null;
    let storedId = a.targetId;
    if (a.targetType === "thread") {
      const rows = await ctx.db.query("forumThreads").collect();
      const t = rows.find(
        (x) => docId(x) === a.targetId || x.slug === a.targetId,
      );
      label = t?.title ?? null;
      if (t) storedId = docId(t);
    } else if (a.targetType === "reply") {
      const rows = await ctx.db.query("forumReplies").collect();
      const r = rows.find((x) => docId(x) === a.targetId);
      label = r?.body?.slice(0, 80) ?? null;
      if (r) storedId = docId(r);
    } else if (a.targetType === "tool") {
      const rows = await ctx.db.query("tools").collect();
      const t = rows.find(
        (x) => docId(x) === a.targetId || x.slug === a.targetId,
      );
      if (t) {
        storedId = docId(t);
        label = t.name;
      }
    } else if (a.targetType === "post") {
      const rows = await ctx.db.query("posts").collect();
      const p = rows.find(
        (x) => docId(x) === a.targetId || x.slug === a.targetId,
      );
      if (p) {
        storedId = docId(p);
        label = p.title;
      }
    } else if (a.targetType === "review") {
      const rows = await ctx.db.query("reviews").collect();
      const r = rows.find((x) => docId(x) === a.targetId);
      label = r?.body?.slice(0, 80) ?? null;
      if (r) storedId = docId(r);
    }
    if (!label) return { ok: false as const };
    const ownerEmail = a.reporterEmail ?? null;
    const ownerKey = ownerEmail ? null : (a.reporterKey ?? null);
    const open = await ctx.db
      .query("reports")
      .withIndex("by_target", (i) =>
        i.eq("targetType", a.targetType).eq("targetId", storedId),
      )
      .collect();
    const dup = open.find(
      (r) =>
        r.status === "open" &&
        (ownerEmail != null
          ? r.reporterEmail === ownerEmail
          : r.reporterEmail == null && r.reporterKey === ownerKey),
    );
    if (dup) return { ok: true as const, already: true, id: docId(dup) };
    const id = await ctx.db.insert("reports", {
      reporterEmail: ownerEmail ?? undefined,
      reporterKey: ownerKey ?? undefined,
      targetType: a.targetType,
      targetId: storedId,
      targetLabel: label,
      reason: a.reason,
      details: a.details,
      status: "open",
      legacyId: a.id,
      createdAt: a.createdAt,
    });
    const row = (await ctx.db.get(id))!;
    return { ok: true as const, already: false, id: docId(row) };
  },
});

// ── Comparison view log + popular ──

export const compareBump = mutation({
  args: { aSlug: v.string(), bSlug: v.string() },
  handler: async (ctx, { aSlug, bSlug }) => {
    const existing = (
      await ctx.db
        .query("comparisons")
        .withIndex("by_pair", (i) => i.eq("aSlug", aSlug).eq("bSlug", bSlug))
        .collect()
    )[0];
    if (existing) {
      await ctx.db.patch(existing._id, { views: existing.views + 1 });
    } else {
      await ctx.db.insert("comparisons", {
        aSlug,
        bSlug,
        views: 1,
        createdAt: Date.now(),
      });
    }
    return { ok: true as const };
  },
});

export const compareView = query({
  args: { aSlug: v.string(), bSlug: v.string(), limit: v.number() },
  handler: async (ctx, { aSlug, bSlug, limit }) => {
    const [toolA, toolB, comparisons, comments, reviews, categories, allTools] =
      await Promise.all([
        ctx.db
          .query("tools")
          .withIndex("by_slug", (i) => i.eq("slug", aSlug))
          .unique(),
        ctx.db
          .query("tools")
          .withIndex("by_slug", (i) => i.eq("slug", bSlug))
          .unique(),
        ctx.db.query("comparisons").collect(),
        ctx.db.query("comments").collect(),
        ctx.db.query("reviews").collect(),
        ctx.db.query("categories").collect(),
        ctx.db.query("tools").collect(),
      ]);
    const toolBySlugLocal = (slug: string) =>
      allTools.find((t) => t.slug === slug) ?? null;
    const popular = [...comparisons]
      .sort((a, b) => b.views - a.views || b.createdAt - a.createdAt)
      .slice(0, limit)
      .flatMap((c) => {
        const ta = toolBySlugLocal(c.aSlug);
        const tb = toolBySlugLocal(c.bSlug);
        if (!ta || !tb) return [];
        return [
          {
            aSlug: c.aSlug,
            bSlug: c.bSlug,
            views: c.views,
            aName: ta.name,
            aEmoji: ta.logoEmoji,
            bName: tb.name,
            bEmoji: tb.logoEmoji,
          },
        ];
      });
    if (!toolA || !toolB) return { error: "tool_not_found" as const, popular };
    const row = (t: NonNullable<typeof toolA>) => {
      const cat = categories.find((c) => c._id === t.categoryId)!;
      const pub = reviews.filter(
        (r) => r.toolId === t._id && r.status === "published",
      );
      const stats = reviewAggregate(
        pub.map((r) => ({ ease: r.ease, power: r.power, value: r.value })),
      );
      return {
        slug: t.slug,
        name: t.name,
        tagline: t.tagline,
        emoji: t.logoEmoji,
        gradient: t.logoGradient,
        description: t.description ?? null,
        websiteUrl: t.websiteUrl,
        pricing: {
          model: t.pricingModel,
          price: t.startingPrice ?? null,
          note: t.pricingNote ?? null,
        },
        category: { slug: cat.slug, name: cat.name, emoji: cat.emoji },
        tags: t.tags,
        links: {
          github: t.githubUrl ?? null,
          docs: t.docsUrl ?? null,
          twitter: t.twitterUrl ?? null,
        },
        rating: stats.aggregate,
        reviewCount: stats.count,
        comments: comments.filter((c) => c.toolId === t._id).length,
        verified: t.verifiedAt != null,
        claimed: t.claimed,
        hasApi: t.hasApi,
        track: t.track === "community" ? "community" : "editor_seed",
        maker: t.makerHandle,
      };
    };
    return { a: row(toolA), b: row(toolB), popular };
  },
});

