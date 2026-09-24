/**
 * Convex submit flow + editor console (Phase 4 step 4).
 *
 * TRUST MODEL: route handlers enforce validation, rate limits, editor-key
 * auth and lookups BEFORE calling these functions (same as community.ts).
 *
 * DUAL-WRITE CONTRACT: routes generate ids/timestamps once and pass them to
 * both stores. The approve path is the showcase transaction — submission →
 * Tool + submissionId link in ONE atomic mutation (the Prisma original
 * needed three separate statements). No AuditLog row on decision in either
 * store: the current code doesn't write one, and parity wins over the plan
 * sketch (§3.2) until the team decides otherwise.
 *
 * Output ids are Prisma cuids (legacyId); timestamps ship as ISO strings
 * where the current responses carry opaque date values.
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { isoFromMs } from "./shared";

function docId<T extends { legacyId?: string; _id: string }>(d: T): string {
  return d.legacyId ?? d._id;
}

/** Pure port of lib/submit.ts domainOf (registrable-domain rule). */
export function domainOfRaw(rawUrl: string): string | null {
  try {
    const u = new URL(
      /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`,
    );
    return u.hostname.toLowerCase().replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

const TAG_VOCAB = [
  "open-source",
  "free-tier",
  "api-available",
  "self-hosted",
  "no-code",
  "enterprise",
  "browser-extension",
  "mobile",
] as const;

const PRICING_VALUES = ["free", "freemium", "paid", "open_source"] as const;

// ── Duplicate check (GET /api/submit/check) ──

export const checkDuplicate = query({
  args: { domain: v.string() },
  handler: async (ctx, { domain }) => {
    const [tools, submissions] = await Promise.all([
      ctx.db.query("tools").collect(),
      ctx.db.query("submissions").collect(),
    ]);
    const toolHit = tools.find((t) => {
      const u = t.websiteUrl;
      try {
        const host = new URL(/^https?:\/\//i.test(u) ? u : `https://${u}`)
          .hostname.toLowerCase()
          .replace(/^www\./, "");
        return host === domain;
      } catch {
        return false;
      }
    });
    if (toolHit) {
      return {
        valid: true as const,
        duplicate: {
          kind: "tool" as const,
          name: toolHit.name,
          slug: toolHit.slug,
          maker: toolHit.makerHandle,
        },
      };
    }
    const subHit = submissions.find(
      (s) => s.domain === domain && (s.status === "pending" || s.status === "approved"),
    );
    if (subHit) {
      return {
        valid: true as const,
        duplicate: { kind: "submission" as const, name: subHit.name },
      };
    }
    return { valid: true as const, duplicate: null };
  },
});

// ── Email rate-limit count (POST /api/submit guard) ──
export const submissionCountSince = query({
  args: { email: v.string(), sinceMs: v.number() },
  handler: async (ctx, { email, sinceMs }) => {
    const subs = await ctx.db
      .query("submissions")
      .withIndex("by_email", (i) => i.eq("email", email))
      .collect();
    return subs.filter((s) => s.createdAt >= sinceMs).length;
  },
});

/** Single submission by Prisma cuid (editor decision pre-read). */
export const submissionGet = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const subs = await ctx.db.query("submissions").collect();
    const s = subs.find((x) => docId(x) === id);
    if (!s) return null;
    return {
      id: docId(s),
      email: s.email,
      websiteUrl: s.websiteUrl,
      domain: s.domain,
      name: s.name,
      tagline: s.tagline,
      description: s.description,
      categorySlug: s.categorySlug,
      tags: s.tags,
      pricingModel: s.pricingModel,
      startingPrice: s.startingPrice ?? null,
      pricingNote: s.pricingNote ?? null,
      hasApi: s.hasApi,
      githubUrl: s.githubUrl ?? null,
      docsUrl: s.docsUrl ?? null,
      twitterUrl: s.twitterUrl ?? null,
      logoEmoji: s.logoEmoji,
      logoGradient: s.logoGradient,
      isOwner: s.isOwner,
      status: s.status,
    };
  },
});

