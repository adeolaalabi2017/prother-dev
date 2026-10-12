/**
 * D1 ports of convex/authStore.ts (writes migration wave 4b).
 *
 * The NextAuth adapter (src/lib/auth-convex-adapter.ts) consumes these via
 * src/lib/data.ts. Reads AND writes lead D1 together — they must share one
 * store per request cycle or live sessions would diverge between stores.
 * Any failure (or missing binding) falls back to the Convex functions, so
 * during the dual-run period a resync (scripts/resync-convex-to-d1.sh)
 * keeps both stores convergent for logins done outside this window.
 *
 * Semantics mirror convex/authStore.ts exactly:
 * - users.id PK + legacy_id + external_auth_id all carry the NextAuth id
 *   (data.ts-adapted from the Convex docId contract: legacyId ?? id).
 * - Timestamps cross the wire as ISO strings; D1 stores epoch ms INT.
 * - Token consumption is a single atomic statement (DELETE … RETURNING,
 *   mirroring the old Convex atomic find-and-delete).
 */
import { and, asc, eq, or, isNotNull } from "drizzle-orm";
import { getD1 } from "./client";
import { authAccounts, authSessions, authVerificationTokens, users } from "./schema";

type UserRow = typeof users.$inferSelect;

function docId(d: { id: string; legacyId: string | null }): string {
  return d.legacyId ?? d.id;
}

function msOrNull(v: number | null | undefined): string | null {
  return v == null ? null : new Date(v).toISOString();
}

/** Mirrors serializeUser in convex/authStore.ts (extra fields preserved). */
function serializeUser(u: UserRow) {
  return {
    id: docId(u),
    name: u.name ?? null,
    email: u.email ?? null,
    emailVerified: msOrNull(u.emailVerified),
    image: u.image ?? null,
    handle: u.handle ?? null,
    bio: u.bio ?? null,
    coverImage: u.coverImage ?? null,
    role: u.role || "member",
    status: u.status || "active",
    createdAt: new Date(u.createdAt).toISOString(),
  };
}

function withIsoEmailVerified(v: string | null | undefined): number | null {
  if (v == null) return null;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : null;
}

/** getUserByLegacyOrConvexId port: external auth id → email → row id. */
async function userByLegacyOrAuthId(
  db: NonNullable<Awaited<ReturnType<typeof getD1>>>,
  id: string,
): Promise<UserRow | null> {
  const [byAuth] = await db
    .select()
    .from(users)
    .where(eq(users.externalAuthId, id))
    .limit(1);
  if (byAuth) return byAuth;

  const [byEmail] = await db.select().from(users).where(eq(users.email, id)).limit(1);
  if (byEmail) return byEmail;

  const [byId] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return byId ?? null;
}

// ── Reads ────────────────────────────────────────────────────────────────

export async function d1AuthUserById(id: string) {
  const db = await getD1();
  if (!db) return null;
  const u = await userByLegacyOrAuthId(db, id);
  return u ? serializeUser(u) : null;
}

export async function d1AuthUserByEmail(email: string) {
  const db = await getD1();
  if (!db) return null;
  const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return u ? serializeUser(u) : null;
}

export async function d1AuthUserByAccount(
  provider: string,
  providerAccountId: string,
) {
  const db = await getD1();
  if (!db) return null;
  const [account] = await db
    .select()
    .from(authAccounts)
    .where(
      and(
        eq(authAccounts.provider, provider),
        eq(authAccounts.providerAccountId, providerAccountId),
      ),
    )
    .limit(1);
  if (!account) return null;
  const u = await userByLegacyOrAuthId(db, account.userLegacyId);
  return u ? serializeUser(u) : null;
}

export async function d1AuthUserByHandle(handle: string) {
  const db = await getD1();
  if (!db) return null;
  const [u] = await db.select().from(users).where(eq(users.handle, handle)).limit(1);
  return u ? serializeUser(u) : null;
}

