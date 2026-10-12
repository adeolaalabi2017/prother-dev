/**
 * D1 ports, wave 4b: public community reads/writes, claims, submit flow.
 * Shapes match convex/community.ts, convex/claims.ts, and the public parts
 * of convex/submissions.ts. Admin/editor/arbitrate paths stay on Convex.
 *
 * Writes are D1-primary (Convex fallback in src/lib/data.ts). Unlike Convex,
 * D1 writes also maintain the denormalized counters (commentCount,
 * reviewCount, ratingSumX100, replyCount, voteCount) so D1-served reads stay
 * exact.
 */
import { and, asc, desc, eq, gte, or } from "drizzle-orm";
import { getD1 } from "./client";
import { parseArr } from "./queries2";
import {
  bookmarks,
  categories,
  claims,
  collectionItems,
  collections,
  comments,
  follows,
  forumReplies,
  forumThreads,
  forumThreadVotes,
  posts,
  reports,
  reviews,
  submissions,
  tools,
} from "./schema";

function isoFromMs(ms: number): string {
  return new Date(ms).toISOString();
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function docId(d: { id: string; legacyId?: string | null }): string {
  return d.legacyId ?? d.id;
}

function reviewAggregate(revs: { ease: number; power: number; value: number }[]) {
  const count = revs.length;
  if (count < 3) return { count, aggregate: null };
  const se = revs.reduce((a, r) => a + r.ease, 0);
  const sp = revs.reduce((a, r) => a + r.power, 0);
  const sv = revs.reduce((a, r) => a + r.value, 0);
  return {
    count,
    aggregate: {
      count,
      ease: round1(se / count),
      power: round1(sp / count),
      value: round1(sv / count),
      overall: round1((se + sp + sv) / (3 * count)),
    },
  };
}

function ratingX100(ease: number, power: number, value: number): number {
  return Math.round(((ease + power + value) / 3) * 100);
}

const FORUM_TOPICS = ["general", "vibecoding", "show", "introduce"] as const;
function asForumTopic(topic: string): (typeof FORUM_TOPICS)[number] {
  return (FORUM_TOPICS as readonly string[]).includes(topic)
    ? (topic as (typeof FORUM_TOPICS)[number])
    : "general";
}

type Db = NonNullable<Awaited<ReturnType<typeof getD1>>>;

async function toolBySlug(db: Db, slug: string) {
  return (await db.select().from(tools).where(eq(tools.slug, slug)).limit(1))[0] ?? null;
}

// ── Comments ──
export async function d1CommentsList(toolSlug: string) {
  const db = await getD1();
  if (!db) return null;
  const tool = await toolBySlug(db, toolSlug);
  if (!tool) return { error: "Tool not found" as const };
  const items = await db
    .select()
    .from(comments)
    .where(eq(comments.toolId, tool.id))
    .orderBy(asc(comments.createdAt));
  return {
    items: items.map((c) => ({
      id: docId(c),
      author: c.author,
      body: c.body,
      isMaker: c.isMaker === 1,
      createdAt: isoFromMs(c.createdAt),
    })),
    count: items.length,
  };
}

export async function d1CommentsLastAge(toolSlug: string, author: string) {
  const db = await getD1();
  if (!db) return null;
  const tool = await toolBySlug(db, toolSlug);
  if (!tool) return { ageSec: null };
  const mine = await db
    .select()
    .from(comments)
    .where(and(eq(comments.toolId, tool.id), eq(comments.author, author)))
    .orderBy(desc(comments.createdAt))
    .limit(1);
  if (mine.length === 0) return { ageSec: null };
  return { ageSec: Math.max(0, (Date.now() - mine[0]!.createdAt) / 1000) };
}

export async function d1CommentAdd(args: { id: string; toolSlug: string; author: string; body: string; createdAt: number }) {
  const db = await getD1();
  if (!db) return null;
  const tool = await toolBySlug(db, args.toolSlug);
  if (!tool) throw new Error("tool_not_found");
  const norm = (s: string) => s.replace(/^@/, "").toLowerCase();
  const isMaker = norm(args.author) === norm(tool.makerHandle);
  await db.insert(comments).values({
    id: args.id,
    toolId: tool.id,
    author: args.author,
    body: args.body,
    isMaker: isMaker ? 1 : 0,
    legacyId: args.id,
    createdAt: args.createdAt,
  });
  await db
    .update(tools)
    .set({ commentCount: tool.commentCount + 1 })
    .where(eq(tools.id, tool.id));
  return {
    id: args.id,
    author: args.author,
    body: args.body,
    isMaker,
    createdAt: isoFromMs(args.createdAt),
  };
}

// ── Reviews ──
const serReview = (r: typeof reviews.$inferSelect) => ({
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

export async function d1ReviewsData(toolSlug: string, viewerUserId?: string) {
  const db = await getD1();
  if (!db) return null;
  const tool = await toolBySlug(db, toolSlug);
  if (!tool) return { error: "tool_not_found" as const };
  const [published, mineRows] = await Promise.all([
    db
      .select()
      .from(reviews)
      .where(and(eq(reviews.toolId, tool.id), eq(reviews.status, "published")))
      .orderBy(desc(reviews.createdAt)),
    viewerUserId != null
      ? db
          .select()
          .from(reviews)
          .where(and(eq(reviews.toolId, tool.id), eq(reviews.userId, viewerUserId)))
          .limit(1)
      : Promise.resolve([]),
  ]);
  const stats = reviewAggregate(published.map((r) => ({ ease: r.ease, power: r.power, value: r.value })));
  return {
    tool: { claimed: tool.claimed === 1, makerEmail: tool.makerEmail, websiteUrl: tool.websiteUrl },
    published: published.map(serReview),
    mineRow: mineRows[0] ? serReview(mineRows[0]) : null,
    stats,
  };
}

export async function d1ReviewUpsert(args: {
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
}) {
  const db = await getD1();
  if (!db) return null;
  const tool = await toolBySlug(db, args.toolSlug);
  if (!tool) throw new Error("tool_not_found");
  const existing = (
    await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.toolId, tool.id), eq(reviews.userId, args.userId)))
      .limit(1)
  )[0];
  if (existing) {
    await db
      .update(reviews)
      .set({
        ease: args.ease,
        power: args.power,
        value: args.value,
        body: args.body,
        status: args.status,
        updatedAt: args.updatedAt,
      })
      .where(eq(reviews.id, existing.id));
  } else {
    await db.insert(reviews).values({
      id: args.id,
      toolId: tool.id,
      userId: args.userId,
      author: args.author,
      ease: args.ease,
      power: args.power,
      value: args.value,
      body: args.body,
      status: args.status,
      legacyId: args.id,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
    });
  }
  const published = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.toolId, tool.id), eq(reviews.status, "published")));
  const stats = reviewAggregate(published.map((r) => ({ ease: r.ease, power: r.power, value: r.value })));
  await db
    .update(tools)
    .set({
      reviewCount: stats.count,
      ratingSumX100: published.reduce((s, r) => s + ratingX100(r.ease, r.power, r.value), 0),
    })
    .where(eq(tools.id, tool.id));
  const row = (
    await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.toolId, tool.id), eq(reviews.userId, args.userId)))
      .limit(1)
  )[0]!;
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
}