// ── Submission create (POST /api/submit) ──
export const submissionCreate = mutation({
  args: {
    id: v.string(),
    email: v.string(),
    websiteUrl: v.string(),
    domain: v.string(),
    name: v.string(),
    tagline: v.string(),
    description: v.string(),
    categorySlug: v.string(),
    tags: v.array(v.string()),
    pricingModel: v.string(),
    startingPrice: v.optional(v.string()),
    pricingNote: v.optional(v.string()),
    hasApi: v.boolean(),
    githubUrl: v.optional(v.string()),
    docsUrl: v.optional(v.string()),
    twitterUrl: v.optional(v.string()),
    logoEmoji: v.string(),
    logoGradient: v.string(),
    isOwner: v.boolean(),
    confirmedLive: v.boolean(),
    agreedStandards: v.boolean(),
    createdAt: v.number(),
  },
  handler: async (ctx, a) => {
    await ctx.db.insert("submissions", {
      email: a.email,
      websiteUrl: a.websiteUrl,
      domain: a.domain,
      name: a.name,
      tagline: a.tagline,
      description: a.description,
      categorySlug: a.categorySlug,
      tags: a.tags,
      pricingModel: a.pricingModel,
      startingPrice: a.startingPrice,
      pricingNote: a.pricingNote,
      hasApi: a.hasApi,
      githubUrl: a.githubUrl,
      docsUrl: a.docsUrl,
      twitterUrl: a.twitterUrl,
      logoEmoji: a.logoEmoji,
      logoGradient: a.logoGradient,
      isOwner: a.isOwner,
      confirmedLive: a.confirmedLive,
      agreedStandards: a.agreedStandards,
      status: "pending",
      legacyId: a.id,
      createdAt: a.createdAt,
    });
    const pending = (
      await ctx.db
        .query("submissions")
        .withIndex("by_status_created", (i) => i.eq("status", "pending"))
        .collect()
    ).sort((x, y) => x.createdAt - y.createdAt);
    const position = pending.findIndex((s) => s.legacyId === a.id) + 1;
    return { id: a.id, position: position > 0 ? position : pending.length };
  },
});

// ── Maker status (GET /api/submit/status) ──

export const submissionsByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const [subs, queue, tools] = await Promise.all([
      ctx.db
        .query("submissions")
        .withIndex("by_email", (i) => i.eq("email", email))
        .collect(),
      ctx.db
        .query("submissions")
        .withIndex("by_status_created", (i) => i.eq("status", "pending"))
        .collect(),
      ctx.db.query("tools").collect(),
    ]);
    const ordered = [...subs]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 20);
    const queueAsc = [...queue].sort((a, b) => a.createdAt - b.createdAt);
    const positionOf = new Map(queueAsc.map((s, i) => [docId(s), i + 1]));
    const bySubmissionId = new Map<string, string>();
    const byDomain = new Map<string, string>();
    for (const t of tools) {
      if (t.submissionId) {
        const sub = await ctx.db.get(t.submissionId);
        if (sub && sub.legacyId && !bySubmissionId.has(sub.legacyId)) {
          bySubmissionId.set(sub.legacyId, t.slug);
        }
      }
      const d = domainOfRaw(t.websiteUrl);
      if (d && !byDomain.has(d)) byDomain.set(d, t.slug);
    }
    const items = ordered.map((s) => {
      const status = s.status as "pending" | "approved" | "rejected";
      const toolSlug =
        status === "approved"
          ? (bySubmissionId.get(docId(s)) ?? byDomain.get(s.domain) ?? null)
          : null;
      let resubmit: {
        email: string;
        websiteUrl: string;
        name: string;
        tagline: string;
        description: string;
        categorySlug: string;
        tags: string[];
        pricingModel: string;
        startingPrice: string;
        pricingNote: string;
        hasApi: boolean;
        githubUrl: string;
        docsUrl: string;
        twitterUrl: string;
        logoEmoji: string;
        logoGradient: string;
      } | null = null;
      if (status === "rejected") {
        const pricingModel = (PRICING_VALUES as readonly string[]).includes(
          s.pricingModel,
        )
          ? s.pricingModel
          : "freemium";
        // Mirrors lib/prother.ts exactly (comma-split quirk included: tags
        // are pipe-joined, so splitting the joined string on "," keeps the
        // pipes intact and the vocab filter yields [] in practice).
        const tags = s.tags
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
          hasApi: s.hasApi,
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
        reviewNote: s.reviewNote ?? null,
        resubmit,
      };
    });
    return { items };
  },
});

