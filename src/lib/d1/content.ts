/**
 * D1 ports, wave 4a: tool detail, journal, forum, compare.
 * Shapes match the (patched) Convex originals so src/lib/data.ts swaps
 * backends without touching callers.
 */
import { and, asc, desc, eq, gte, inArray, or, sql } from "drizzle-orm";
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
  reviews,
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

function parseObj(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

function parseUseCases(raw: string | null | undefined): { title: string; body: string }[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
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

const FORUM_TOPICS = ["general", "vibecoding", "show", "introduce"] as const;
function asForumTopic(topic: string): (typeof FORUM_TOPICS)[number] {
  return (FORUM_TOPICS as readonly string[]).includes(topic)
    ? (topic as (typeof FORUM_TOPICS)[number])
    : "general";
}

function rankScore(votes: number, createdMs: number, nowMs = Date.now()): number {
  const hours = Math.max(0.5, (nowMs - createdMs) / 3_600_000);
  return votes / Math.pow(hours, 1.2);
}

type Db = NonNullable<Awaited<ReturnType<typeof getD1>>>;

// ── Tool pageData ──
export async function d1ToolPageData(slug: string) {
  const db = await getD1();
  if (!db) return null;
  const tool = (await db.select().from(tools).where(eq(tools.slug, slug)).limit(1))[0];
  if (!tool) return { error: "not_found" as const };
  const [catRows, revRows, inCategory] = await Promise.all([
    db.select().from(categories),
    db
      .select()
      .from(reviews)
      .where(and(eq(reviews.toolId, tool.id), eq(reviews.status, "published")))
      .limit(100),
    db.select().from(tools).where(and(eq(tools.status, "live"), eq(tools.categoryId, tool.categoryId))).limit(200),
  ]);
  if (catRows.length === 0) return null;
  const catById = new Map(catRows.map((c) => [c.id, c]));
  const cat = catById.get(tool.categoryId)!;
  const published = [...revRows].sort((a, b) => b.createdAt - a.createdAt);
  const stats = reviewAggregate(published.map((r) => ({ ease: r.ease, power: r.power, value: r.value })));

  const related = [...inCategory]
    .filter((t) => t.slug !== tool.slug)
    .sort(
      (a, b) =>
        Number(b.editorsPick) - Number(a.editorsPick) || b.createdAt - a.createdAt,
    )
    .slice(0, 3);

  const wantedSlugs = [...new Set(parseArr(tool.alternativesJson))].filter((s) => s && s !== tool.slug).slice(0, 6);
  const altDocs = await Promise.all(
    wantedSlugs.map((s) => db.select().from(tools).where(eq(tools.slug, s)).limit(1).then((r) => r[0] ?? null)),
  );
  const alternatives = altDocs
    .filter((t): t is NonNullable<typeof t> => t != null && t.status === "live")
    .map((t) => ({
      slug: t.slug,
      name: t.name,
      tagline: t.tagline,
      logoEmoji: t.logoEmoji,
      logoGradient: t.logoGradient,
      logoUrl: t.logoUrl,
      pricingModel: t.pricingModel,
      startingPrice: t.startingPrice,
      editorsPick: t.editorsPick === 1,
    }));

  return {
    tool: {
      id: docId(tool),
      slug: tool.slug,
      status: tool.status,
      name: tool.name,
      tagline: tool.tagline,
      description: tool.description,
      websiteUrl: tool.websiteUrl,
      logoEmoji: tool.logoEmoji,
      logoGradient: tool.logoGradient,
      pricingModel: tool.pricingModel,
      startingPrice: tool.startingPrice,
      pricingNote: tool.pricingNote,
      tags: parseArr(tool.tagsJson),
      makerHandle: tool.makerHandle,
      track: tool.track,
      editorsPick: tool.editorsPick === 1,
      curated: tool.curated === 1,
      claimed: tool.claimed === 1,
      hasApi: tool.hasApi === 1,
      githubUrl: tool.githubUrl,
      docsUrl: tool.docsUrl,
      twitterUrl: tool.twitterUrl,
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
    threads: [],
    related: related.map((r) => ({
      slug: r.slug,
      name: r.name,
      logoEmoji: r.logoEmoji,
      logoGradient: r.logoGradient,
      tagline: r.tagline,
      editorsPick: r.editorsPick === 1,
      logoUrl: r.logoUrl,
    })),
    logoUrl: tool.logoUrl,
    screenshots: parseArr(tool.screenshotUrlsJson),
    editorial: {
      longDescription: tool.longDescription,
      useCases: parseUseCases(tool.useCasesJson),
      pros: parseArr(tool.prosJson),
      cons: parseArr(tool.consJson),
      alternativeSlugs: parseArr(tool.alternativesJson),
      pricingCheckedAt: tool.pricingCheckedAt != null ? isoFromMs(tool.pricingCheckedAt) : null,
      contentUpdatedAt: tool.contentUpdatedAt != null ? isoFromMs(tool.contentUpdatedAt) : null,
    },
    alternatives,
    categoryToolCount: inCategory.length,
  };
}

// ── Tool detail (auth-aware) ──
export async function d1ToolDetail(slug: string, viewerEmail?: string, viewerUserId?: string) {
  const db = await getD1();
  if (!db) return null;
  const tool = (await db.select().from(tools).where(eq(tools.slug, slug)).limit(1))[0];
  if (!tool) return { error: "Tool not found" as const };
  const catRows = await db.select().from(categories);
  if (catRows.length === 0) return null;
  const catById = new Map(catRows.map((c) => [c.id, c]));
  const cat = catById.get(tool.categoryId)!;

  const [inCategory, revRows, comRows, followsRows, claimRows, collRows] = await Promise.all([
    db.select().from(tools).where(and(eq(tools.status, "live"), eq(tools.categoryId, tool.categoryId))).limit(200),
    db
      .select()
      .from(reviews)
      .where(and(eq(reviews.toolId, tool.id), eq(reviews.status, "published")))
      .limit(50),
    db.select({ id: comments.id }).from(comments).where(eq(comments.toolId, tool.id)).limit(500),
    viewerEmail != null
      ? db
          .select()
          .from(follows)
          .where(
            and(
              eq(follows.userEmail, viewerEmail),
              eq(follows.targetType, "tool"),
              eq(follows.targetId, tool.slug),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
    viewerEmail != null
      ? db.select().from(claims).where(eq(claims.toolId, tool.id)).limit(50)
      : Promise.resolve([]),
    viewerEmail != null
      ? db.select().from(collections).where(eq(collections.ownerEmail, viewerEmail)).limit(50)
      : Promise.resolve([]),
  ]);

  const relatedDocs = [...inCategory]
    .filter((t) => t.slug !== tool.slug)
    .sort(
      (a, b) =>
        Number(b.editorsPick) - Number(a.editorsPick) || b.createdAt - a.createdAt,
    )
    .slice(0, 3);
  const toolCount = inCategory.length;

  let items: (typeof collectionItems.$inferSelect)[] = [];
  if (viewerEmail != null && collRows.length > 0) {
    const per = await Promise.all(
      collRows.slice(0, 20).map((col) =>
        db.select().from(collectionItems).where(eq(collectionItems.collectionId, col.id)).limit(200),
      ),
    );
    items = per.flat();
  }

  const published = revRows.map((r) => ({ ease: r.ease, power: r.power, value: r.value }));
  const stats = reviewAggregate(published);

  const wantedSlugs = [...new Set(parseArr(tool.alternativesJson))].filter((s) => s && s !== tool.slug).slice(0, 6);
  const altDocs = await Promise.all(
    wantedSlugs.map((s) => db.select().from(tools).where(eq(tools.slug, s)).limit(1).then((r) => r[0] ?? null)),
  );
  const alternatives = altDocs
    .filter((t): t is NonNullable<typeof t> => t != null && t.status === "live")
    .map((t) => ({
      slug: t.slug,
      name: t.name,
      tagline: t.tagline,
      logoEmoji: t.logoEmoji,
      logoGradient: t.logoGradient,
      logoUrl: t.logoUrl,
      pricingModel: t.pricingModel,
      startingPrice: t.startingPrice,
      editorsPick: t.editorsPick === 1,
    }));

  const myClaim =
    viewerEmail != null
      ? claimRows
          .filter((c) => c.userEmail === viewerEmail)
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 1)[0] ?? null
      : null;

  return {
    slug: tool.slug,
    name: tool.name,
    tagline: tool.tagline,
    description: tool.description,
    websiteUrl: tool.websiteUrl,
    emoji: tool.logoEmoji,
    gradient: tool.logoGradient,
    logoUrl: tool.logoUrl,
    screenshots: parseArr(tool.screenshotUrlsJson),
    longDescription: tool.longDescription,
    useCases: parseUseCases(tool.useCasesJson),
    pros: parseArr(tool.prosJson),
    cons: parseArr(tool.consJson),
    alternatives,
    pricingCheckedAt: tool.pricingCheckedAt != null ? isoFromMs(tool.pricingCheckedAt) : null,
    contentUpdatedAt: tool.contentUpdatedAt != null ? isoFromMs(tool.contentUpdatedAt) : null,
    pricing: { model: tool.pricingModel, price: tool.startingPrice, note: tool.pricingNote },
    category: { slug: cat.slug, name: cat.name, emoji: cat.emoji, toolCount },
    maker: tool.makerHandle,
    track: tool.track === "community" ? "community" : ("editor_seed" as const),
    badges: {
      editorsPick: tool.editorsPick === 1,
      curated: tool.curated === 1,
      unclaimed: !tool.claimed,
      hasApi: tool.hasApi === 1,
      openSource: tool.pricingModel === "open_source",
    },
    links: { github: tool.githubUrl, docs: tool.docsUrl, twitter: tool.twitterUrl },
    submittedAt: isoFromMs(tool.createdAt),
    verified: tool.verifiedAt != null,
    related: relatedDocs.map((r) => ({
      slug: r.slug,
      name: r.name,
      emoji: r.logoEmoji,
      gradient: r.logoGradient,
      tagline: r.tagline,
      editorsPick: r.editorsPick === 1,
      logoUrl: r.logoUrl,
    })),
    reviews: { count: stats.count, aggregate: stats.aggregate },
    comments: comRows.length,
    viewer: (() => {
      if (viewerEmail == null) return null;
      const myReview =
        viewerUserId != null ? (revRows.find((r) => r.userId === viewerUserId) ?? null) : null;
      const savedIn = collRows
        .flatMap((c) => {
          const positions = items
            .filter((i) => i.collectionId === c.id && i.toolId === tool.id)
            .map((i) => i.position);
          if (c.ownerEmail !== viewerEmail || positions.length === 0) return [];
          return [{ slug: c.slug, name: c.name, position: Math.min(...positions) }];
        })
        .sort((a, b) => a.position - b.position)
        .slice(0, 50)
        .map(({ slug, name }) => ({ slug, name }));
      return {
        following: followsRows.length > 0,
        claim: myClaim
          ? {
              id: docId(myClaim),
              status: myClaim.status,
              method: myClaim.method,
              token: myClaim.token,
              note: myClaim.note,
              createdAt: isoFromMs(myClaim.createdAt),
              verifiedAt: myClaim.verifiedAt != null ? isoFromMs(myClaim.verifiedAt) : null,
            }
          : null,
        myReview: myReview
          ? {
              id: docId(myReview),
              ease: myReview.ease,
              power: myReview.power,
              value: myReview.value,
              body: myReview.body,
              status: myReview.status,
            }
          : null,
        savedIn,
        maker: { claimed: tool.claimed === 1, makerEmail: tool.makerEmail, makerHandle: tool.makerHandle },
      };
    })(),
  };
}

// ── Journal ──
export async function d1BlogList(limit: number, category?: string | null) {
  const db = await getD1();
  if (!db) return null;
  const pub = await db.select().from(posts).where(eq(posts.status, "published"));
  if (pub.length === 0) {
    const anyPosts = await db.select({ id: posts.id }).from(posts).limit(1);
    if (anyPosts.length === 0) return null;
  }
  const filtered =
    category != null && category !== "" ? pub.filter((p) => p.category === category) : pub;
  filtered.sort((a, b) => (b.publishedAt ?? -1) - (a.publishedAt ?? -1));
  return {
    posts: filtered.slice(0, limit).map((p) => ({
      id: docId(p),
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      category: p.category,
      tags: parseArr(p.tagsJson),
      coverEmoji: p.coverEmoji,
      coverGradient: p.coverGradient,
      author: p.author,
      readingMinutes: p.readingMinutes,
      publishedAt: p.publishedAt != null ? isoFromMs(p.publishedAt) : null,
      coverUrl: p.coverUrl,
    })),
  };
}

export async function d1BlogDetail(slug: string) {
  const db = await getD1();
  if (!db) return null;
  const post = (await db.select().from(posts).where(eq(posts.slug, slug)).limit(1))[0];
  if (!post || post.status !== "published") return { error: "Post not found" as const };
  const pub = await db.select().from(posts).where(eq(posts.status, "published")).limit(50);
  const related = pub
    .filter((p) => p.category === post.category && p.slug !== post.slug)
    .sort((a, b) => (b.publishedAt ?? -1) - (a.publishedAt ?? -1))
    .slice(0, 3)
    .map((r) => ({
      id: docId(r),
      slug: r.slug,
      title: r.title,
      coverEmoji: r.coverEmoji,
      coverGradient: r.coverGradient,
      readingMinutes: r.readingMinutes,
      category: r.category,
      coverUrl: r.coverUrl,
    }));
  return {
    post: {
      id: docId(post),
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      body: post.body,
      category: post.category,
      tags: parseArr(post.tagsJson),
      coverEmoji: post.coverEmoji,
      coverGradient: post.coverGradient,
      author: post.author,
      status: post.status,
      readingMinutes: post.readingMinutes,
      views: post.views,
      seoTitle: post.seoTitle,
      seoDescription: post.seoDescription,
      keywords: post.keywords,
      publishedAt: post.publishedAt != null ? isoFromMs(post.publishedAt) : null,
      updatedAt: isoFromMs(post.updatedAt),
      coverUrl: post.coverUrl,
    },
    related,
  };
}

export async function d1RssPosts(limit: number) {
  const db = await getD1();
  if (!db) return null;
  const pub = await db.select().from(posts).where(eq(posts.status, "published"));
  if (pub.length === 0) return null;
  return pub
    .sort((a, b) => (b.publishedAt ?? -1) - (a.publishedAt ?? -1))
    .slice(0, limit)
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      category: p.category,
      publishedAt: p.publishedAt != null ? isoFromMs(p.publishedAt) : null,
      updatedAt: isoFromMs(p.updatedAt),
    }));
}

export async function d1OgTool(slug: string) {
  const db = await getD1();
  if (!db) return null;
  const tool = (await db.select().from(tools).where(eq(tools.slug, slug)).limit(1))[0];
  if (!tool) return null;
  const cat = (await db.select().from(categories).where(eq(categories.id, tool.categoryId)).limit(1))[0];
  if (!cat) return null;
  return {
    name: tool.name,
    tagline: tool.tagline,
    emoji: tool.logoEmoji,
    gradient: tool.logoGradient,
    logoUrl: tool.logoUrl,
    category: { slug: cat.slug, name: cat.name, emoji: cat.emoji },
    editorsPick: tool.editorsPick === 1,
  };
}

export async function d1OgPost(slug: string) {
  const db = await getD1();
  if (!db) return null;
  const post = (await db.select().from(posts).where(eq(posts.slug, slug)).limit(1))[0];
  if (!post || post.status !== "published") return null;
  return {
    title: post.title,
    excerpt: post.excerpt,
    emoji: post.coverEmoji,
    gradient: post.coverGradient,
    category: post.category,
    readingMinutes: post.readingMinutes,
  };
}

export async function d1AdvertiseStats() {
  const db = await getD1();
  if (!db) return null;
  const [live, revRows, pub] = await Promise.all([
    db.select({ id: tools.id }).from(tools).where(eq(tools.status, "live")),
    db.select({ id: reviews.id }).from(reviews).where(eq(reviews.status, "published")).limit(500),
    db.select({ id: posts.id }).from(posts).where(eq(posts.status, "published")),
  ]);
  if (live.length === 0) return null;
  return { tools: live.length, reviews: revRows.length, posts: pub.length };
}

export async function d1MetaEntities(args: {
  toolSlug?: string;
  postSlug?: string;
  categorySlug?: string;
  collectionSlug?: string;
  compareA?: string;
  compareB?: string;
}) {
  const db = await getD1();
  if (!db) return null;
  const requestedSlugs = [args.toolSlug, args.compareA, args.compareB].filter((s): s is string => !!s);
  const foundTools: (typeof tools.$inferSelect)[] =
    requestedSlugs.length > 0
      ? await db.select().from(tools).where(inArray(tools.slug, requestedSlugs))
      : [];
  const [post, category, collection] = await Promise.all([
    args.postSlug
      ? db.select().from(posts).where(eq(posts.slug, args.postSlug)).limit(1).then((r) => r[0] ?? null)
      : Promise.resolve(null),
    args.categorySlug
      ? db.select().from(categories).where(eq(categories.slug, args.categorySlug)).limit(1).then((r) => r[0] ?? null)
      : Promise.resolve(null),
    args.collectionSlug
      ? db.select().from(collections).where(eq(collections.slug, args.collectionSlug)).limit(1).then((r) => r[0] ?? null)
      : Promise.resolve(null),
  ]);
  if (foundTools.length === 0 && !post && !category && !collection) {
    const anyTool = await db.select({ id: tools.id }).from(tools).limit(1);
    if (anyTool.length === 0) return null;
  }
  const toolBySlug = new Map(foundTools.map((t) => [t.slug, t]));
  const pickTool = async (slug?: string) => {
    const t = slug ? toolBySlug.get(slug) : undefined;
    if (!t) return null;
    const cat = (await db.select().from(categories).where(eq(categories.id, t.categoryId)).limit(1))[0];
    return {
      slug: t.slug,
      name: t.name,
      tagline: t.tagline,
      description: t.description,
      pricingModel: t.pricingModel,
      category: { name: cat?.name ?? "" },
    };
  };
  return {
    tool: await pickTool(args.toolSlug),
    post: post
      ? {
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          seoTitle: post.seoTitle,
          seoDescription: post.seoDescription,
          keywords: post.keywords,
          status: post.status,
          author: post.author,
          publishedAt: post.publishedAt != null ? isoFromMs(post.publishedAt) : null,
        }
      : null,
    category: category ? { slug: category.slug, name: category.name, toolCount: 0 } : null,
    collection: collection
      ? {
          slug: collection.slug,
          name: collection.name,
          description: collection.description,
          isPublic: collection.isPublic === 1,
          ownerName: collection.ownerName,
          itemCount: 0,
        }
      : null,
    compareA: await pickTool(args.compareA),
    compareB: await pickTool(args.compareB),
  };
}

export async function d1BadgeTool(slug: string) {
  const db = await getD1();
  if (!db) return null;
  const tool = (await db.select().from(tools).where(eq(tools.slug, slug)).limit(1))[0];
  if (!tool || tool.status !== "live") return null;
  const revRows = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.toolId, tool.id), eq(reviews.status, "published")))
    .limit(200);
  const stats = reviewAggregate(revRows.map((r) => ({ ease: r.ease, power: r.power, value: r.value })));
  return {
    slug: tool.slug,
    name: tool.name,
    editorsPick: tool.editorsPick === 1,
    curated: tool.curated === 1,
    claimed: tool.claimed === 1,
    rating: stats.aggregate ? stats.aggregate.overall : null,
    reviewCount: revRows.length,
  };
}