// ── Forum writes ──
export async function d1ThreadCreate(args: {
  id: string;
  slug: string;
  title: string;
  body: string;
  topic: string;
  author: string;
  authorId?: string;
  createdAt: number;
  updatedAt: number;
}) {
  const db = await getD1();
  if (!db) return null;
  const taken = await db.select({ id: forumThreads.id }).from(forumThreads).where(eq(forumThreads.slug, args.slug)).limit(1);
  if (taken.length > 0) throw new Error("slug_taken");
  await db.insert(forumThreads).values({
    id: args.id,
    slug: args.slug,
    title: args.title,
    body: args.body,
    topic: args.topic,
    author: args.author,
    authorId: args.authorId ?? null,
    pinned: 0,
    hidden: 0,
    baseUpvotes: 0,
    replyCount: 0,
    voteCount: 0,
    legacyId: args.id,
    createdAt: args.createdAt,
    updatedAt: args.updatedAt,
  });
  return {
    id: args.id,
    slug: args.slug,
    title: args.title,
    body: args.body,
    topic: asForumTopic(args.topic),
    author: args.author,
    pinned: false,
    votes: 0,
    voted: false,
    replyCount: 0,
    createdAt: isoFromMs(args.createdAt),
  };
}

export async function d1ReplyCreate(args: {
  id: string;
  threadSlug: string;
  author: string;
  authorId?: string;
  body: string;
  createdAt: number;
}) {
  const db = await getD1();
  if (!db) return null;
  const thread = (
    await db.select().from(forumThreads).where(eq(forumThreads.slug, args.threadSlug)).limit(1)
  )[0];
  if (!thread) throw new Error("thread_not_found");
  await db.insert(forumReplies).values({
    id: args.id,
    threadId: thread.id,
    author: args.author,
    authorId: args.authorId ?? null,
    body: args.body,
    hidden: 0,
    legacyId: args.id,
    createdAt: args.createdAt,
  });
  await db
    .update(forumThreads)
    .set({ replyCount: thread.replyCount + 1 })
    .where(eq(forumThreads.id, thread.id));
  return { id: args.id, author: args.author, body: args.body, createdAt: isoFromMs(args.createdAt) };
}