export async function d1AuthHandlesTaken(): Promise<string[] | null> {
  const db = await getD1();
  if (!db) return null;
  const rows = await db
    .select({ handle: users.handle })
    .from(users)
    .where(isNotNull(users.handle))
    .orderBy(asc(users.id))
    .limit(500);
  return rows.map((r) => r.handle!).filter((h): h is string => !!h);
}

export async function d1AuthSessionAndUser(sessionToken: string) {
  const db = await getD1();
  if (!db) return null;
  const [s] = await db
    .select()
    .from(authSessions)
    .where(eq(authSessions.sessionToken, sessionToken))
    .limit(1);
  if (!s) return null;
  const u = await userByLegacyOrAuthId(db, s.userLegacyId);
  if (!u) return null;
  return {
    session: {
      sessionToken: s.sessionToken,
      userId: docId(u),
      expires: new Date(s.expires).toISOString(),
    },
    user: serializeUser(u),
  };
}

// ── Writes ───────────────────────────────────────────────────────────────

export async function d1AuthUserCreate(args: {
  id: string;
  name?: string | null;
  email?: string | null;
  emailVerified?: number | null;
  image?: string | null;
  handle?: string | null;
  createdAt: number;
}) {
  const db = await getD1();
  if (!db) return null;
  await db.insert(users).values({
    id: args.id,
    legacyId: args.id,
    externalAuthId: args.id,
    name: args.name ?? null,
    email: args.email ?? null,
    handle: args.handle ?? null,
    image: args.image ?? null,
    emailVerified: args.emailVerified ?? null,
    role: "member",
    status: "active",
    createdAt: args.createdAt,
  });
  const [row] = await db.select().from(users).where(eq(users.id, args.id)).limit(1);
  return row ? serializeUser(row) : null;
}

export async function d1AuthUserPatch(args: {
  id: string;
  name?: string | null;
  email?: string | null;
  emailVerified?: string | null;
  image?: string | null;
  handle?: string | null;
  bio?: string | null;
  coverImage?: string | null;
}) {
  const db = await getD1();
  if (!db) return null;
  const u = await userByLegacyOrAuthId(db, args.id);
  if (!u) return null;
  const patch: Partial<UserRow> = {};
  if (args.name !== undefined) patch.name = args.name ?? null;
  if (args.email !== undefined) patch.email = args.email ?? null;
  if (args.emailVerified !== undefined) patch.emailVerified = withIsoEmailVerified(args.emailVerified);
  if (args.image !== undefined) patch.image = args.image ?? null;
  if (args.handle !== undefined) patch.handle = args.handle ?? null;
  if (args.bio !== undefined) patch.bio = args.bio ?? null;
  if (args.coverImage !== undefined) patch.coverImage = args.coverImage ?? null;
  if (Object.keys(patch).length > 0) {
    await db.update(users).set(patch).where(eq(users.id, u.id));
  }
  const [row] = await db.select().from(users).where(eq(users.id, u.id)).limit(1);
  return row ? serializeUser(row) : null;
}

export async function d1AuthAccountLink(args: {
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
}) {
  const db = await getD1();
  if (!db) return null;
  await db.insert(authAccounts).values({
    id: crypto.randomUUID(),
    userLegacyId: args.userLegacyId,
    type: args.type,
    provider: args.provider,
    providerAccountId: args.providerAccountId,
    refreshToken: args.refreshToken ?? null,
    accessToken: args.accessToken ?? null,
    expiresAt: args.expiresAt ?? null,
    tokenType: args.tokenType ?? null,
    scope: args.scope ?? null,
    idToken: args.idToken ?? null,
    sessionState: args.sessionState ?? null,
  });
  return { ok: true as const };
}

