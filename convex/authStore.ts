/**
 * Convex NextAuth store (Auth phase, option C).
 *
 * These queries/mutations implement the NextAuth v4 Adapter interface
 * 1:1 against the `users` / `authAccounts` / `authSessions` /
 * `authVerificationTokens` tables, mirroring the micro-SQLite adapter in
 * src/lib/auth.ts (same ids, same null semantics, same handle-derivation
 * inputs). The route-side adapter (src/lib/auth-convex-adapter.ts) calls
 * these — never Convex directly — so the call graph stays greppable.
 *
 * Conventions (match the rest of the backend):
 * - `legacyId` carries the NextAuth id (backfilled SQLite ids survive the
 *   move, so sessions/cookies stay valid across the cutover).
 * - Timestamps cross the wire as ISO strings (Wire semantics, see
 *   lib/shadow.ts); mutations accept epoch ms.
 * - Token consumption is a single mutation (atomic find-and-delete,
 *   mirroring the old DELETE … RETURNING).
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { isoFromMs } from "./shared";

function docId<T extends { legacyId?: string; _id: string }>(d: T): string {
  return d.legacyId ?? d._id;
}

const msOrNull = (v: number | null | undefined): string | null =>
  v == null ? null : isoFromMs(v);

function serializeUser(u: {
  legacyId?: string;
  _id: string;
  name?: string;
  email?: string;
  emailVerified?: number;
  image?: string;
  handle?: string;
  bio?: string;
  coverImage?: string;
  role?: string;
  status?: string;
  createdAt: number;
}) {
  return {
    id: docId(u),
    name: u.name ?? null,
    email: u.email ?? null,
    emailVerified: msOrNull(u.emailVerified),
    image: u.image ?? null,
    handle: u.handle ?? null,
    bio: u.bio ?? null,
    coverImage: u.coverImage ?? null,
    // Role/status travel for profile + moderation reads (ignored by the
    // NextAuth adapter mapping, which only takes the AdapterUser fields).
    role: u.role ?? "member",
    status: u.status ?? "active",
    createdAt: isoFromMs(u.createdAt),
  };
}

// ── Users ────────────────────────────────────────────────────────────────

export const authUserById = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const users = await ctx.db.query("users").collect();
    const u = users.find((x) => docId(x) === id);
    return u ? serializeUser(u) : null;
  },
});

export const authUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const users = await ctx.db.query("users").collect();
    const u = users.find((x) => x.email === email);
    return u ? serializeUser(u) : null;
  },
});

export const authUserByAccount = query({
  args: { provider: v.string(), providerAccountId: v.string() },
  handler: async (ctx, a) => {
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("by_provider_account", (i) =>
        i.eq("provider", a.provider).eq("providerAccountId", a.providerAccountId),
      )
      .collect();
    const linked = accounts[0];
    if (!linked) return null;
    const users = await ctx.db.query("users").collect();
    const u = users.find((x) => docId(x) === linked.userLegacyId);
    return u ? serializeUser(u) : null;
  },
});

/** All taken handles (small table) — the adapter derives collision-safe
 *  handles route-side, mirroring deriveHandle in lib/auth.ts. */
export const authHandlesTaken = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map((u) => u.handle).filter((h): h is string => !!h);
  },
});

/** Profile reads and handle-clash checks by @handle. */
export const authUserByHandle = query({
  args: { handle: v.string() },
  handler: async (ctx, { handle }) => {
    const users = await ctx.db
      .query("users")
      .withIndex("by_handle", (i) => i.eq("handle", handle))
      .collect();
    const u = users[0];
    return u ? serializeUser(u) : null;
  },
});

export const authUserCreate = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.union(v.string(), v.null())),
    email: v.optional(v.union(v.string(), v.null())),
    emailVerified: v.optional(v.union(v.number(), v.null())),
    image: v.optional(v.union(v.string(), v.null())),
    handle: v.optional(v.union(v.string(), v.null())),
    createdAt: v.number(),
  },
  handler: async (ctx, a) => {
    const id = await ctx.db.insert("users", {
      email: a.email ?? undefined,
      name: a.name ?? undefined,
      handle: a.handle ?? undefined,
      image: a.image ?? undefined,
      role: "member",
      status: "active",
      emailVerified: a.emailVerified ?? undefined,
      externalAuthId: a.id,
      legacyId: a.id,
      createdAt: a.createdAt,
    });
    return serializeUser((await ctx.db.get(id))!);
  },
});