// ── Editor queue (GET /api/editor/queue) ──

export const editorQueue = query({
  args: {},
  handler: async (ctx) => {
    const nowMs = Date.now();
    const [submissions, claims, reviews, tools] = await Promise.all([
      ctx.db.query("submissions").collect(),
      ctx.db.query("claims").collect(),
      ctx.db.query("reviews").collect(),
      ctx.db.query("tools").collect(),
    ]);
    const ageH = (at: number) =>
      Math.max(0, Math.round((nowMs - at) / 3_600_000));
    const pending = submissions
      .filter((s) => s.status === "pending")
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((s) => ({
        id: docId(s),
        email: s.email,
        websiteUrl: s.websiteUrl,
        domain: s.domain,
        name: s.name,
        tagline: s.tagline,
        description: s.description,
        categorySlug: s.categorySlug,
        tags: s.tags.join("|"),
        pricingModel: s.pricingModel,
        startingPrice: s.startingPrice ?? null,
        pricingNote: s.pricingNote ?? null,
        hasApi: s.hasApi,
        githubUrl: s.githubUrl ?? null,
        docsUrl: s.docsUrl ?? null,
        twitterUrl: s.twitterUrl ?? null,
        logoEmoji: s.logoEmoji,
        logoGradient: s.logoGradient,
        isOwner: s.isOwner,
        confirmedLive: s.confirmedLive,
        agreedStandards: s.agreedStandards,
        status: s.status,
        createdAt: isoFromMs(s.createdAt),
        ageH: ageH(s.createdAt),
      }));
    const counts: Record<string, number> = { pending: 0, approved: 0, rejected: 0 };
    for (const s of submissions) {
      counts[s.status] = (counts[s.status] ?? 0) + 1;
    }
    const toolById = new Map(tools.map((t) => [t._id, t]));
    const claimRows = claims
      .filter(
        (c) =>
          (c.status === "pending" || c.status === "failed" || c.status === "disputed") &&
          !(toolById.get(c.toolId)?.claimed ?? false),
      )
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(0, 50)
      .map((c) => {
        const t = toolById.get(c.toolId)!;
        return {
          id: docId(c),
          userEmail: c.userEmail,
          userName: c.userName,
          method: c.method,
          status: c.status,
          token: c.token,
          note: c.note ?? null,
          createdAt: isoFromMs(c.createdAt),
          toolSlug: t.slug,
          toolName: t.name,
          toolEmoji: t.logoEmoji,
          ageH: ageH(c.createdAt),
        };
      });
    const reviewRows = reviews
      .filter((r) => r.status === "filtered")
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(0, 50)
      .map((r) => {
        const t = toolById.get(r.toolId);
        return {
          id: docId(r),
          author: r.author,
          ease: r.ease,
          power: r.power,
          value: r.value,
          body: r.body,
          createdAt: isoFromMs(r.createdAt),
          toolSlug: t?.slug ?? "",
          toolName: t?.name ?? "",
          toolEmoji: t?.logoEmoji ?? "",
          ageH: ageH(r.createdAt),
        };
      });
    return { ok: true as const, pending, counts, claims: claimRows, filteredReviews: reviewRows };
  },
});

// ── Editor decision (POST /api/editor/decision) ──
// The showcase transaction: approve creates the Tool, links submissionId
// and flips the submission in ONE atomic mutation.