export async function d1AuthSessionCreate(args: {
  sessionToken: string;
  userLegacyId: string;
  expires: number;
}) {
  const db = await getD1();
  if (!db) return null;
  await db.insert(authSessions).values({
    id: crypto.randomUUID(),
    sessionToken: args.sessionToken,
    userLegacyId: args.userLegacyId,
    expires: args.expires,
  });
  return {
    sessionToken: args.sessionToken,
    userId: args.userLegacyId,
    expires: new Date(args.expires).toISOString(),
  };
}

export async function d1AuthSessionPatch(args: {
  sessionToken: string;
  expires: number;
}) {
  const db = await getD1();
  if (!db) return null;
  const updated = await db
    .update(authSessions)
    .set({ expires: args.expires })
    .where(eq(authSessions.sessionToken, args.sessionToken))
    .returning({ sessionToken: authSessions.sessionToken, userLegacyId: authSessions.userLegacyId });
  const row = updated[0];
  if (!row) return null;
  return {
    sessionToken: row.sessionToken,
    userId: row.userLegacyId,
    expires: new Date(args.expires).toISOString(),
  };
}

export async function d1AuthSessionDelete(sessionToken: string) {
  const db = await getD1();
  if (!db) return null;
  await db.delete(authSessions).where(eq(authSessions.sessionToken, sessionToken));
  return { ok: true as const };
}

export async function d1AuthSessionsDeleteByUser(userLegacyId: string) {
  const db = await getD1();
  if (!db) return null;
  const deleted = await db
    .delete(authSessions)
    .where(eq(authSessions.userLegacyId, userLegacyId))
    .returning({ id: authSessions.id });
  return { revoked: deleted.length };
}

export async function d1AuthVerificationTokenCreate(args: {
  identifier: string;
  token: string;
  expires: number;
}) {
  const db = await getD1();
  if (!db) return null;
  await db.insert(authVerificationTokens).values({
    id: crypto.randomUUID(),
    identifier: args.identifier,
    token: args.token,
    expires: args.expires,
  });
  return {
    identifier: args.identifier,
    token: args.token,
    expires: new Date(args.expires).toISOString(),
  };
}

/** Atomic consume: one statement (DELETE … RETURNING), like the Convex
 *  single-mutation find-and-delete. Null when unknown. */
export async function d1AuthVerificationTokenConsume(args: {
  identifier: string;
  token: string;
}) {
  const db = await getD1();
  if (!db) return null;
  const deleted = await db
    .delete(authVerificationTokens)
    .where(
      and(
        eq(authVerificationTokens.identifier, args.identifier),
        eq(authVerificationTokens.token, args.token),
      ),
    )
    .returning();
  const row = deleted[0];
  if (!row) return null;
  return {
    identifier: row.identifier,
    token: row.token,
    expires: new Date(row.expires).toISOString(),
  };
}

/** Full account erasure (mirrors authUserDeleteFull): user + accounts +
 *  sessions + tokens keyed by legacy id or email. */
export async function d1AuthUserDeleteFull(id: string) {
  const db = await getD1();
  if (!db) return null;
  const u = await userByLegacyOrAuthId(db, id);
  if (!u) return null;
  const uid = docId(u);
  const ownedAccounts = await db
    .delete(authAccounts)
    .where(eq(authAccounts.userLegacyId, uid))
    .returning({ id: authAccounts.id });
  const ownedSessions = await db
    .delete(authSessions)
    .where(
      or(eq(authSessions.userLegacyId, uid), eq(authSessions.userLegacyId, u.id)),
    )
    .returning({ id: authSessions.id });
  const ownedTokens = u.email
    ? await db
        .delete(authVerificationTokens)
        .where(eq(authVerificationTokens.identifier, u.email))
        .returning({ id: authVerificationTokens.id })
    : [];
  await db.delete(users).where(eq(users.id, u.id));
  return {
    ok: true as const,
    removed: {
      accounts: ownedAccounts.length,
      sessions: ownedSessions.length,
      tokens: ownedTokens.length,
    },
  };
}
