/**
 * Convex user identity bridge (Phase 4 step 7, plan §3.5).
 *
 * NextAuth stays authoritative for sessions (SQLite adapter, magic links +
 * Google). This module keeps the Convex `users` table in sync so ban
 * checks, the admin roster and future mutations can resolve identity
 * without Prisma:
 *
 * - `ensureFromAuth`: idempotent upsert keyed by the NextAuth user id
 *   (stored as BOTH legacyId and externalAuthId — imported rows already
 *   carry legacyId = NextAuth id, so the first sync simply stamps
 *   externalAuthId). Called from NextAuth events.createUser/signIn
 *   (fire-and-forget) and the one-time backfill. Never downgrades
 *   role/status — admin moderation (dual-written) owns those fields.
 * - `authState`: ban/role/status/handle lookup by externalAuthId (falling
 *   back to legacyId) for route-side gates. Null when unknown — callers
 *   fall back to Prisma.
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { isoFromMs } from "./shared";

function docId<T extends { legacyId?: string; _id: string }>(d: T): string {
  return d.legacyId ?? d._id;
}

function deriveHandle(email: string | undefined, taken: Set<string>): string | undefined {
  if (!email) return undefined;
  const base =
    email
      .split("@")[0]!
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "")
      .slice(0, 24) || "maker";
  if (!taken.has(base)) return base;
  for (let i = 2; i < 50; i++) {
    if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export const ensureFromAuth = mutation({
  args: {
    id: v.string(),
    email: v.optional(v.union(v.string(), v.null())),
    name: v.optional(v.union(v.string(), v.null())),
    handle: v.optional(v.union(v.string(), v.null())),
    image: v.optional(v.union(v.string(), v.null())),
    bio: v.optional(v.union(v.string(), v.null())),
    createdAt: v.number(),
  },
  handler: async (ctx, a) => {
    const email = a.email ?? undefined;
    const name = a.name ?? undefined;
    const handle = a.handle ?? undefined;
    const image = a.image ?? undefined;
    const bio = a.bio ?? undefined;
    const users = await ctx.db.query("users").collect();
    const existing = users.find(
      (u) => u.externalAuthId === a.id || u.legacyId === a.id,
    );
    if (existing) {
      const patch: Record<string, unknown> = { externalAuthId: a.id };
      if (email !== undefined) patch.email = email;
      if (name !== undefined) patch.name = name;
      if (handle !== undefined) patch.handle = handle;
      if (image !== undefined) patch.image = image;
      if (bio !== undefined) patch.bio = bio;
      await ctx.db.patch(existing._id, patch as never);
      return { id: docId(existing), created: false as const };
    }
    const taken = new Set(
      users.map((u) => u.handle).filter((h): h is string => !!h),
    );
    const id = await ctx.db.insert("users", {
      email,
      name,
      handle: handle ?? deriveHandle(email, taken),
      image,
      bio,
      role: "member",
      status: "active",
      externalAuthId: a.id,
      legacyId: a.id,
      createdAt: a.createdAt,
    });
    const u = (await ctx.db.get(id))!;
    return { id: docId(u), created: true as const };
  },
});

export const authState = query({
  args: { externalAuthId: v.string() },
  handler: async (ctx, { externalAuthId }) => {
    const users = await ctx.db.query("users").collect();
    const u =
      users.find((x) => x.externalAuthId === externalAuthId) ??
      users.find((x) => x.legacyId === externalAuthId);
    if (!u) return null;
    return {
      banned: u.status === "banned",
      status: u.status,
      role: u.role,
      handle: u.handle,
      email: u.email,
      createdAt: isoFromMs(u.createdAt),
    };
  },
});