export const authUserPatch = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.union(v.string(), v.null())),
    email: v.optional(v.union(v.string(), v.null())),
    emailVerified: v.optional(v.union(v.string(), v.null())),
    image: v.optional(v.union(v.string(), v.null())),
    handle: v.optional(v.union(v.string(), v.null())),
    bio: v.optional(v.union(v.string(), v.null())),
    coverImage: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, a) => {
    const users = await ctx.db.query("users").collect();
    const u = users.find((x) => docId(x) === a.id);
    if (!u) throw new Error("user_not_found");
    const patch: Record<string, unknown> = {};
    // Whitelisted columns only (mirrors the SQLite adapter).
    if (a.name !== undefined) patch.name = a.name ?? undefined;
    if (a.email !== undefined) patch.email = a.email ?? undefined;
    if (a.emailVerified !== undefined) {
      patch.emailVerified = a.emailVerified ? new Date(a.emailVerified).getTime() : undefined;
    }
    if (a.image !== undefined) patch.image = a.image ?? undefined;
    if (a.handle !== undefined) patch.handle = a.handle ?? undefined;
    if (a.bio !== undefined) patch.bio = a.bio ?? undefined;
    if (a.coverImage !== undefined) patch.coverImage = a.coverImage ?? undefined;
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(u._id, patch as never);
    }
    return serializeUser((await ctx.db.get(u._id))!);
  },
});

// ── Accounts ─────────────────────────────────────────────────────────────

export const authAccountLink = mutation({
  args: {
    userLegacyId: v.string(),
    type: v.string(),
    provider: v.string(),
    providerAccountId: v.string(),
    refreshToken: v.optional(v.union(v.string(), v.null())),
    accessToken: v.optional(v.union(v.string(), v.null())),
    expiresAt: v.optional(v.union(v.number(), v.null())),
    tokenType: v.optional(v.union(v.string(), v.null())),
    scope: v.optional(v.union(v.string(), v.null())),
    idToken: v.optional(v.union(v.string(), v.null())),
    sessionState: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, a) => {
    await ctx.db.insert("authAccounts", {
      userLegacyId: a.userLegacyId,
      type: a.type,
      provider: a.provider,
      providerAccountId: a.providerAccountId,
      refreshToken: a.refreshToken ?? undefined,
      accessToken: a.accessToken ?? undefined,
      expiresAt: a.expiresAt ?? undefined,
      tokenType: a.tokenType ?? undefined,
      scope: a.scope ?? undefined,
      idToken: a.idToken ?? undefined,
      sessionState: a.sessionState ?? undefined,
    });
    return { ok: true as const };
  },
});

// ── Sessions ─────────────────────────────────────────────────────────────

export const authSessionCreate = mutation({
  args: {
    sessionToken: v.string(),
    userLegacyId: v.string(),
    expires: v.number(),
  },
  handler: async (ctx, a) => {
    await ctx.db.insert("authSessions", {
      sessionToken: a.sessionToken,
      userLegacyId: a.userLegacyId,
      expires: a.expires,
    });
    return {
      sessionToken: a.sessionToken,
      userId: a.userLegacyId,
      expires: isoFromMs(a.expires),
    };
  },
});

export const authSessionAndUser = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("by_token", (i) => i.eq("sessionToken", sessionToken))
      .collect();
    const s = sessions[0];
    if (!s) return null;
    const users = await ctx.db.query("users").collect();
    const u = users.find((x) => docId(x) === s.userLegacyId);
    if (!u) return null;
    return {
      session: {
        sessionToken: s.sessionToken,
        userId: docId(u),
        expires: isoFromMs(s.expires),
      },
      user: serializeUser(u),
    };
  },
});