export async function d1VoteToggle(threadSlug: string, voterKey: string) {
  const db = await getD1();
  if (!db) return null;
  const thread = (
    await db.select().from(forumThreads).where(eq(forumThreads.slug, threadSlug)).limit(1)
  )[0];
  if (!thread) throw new Error("thread_not_found");
  const existing = (
    await db
      .select({ id: forumThreadVotes.id })
      .from(forumThreadVotes)
      .where(and(eq(forumThreadVotes.threadId, thread.id), eq(forumThreadVotes.voterKey, voterKey)))
      .limit(1)
  )[0];
  let voted: boolean;
  if (existing) {
    await db.delete(forumThreadVotes).where(eq(forumThreadVotes.id, existing.id));
    voted = false;
  } else {
    await db.insert(forumThreadVotes).values({
      id: `vote:${thread.id}:${voterKey}`,
      threadId: thread.id,
      voterKey,
    });
    voted = true;
  }
  const countRows = await db
    .select({ id: forumThreadVotes.id })
    .from(forumThreadVotes)
    .where(eq(forumThreadVotes.threadId, thread.id))
    .limit(5000);
  await db.update(forumThreads).set({ voteCount: countRows.length }).where(eq(forumThreads.id, thread.id));
  return { voted, votes: thread.baseUpvotes + countRows.length };
}

// ── Bookmarks / follows toggles ──
export async function d1BookmarkToggle(args: {
  id: string;
  ownerKey: string;
  targetType: string;
  targetId: string;
  targetLabel?: string;
  targetHref?: string;
  action?: string;
  createdAt: number;
}) {
  const db = await getD1();
  if (!db) return null;
  const existing = (
    await db
      .select({ id: bookmarks.id })
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.ownerKey, args.ownerKey),
          eq(bookmarks.targetType, args.targetType),
          eq(bookmarks.targetId, args.targetId),
        ),
      )
      .limit(1)
  )[0];
  const isBookmarked = Boolean(existing);
  const remove = args.action === "remove" || (args.action !== "add" && isBookmarked);
  if (remove) {
    if (existing) await db.delete(bookmarks).where(eq(bookmarks.id, existing.id));
    return { bookmarked: false };
  }
  if (!isBookmarked) {
    let label = args.targetLabel ?? "";
    let href = args.targetHref ?? "";
    if (args.targetType === "tool" && (!label || !href)) {
      const t = await toolBySlug(db, args.targetId);
      label = label || t?.name || "";
      href = href || (t ? `/?tool=${t.slug}` : "");
    } else if (args.targetType === "thread" && (!label || !href)) {
      const t = (
        await db.select().from(forumThreads).where(eq(forumThreads.slug, args.targetId)).limit(1)
      )[0];
      label = label || t?.title || "";
      href = href || (t ? `/forums/${t.slug}` : "");
    } else if (args.targetType === "post" && (!label || !href)) {
      const p = (
        await db.select().from(posts).where(eq(posts.slug, args.targetId)).limit(1)
      )[0];
      label = label || p?.title || "";
      href = href || (p ? `/?post=${p.slug}` : "");
    }
    await db.insert(bookmarks).values({
      id: args.id,
      ownerKey: args.ownerKey,
      targetType: args.targetType,
      targetId: args.targetId,
      targetLabel: label.slice(0, 160),
      targetHref: href.slice(0, 200),
      legacyId: args.id,
      createdAt: args.createdAt,
    });
  }
  return { bookmarked: true };
}