export async function d1Serp(q: string, page: number, pageSize: number) {
  const db = await import("./queries2").then((m) =>
    m.d1Directory({
      categorySlug: null,
      q,
      pricing: null,
      tag: null,
      sort: "featured",
      page,
      pageSize,
    }),
  );
  if (!db || "error" in db) return db;
  return {
    rows: db.rows.map((r: { slug: string; name: string; tagline: string; logoUrl: string | null; editorsPick: boolean; pricing: { model: string }; category: unknown; listedAt: string }) => ({
      slug: r.slug,
      name: r.name,
      tagline: r.tagline,
      emoji: undefined,
      gradient: undefined,
      logoUrl: r.logoUrl,
      editorsPick: r.editorsPick,
      pricingModel: r.pricing.model,
      category: r.category,
      listedAt: r.listedAt,
    })),
    total: db.total,
    page: db.page,
    pages: db.pages,
  };
}

// ── Forum list ──
export async function d1ForumList(topic: string, sort: "hot" | "new" | "top", voterKey?: string) {
  const db = await getD1();
  if (!db) return null;
  const threads =
    topic === "all"
      ? await db.select().from(forumThreads).orderBy(desc(forumThreads.createdAt)).limit(100)
      : await db
          .select()
          .from(forumThreads)
          .where(eq(forumThreads.topic, topic))
          .orderBy(desc(forumThreads.createdAt))
          .limit(100);
  const anyCheck = threads.length === 0 ? await db.select({ id: forumThreads.id }).from(forumThreads).limit(1) : [{ id: "x" }];
  if (anyCheck.length === 0) return null;
  const visible = threads.filter((t) => !t.hidden);
  const inTopic = topic === "all" ? visible : visible.filter((t) => t.topic === topic);

  let votedSet = new Set<string>();
  if (voterKey) {
    const checks = await Promise.all(
      inTopic.slice(0, 50).map((t) =>
        db
          .select({ id: forumThreadVotes.id })
          .from(forumThreadVotes)
          .where(and(eq(forumThreadVotes.threadId, t.id), eq(forumThreadVotes.voterKey, voterKey)))
          .limit(1),
      ),
    );
    checks.forEach((rows, idx) => {
      if (rows.length > 0) votedSet.add(inTopic[idx]!.id);
    });
  }

  const rows = inTopic.map((t) => ({
    id: docId(t),
    slug: t.slug,
    title: t.title,
    body: t.body,
    topic: asForumTopic(t.topic),
    author: t.author,
    pinned: t.pinned === 1,
    votes: t.baseUpvotes + t.voteCount,
    voted: votedSet.has(t.id),
    replyCount: t.replyCount ?? 0,
    createdAt: isoFromMs(t.createdAt),
    _c: t.createdAt,
  }));

  const pinnedFirst = (a: (typeof rows)[number], b: (typeof rows)[number]) =>
    Number(b.pinned) - Number(a.pinned);
  const byNewest = (a: (typeof rows)[number], b: (typeof rows)[number]) =>
    b.createdAt.localeCompare(a.createdAt) || a._c - b._c;
  if (sort === "new") rows.sort(byNewest);
  else if (sort === "top") rows.sort((a, b) => pinnedFirst(a, b) || b.votes - a.votes || byNewest(a, b));
  else {
    const now = Date.now();
    rows.sort((a, b) => pinnedFirst(a, b) || rankScore(b.votes, new Date(b.createdAt).getTime(), now) - rankScore(a.votes, new Date(a.createdAt).getTime(), now) || byNewest(a, b));
  }
  const stripped = rows.map(({ _c, ...rest }) => {
    void _c;
    return rest;
  });
  const counts: Record<"all" | (typeof FORUM_TOPICS)[number], number> = {
    all: 0,
    general: 0,
    vibecoding: 0,
    show: 0,
    introduce: 0,
  };
  for (const t of visible) {
    counts.all += 1;
    const parsed = asForumTopic(t.topic);
    if (t.topic === parsed) counts[parsed] += 1;
  }
  return { threads: stripped, counts };
}

