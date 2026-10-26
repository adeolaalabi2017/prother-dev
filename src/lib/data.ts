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

export async function shadowSite(c: Client | null | undefined) {
  // D1-first (Convex migration wave 1): Workers serve site stats from D1
  // with zero Convex I/O. Local dev without bindings falls back to Convex.
  try {
    const { d1SiteGet } = await import("@/lib/d1/queries");
    const d1 = await d1SiteGet();
    if (d1) return withAnnouncement(d1);
  } catch {
    // fall through to Convex
  }
  if (!c) {
    throw new Error("[data] NEXT_PUBLIC_CONVEX_URL is required; the Prisma/custom.db fallback was retired (Phase A, 2026-10-06).");
  }
  const res = await c.query(api.site.get, {});
  return withAnnouncement(res);
}

function withAnnouncement(res: {
  settings: Record<string, string>;
  stats: { tools: number; categories: number; reviews: number; comments: number };
}) {
  if (res && res.settings && res.stats) {
    const template = res.settings["hero.announcement"];
    if (template) {
      let formatted = template
        .replace(/\{tools\}|\{count\}/gi, String(res.stats.tools))
        .replace(/\{categories\}/gi, String(res.stats.categories));
      if (res.stats.tools > 0) {
        formatted = formatted.replace(/\b\d+(\s+tools\b)/gi, `${res.stats.tools}$1`);
      }
      if (res.stats.categories > 0) {
        formatted = formatted.replace(/\b\d+(\s+categories\b)/gi, `${res.stats.categories}$1`);
      }
      res.settings["hero.announcement"] = formatted;
    }
  }
  return res;
}

import { KNOWN_LOCAL_LOGOS } from "@/lib/logos";
export { KNOWN_LOCAL_LOGOS };

export function cleanLogoUrl(
  raw: string | null | undefined,
  slug: string | null | undefined,
  logoMap?: Map<string, string>,
): string | null {
  if (slug) {
    const fromMap = logoMap?.get(slug);
    if (fromMap && !fromMap.startsWith("/api/media/")) return fromMap;
    const local = KNOWN_LOCAL_LOGOS[slug];
    if (local) return local;
  }
  if (raw && !raw.startsWith("/api/media/")) return raw;
  return null;
}

let cachedLogoMap: { map: Map<string, string>; expiry: number } | null = null;

export async function getToolLogoMap(_c: Client | null | undefined): Promise<Map<string, string>> {
  // I/O HOTFIX (Oct 2026 overage): previously this issued a full
  // `api.tools.directory` (pageSize 200, all live tool docs) on every cold
  // isolate, doubling every shadow* call. Rows already carry logoUrl from
  // their own query, so the map is fallback-only. Serve locals with zero I/O.
  const now = Date.now();
  if (cachedLogoMap && cachedLogoMap.expiry > now) {
    return cachedLogoMap.map;
  }
  const map = new Map<string, string>(Object.entries(KNOWN_LOCAL_LOGOS));
  cachedLogoMap = { map, expiry: now + 3_600_000 };
  return map;
}

export async function shadowTrending(c: Client | null | undefined, window: "week" | "month", limit: number) {
  if (!c) {
    throw new Error("[data] NEXT_PUBLIC_CONVEX_URL is required; the Prisma/custom.db fallback was retired (Phase A, 2026-10-06).");
  }
  const [res, logoMap] = await Promise.all([
    c.query(api.trending.list, { window, limit }),
    getToolLogoMap(c),
  ]);
  if (res && Array.isArray(res.rows)) {
    return {
      ...res,
      rows: res.rows.map((r: any) => ({
        ...r,
        logoUrl: cleanLogoUrl(r.logoUrl, r.slug, logoMap),
      })),
    };
  }
  return res;
}

export async function shadowBlog(c: Client | null | undefined, limit: number, category: string | null) {
  if (!c) return { posts: [] };
  try {
    const { d1BlogList } = await import("@/lib/d1/content");
    const d1 = await d1BlogList(limit, category);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.posts.list, { limit, category: category ?? undefined });
}

export async function shadowSearch(c: Client | null | undefined, q: string) {
  if (!c) {
    throw new Error("[data] NEXT_PUBLIC_CONVEX_URL is required; the Prisma/custom.db fallback was retired (Phase A, 2026-10-06).");
  }
  try {
    const { d1Search } = await import("@/lib/d1/queries2");
    const d1 = await d1Search(q);
    if (d1) {
      const logoMap = await getToolLogoMap(c);
      return {
        ...d1,
        tools: d1.tools.map((t: any) => ({
          ...t,
          logoUrl: cleanLogoUrl(t.logoUrl, t.slug, logoMap),
        })),
      };
    }
  } catch {
    // fall through to Convex
  }
  const [res, logoMap] = await Promise.all([
    c.query(api.search.search, { q }),
    getToolLogoMap(c),
  ]);
  if (res && Array.isArray(res.tools)) {
    return {
      ...res,
      tools: res.tools.map((t: any) => ({
        ...t,
        logoUrl: cleanLogoUrl(t.logoUrl, t.slug, logoMap),
      })),
    };
  }
  return res;
}