export async function d1FollowToggle(args: { userEmail: string; targetType: string; targetId: string; targetLabel: string }) {
  const db = await getD1();
  if (!db) return null;
  const existing = (
    await db
      .select({ id: follows.id })
      .from(follows)
      .where(
        and(
          eq(follows.userEmail, args.userEmail),
          eq(follows.targetType, args.targetType),
          eq(follows.targetId, args.targetId),
        ),
      )
      .limit(1)
  )[0];
  if (existing) {
    await db.delete(follows).where(eq(follows.id, existing.id));
    return { following: false };
  }
  await db.insert(follows).values({
    id: `follow:${args.userEmail}:${args.targetType}:${args.targetId}`,
    userEmail: args.userEmail,
    targetType: args.targetType,
    targetId: args.targetId,
    targetLabel: args.targetLabel,
    createdAt: Date.now(),
  });
  return { following: true };
}

// ── Collections ──
export async function d1CollectionsMine(ownerEmail?: string) {
  const db = await getD1();
  if (!db) return null;
  const [collRows, itemRows, toolRows] = await Promise.all([
    db.select().from(collections).limit(500),
    db.select().from(collectionItems).limit(2000),
    db.select().from(tools).where(eq(tools.status, "live")).limit(1000),
  ]);
  if (collRows.length === 0) {
    const anyTools = await db.select({ id: tools.id }).from(tools).limit(1);
    if (anyTools.length === 0) return null;
  }
  const toolById = new Map(toolRows.map((t) => [t.id, t]));
  const card = (c: (typeof collRows)[number]) => {
    const mine = itemRows
      .filter((i) => i.collectionId === c.id)
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
      isPublic: c.isPublic === 1,
      itemCount: mine.length,
      covers,
      createdAt: isoFromMs(c.createdAt),
    };
    return c.isPublic === 1 ? { ...base, ownerName: c.ownerName } : base;
  };
  const strip = ({ createdAt, ...rest }: ReturnType<typeof card>) => {
    void createdAt;
    return rest;
  };
  const mine =
    ownerEmail != null
      ? collRows
          .filter((c) => c.ownerEmail === ownerEmail)
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 100)
          .map(card)
          .map(strip)
      : [];
  const featured = collRows
    .filter((c) => c.isPublic === 1)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 24)
    .map(card)
    .sort((a, b) => b.itemCount - a.itemCount || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6)
    .map(strip);
  return { mine, featured };
}

export async function d1CollectionDetail(slug: string, viewerEmail?: string) {
  const db = await getD1();
  if (!db) return null;
  const c = (await db.select().from(collections).where(eq(collections.slug, slug)).limit(1))[0];
  if (!c) return { error: "not_found" as const };
  const isOwner = viewerEmail != null && c.ownerEmail === viewerEmail;
  if (!c.isPublic && !isOwner) return { error: "not_found" as const };
  const [itemRows, catRows] = await Promise.all([
    db.select().from(collectionItems).where(eq(collectionItems.collectionId, c.id)).limit(500),
    db.select().from(categories),
  ]);
  const toolIds = [...new Set(itemRows.map((i) => i.toolId))];
  const foundTools =
    toolIds.length > 0
      ? await db.select().from(tools).where(or(...toolIds.map((id) => eq(tools.id, id))))
      : [];
  const toolById = new Map(foundTools.map((t) => [t.id, t]));
  const catById = new Map(catRows.map((x) => [x.id, x]));
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
            pricing: { model: t.pricingModel, price: t.startingPrice },
            category: { slug: cat.slug, name: cat.name, emoji: cat.emoji },
            editorsPick: t.editorsPick === 1,
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
      isPublic: c.isPublic === 1,
      ownerName: c.ownerName,
      ...(isOwner ? { ownerEmail: c.ownerEmail } : {}),
      isOwner,
      createdAt: isoFromMs(c.createdAt),
      items,
    },
  };
}

export async function d1CollectionCreate(args: {
  id: string;
  slug: string;
  name: string;
  description: string;
  isPublic: boolean;
  ownerEmail: string;
  ownerName: string;
  createdAt: number;
}) {
  const db = await getD1();
  if (!db) return null;
  await db.insert(collections).values({
    id: args.id,
    slug: args.slug,
    name: args.name,
    description: args.description,
    isPublic: args.isPublic ? 1 : 0,
    ownerEmail: args.ownerEmail,
    ownerName: args.ownerName,
    legacyId: args.id,
    createdAt: args.createdAt,
  });
  return {
    id: args.id,
    slug: args.slug,
    name: args.name,
    description: args.description,
    isPublic: args.isPublic,
    ownerEmail: args.ownerEmail,
    ownerName: args.ownerName,
    createdAt: isoFromMs(args.createdAt),
  };
}