export const authSessionPatch = mutation({
  args: { sessionToken: v.string(), expires: v.number() },
  handler: async (ctx, a) => {
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("by_token", (i) => i.eq("sessionToken", a.sessionToken))
      .collect();
    const s = sessions[0];
    if (!s) return null;
    await ctx.db.patch(s._id, { expires: a.expires });
    return {
      sessionToken: s.sessionToken,
      userId: s.userLegacyId,
      expires: isoFromMs(a.expires),
    };
  },
});

export const authSessionDelete = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("by_token", (i) => i.eq("sessionToken", sessionToken))
      .collect();
    const s = sessions[0];
    if (s) await ctx.db.delete(s._id);
    return { ok: true as const };
  },
});

/** Ban revocation: drop every live session for a user immediately. */
export const authSessionsDeleteByUser = mutation({
  args: { userLegacyId: v.string() },
  handler: async (ctx, { userLegacyId }) => {
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("by_user", (i) => i.eq("userLegacyId", userLegacyId))
      .collect();
    await Promise.all(sessions.map((s) => ctx.db.delete(s._id)));
    return { revoked: sessions.length };
  },
});

// ── Verification tokens ──────────────────────────────────────────────────

export const authVerificationTokenCreate = mutation({
  args: {
    identifier: v.string(),
    token: v.string(),
    expires: v.number(),
  },
  handler: async (ctx, a) => {
    await ctx.db.insert("authVerificationTokens", {
      identifier: a.identifier,
      token: a.token,
      expires: a.expires,
    });
    return {
      identifier: a.identifier,
      token: a.token,
      expires: isoFromMs(a.expires),
    };
  },
});

/** Atomic consume (find-and-delete in one mutation). Null when unknown. */
export const authVerificationTokenConsume = mutation({
  args: { identifier: v.string(), token: v.string() },
  handler: async (ctx, a) => {
    const rows = await ctx.db
      .query("authVerificationTokens")
      .withIndex("by_identifier_token", (i) =>
        i.eq("identifier", a.identifier).eq("token", a.token),
      )
      .collect();
    const row = rows[0];
    if (!row) return null;
    await ctx.db.delete(row._id);
    return {
      identifier: row.identifier,
      token: row.token,
      expires: isoFromMs(row.expires),
    };
  },
});

/** Full account erasure (GDPR-style): user row + accounts, sessions, and
 *  verification tokens keyed by email or legacy id. Returns what was removed.
 *  Throws user_not_found when no user row matches. */
export const authUserDeleteFull = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const users = await ctx.db.query("users").collect();
    const u = users.find((x) => docId(x) === id || x.email === id);
    if (!u) throw new Error("user_not_found");
    const uid = docId(u);
    const [accounts, sessions, tokens] = await Promise.all([
      ctx.db.query("authAccounts").collect(),
      ctx.db.query("authSessions").collect(),
      ctx.db.query("authVerificationTokens").collect(),
    ]);
    const ownedSessions = sessions.filter((s) => s.userLegacyId === uid);
    const ownedTokens = tokens.filter(
      (t) => u.email != null && t.identifier === u.email,
    );
    const ownedAccounts = accounts.filter((r) => r.userLegacyId === uid);
    await Promise.all([
      ...ownedAccounts.map((r) => ctx.db.delete(r._id)),
      ...ownedSessions.map((s) => ctx.db.delete(s._id)),
      ...ownedTokens.map((t) => ctx.db.delete(t._id)),
    ]);
    await ctx.db.delete(u._id);
    return {
      ok: true as const,
      removed: {
        accounts: ownedAccounts.length,
        sessions: ownedSessions.length,
        tokens: ownedTokens.length,
      },
    };
  },
});

// ── One-time backfill (auth.db → Convex; run via script, then delete) ────