export async function shadowToolsDirectory(c: Client | null | undefined,
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
  if (!c) {
    throw new Error("[data] NEXT_PUBLIC_CONVEX_URL is required; the Prisma/custom.db fallback was retired (Phase A, 2026-10-06).");
  }
  // D1-first (migration wave 2). Falls back to Convex when bindings are absent.
  try {
    const { d1Directory } = await import("@/lib/d1/queries2");
    const d1 = await d1Directory(args);
    if (d1 && !("error" in d1)) {
      const logoMap = await getToolLogoMap(c);
      const { categoryMeta, ...rest } = d1 as typeof d1 & { categoryMeta?: { slug: string; name: string } };
      return {
        ...rest,
        rows: (d1 as { rows: any[] }).rows.map((r: any) => ({
          ...r,
          logoUrl: cleanLogoUrl(r.logoUrl, r.slug, logoMap),
        })),
        ...(categoryMeta
          ? { categoryMeta: { ...categoryMeta, blurb: blurbFor(categoryMeta.slug, categoryMeta.name) } }
          : {}),
      };
    }
    if (d1 && "error" in d1) return d1;
  } catch {
    // fall through to Convex
  }
  const [res, logoMap] = await Promise.all([
    c.query(api.tools.directory, {
      categorySlug: args.categorySlug ?? undefined,
      q: args.q ?? undefined,
      pricing: args.pricing ?? undefined,
      tag: args.tag ?? undefined,
      sort: args.sort,
      page: args.page,
      pageSize: args.pageSize,
    }),
    getToolLogoMap(c),
  ]);
  if ("error" in res) return res;
  // categoryMeta is ABSENT (not null) when unscoped — mirror the route.
  // The blurb stays a Next-side presentation constant (lib/category-blurbs).
  const { categoryMeta, ...rest } = res;
  return {
    ...rest,
    rows: res.rows.map((r: any) => ({
      ...r,
      logoUrl: cleanLogoUrl(r.logoUrl, r.slug, logoMap),
    })),
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
  c: Client | null | undefined,
  slug: string,
  viewer?: { id: string; email: string; handle: string } | null,
) {
  if (!c) return shadowToolPageData(c, slug) as any;
  try {
    const { d1ToolDetail } = await import("@/lib/d1/content");
    const d1 = await d1ToolDetail(slug, viewer?.email, viewer?.id);
    if (d1 && !("error" in d1)) {
      const logoMap = await getToolLogoMap(c);
      const { viewer: v, ...rest } = d1;
      return {
        ...rest,
        logoUrl: cleanLogoUrl(rest.logoUrl, rest.slug, logoMap),
        related: Array.isArray(rest.related)
          ? rest.related.map((r: any) => ({
              ...r,
              logoUrl: cleanLogoUrl((r as any).logoUrl, r.slug, logoMap),
            }))
          : rest.related,
        alternatives: Array.isArray(rest.alternatives)
          ? rest.alternatives.map((a: any) => ({
              ...a,
              logoUrl: cleanLogoUrl((a as any).logoUrl, a.slug, logoMap),
            }))
          : rest.alternatives,
        standards: STANDARD_DEFS.map((s) => ({ ...s, passed: true })),
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
    if (d1 && "error" in d1) return d1;
  } catch {
    // fall through to Convex
  }
  const [res, logoMap] = await Promise.all([
    c.query(api.tools.detail, {
      slug,
      viewerEmail: viewer?.email,
      viewerUserId: viewer?.id,
    }),
    getToolLogoMap(c),
  ]);
  if ("error" in res) return res;
  const { viewer: v, ...rest } = res;
  return {
    ...rest,
    logoUrl: cleanLogoUrl(rest.logoUrl, rest.slug, logoMap),
    related: Array.isArray(rest.related)
      ? rest.related.map((r: any) => ({
          ...r,
          logoUrl: cleanLogoUrl((r as any).logoUrl, r.slug, logoMap),
        }))
      : rest.related,
    alternatives: Array.isArray(rest.alternatives)
      ? rest.alternatives.map((a: any) => ({
          ...a,
          logoUrl: cleanLogoUrl((a as any).logoUrl, a.slug, logoMap),
        }))
      : rest.alternatives,
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

export async function shadowCompareMatrix(
  c: Client | null | undefined,
  category: string,
  tools: string[],
) {
  if (!c) return { category: null, tools: [], options: [] } as any;
  if (!category) return { error: "category_required" as const };
  try {
    const { d1CompareMatrix } = await import("@/lib/d1/content");
    const d1 = await d1CompareMatrix(category, tools);
    if (d1 && !("error" in d1)) {
      const logoMap = await getToolLogoMap(c);
      return {
        ...d1,
        options: Array.isArray(d1.options)
          ? d1.options.map((o: any) => ({
              ...o,
              logoUrl: cleanLogoUrl((o as any).logoUrl, o.slug, logoMap),
            }))
          : d1.options,
        tools: Array.isArray(d1.tools)
          ? d1.tools.map((t: any) => ({
              ...t,
              logoUrl: cleanLogoUrl((t as any).logoUrl, t.slug, logoMap),
            }))
          : d1.tools,
      };
    }
    if (d1 && "error" in d1) return d1;
  } catch {
    // fall through to Convex
  }
  const [res, logoMap] = await Promise.all([
    c.query(api.compare.matrix, { category, tools }),
    getToolLogoMap(c),
  ]);
  if (res && !("error" in res)) {
    return {
      ...res,
      options: Array.isArray(res.options)
        ? res.options.map((o: any) => ({
            ...o,
            logoUrl: cleanLogoUrl((o as any).logoUrl, o.slug, logoMap),
          }))
        : res.options,
      tools: Array.isArray(res.tools)
        ? res.tools.map((t: any) => ({
            ...t,
            logoUrl: cleanLogoUrl((t as any).logoUrl, t.slug, logoMap),
          }))
        : res.tools,
    };
  }
  return res;
}

export async function shadowCompareCategories(c: Client | null | undefined) { if (!c) return null as any;
  try {
    const { d1CompareCategories } = await import("@/lib/d1/content");
    const d1 = await d1CompareCategories();
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.compare.categories, {});
}

export async function shadowForumList(
  c: Client,
  topic: string,
  sort: "hot" | "new" | "top",
  voterKey?: string,
) {
  try {
    const { d1ForumList } = await import("@/lib/d1/content");
    const d1 = await d1ForumList(topic, sort, voterKey);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.forum.list, { topic, sort, voterKey });
}

export function shadowAdminOverview(c: Client) { if (!c) return null as any;
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

export async function shadowComments(c: Client, toolSlug: string) { if (!c) return null as any;
  try {
    const { d1CommentsList } = await import("@/lib/d1/community");
    const d1 = await d1CommentsList(toolSlug);
    if (d1 && !("error" in d1)) return d1;
    if (d1 && "error" in d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.community.commentsList, { toolSlug });
}

export async function shadowCommentsLastAge(
  c: Client,
  toolSlug: string,
  author: string,
) {
  try {
    const { d1CommentsLastAge } = await import("@/lib/d1/community");
    const d1 = await d1CommentsLastAge(toolSlug, author);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.community.commentsLastAge, { toolSlug, author });
}

export async function shadowReviewsData(
  c: Client,
  toolSlug: string,
  viewerUserId?: string,
) {
  try {
    const { d1ReviewsData } = await import("@/lib/d1/community");
    const d1 = await d1ReviewsData(toolSlug, viewerUserId);
    if (d1 && !("error" in d1)) return d1;
    if (d1 && "error" in d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.community.reviewsData, {
    toolSlug,
    viewerUserId,
  });
}

export async function shadowForumThread(
  c: Client,
  slug: string,
  voterKey?: string,
) {
  try {
    const { d1ForumThread } = await import("@/lib/d1/content");
    const d1 = await d1ForumThread(slug, voterKey);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.community.forumThread, { slug, voterKey });
}

export async function shadowBookmarks(c: Client, ownerKey: string) { if (!c) return null as any;
  try {
    const { d1BookmarksList } = await import("@/lib/d1/content");
    const d1 = await d1BookmarksList(ownerKey);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.community.bookmarksList, { ownerKey });
}

export async function shadowFollows(c: Client, userEmail: string) { if (!c) return null as any;
  try {
    const { d1FollowsList } = await import("@/lib/d1/content");
    const d1 = await d1FollowsList(userEmail);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.community.followsList, { userEmail });
}

export async function shadowCollectionsMine(c: Client, ownerEmail?: string) { if (!c) return null as any;
  try {
    const { d1CollectionsMine } = await import("@/lib/d1/community");
    const d1 = await d1CollectionsMine(ownerEmail);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.community.collectionsMine, {
    ownerEmail,
  });
}

export async function shadowCollectionDetail(
  c: Client,
  slug: string,
  viewerEmail?: string,
) {
  try {
    const { d1CollectionDetail } = await import("@/lib/d1/community");
    const d1 = await d1CollectionDetail(slug, viewerEmail);
    if (d1 && !("error" in d1)) {
      const logoMap = await getToolLogoMap(c);
      return {
        ...d1,
        collection: {
          ...d1.collection,
          items: d1.collection.items.map((item: any) => ({
            ...item,
            tool: item.tool
              ? {
                  ...item.tool,
                  logoUrl: item.tool.logoUrl ?? logoMap.get(item.tool.slug) ?? null,
                }
              : item.tool,
          })),
        },
      };
    }
    if (d1 && "error" in d1) return d1;
  } catch {
    // fall through to Convex
  }
  const [res, logoMap] = await Promise.all([
    c.query(api.community.collectionDetail, { slug, viewerEmail }),
    getToolLogoMap(c),
  ]);
  if (res && res.collection && Array.isArray(res.collection.items)) {
    return {
      ...res,
      collection: {
        ...res.collection,
        items: res.collection.items.map((item: any) => ({
          ...item,
          tool: item.tool
            ? {
                ...item.tool,
                logoUrl: item.tool.logoUrl ?? logoMap.get(item.tool.slug) ?? null,
              }
            : item.tool,
        })),
      },
    };
  }
  return res;
}

export async function shadowCompareView(
  c: Client | null | undefined,
  aSlug: string,
  bSlug: string,
  limit: number,
) {
  if (!c) return { a: null, b: null, popular: [] } as any;
  try {
    const { d1CompareView } = await import("@/lib/d1/analytics");
    const d1 = await d1CompareView(aSlug, bSlug, limit);
    if (d1 && !("error" in d1)) {
      const logoMap = await getToolLogoMap(c);
      const attach = (t: any) =>
        t ? { ...t, logoUrl: t.logoUrl ?? logoMap.get(t.slug) ?? null } : t;
      return {
        ...d1,
        a: attach((d1 as { a: unknown }).a),
        b: attach((d1 as { b: unknown }).b),
        popular: Array.isArray((d1 as { popular: unknown }).popular)
          ? (d1 as { popular: any[] }).popular.map((p: any) => ({
              ...p,
              aLogoUrl: p.aLogoUrl ?? logoMap.get(p.aSlug) ?? null,
              bLogoUrl: p.bLogoUrl ?? logoMap.get(p.bSlug) ?? null,
            }))
          : (d1 as { popular: unknown }).popular,
      };
    }
    if (d1 && "error" in d1) {
      // Fall through to Convex for the error variant (it carries popular).
    }
  } catch {
    // fall through to Convex
  }
  const [res, logoMap] = await Promise.all([
    c.query(api.community.compareView, { aSlug, bSlug, limit }),
    getToolLogoMap(c),
  ]);
  if (res && !("error" in res)) {
    const attach = (t: any) =>
      t ? { ...t, logoUrl: t.logoUrl ?? logoMap.get(t.slug) ?? null } : t;
    return {
      ...res,
      a: attach(res.a),
      b: attach(res.b),
      popular: Array.isArray(res.popular)
        ? res.popular.map((p: any) => ({
            ...p,
            aLogoUrl: p.aLogoUrl ?? logoMap.get(p.aSlug) ?? null,
            bLogoUrl: p.bLogoUrl ?? logoMap.get(p.bSlug) ?? null,
          }))
        : res.popular,
    };
  }
  return res;
}

export async function shadowToolPageData(c: Client | null | undefined, slug: string) {
  if (!c) {
    throw new Error("[data] NEXT_PUBLIC_CONVEX_URL is required; the Prisma/custom.db fallback was retired (Phase A, 2026-10-06).");
  }
  try {
    const { d1ToolPageData } = await import("@/lib/d1/content");
    const d1 = await d1ToolPageData(slug);
    if (d1 && !("error" in d1)) {
      const logoMap = await getToolLogoMap(c);
      return {
        ...d1,
        logoUrl: d1.logoUrl ?? logoMap.get(d1.tool.slug) ?? null,
        alternatives: Array.isArray(d1.alternatives)
          ? d1.alternatives.map((a: any) => ({
              ...a,
              logoUrl: a.logoUrl ?? logoMap.get(a.slug) ?? null,
            }))
          : d1.alternatives,
        related: Array.isArray(d1.related)
          ? d1.related.map((r: any) => ({
              ...r,
              logoUrl: (r as any).logoUrl ?? logoMap.get(r.slug) ?? null,
            }))
          : d1.related,
      };
    }
    if (d1 && "error" in d1) return d1;
  } catch {
    // fall through to Convex
  }
  const [res, logoMap] = await Promise.all([
    c.query(api.tools.pageData, { slug }),
    getToolLogoMap(c),
  ]);
  if (res && !("error" in res)) {
    return {
      ...res,
      logoUrl: res.logoUrl ?? logoMap.get(res.tool.slug) ?? null,
      alternatives: Array.isArray(res.alternatives)
        ? res.alternatives.map((a: any) => ({
            ...a,
            logoUrl: a.logoUrl ?? logoMap.get(a.slug) ?? null,
          }))
        : res.alternatives,
      related: Array.isArray(res.related)
        ? res.related.map((r: any) => ({
            ...r,
            logoUrl: (r as any).logoUrl ?? logoMap.get(r.slug) ?? null,
          }))
        : res.related,
    };
  }
  return res;
}

// ── Phase 5 — claims flow ──

export async function shadowClaimState(
  c: Client,
  toolSlug: string,
  userEmail?: string,
) {
  try {
    const { d1ClaimState } = await import("@/lib/d1/community");
    const d1 = await d1ClaimState(toolSlug, userEmail);
    if (d1 && !("error" in d1)) return d1;
    if (d1 && "error" in d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.claims.claimState, { toolSlug, userEmail });
}

export async function shadowClaimLatest(
  c: Client,
  toolSlug: string,
  userEmail: string,
) {
  try {
    const { d1ClaimLatest } = await import("@/lib/d1/community");
    const d1 = await d1ClaimLatest(toolSlug, userEmail);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.claims.claimLatest, { toolSlug, userEmail });
}

export async function shadowClaimById(c: Client, id: string) { if (!c) return null as any;
  try {
    const { d1ClaimById } = await import("@/lib/d1/community");
    const d1 = await d1ClaimById(id);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.claims.claimByIdQ, { id });
}

export async function convexClaimInsert(
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
  try {
    const { d1ClaimInsert } = await import("@/lib/d1/community");
    const d1 = await d1ClaimInsert(args);
    if (d1) return d1;
  } catch (e) {
    if (e instanceof Error && (e.message === "tool_not_found" || e.message === "already_claimed" || e.message === "token_taken")) throw e;
  }
  return c.mutation(api.claims.claimInsert, args);
}

export async function convexClaimSettle(
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
  try {
    const { d1ClaimSettle } = await import("@/lib/d1/community");
    const d1 = await d1ClaimSettle(args);
    if (d1) return d1;
  } catch (e) {
    if (e instanceof Error && (e.message === "claim_not_found" || e.message === "tool_not_found")) throw e;
  }
  return c.mutation(api.claims.claimSettle, args);
}

// ── Phase 5 — media library ──

export function shadowMediaTable(
  c: Client,
  args: { kind?: string; purpose?: string; take: number },
) {
  return c.query(api.media.mediaTable, args);
}

export function shadowMediaById(c: Client, id: string) { if (!c) return null as any;
  return c.query(api.media.mediaById, { id });
}

/** Short-lived direct-to-storage upload URL (route PUTs validated bytes). */
export function convexMediaUploadUrl(c: Client) { if (!c) return null as any;
  return c.mutation(api.media.mediaUploadUrl, {});
}

/** Public serve URL for a row's storage bytes (null = disk fallback). */
export function shadowMediaServeUrl(c: Client, id: string) { if (!c) return null as any;
  return c.query(api.media.mediaServeUrl, { id });
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

export function convexMediaDeleteFull(c: Client, args: { id: string }) { if (!c) return null as any;
  return c.mutation(api.media.mediaDeleteFull, args);
}

// ── Phase 5 — remaining SSR surfaces ──

export async function shadowCategoryDetail(c: Client | null | undefined, slug: string) { if (!c) return null as any;
  try {
    const { d1CategoryDetail2 } = await import("@/lib/d1/queries2");
    const d1 = await d1CategoryDetail2(slug);
    if (d1 && "tools" in d1 && Array.isArray(d1.tools)) {
      const logoMap = await getToolLogoMap(c);
      return {
        ...d1,
        tools: d1.tools.map((t: any) => ({
          ...t,
          logoUrl: cleanLogoUrl((t as any).logoUrl, t.slug, logoMap),
        })),
      };
    }
    if (d1 && "error" in d1) return d1;
  } catch {
    // fall through to Convex
  }
  const [res, logoMap] = await Promise.all([
    c.query(api.categories.detail, { slug }),
    getToolLogoMap(c),
  ]);
  if (res && "tools" in res && Array.isArray(res.tools)) {
    return {
      ...res,
      tools: res.tools.map((t: any) => ({
        ...t,
        logoUrl: cleanLogoUrl((t as any).logoUrl, t.slug, logoMap),
      })),
    };
  }
  return res;
}

export async function shadowHomepage(c: Client | null | undefined) { if (!c) return null as any;
  try {
    const { d1Homepage } = await import("@/lib/d1/queries");
    const d1 = await d1Homepage();
    if (d1) {
      const logoMap = await getToolLogoMap(c);
      return {
        ...d1,
        picks: d1.picks.map((p: any) => ({
          ...p,
          logoUrl: cleanLogoUrl(p.logoUrl, p.slug, logoMap),
        })),
      };
    }
  } catch {
    // fall through to Convex
  }
  const [res, logoMap] = await Promise.all([
    c.query(api.tools.homepage, {}),
    getToolLogoMap(c),
  ]);
  if (res && res.picks && Array.isArray(res.picks)) {
    res.picks = res.picks.map((p: any) => ({
      ...p,
      logoUrl: cleanLogoUrl(p.logoUrl, p.slug, logoMap),
    }));
  }
  return res;
}

export function shadowSerp(
  c: Client | null | undefined,
  args: { q: string; page: number; pageSize: number },
) {
  if (!c) return { tools: [] } as any;
  return c.query(api.tools.serp, args);
}

export async function shadowAdvertiseStats(c: Client) { if (!c) return null as any;
  try {
    const { d1AdvertiseStats } = await import("@/lib/d1/content");
    const d1 = await d1AdvertiseStats();
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.seo.advertiseStats, {});
}

export async function shadowMetaEntities(
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
  try {
    const { d1MetaEntities } = await import("@/lib/d1/content");
    const d1 = await d1MetaEntities(args);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.seo.metaEntities, args);
}

export async function shadowJournalList(c: Client, limit: number) { if (!c) return null as any;
  try {
    const { d1BlogList } = await import("@/lib/d1/content");
    const d1 = await d1BlogList(limit, null);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.posts.list, { limit });
}

// ── Phase 4 step 7 — SEO reads + bridge-adjacent writes ──

export async function shadowSitemapData(c: Client) { if (!c) return null as any;
  try {
    const { d1SitemapData } = await import("@/lib/d1/queries2");
    const d1 = await d1SitemapData();
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.seo.sitemapData, {});
}

export async function shadowRssPosts(c: Client, limit: number) { if (!c) return null as any;
  try {
    const { d1RssPosts } = await import("@/lib/d1/content");
    const d1 = await d1RssPosts(limit);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.seo.rssPosts, { limit });
}

export async function shadowOgTool(c: Client, slug: string) { if (!c) return null as any;
  try {
    const { d1OgTool } = await import("@/lib/d1/content");
    const d1 = await d1OgTool(slug);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.seo.ogTool, { slug });
}

export async function shadowOgPost(c: Client, slug: string) { if (!c) return null as any;
  try {
    const { d1OgPost } = await import("@/lib/d1/content");
    const d1 = await d1OgPost(slug);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.seo.ogPost, { slug });
}

export async function shadowBlogDetail(c: Client, slug: string) { if (!c) return null as any;
  try {
    const { d1BlogDetail } = await import("@/lib/d1/content");
    const d1 = await d1BlogDetail(slug);
    if (d1 && !("error" in d1)) return d1;
    if (d1 && "error" in d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.seo.blogDetail, { slug });
}

export async function shadowBadgeTool(c: Client, slug: string) { if (!c) return null as any;
  try {
    const { d1BadgeTool } = await import("@/lib/d1/content");
    const d1 = await d1BadgeTool(slug);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.seo.badgeTool, { slug });
}

export async function convexPostBumpViews(c: Client, args: { slug: string }) { if (!c) return null as any;
  try {
    const { d1PostBumpViews } = await import("@/lib/d1/analytics");
    const d1 = await d1PostBumpViews(args.slug);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.mutation(api.seo.postBumpViews, args);
}

// ── Phase 4 step 6 — admin console reads ──

export async function shadowAdminCategories(c: Client) { if (!c) return null as any;
  try {
    const { d1AdminCategories } = await import("@/lib/d1/admin");
    const d1 = await d1AdminCategories();
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.adminCrud.categoriesTable, {});
}

export async function shadowAdminPosts(c: Client, status: string) { if (!c) return null as any;
  try {
    const { d1AdminPosts } = await import("@/lib/d1/admin");
    const d1 = await d1AdminPosts(status);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.adminCrud.postsTable, { status });
}
export async function shadowAdminUsers(
  c: Client,
  args: { q: string; status: string; role: string; page?: number; size?: number },
) { if (!c) return null as any;
  try {
    const { d1AdminUsers } = await import("@/lib/d1/moderation");
    const d1 = await d1AdminUsers(args);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.adminCrud.usersTable, args);
}

export async function shadowAdminReports(c: Client, status: string) { if (!c) return null as any;
  try {
    const { d1AdminReports } = await import("@/lib/d1/moderation");
    const d1 = await d1AdminReports(status);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.adminCrud.reportsTable, { status });
}

export async function shadowAdminAds(c: Client) { if (!c) return null as any;
  try {
    const { d1AdminAds } = await import("@/lib/d1/admin");
    const d1 = await d1AdminAds();
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.adminCrud.campaignsTable, {});
}

export async function shadowAdminIntegrations(c: Client) { if (!c) return null as any;
  try {
    const { d1AdminIntegrations } = await import("@/lib/d1/admin");
    const d1 = await d1AdminIntegrations();
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.adminCrud.integrationsTable, {});
}

/**
 * Raw stored configJson for the sentinel merge (server-only — never sent
 * to clients; see convex/adminCrud.ts integrationRaw).
 */
export async function shadowAdminIntegrationRaw(c: Client, key: string) { if (!c) return null as any;
  try {
    const { d1AdminIntegrationRaw } = await import("@/lib/d1/admin");
    const d1 = await d1AdminIntegrationRaw(key);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.adminCrud.integrationRaw, { key });
}

export async function shadowAdminSettings(c: Client) { if (!c) return null as any;
  try {
    const { d1AdminSettings } = await import("@/lib/d1/admin");
    const d1 = await d1AdminSettings();
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.adminCrud.settingsTable, {});
}

/** Single settings key read (static page copy). undefined = no store. */
export async function shadowSiteSetting(
  c: Client | null | undefined,
  key: string
): Promise<string | null | undefined> {
  if (!c) return undefined;
  try {
    const { d1SiteSetting } = await import("@/lib/d1/admin");
    const d1 = await d1SiteSetting(key);
    if (d1 !== undefined && d1 !== null) return d1;
    if (d1 === null) return null;
  } catch {
    // fall through to Convex
  }
  return c.query(api.site.getSetting, { key });
}

/** Bulk curate every listing — admin-key enforced route-side. */
export async function convexAdminMarkAllCurated(c: Client) { if (!c) return null as any;
  try {
    const { d1MarkAllCurated } = await import("@/lib/d1/admin");
    const d1 = await d1MarkAllCurated();
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.mutation(api.admin.markAllCurated, {});
}

/** Launch purge (dry-run or execute) — admin-key enforced route-side. */
export function convexAdminPurge(
  c: Client,
  args: { protectedEmail: string; confirm: string; execute: boolean }
) {
  return c.mutation(api.adminPurge.purgeUsers, args);
}

// ── Phase 4 step 6 — admin console writes (dual-write; editor-key enforced
// route-side, ids/timestamps generated once route-side and shared) ──

export async function convexToolCreate(
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
) { if (!c) return null as any;
  try {
    const { d1ToolCreate } = await import("@/lib/d1/admin");
    const d1 = await d1ToolCreate(args);
    if (d1) return d1;
  } catch (e) {
    // Constraint collisions are real: rethrow instead of re-applying the
    // same write against Convex and hiding a genuine slug conflict.
    if (e instanceof Error && (e.message === "slug_taken" || e.message === "category_not_found")) throw e;
  }
  return c.mutation(api.adminCrud.toolCreate, args);
}

export async function convexToolPatch(
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
) { if (!c) return null as any;
  try {
    const { d1ToolPatch } = await import("@/lib/d1/admin");
    // The route builds the ORM-shaped patch 1:1 onto these fields
    // (tagsPipe/categoryLegacyId/verifiedAt converted caller-side), so the
    // runtime shape matches the typed port even though data is wide here.
    const d1 = await d1ToolPatch(args as unknown as Parameters<typeof d1ToolPatch>[0]);
    if (d1) return d1;
  } catch (e) {
    if (e instanceof Error && e.message === "not_found") throw e;
  }
  // The route's ORM-shaped patch maps 1:1 onto the mutation's data fields
  // (tagsPipe/categoryLegacyId/verifiedAt converted by the caller).
  return c.mutation(api.adminCrud.toolPatch, args as never);
}

export async function convexToolRemove(c: Client, args: { toolLegacyId: string }) { if (!c) return null as any;
  try {
    const { d1ToolRemove } = await import("@/lib/d1/admin");
    const d1 = await d1ToolRemove(args.toolLegacyId);
    if (d1) return d1;
  } catch (e) {
    if (e instanceof Error && e.message === "not_found") throw e;
  }
  return c.mutation(api.adminCrud.toolRemove, args);
}

export async function convexCategoryUpsert(
  c: Client,
  args: {
    legacyId: string;
    slug: string;
    name: string;
    emoji: string;
    sortOrder?: number;
    featuresPipe?: string;
  },
) { if (!c) return null as any;
  try {
    const { d1CategoryUpsert } = await import("@/lib/d1/admin");
    const d1 = await d1CategoryUpsert(args);
    if (d1) return d1;
  } catch (e) {
    if (e instanceof Error && e.message === "slug_taken") throw e;
  }
  return c.mutation(api.adminCrud.categoryUpsert, args);
}

export async function convexCategoryDelete(c: Client, args: { legacyId: string }) { if (!c) return null as any;
  try {
    const { d1CategoryDelete } = await import("@/lib/d1/admin");
    const d1 = await d1CategoryDelete(args.legacyId);
    if (d1) return d1;
  } catch (e) {
    // has_tools:N is a content guard — both stores enforce it identically;
    // rethrow rather than cascade into Convex.
    if (e instanceof Error && (e.message === "not_found" || e.message.startsWith("has_tools:"))) throw e;
  }
  return c.mutation(api.adminCrud.categoryDelete, args);
}

export async function convexPostCreate(
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
) { if (!c) return null as any;
  try {
    const { d1PostCreate } = await import("@/lib/d1/admin");
    const d1 = await d1PostCreate(args);
    if (d1) return d1;
  } catch (e) {
    if (e instanceof Error && e.message === "slug_taken") throw e;
  }
  return c.mutation(api.adminCrud.postCreate, args);
}

export async function convexPostPatch(
  c: Client,
  args: {
    postLegacyId: string;
    data: Record<string, unknown>;
    coverUrl?: string | null;
  },
) { if (!c) return null as any;
  try {
    const { d1PostPatch } = await import("@/lib/d1/admin");
    const d1 = await d1PostPatch(args as unknown as Parameters<typeof d1PostPatch>[0]);
    if (d1) return d1;
  } catch (e) {
    if (e instanceof Error && e.message === "not_found") throw e;
  }
  return c.mutation(api.adminCrud.postPatch, args as never);
}

export async function convexPostDelete(c: Client, args: { postLegacyId: string }) { if (!c) return null as any;
  try {
    const { d1PostDelete } = await import("@/lib/d1/admin");
    const d1 = await d1PostDelete(args.postLegacyId);
    if (d1) return d1;
  } catch (e) {
    if (e instanceof Error && e.message === "not_found") throw e;
  }
  return c.mutation(api.adminCrud.postDelete, args);
}

export async function shadowAdminUserDetail(c: Client, userId: string) { if (!c) return null as any;
  try {
    const { d1UserDetail } = await import("@/lib/d1/moderation");
    const d1 = await d1UserDetail(userId);
    if (d1) return d1;
  } catch (e) {
    if (e instanceof Error && e.message === "not_found") throw e;
  }
  return c.query(api.adminCrud.userDetail, { userId });
}

export async function shadowUserBanSweep(
  c: Client,
  args: { userLegacyId: string; hide: boolean },
) { if (!c) return null as any;
  try {
    const { d1UserBanSweep } = await import("@/lib/d1/moderation");
    const d1 = await d1UserBanSweep(args);
    if (d1) return d1;
  } catch (e) {
    if (e instanceof Error && e.message === "not_found") throw e;
  }
  return c.mutation(api.adminCrud.userBanSweep, args);
}

export async function convexUserModerate(
  c: Client,
  args: {
    userLegacyId: string;
    role?: string;
    status?: string;
    image?: string | null;
  },
) { if (!c) return null as any;
  try {
    const { d1UserModerate } = await import("@/lib/d1/moderation");
    const d1 = await d1UserModerate(args);
    if (d1) return d1;
  } catch (e) {
    if (e instanceof Error && e.message === "not_found") throw e;
  }
  return c.mutation(api.adminCrud.userModerate, args);
}

export async function convexReportResolve(
  c: Client,
  args: {
    reportLegacyId: string;
    status: string;
    note?: string;
    hideTarget?: boolean;
    nowMs: number;
  },
) { if (!c) return null as any;
  try {
    const { d1ReportResolve } = await import("@/lib/d1/moderation");
    const d1 = await d1ReportResolve(args);
    if (d1) return d1;
  } catch (e) {
    if (e instanceof Error && e.message === "not_found") throw e;
  }
  return c.mutation(api.adminCrud.reportResolve, args);
}

export async function convexCampaignCreate(
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
) { if (!c) return null as any;
  try {
    const { d1CampaignCreate } = await import("@/lib/d1/admin");
    const d1 = await d1CampaignCreate(args);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.mutation(api.adminCrud.campaignCreate, args);
}

export async function convexCampaignPatch(
  c: Client,
  args: {
    campaignLegacyId: string;
    patch: Record<string, unknown>;
    nowMs: number;
  },
) { if (!c) return null as any;
  try {
    const { d1CampaignPatch } = await import("@/lib/d1/admin");
    const d1 = await d1CampaignPatch(args as unknown as Parameters<typeof d1CampaignPatch>[0]);
    if (d1) return d1;
  } catch (e) {
    if (e instanceof Error && e.message === "not_found") throw e;
  }
  return c.mutation(api.adminCrud.campaignPatch, args as never);
}

export async function convexCampaignDelete(
  c: Client,
  args: { campaignLegacyId: string },
) { if (!c) return null as any;
  try {
    const { d1CampaignDelete } = await import("@/lib/d1/admin");
    const d1 = await d1CampaignDelete(args.campaignLegacyId);
    if (d1) return d1;
  } catch (e) {
    if (e instanceof Error && e.message === "not_found") throw e;
  }
  return c.mutation(api.adminCrud.campaignDelete, args);
}

export async function convexIntegrationUpsert(
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
) { if (!c) return null as any;
  try {
    const { d1IntegrationUpsert } = await import("@/lib/d1/admin");
    const d1 = await d1IntegrationUpsert(args);
    if (d1) return d1;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("key must be 2-41 chars")) throw e;
  }
  return c.mutation(api.adminCrud.integrationUpsert, args);
}

export async function convexIntegrationDelete(c: Client, args: { key: string }) { if (!c) return null as any;
  try {
    const { d1IntegrationDelete } = await import("@/lib/d1/admin");
    const d1 = await d1IntegrationDelete(args.key);
    if (d1) return d1;
  } catch (e) {
    if (e instanceof Error && e.message === "not_found") throw e;
  }
  return c.mutation(api.adminCrud.integrationDelete, args);
}

export async function convexSettingsPut(
  c: Client,
  args: { entries: { key: string; value: string }[] },
) { if (!c) return null as any;
  try {
    const { d1SettingsPut } = await import("@/lib/d1/admin");
    const d1 = await d1SettingsPut(args.entries);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.mutation(api.adminCrud.settingsPut, args);
}

// ── Phase 4 step 5 — ads + analytics (D1-primary since migration wave 3) ──

export async function convexAdServe(
  c: Client,
  args: { placement: string; category?: string },
) {
  try {
    const { d1AdServe } = await import("@/lib/d1/analytics");
    const d1 = await d1AdServe(args.placement, args.category);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.mutation(api.ads.serve, args);
}

export async function convexAdClick(c: Client, args: { id: string }) { if (!c) return null as any;
  try {
    const { d1AdClick } = await import("@/lib/d1/analytics");
    const d1 = await d1AdClick(args.id);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.mutation(api.ads.registerClick, args);
}

export async function convexAdViewable(c: Client, args: { id: string }) { if (!c) return null as any;
  try {
    const { d1AdViewable } = await import("@/lib/d1/analytics");
    const d1 = await d1AdViewable(args.id);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.mutation(api.ads.recordViewable, args);
}

export async function convexPageView(
  c: Client,
  args: { path: string; day: string; nowMs: number },
) {
  try {
    const { d1RecordPageView } = await import("@/lib/d1/analytics");
    const d1 = await d1RecordPageView(args.path, args.day, args.nowMs);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.mutation(api.ads.recordPageView, args);
}

export async function shadowPageViewSource(
  c: Client,
  args: { source: string; device: string; day: string; nowMs: number },
) {
  try {
    const { d1RecordPageViewSource } = await import("@/lib/d1/analytics");
    const d1 = await d1RecordPageViewSource(args.source, args.device, args.day, args.nowMs);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.mutation(api.ads.recordPageViewSource, args);
}

export async function shadowSearchLog(
  c: Client,
  args: { query: string; zero: boolean; day: string; nowMs: number },
) {
  try {
    const { d1RecordSearch } = await import("@/lib/d1/analytics");
    const d1 = await d1RecordSearch(args.query, args.zero, args.day, args.nowMs);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.mutation(api.ads.recordSearch, args);
}

export async function shadowErrorLog(
  c: Client,
  args: { sig: string; day: string; nowMs: number },
) {
  try {
    const { d1RecordError } = await import("@/lib/d1/analytics");
    const d1 = await d1RecordError(args.sig, args.day, args.nowMs);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.mutation(api.ads.recordError, args);
}

export async function shadowTrafficReadout(c: Client) { if (!c) return null as any;
  try {
    const { d1TrafficReadout } = await import("@/lib/d1/analytics");
    const d1 = await d1TrafficReadout();
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.ads.trafficReadout, {});
}

export async function shadowPlacementMeasurement(c: Client) { if (!c) return null as any;
  try {
    const { d1PlacementMeasurement } = await import("@/lib/d1/analytics");
    const d1 = await d1PlacementMeasurement();
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.ads.placementMeasurement, {});
}

// ── Phase 4 step 4 — submit flow + editor console ──

export async function shadowSubmitCheck(c: Client, domain: string) { if (!c) return null as any;
  try {
    const { d1SubmitCheck } = await import("@/lib/d1/community");
    const d1 = await d1SubmitCheck(domain);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.submissions.checkDuplicate, { domain });
}

export async function shadowSubmissionCountSince(
  c: Client,
  email: string,
  sinceMs: number,
) {
  try {
    const { d1SubmissionCountSince } = await import("@/lib/d1/community");
    const d1 = await d1SubmissionCountSince(email, sinceMs);
    if (d1 !== null) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.submissions.submissionCountSince, { email, sinceMs });
}

export async function shadowSubmissionsByEmail(c: Client, email: string) { if (!c) return null as any;
  try {
    const { d1SubmissionsByEmail } = await import("@/lib/d1/community");
    const d1 = await d1SubmissionsByEmail(email);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.submissions.submissionsByEmail, { email });
}

export async function shadowEditorQueue(c: Client) { if (!c) return null as any;
  try {
    const { d1EditorQueue } = await import("@/lib/d1/community");
    const d1 = await d1EditorQueue();
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.submissions.editorQueue, {});
}

export async function convexSubmissionCreate(
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
  try {
    const { d1SubmissionCreate } = await import("@/lib/d1/community");
    const d1 = await d1SubmissionCreate(args);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.mutation(api.submissions.submissionCreate, args);
}

export async function convexEditorDecide(
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
) { if (!c) return null as any;
  try {
    const { d1EditorDecide } = await import("@/lib/d1/community");
    const d1 = await d1EditorDecide(args);
    if (d1) return d1;
  } catch (e) {
    // Hard states: rethrowing keeps the editor facing the real constraint
    // (unknown category, slug collision, double decision) instead of the
    // same write silently re-applied to Convex.
    if (
      e instanceof Error &&
      (e.message === "submission_not_found" ||
        e.message.startsWith("already_") ||
        e.message === "unknown_category" ||
        e.message === "slug_taken")
    )
      throw e;
  }
  return c.mutation(api.submissions.editorDecide, args);
}

export async function convexArbitrateClaim(
  c: Client,
  args: {
    claimId: string;
    action: "verify" | "dismiss";
    note?: string;
    email?: string;
    handle?: string;
    now: number;
  },
) { if (!c) return null as any;
  try {
    const { d1ArbitrateClaim } = await import("@/lib/d1/community");
    const d1 = await d1ArbitrateClaim(args);
    if (d1) return d1;
  } catch (e) {
    if (
      e instanceof Error &&
      (e.message === "claim_not_found" ||
        e.message === "tool_not_found" ||
        e.message === "already_claimed")
    )
      throw e;
  }
  return c.mutation(api.submissions.arbitrateClaim, args);
}

export async function convexArbitrateReview(
  c: Client,
  args: {
    reviewId: string;
    action: "publish" | "spam";
    now: number;
  },
) { if (!c) return null as any;
  try {
    const { d1ArbitrateReview } = await import("@/lib/d1/community");
    const d1 = await d1ArbitrateReview(args);
    if (d1) return d1;
  } catch (e) {
    if (e instanceof Error && e.message === "review_not_found") throw e;
  }
  return c.mutation(api.submissions.arbitrateReview, args);
}

// ── Phase 4 step 3 — community writes (dual-write).
// The route generates id/timestamps ONCE and passes them to both stores.
// Mutations trust route-enforced auth (see convex/community.ts header).

export async function convexCommentAdd(
  c: Client,
  args: {
    id: string;
    toolSlug: string;
    author: string;
    body: string;
    createdAt: number;
    authenticatedUserEmail?: string;
  },
) {
  try {
    const { d1CommentAdd } = await import("@/lib/d1/community");
    const d1 = await d1CommentAdd(args);
    if (d1) return d1;
  } catch (e) {
    // fall through to Convex unless D1 threw a domain error the route must see
    if (
      e instanceof Error &&
      (e.message === "tool_not_found" || e.message === "maker_handle_reserved")
    ) {
      throw e;
    }
  }
  return c.mutation(api.community.commentAdd, args);
}

export async function convexReviewUpsert(
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
  try {
    const { d1ReviewUpsert } = await import("@/lib/d1/community");
    const d1 = await d1ReviewUpsert(args);
    if (d1) return d1;
  } catch (e) {
    if (e instanceof Error && (e.message === "tool_not_found")) throw e;
  }
  return c.mutation(api.community.reviewUpsert, args);
}

export async function convexThreadCreate(
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
  try {
    const { d1ThreadCreate } = await import("@/lib/d1/community");
    const d1 = await d1ThreadCreate(args);
    if (d1) return d1;
  } catch (e) {
    if (e instanceof Error && (e.message === "slug_taken")) throw e;
  }
  return c.mutation(api.community.threadCreate, args);
}

export async function convexReplyCreate(
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
  try {
    const { d1ReplyCreate } = await import("@/lib/d1/community");
    const d1 = await d1ReplyCreate(args);
    if (d1) return d1;
  } catch (e) {
    if (e instanceof Error && (e.message === "thread_not_found")) throw e;
  }
  return c.mutation(api.community.replyCreate, args);
}

export async function convexVoteToggle(
  c: Client,
  args: { threadSlug: string; voterKey: string },
) {
  try {
    const { d1VoteToggle } = await import("@/lib/d1/community");
    const d1 = await d1VoteToggle(args.threadSlug, args.voterKey);
    if (d1) return d1;
  } catch (e) {
    if (e instanceof Error && (e.message === "thread_not_found")) throw e;
  }
  return c.mutation(api.community.voteToggle, args);
}

export async function convexBookmarkToggle(
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
  try {
    const { d1BookmarkToggle } = await import("@/lib/d1/community");
    const d1 = await d1BookmarkToggle(args);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.mutation(api.community.bookmarkToggle, args);
}

export async function convexFollowToggle(
  c: Client,
  args: {
    userEmail: string;
    targetType: string;
    targetId: string;
    targetLabel: string;
  },
) {
  try {
    const { d1FollowToggle } = await import("@/lib/d1/community");
    const d1 = await d1FollowToggle(args);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.mutation(api.community.followToggle, args);
}

export async function convexCollectionCreate(
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
  try {
    const { d1CollectionCreate } = await import("@/lib/d1/community");
    const d1 = await d1CollectionCreate(args);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.mutation(api.community.collectionCreate, args);
}

export async function convexCollectionUpdate(
  c: Client,
  args: {
    slug: string;
    name?: string;
    description?: string;
    isPublic?: boolean;
  },
) {
  try {
    const { d1CollectionUpdate } = await import("@/lib/d1/community");
    const d1 = await d1CollectionUpdate(args);
    if (d1) return d1;
  } catch (e) {
    if (e instanceof Error && (e.message === "not_found")) throw e;
  }
  return c.mutation(api.community.collectionUpdate, args);
}

export async function convexCollectionDelete(c: Client, args: { slug: string }) { if (!c) return null as any;
  try {
    const { d1CollectionDelete } = await import("@/lib/d1/community");
    const d1 = await d1CollectionDelete(args.slug);
    if (d1) return d1;
  } catch (e) {
    if (e instanceof Error && (e.message === "not_found")) throw e;
  }
  return c.mutation(api.community.collectionDelete, args);
}

export async function convexCollectionItemToggle(
  c: Client,
  args: {
    id: string;
    collectionSlug: string;
    toolSlug: string;
    createdAt: number;
  },
) {
  try {
    const { d1CollectionItemToggle } = await import("@/lib/d1/community");
    const d1 = await d1CollectionItemToggle(args);
    if (d1) return d1;
  } catch (e) {
    if (e instanceof Error && (e.message === "not_found" || e.message === "tool_not_found")) throw e;
  }
  return c.mutation(api.community.collectionItemToggle, args);
}

export async function convexReportCreate(
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
  try {
    const { d1ReportCreate } = await import("@/lib/d1/community");
    const d1 = await d1ReportCreate(args);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.mutation(api.community.reportCreate, args);
}

export async function convexCompareBump(
  c: Client,
  args: { aSlug: string; bSlug: string },
) {
  try {
    const { d1CompareBump } = await import("@/lib/d1/analytics");
    const d1 = await d1CompareBump(args.aSlug, args.bSlug);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.mutation(api.community.compareBump, args);
}

// ── Auth phase (option C): NextAuth store (see convex/authStore.ts) ──
// Reads AND writes lead D1 together (src/lib/d1/auth.ts): the NextAuth
// adapter resolves sessions per request cycle, so a split store would
// randomly drop live sessions. Any D1 absence/failure falls back to the
// Convex functions below; resync keeps the two convergent during the
// dual-run window.

export async function convexAuthUserById(c: Client, id: string) {
  try {
    const { d1AuthUserById } = await import("@/lib/d1/auth");
    const d1 = await d1AuthUserById(id);
    if (d1 !== null) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.authStore.authUserById, { id });
}

export async function convexAuthUserByEmail(c: Client, email: string) { if (!c) return null as any;
  try {
    const { d1AuthUserByEmail } = await import("@/lib/d1/auth");
    const d1 = await d1AuthUserByEmail(email);
    if (d1 !== null) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.authStore.authUserByEmail, { email });
}

export async function convexAuthUserByAccount(
  c: Client,
  args: { provider: string; providerAccountId: string },
) {
  try {
    const { d1AuthUserByAccount } = await import("@/lib/d1/auth");
    const d1 = await d1AuthUserByAccount(args.provider, args.providerAccountId);
    if (d1 !== null) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.authStore.authUserByAccount, args);
}

export async function convexAuthHandlesTaken(c: Client) { if (!c) return null as any;
  try {
    const { d1AuthHandlesTaken } = await import("@/lib/d1/auth");
    const d1 = await d1AuthHandlesTaken();
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.authStore.authHandlesTaken, {});
}

export async function convexAuthUserByHandle(c: Client, handle: string) { if (!c) return null as any;
  try {
    const { d1AuthUserByHandle } = await import("@/lib/d1/auth");
    const d1 = await d1AuthUserByHandle(handle);
    if (d1 !== null) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.authStore.authUserByHandle, { handle });
}

export async function convexAuthUserCreate(
  c: Client,
  args: {
    id: string;
    name?: string | null;
    email?: string | null;
    emailVerified?: number | null;
    image?: string | null;
    handle?: string | null;
    createdAt: number;
  },
) {
  try {
    const { d1AuthUserCreate } = await import("@/lib/d1/auth");
    const d1 = await d1AuthUserCreate(args);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.mutation(api.authStore.authUserCreate, args);
}

export async function convexAuthUserPatch(
  c: Client,
  args: {
    id: string;
    name?: string | null;
    email?: string | null;
    emailVerified?: string | null;
    image?: string | null;
    handle?: string | null;
    bio?: string | null;
    coverImage?: string | null;
  },
) {
  try {
    const { d1AuthUserPatch } = await import("@/lib/d1/auth");
    const d1 = await d1AuthUserPatch(args);
    if (d1) return d1;
  } catch {
    // Not found in D1 or any D1 failure → the legacy store owns this user;
    // fall through so the patch lands where the identity actually lives.
  }
  return c.mutation(api.authStore.authUserPatch, args as never);
}

export async function convexAuthAccountLink(
  c: Client,
  args: {
    userLegacyId: string;
    type: string;
    provider: string;
    providerAccountId: string;
    refreshToken?: string | null;
    accessToken?: string | null;
    expiresAt?: number | null;
    tokenType?: string | null;
    scope?: string | null;
    idToken?: string | null;
    sessionState?: string | null;
  },
) {
  try {
    const { d1AuthAccountLink } = await import("@/lib/d1/auth");
    const d1 = await d1AuthAccountLink(args);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.mutation(api.authStore.authAccountLink, args);
}

export async function convexAuthSessionCreate(
  c: Client,
  args: { sessionToken: string; userLegacyId: string; expires: number },
) {
  try {
    const { d1AuthSessionCreate } = await import("@/lib/d1/auth");
    const d1 = await d1AuthSessionCreate(args);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.mutation(api.authStore.authSessionCreate, args);
}

export async function convexAuthSessionAndUser(c: Client, sessionToken: string) { if (!c) return null as any;
  try {
    const { d1AuthSessionAndUser } = await import("@/lib/d1/auth");
    const d1 = await d1AuthSessionAndUser(sessionToken);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.query(api.authStore.authSessionAndUser, { sessionToken });
}

export async function convexAuthSessionPatch(
  c: Client,
  args: { sessionToken: string; expires: number },
) {
  try {
    const { d1AuthSessionPatch } = await import("@/lib/d1/auth");
    const d1 = await d1AuthSessionPatch(args);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.mutation(api.authStore.authSessionPatch, args);
}

export async function convexAuthSessionDelete(c: Client, sessionToken: string) { if (!c) return null as any;
  try {
    const { d1AuthSessionDelete } = await import("@/lib/d1/auth");
    const d1 = await d1AuthSessionDelete(sessionToken);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.mutation(api.authStore.authSessionDelete, { sessionToken });
}

export async function convexAuthSessionsDeleteByUser(c: Client, userLegacyId: string) { if (!c) return null as any;
  try {
    const { d1AuthSessionsDeleteByUser } = await import("@/lib/d1/auth");
    const d1 = await d1AuthSessionsDeleteByUser(userLegacyId);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.mutation(api.authStore.authSessionsDeleteByUser, { userLegacyId });
}

export async function convexAuthVerificationTokenCreate(
  c: Client,
  args: { identifier: string; token: string; expires: number },
) {
  try {
    const { d1AuthVerificationTokenCreate } = await import("@/lib/d1/auth");
    const d1 = await d1AuthVerificationTokenCreate(args);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.mutation(api.authStore.authVerificationTokenCreate, args);
}

export async function convexAuthVerificationTokenConsume(
  c: Client,
  args: { identifier: string; token: string },
) {
  try {
    const { d1AuthVerificationTokenConsume } = await import("@/lib/d1/auth");
    const d1 = await d1AuthVerificationTokenConsume(args);
    if (d1) return d1;
  } catch {
    // fall through to Convex
  }
  return c.mutation(api.authStore.authVerificationTokenConsume, args);
}