export async function d1CollectionUpdate(args: { slug: string; name?: string; description?: string; isPublic?: boolean }) {
  const db = await getD1();
  if (!db) return null;
  const c = (await db.select().from(collections).where(eq(collections.slug, args.slug)).limit(1))[0];
  if (!c) throw new Error("not_found");
  const patch: Partial<{ name: string; description: string; isPublic: number }> = {};
  if (args.name !== undefined) patch.name = args.name;
  if (args.description !== undefined) patch.description = args.description;
  if (args.isPublic !== undefined) patch.isPublic = args.isPublic ? 1 : 0;
  if (Object.keys(patch).length > 0) await db.update(collections).set(patch).where(eq(collections.id, c.id));
  const fresh = (await db.select().from(collections).where(eq(collections.id, c.id)).limit(1))[0]!;
  return {
    id: docId(fresh),
    slug: fresh.slug,
    name: fresh.name,
    description: fresh.description,
    isPublic: fresh.isPublic === 1,
    ownerEmail: fresh.ownerEmail,
    ownerName: fresh.ownerName,
    createdAt: isoFromMs(fresh.createdAt),
  };
}

export async function d1CollectionDelete(slug: string) {
  const db = await getD1();
  if (!db) return null;
  const c = (await db.select().from(collections).where(eq(collections.slug, slug)).limit(1))[0];
  if (!c) throw new Error("not_found");
  await db.delete(collectionItems).where(eq(collectionItems.collectionId, c.id));
  await db.delete(collections).where(eq(collections.id, c.id));
  return { ok: true as const };
}

export async function d1CollectionItemToggle(args: { id: string; collectionSlug: string; toolSlug: string; createdAt: number }) {
  const db = await getD1();
  if (!db) return null;
  const c = (
    await db.select().from(collections).where(eq(collections.slug, args.collectionSlug)).limit(1)
  )[0];
  if (!c) throw new Error("not_found");
  const t = await toolBySlug(db, args.toolSlug);
  if (!t) throw new Error("tool_not_found");
  const existing = (
    await db
      .select({ id: collectionItems.id })
      .from(collectionItems)
      .where(and(eq(collectionItems.collectionId, c.id), eq(collectionItems.toolId, t.id)))
      .limit(1)
  )[0];
  if (existing) {
    await db.delete(collectionItems).where(eq(collectionItems.id, existing.id));
  } else {
    const countRows = await db
      .select({ id: collectionItems.id })
      .from(collectionItems)
      .where(eq(collectionItems.collectionId, c.id))
      .limit(1000);
    await db.insert(collectionItems).values({
      id: args.id,
      collectionId: c.id,
      toolId: t.id,
      position: countRows.length,
      legacyId: args.id,
      createdAt: args.createdAt,
    });
  }
  const itemCount = (
    await db
      .select({ id: collectionItems.id })
      .from(collectionItems)
      .where(eq(collectionItems.collectionId, c.id))
      .limit(2000)
  ).length;
  return { inCollection: !existing, itemCount };
}