export const authBackfill = mutation({
  args: {
    users: v.array(
      v.object({
        id: v.string(),
        name: v.optional(v.union(v.string(), v.null())),
        email: v.optional(v.union(v.string(), v.null())),
        emailVerified: v.optional(v.union(v.string(), v.null())),
        image: v.optional(v.union(v.string(), v.null())),
        handle: v.optional(v.union(v.string(), v.null())),
        bio: v.optional(v.union(v.string(), v.null())),
        role: v.string(),
        status: v.string(),
        createdAt: v.string(),
      }),
    ),
    accounts: v.array(
      v.object({
        userLegacyId: v.string(),
        type: v.string(),
        provider: v.string(),
        providerAccountId: v.string(),
        refreshToken: v.optional(v.union(v.string(), v.null())),
        accessToken: v.optional(v.union(v.string(), v.null())),
        expiresAt: v.optional(v.union(v.number(), v.null())),
        tokenType: v.optional(v.union(v.string(), v.null())),
        scope: v.optional(v.union(v.string(), v.null())),
        idToken: v.optional(v.union(v.string(), v.null())),
        sessionState: v.optional(v.union(v.string(), v.null())),
      }),
    ),
    sessions: v.array(
      v.object({
        sessionToken: v.string(),
        userLegacyId: v.string(),
        expires: v.string(),
      }),
    ),
    tokens: v.array(
      v.object({
        identifier: v.string(),
        token: v.string(),
        expires: v.string(),
      }),
    ),
  },
  handler: async (ctx, a) => {
    // Idempotent: skip rows that already landed (re-runs are safe).
    const [existingUsers, existingAccounts, existingSessions, existingTokens] =
      await Promise.all([
        ctx.db.query("users").collect(),
        ctx.db.query("authAccounts").collect(),
        ctx.db.query("authSessions").collect(),
        ctx.db.query("authVerificationTokens").collect(),
      ]);
    const userIds = new Set(existingUsers.map((u) => docId(u)));
    const accountKeys = new Set(
      existingAccounts.map((r) => `${r.provider}:${r.providerAccountId}`),
    );
    const sessionTokens = new Set(existingSessions.map((s) => s.sessionToken));
    const tokenKeys = new Set(
      existingTokens.map((t) => `${t.identifier}:${t.token}`),
    );
    let users = 0;
    for (const u of a.users) {
      if (userIds.has(u.id)) continue;
      await ctx.db.insert("users", {
        email: u.email ?? undefined,
        name: u.name ?? undefined,
        handle: u.handle ?? undefined,
        image: u.image ?? undefined,
        bio: u.bio ?? undefined,
        role: u.role,
        status: u.status,
        emailVerified: u.emailVerified ? new Date(u.emailVerified).getTime() : undefined,
        externalAuthId: u.id,
        legacyId: u.id,
        createdAt: new Date(u.createdAt).getTime(),
      });
      users++;
    }
    let accounts = 0;
    for (const r of a.accounts) {
      if (accountKeys.has(`${r.provider}:${r.providerAccountId}`)) continue;
      await ctx.db.insert("authAccounts", {
        userLegacyId: r.userLegacyId,
        type: r.type,
        provider: r.provider,
        providerAccountId: r.providerAccountId,
        refreshToken: r.refreshToken ?? undefined,
        accessToken: r.accessToken ?? undefined,
        expiresAt: r.expiresAt ?? undefined,
        tokenType: r.tokenType ?? undefined,
        scope: r.scope ?? undefined,
        idToken: r.idToken ?? undefined,
        sessionState: r.sessionState ?? undefined,
      });
      accounts++;
    }
    let sessions = 0;
    for (const s of a.sessions) {
      if (sessionTokens.has(s.sessionToken)) continue;
      await ctx.db.insert("authSessions", {
        sessionToken: s.sessionToken,
        userLegacyId: s.userLegacyId,
        expires: new Date(s.expires).getTime(),
      });
      sessions++;
    }
    let tokens = 0;
    for (const t of a.tokens) {
      if (tokenKeys.has(`${t.identifier}:${t.token}`)) continue;
      await ctx.db.insert("authVerificationTokens", {
        identifier: t.identifier,
        token: t.token,
        expires: new Date(t.expires).getTime(),
      });
      tokens++;
    }
    return { users, accounts, sessions, tokens };
  },
});