// ── Forum thread ──
export async function d1ForumThread(slug: string, voterKey?: string) {
  const db = await getD1();
  if (!db) return null;
  const thread = (await db.select().from(forumThreads).where(eq(forumThreads.slug, slug)).limit(1))[0];
  if (!thread) return null;
  if (thread.hidden) return { hidden: true as const };
  const [replies, votes] = await Promise.all([
    db
      .select()
      .from(forumReplies)
      .where(eq(forumReplies.threadId, thread.id))
      .orderBy(asc(forumReplies.createdAt))
      .limit(500),
    db.select().from(forumThreadVotes).where(eq(forumThreadVotes.threadId, thread.id)).limit(2000),
  ]);
  const visible = replies.filter((r) => !r.hidden).slice(0, 500);
  const voted = voterKey != null && votes.some((x) => x.voterKey === voterKey);
  return {
    thread: {
      id: docId(thread),
      slug: thread.slug,
      title: thread.title,
      body: thread.body,
      topic: asForumTopic(thread.topic),
      author: thread.author,
      pinned: thread.pinned === 1,
      votes: thread.baseUpvotes + votes.length,
      voted,
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
    voted,
  };
}

// ── Compare matrix + categories ──
export async function d1CompareCategories() {
  const db = await getD1();
  if (!db) return null;
  const [catRows, live] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
    db.select({ id: tools.id, categoryId: tools.categoryId }).from(tools).where(eq(tools.status, "live")),
  ]);
  if (catRows.length === 0) return null;
  const liveByCat = new Map<string, number>();
  for (const t of live) liveByCat.set(t.categoryId, (liveByCat.get(t.categoryId) ?? 0) + 1);
  return [...catRows]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => ({ slug: c.slug, name: c.name, emoji: c.emoji, toolCount: liveByCat.get(c.id) ?? 0 }));
}

