/**
 * Convex claims flow (Phase 5): ownership verification for unclaimed listings.
 *
 * Dual-write with the Prisma paths (single id/timestamp generated
 * route-side). The meta-tag SITE FETCH stays route-side (external I/O can't
 * run in a query/mutation — a Convex action would be the Phase-5+ shape;
 * the route performs the fetch then settles via claimSettle).
 *
 * Methods: "meta_tag" (maker adds <meta name="prother-claim">, route
 * verifies) and "email_domain" (auto-verified when the signed-in email
 * domain matches the tool domain — decided route-side).
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { isoFromMs } from "./shared";

function docId<T extends { legacyId?: string; _id: string }>(d: T): string {
  return d.legacyId ?? d._id;
}

function serializeClaim(r: {
  legacyId?: string;
  _id: string;
  status: string;
  method: string;
  token: string;
  note?: string;
  createdAt: number;
  verifiedAt?: number;
}) {
  return {
    id: docId(r),
    status: r.status,
    method: r.method,
    token: r.token,
    note: r.note ?? null,
    createdAt: isoFromMs(r.createdAt),
    verifiedAt: r.verifiedAt != null ? isoFromMs(r.verifiedAt) : null,
  };
}

/** GET /api/claims?tool=<slug> — claimable flag + viewer's own claim. */
export const claimState = query({
  args: { toolSlug: v.string(), userEmail: v.optional(v.string()) },
  handler: async (ctx, { toolSlug, userEmail }) => {
    const tool = await ctx.db
      .query("tools")
      .withIndex("by_slug", (i) => i.eq("slug", toolSlug))
      .unique();
    if (!tool) return { error: "tool_not_found" as const };
    let claim: ReturnType<typeof serializeClaim> | null = null;
    if (userEmail != null) {
      const claims = await ctx.db.query("claims").collect();
      const mine = claims
        .filter((c) => c.toolId === tool._id && c.userEmail === userEmail)
        .sort((a, b) => b.createdAt - a.createdAt || a._creationTime - b._creationTime);
      const latest = mine[0];
      if (latest) claim = serializeClaim(latest);
    }
    return { claimable: !tool.claimed, claim };
  },
});

export const claimInsert = mutation({
  args: {
    id: v.string(),
    toolSlug: v.string(),
    userEmail: v.string(),
    userName: v.string(),
    method: v.string(),
    token: v.string(),
    status: v.string(),
    note: v.optional(v.union(v.string(), v.null())),
    verifiedAt: v.optional(v.number()),
    createdAt: v.number(),
    // Email-domain auto-verify transfers listing rights in the SAME
    // transaction (mirrors insertClaim + approveClaimAndTransfer).
    transfer: v.optional(
      v.object({ email: v.string(), handle: v.string() }),
    ),
    nowMs: v.optional(v.number()),
  },
  handler: async (ctx, a) => {
    const tool = await ctx.db
      .query("tools")
      .withIndex("by_slug", (i) => i.eq("slug", a.toolSlug))
      .unique();
    if (!tool) throw new Error("tool_not_found");
    if (tool.claimed) throw new Error("already_claimed");
    const claims = await ctx.db.query("claims").collect();
    if (claims.some((c) => c.token === a.token)) throw new Error("token_taken");
    const now = a.nowMs ?? a.createdAt;
    const id = await ctx.db.insert("claims", {
      toolId: tool._id,
      userEmail: a.userEmail,
      userName: a.userName,
      method: a.method,
      token: a.token,
      status: a.status,
      note: a.note ?? undefined,
      verifiedAt: a.verifiedAt,
      legacyId: a.id,
      createdAt: a.createdAt,
    });
    if (a.transfer) {
      await ctx.db.patch(tool._id, {
        claimed: true,
        makerEmail: a.transfer.email,
        makerHandle: `@${a.transfer.handle}`,
        verifiedAt: now,
      });
    }
    const row = (await ctx.db.get(id))!;
    return serializeClaim(row);
  },
});

/** Latest claim by (tool, email) — powers the idempotent-start check.
 *  Also returns the tool's website + claimed flag so POST can decide the
 *  email-domain auto-verify and build meta-tag instructions without a
 *  second round-trip. */
export const claimLatest = query({
  args: { toolSlug: v.string(), userEmail: v.string() },
  handler: async (ctx, { toolSlug, userEmail }) => {
    const tool = await ctx.db
      .query("tools")
      .withIndex("by_slug", (i) => i.eq("slug", toolSlug))
      .unique();
    if (!tool) return null;
    const claims = await ctx.db.query("claims").collect();
    const mine = claims
      .filter((c) => c.toolId === tool._id && c.userEmail === userEmail)
      .sort((a, b) => b.createdAt - a.createdAt || a._creationTime - b._creationTime);
    const latest = mine[0];
    return {
      claim: latest ? serializeClaim(latest) : null,
      tool: {
        slug: tool.slug,
        name: tool.name,
        websiteUrl: tool.websiteUrl,
        claimed: tool.claimed,
      },
    };
  },
});

export const claimByIdQ = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const claims = await ctx.db.query("claims").collect();
    const row = claims.find((c) => docId(c) === id);
    if (!row) return null;
    const tool = await ctx.db.get(row.toolId);
    return {
      // userEmail/userName stay server-side (ownership check); the public
      // claimState/latest shapes intentionally omit them.
      claim: { ...serializeClaim(row), userEmail: row.userEmail, userName: row.userName },
      tool: tool
        ? {
            id: docId(tool),
            slug: tool.slug,
            name: tool.name,
            websiteUrl: tool.websiteUrl,
            claimed: tool.claimed,
            makerEmail: tool.makerEmail ?? null,
          }
        : null,
    };
  },
});

/** Settle after the route-side fetch (or auto-verify): status flip with or
 *  without the listing-rights transfer, atomically. */
export const claimSettle = mutation({
  args: {
    claimLegacyId: v.string(),
    status: v.string(),
    note: v.optional(v.union(v.string(), v.null())),
    verifiedAt: v.optional(v.number()),
    transfer: v.optional(
      v.object({ email: v.string(), handle: v.string() }),
    ),
    nowMs: v.number(),
  },
  handler: async (ctx, a) => {
    const claims = await ctx.db.query("claims").collect();
    const claim = claims.find((c) => docId(c) === a.claimLegacyId);
    if (!claim) throw new Error("claim_not_found");
    await ctx.db.patch(claim._id, {
      status: a.status,
      note: a.note ?? undefined,
      verifiedAt: a.verifiedAt,
    });
    if (a.transfer) {
      const tool = await ctx.db.get(claim.toolId);
      if (!tool) throw new Error("tool_not_found");
      await ctx.db.patch(tool._id, {
        claimed: true,
        makerEmail: a.transfer.email,
        makerHandle: `@${a.transfer.handle}`,
        verifiedAt: a.nowMs,
      });
    }
    const fresh = (await ctx.db.get(claim._id))!;
    return serializeClaim(fresh);
  },
});