// ── Reports ──
export async function d1ReportCreate(args: {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details?: string;
  reporterEmail?: string;
  reporterKey?: string;
  createdAt: number;
}) {
  const db = await getD1();
  if (!db) return null;
  let label: string | null = null;
  let storedId = args.targetId;
  if (args.targetType === "thread") {
    const t = (
      await db.select().from(forumThreads).where(eq(forumThreads.slug, args.targetId)).limit(1)
    )[0];
    label = t?.title ?? null;
    if (t) storedId = docId(t);
  } else if (args.targetType === "reply") {
    const r = (await db.select().from(forumReplies).where(eq(forumReplies.id, args.targetId)).limit(1))[0];
    label = r?.body?.slice(0, 80) ?? null;
    if (r) storedId = docId(r);
  } else if (args.targetType === "tool") {
    const t = await toolBySlug(db, args.targetId);
    if (t) {
      storedId = docId(t);
      label = t.name;
    }
  } else if (args.targetType === "post") {
    const p = (await db.select().from(posts).where(eq(posts.slug, args.targetId)).limit(1))[0];
    if (p) {
      storedId = docId(p);
      label = p.title;
    }
  } else if (args.targetType === "review") {
    const r = (await db.select().from(reviews).where(eq(reviews.id, args.targetId)).limit(1))[0];
    label = r?.body?.slice(0, 80) ?? null;
    if (r) storedId = docId(r);
  }
  if (!label) return { ok: false as const };
  const ownerEmail = args.reporterEmail ?? null;
  const ownerKey = ownerEmail ? null : (args.reporterKey ?? null);
  const open = await db
    .select()
    .from(reports)
    .where(and(eq(reports.targetType, args.targetType), eq(reports.targetId, storedId)))
    .limit(50);
  const dup = open.find(
    (r) =>
      r.status === "open" &&
      (ownerEmail != null
        ? r.reporterEmail === ownerEmail
        : r.reporterEmail == null && r.reporterKey === ownerKey),
  );
  if (dup) return { ok: true as const, already: true, id: docId(dup) };
  await db.insert(reports).values({
    id: args.id,
    reporterEmail: ownerEmail,
    reporterKey: ownerKey,
    targetType: args.targetType,
    targetId: storedId,
    targetLabel: label,
    reason: args.reason,
    details: args.details ?? null,
    status: "open",
    legacyId: args.id,
    createdAt: args.createdAt,
  });
  return { ok: true as const, already: false, id: args.id };
}

// ── Claims ──
function serializeClaim(r: typeof claims.$inferSelect) {
  return {
    id: docId(r),
    status: r.status,
    method: r.method,
    token: r.token,
    note: r.note,
    createdAt: isoFromMs(r.createdAt),
    verifiedAt: r.verifiedAt != null ? isoFromMs(r.verifiedAt) : null,
  };
}

async function claimsForTool(db: Db, toolId: string) {
  return db.select().from(claims).where(eq(claims.toolId, toolId)).limit(100);
}

export async function d1ClaimState(toolSlug: string, userEmail?: string) {
  const db = await getD1();
  if (!db) return null;
  const tool = await toolBySlug(db, toolSlug);
  if (!tool) return { error: "tool_not_found" as const };
  let claim: ReturnType<typeof serializeClaim> | null = null;
  if (userEmail != null) {
    const mine = (await claimsForTool(db, tool.id))
      .filter((c) => c.userEmail === userEmail)
      .sort((a, b) => b.createdAt - a.createdAt);
    if (mine[0]) claim = serializeClaim(mine[0]);
  }
  return { claimable: !tool.claimed, claim };
}

export async function d1ClaimLatest(toolSlug: string, userEmail: string) {
  const db = await getD1();
  if (!db) return null;
  const tool = await toolBySlug(db, toolSlug);
  if (!tool) return null;
  const mine = (await claimsForTool(db, tool.id))
    .filter((c) => c.userEmail === userEmail)
    .sort((a, b) => b.createdAt - a.createdAt);
  const latest = mine[0];
  return {
    claim: latest ? serializeClaim(latest) : null,
    tool: { slug: tool.slug, name: tool.name, websiteUrl: tool.websiteUrl, claimed: tool.claimed === 1 },
  };
}

export async function d1ClaimById(id: string) {
  const db = await getD1();
  if (!db) return null;
  const row = (
    await db
      .select()
      .from(claims)
      .where(or(eq(claims.id, id), eq(claims.legacyId, id)))
      .limit(1)
  )[0];
  if (!row) return null;
  const tool = (await db.select().from(tools).where(eq(tools.id, row.toolId)).limit(1))[0];
  return {
    claim: { ...serializeClaim(row), userEmail: row.userEmail, userName: row.userName },
    tool: tool
      ? {
          id: docId(tool),
          slug: tool.slug,
          name: tool.name,
          websiteUrl: tool.websiteUrl,
          claimed: tool.claimed === 1,
          makerEmail: tool.makerEmail,
        }
      : null,
  };
}