export async function d1CompareMatrix(categorySlug: string, selectedSlugs: string[]) {
  const db: Db = (await getD1())!;
  if (!db) return null;
  const category = (await db.select().from(categories).where(eq(categories.slug, categorySlug)).limit(1))[0];
  if (!category) return { error: "category_not_found" as const };
  const inCategory = await db
    .select()
    .from(tools)
    .where(and(eq(tools.status, "live"), eq(tools.categoryId, category.id)))
    .limit(500);
  const options = [...inCategory]
    .sort(
      (a, b) =>
        b.pinned - a.pinned ||
        Number(b.editorsPick) - Number(a.editorsPick) ||
        b.createdAt - a.createdAt,
    )
    .slice(0, 40)
    .map((o) => ({
      slug: o.slug,
      name: o.name,
      emoji: o.logoEmoji,
      gradient: o.logoGradient,
      tagline: o.tagline,
      pricingModel: o.pricingModel,
      editorsPick: o.editorsPick === 1,
      pinned: o.pinned,
    }));

  const wanted = selectedSlugs.map((s) => s.trim()).filter(Boolean).slice(0, 4);
  const bySlug = new Map(inCategory.map((t) => [t.slug, t]));
  const ordered = wanted.map((s) => bySlug.get(s)).filter((t): t is NonNullable<typeof t> => t != null);

  const toolRows = await Promise.all(
    ordered.map(async (t) => {
      const pub = await db
        .select()
        .from(reviews)
        .where(and(eq(reviews.toolId, t.id), eq(reviews.status, "published")))
        .limit(200);
      const stats = reviewAggregate(pub.map((r) => ({ ease: r.ease, power: r.power, value: r.value })));
      return {
        slug: t.slug,
        name: t.name,
        emoji: t.logoEmoji,
        gradient: t.logoGradient,
        tagline: t.tagline,
        websiteUrl: t.websiteUrl,
        pricing: { model: t.pricingModel, price: t.startingPrice, note: t.pricingNote },
        hasApi: t.hasApi === 1,
        openSource: t.pricingModel === "open_source",
        tags: parseArr(t.tagsJson).slice(0, 5),
        rating: stats.aggregate,
        reviewCount: stats.count,
        features: parseObj(t.featuresJson),
      };
    }),
  );

  return {
    category: {
      slug: category.slug,
      name: category.name,
      emoji: category.emoji,
      features: parseArr(category.featuresJson).slice(0, 12),
    },
    options,
    tools: toolRows,
  };
}