export const editorDecide = mutation({
  args: {
    submissionId: v.string(),
    decision: v.union(v.literal("approve"), v.literal("reject")),
    // reject
    reviewNote: v.optional(v.string()),
    // approve
    toolId: v.optional(v.string()),
    toolSlug: v.optional(v.string()),
    categorySlug: v.optional(v.string()),
    makerHandle: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  },
  handler: async (ctx, a) => {
    const subs = await ctx.db.query("submissions").collect();
    const sub = subs.find((s) => docId(s) === a.submissionId);
    if (!sub) throw new Error("submission_not_found");
    if (sub.status !== "pending") throw new Error(`already_${sub.status}`);

    if (a.decision === "reject") {
      // Optional-field absence reads as null downstream (see
      // submissionsByEmail's `?? null`), matching Prisma's NULL.
      await ctx.db.patch(sub._id, {
        status: "rejected",
        reviewNote: a.reviewNote,
      });
      return { decision: "rejected" as const, reviewNote: a.reviewNote ?? null };
    }

    // ── Approve ──
    const categories = await ctx.db.query("categories").collect();
    const cat = categories.find((c) => c.slug === a.categorySlug);
    if (!cat) throw new Error("unknown_category");
    const tools = await ctx.db.query("tools").collect();
    if (tools.some((t) => t.slug === a.toolSlug)) throw new Error("slug_taken");
    const now = a.createdAt ?? Date.now();
    await ctx.db.insert("tools", {
      slug: a.toolSlug!,
      name: sub.name,
      tagline: sub.tagline,
      description: sub.description,
      websiteUrl: sub.websiteUrl,
      logoEmoji: sub.logoEmoji,
      logoGradient: sub.logoGradient,
      screenshotUrls: [],
      useCases: [],
      pros: [],
      cons: [],
      alternatives: [],
      pricingModel: sub.pricingModel,
      startingPrice: sub.startingPrice,
      pricingNote: sub.pricingNote,
      hasApi: sub.hasApi,
      githubUrl: sub.githubUrl,
      docsUrl: sub.docsUrl,
      twitterUrl: sub.twitterUrl,
      tags: sub.tags,
      features: {},
      track: "community",
      editorsPick: false,
      curated: false,
      claimed: false,
      makerHandle: a.makerHandle!,
      status: "live",
      pinned: 0,
      verifiedAt: now,
      categoryId: cat._id,
      submissionId: sub._id,
      commentCount: 0,
      reviewCount: 0,
      ratingSumX100: 0,
      legacyId: a.toolId!,
      createdAt: now,
    });
    await ctx.db.patch(sub._id, { status: "approved" });
    return { decision: "approved" as const, slug: a.toolSlug! };
  },
});

// ── Editor arbitration (POST /api/editor/arbitrate) ──

export const arbitrateClaim = mutation({
  args: {
    claimId: v.string(),
    action: v.union(v.literal("verify"), v.literal("dismiss")),
    note: v.optional(v.string()),
    email: v.optional(v.string()),
    handle: v.optional(v.string()),
    now: v.number(),
  },
  handler: async (ctx, a) => {
    const claims = await ctx.db.query("claims").collect();
    const claim = claims.find((c) => docId(c) === a.claimId);
    if (!claim) throw new Error("claim_not_found");
    if (a.action === "verify") {
      const tool = await ctx.db.get(claim.toolId);
      if (!tool) throw new Error("tool_not_found");
      if (tool.claimed) throw new Error("already_claimed");
      await ctx.db.patch(claim._id, {
        status: "verified",
        verifiedAt: a.now,
        note: undefined,
      });
      await ctx.db.patch(tool._id, {
        claimed: true,
        makerEmail: a.email!,
        makerHandle: `@${a.handle!}`,
        verifiedAt: a.now,
      });
      return {
        decision: "verified" as const,
        toolSlug: tool.slug,
        userEmail: claim.userEmail,
        userName: claim.userName,
      };
    }
    await ctx.db.patch(claim._id, {
      status: "disputed",
      note: a.note ?? "Editor dismissed: ownership not established",
    });
    const tool = await ctx.db.get(claim.toolId);
    return {
      decision: "dismissed" as const,
      toolSlug: tool?.slug ?? "",
      userEmail: claim.userEmail,
    };
  },
});

export const arbitrateReview = mutation({
  args: {
    reviewId: v.string(),
    action: v.union(v.literal("publish"), v.literal("spam")),
    now: v.number(),
  },
  handler: async (ctx, a) => {
    const reviews = await ctx.db.query("reviews").collect();
    const review = reviews.find((r) => docId(r) === a.reviewId);
    if (!review) throw new Error("review_not_found");
    if (a.action === "publish") {
      await ctx.db.patch(review._id, { status: "published", updatedAt: a.now });
      const tool = await ctx.db.get(review.toolId);
      return {
        decision: "published" as const,
        toolLegacyId: tool ? (tool.legacyId ?? tool._id) : "",
      };
    }
    const tool = await ctx.db.get(review.toolId);
    await ctx.db.delete(review._id);
    return {
      decision: "spam" as const,
      toolLegacyId: tool ? (tool.legacyId ?? tool._id) : "",
    };
  },
});