export async function d1ClaimInsert(args: {
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
}) {
  const db = await getD1();
  if (!db) return null;
  const tool = await toolBySlug(db, args.toolSlug);
  if (!tool) throw new Error("tool_not_found");
  if (tool.claimed) throw new Error("already_claimed");
  const tokenTaken = await db.select({ id: claims.id }).from(claims).where(eq(claims.token, args.token)).limit(1);
  if (tokenTaken.length > 0) throw new Error("token_taken");
  const now = args.nowMs ?? args.createdAt;
  await db.insert(claims).values({
    id: args.id,
    toolId: tool.id,
    userEmail: args.userEmail,
    userName: args.userName,
    method: args.method,
    token: args.token,
    status: args.status,
    note: args.note ?? null,
    verifiedAt: args.verifiedAt ?? null,
    legacyId: args.id,
    createdAt: args.createdAt,
  });
  if (args.transfer) {
    await db
      .update(tools)
      .set({
        claimed: 1,
        makerEmail: args.transfer.email,
        makerHandle: `@${args.transfer.handle}`,
        verifiedAt: now,
      })
      .where(eq(tools.id, tool.id));
  }
  const row = (await db.select().from(claims).where(eq(claims.id, args.id)).limit(1))[0]!;
  return serializeClaim(row);
}

export async function d1ClaimSettle(args: {
  claimLegacyId: string;
  status: string;
  note?: string | null;
  verifiedAt?: number;
  transfer?: { email: string; handle: string };
  nowMs: number;
}) {
  const db = await getD1();
  if (!db) return null;
  const claim = (
    await db
      .select()
      .from(claims)
      .where(or(eq(claims.id, args.claimLegacyId), eq(claims.legacyId, args.claimLegacyId)))
      .limit(1)
  )[0];
  if (!claim) throw new Error("claim_not_found");
  await db
    .update(claims)
    .set({ status: args.status, note: args.note ?? null, verifiedAt: args.verifiedAt ?? null })
    .where(eq(claims.id, claim.id));
  if (args.transfer) {
    const tool = (await db.select().from(tools).where(eq(tools.id, claim.toolId)).limit(1))[0];
    if (!tool) throw new Error("tool_not_found");
    await db
      .update(tools)
      .set({
        claimed: 1,
        makerEmail: args.transfer.email,
        makerHandle: `@${args.transfer.handle}`,
        verifiedAt: args.nowMs,
      })
      .where(eq(tools.id, tool.id));
  }
  const fresh = (await db.select().from(claims).where(eq(claims.id, claim.id)).limit(1))[0]!;
  return serializeClaim(fresh);
}