// ── Bookmarks / follows (small indexed reads, Convex shapes) ──
export async function d1BookmarksList(ownerKey: string) {
  const db = await getD1();
  if (!db) return null;
  const rows = await db
    .select()
    .from(bookmarks)
    .where(eq(bookmarks.ownerKey, ownerKey))
    .orderBy(desc(bookmarks.createdAt))
    .limit(200);
  if (rows.length === 0) {
    const anyRows = await db.select({ id: bookmarks.id }).from(bookmarks).limit(1);
    if (anyRows.length === 0) return null;
  }
  const items = [...rows]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 200)
    .map((r) => ({
      id: docId(r),
      targetType: (["tool", "thread", "post"] as readonly string[]).includes(r.targetType)
        ? r.targetType
        : "tool",
      targetId: r.targetId,
      targetLabel: r.targetLabel || r.targetId,
      targetHref: r.targetHref,
      createdAt: isoFromMs(r.createdAt),
    }));
  const [prefix] = ownerKey.split(":");
  return { items, owner: `${prefix}:…` };
}

export async function d1FollowsList(userEmail: string) {
  const db = await getD1();
  if (!db) return null;
  const rows = await db
    .select()
    .from(follows)
    .where(eq(follows.userEmail, userEmail))
    .orderBy(desc(follows.createdAt))
    .limit(500);
  if (rows.length === 0) {
    const anyRows = await db.select({ id: follows.id }).from(follows).limit(1);
    if (anyRows.length === 0) return null;
  }
  return {
    follows: [...rows]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 500)
      .map((r) => ({
        id: docId(r),
        targetType: r.targetType,
        targetId: r.targetId,
        targetLabel: r.targetLabel,
        createdAt: isoFromMs(r.createdAt),
      })),
  };
}