// ── Submit flow (public) ──
function hostOf(rawUrl: string): string | null {
  try {
    return (
      new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`).hostname
        .toLowerCase()
        .replace(/^www\./, "") || null
    );
  } catch {
    return null;
  }
}

export async function d1SubmitCheck(domain: string) {
  const db = await getD1();
  if (!db) return null;
  const [toolRows, subRows] = await Promise.all([
    db.select().from(tools).limit(1000),
    db.select().from(submissions).where(eq(submissions.domain, domain)).limit(20),
  ]);
  if (toolRows.length === 0 && subRows.length === 0) {
    const anyTools = await db.select({ id: tools.id }).from(tools).limit(1);
    if (anyTools.length === 0) return null;
  }
  const toolHit = toolRows.find((t) => hostOf(t.websiteUrl) === domain);
  if (toolHit) {
    return {
      valid: true as const,
      duplicate: { kind: "tool" as const, name: toolHit.name, slug: toolHit.slug, maker: toolHit.makerHandle },
    };
  }
  const subHit = subRows.find((s) => s.status === "pending" || s.status === "approved");
  if (subHit) {
    return { valid: true as const, duplicate: { kind: "submission" as const, name: subHit.name } };
  }
  return { valid: true as const, duplicate: null };
}

export async function d1SubmissionCountSince(email: string, sinceMs: number) {
  const db = await getD1();
  if (!db) return null;
  const subs = await db.select().from(submissions).where(eq(submissions.email, email)).limit(100);
  return subs.filter((s) => s.createdAt >= sinceMs).length;
}

export async function d1SubmissionsByEmail(email: string) {
  const db = await getD1();
  if (!db) return null;
  const { TAG_VOCAB } = await import("@/lib/submit");
  const { domainOf } = await import("@/lib/submit");
  const PRICING_VALUES = ["free", "freemium", "paid", "open_source"] as const;
  const [subs, queue, toolRows] = await Promise.all([
    db.select().from(submissions).where(eq(submissions.email, email)).limit(100),
    db.select().from(submissions).where(eq(submissions.status, "pending")).orderBy(asc(submissions.createdAt)).limit(2000),
    db.select().from(tools).limit(1000),
  ]);
  if (subs.length === 0 && queue.length === 0 && toolRows.length === 0) {
    const anyTools = await db.select({ id: tools.id }).from(tools).limit(1);
    if (anyTools.length === 0) return null;
  }
  const ordered = [...subs].sort((a, b) => b.createdAt - a.createdAt).slice(0, 20);
  const queueAsc = [...queue].sort((a, b) => a.createdAt - b.createdAt);
  const positionOf = new Map(queueAsc.map((s, i) => [docId(s), i + 1]));
  const bySubmissionId = new Map<string, string>();
  const byDomain = new Map<string, string>();
  for (const t of toolRows) {
    if (t.submissionId && !bySubmissionId.has(t.submissionId)) {
      bySubmissionId.set(t.submissionId, t.slug);
    }
    const d = domainOf(t.websiteUrl);
    if (d && !byDomain.has(d)) byDomain.set(d, t.slug);
  }
  const items = ordered.map((s) => {
    const status = s.status as "pending" | "approved" | "rejected";
    const toolSlug =
      status === "approved"
        ? (bySubmissionId.get(s.id) ?? bySubmissionId.get(s.legacyId ?? "") ?? byDomain.get(s.domain) ?? null)
        : null;
    let resubmit: Record<string, unknown> | null = null;
    if (status === "rejected") {
      const pricingModel = (PRICING_VALUES as readonly string[]).includes(s.pricingModel) ? s.pricingModel : "freemium";
      const tags = parseArr(s.tagsJson)
        .join("|")
        .split(",")
        .map((t) => t.trim())
        .filter((t) => (TAG_VOCAB as readonly string[]).includes(t))
        .slice(0, 5);
      resubmit = {
        email,
        websiteUrl: s.websiteUrl,
        name: s.name,
        tagline: s.tagline,
        description: s.description,
        categorySlug: s.categorySlug,
        tags,
        pricingModel,
        startingPrice: s.startingPrice ?? "",
        pricingNote: s.pricingNote ?? "",
        hasApi: s.hasApi === 1,
        githubUrl: s.githubUrl ?? "",
        docsUrl: s.docsUrl ?? "",
        twitterUrl: s.twitterUrl ?? "",
        logoEmoji: s.logoEmoji,
        logoGradient: s.logoGradient,
      };
    }
    return {
      id: docId(s),
      name: s.name,
      tagline: s.tagline,
      domain: s.domain,
      emoji: s.logoEmoji,
      gradient: s.logoGradient,
      status,
      createdAt: isoFromMs(s.createdAt),
      queuePosition: status === "pending" ? (positionOf.get(docId(s)) ?? null) : null,
      toolSlug,
      reviewNote: s.reviewNote,
      resubmit,
    };
  });
  return { items };
}

export async function d1SubmissionCreate(args: {
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
}) {
  const db = await getD1();
  if (!db) return null;
  await db.insert(submissions).values({
    id: args.id,
    email: args.email,
    websiteUrl: args.websiteUrl,
    domain: args.domain,
    name: args.name,
    tagline: args.tagline,
    description: args.description,
    categorySlug: args.categorySlug,
    tagsJson: JSON.stringify(args.tags),
    pricingModel: args.pricingModel,
    startingPrice: args.startingPrice ?? null,
    pricingNote: args.pricingNote ?? null,
    hasApi: args.hasApi ? 1 : 0,
    githubUrl: args.githubUrl ?? null,
    docsUrl: args.docsUrl ?? null,
    twitterUrl: args.twitterUrl ?? null,
    logoEmoji: args.logoEmoji,
    logoGradient: args.logoGradient,
    isOwner: args.isOwner ? 1 : 0,
    confirmedLive: args.confirmedLive ? 1 : 0,
    agreedStandards: args.agreedStandards ? 1 : 0,
    status: "pending",
    legacyId: args.id,
    createdAt: args.createdAt,
  });
  const pending = await db
    .select()
    .from(submissions)
    .where(eq(submissions.status, "pending"))
    .orderBy(asc(submissions.createdAt))
    .limit(2000);
  const position = pending.findIndex((s) => s.legacyId === args.id) + 1;
  return { id: args.id, position: position > 0 ? position : pending.length };
}
