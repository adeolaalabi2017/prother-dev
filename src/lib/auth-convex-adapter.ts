/**
 * Convex-backed NextAuth v4 adapter (Auth phase, option C).
 *
 * Method-for-method mirror of the micro-SQLite adapter in src/lib/auth.ts:
 * same ids, same null semantics, same handle derivation, same whitelisted
 * update columns, same atomic token consumption. The only differences are
 * the store (Convex via src/lib/data.ts wrappers) and value mapping
 * (epoch ms over the wire instead of ISO TEXT columns).
 *
 * Activated with AUTH_STORE=convex (default: sqlite — the micro-SQLite
 * adapter stays authoritative until the cutover is verified). Switching
 * stores requires a server restart (the adapter is chosen at module load).
 * Sessions/cookies stay valid across the switch: backfilled Convex rows
 * keep the original SQLite ids (see scripts/backfill-auth-to-convex.ts).
 */
import type {
  Adapter,
  AdapterSession,
  AdapterUser,
  VerificationToken as AdapterVerificationToken,
} from "next-auth/adapters";
import { createServerConvexClient } from "@/lib/convex";
import {
  convexAuthAccountLink,
  convexAuthHandlesTaken,
  convexAuthSessionAndUser,
  convexAuthSessionCreate,
  convexAuthSessionDelete,
  convexAuthSessionPatch,
  convexAuthUserByAccount,
  convexAuthUserByEmail,
  convexAuthUserById,
  convexAuthUserCreate,
  convexAuthUserPatch,
  convexAuthVerificationTokenConsume,
  convexAuthVerificationTokenCreate,
} from "@/lib/data";

type Client = NonNullable<ReturnType<typeof createServerConvexClient>>;

function client(): Client {
  const c = createServerConvexClient();
  if (!c) throw new Error("AUTH_STORE=convex but NEXT_PUBLIC_CONVEX_URL is unset");
  return c;
}

/** ISO-wire user → AdapterUser (Dates rebuilt, extras preserved). */
function mapUser(u: {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: string | null;
  image: string | null;
  handle: string | null;
  bio: string | null;
  createdAt: string;
}): AdapterUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    emailVerified: u.emailVerified ? new Date(u.emailVerified) : null,
    image: u.image,
    handle: u.handle,
    bio: u.bio,
    createdAt: new Date(u.createdAt),
  } as AdapterUser;
}

/** Handle derivation ("dana@x.com" → "dana", collision-safe) — mirrors
 *  deriveHandle in lib/auth.ts, with taken handles resolved Convex-side. */
async function deriveHandle(c: Client, email: string | null): Promise<string | null> {
  if (!email) return null;
  const base =
    email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "")
      .slice(0, 24) || "maker";
  const taken = await convexAuthHandlesTaken(c);
  // Prefix-substring scan to bound the candidate walk (mirrors LIKE … LIMIT).
  const used = new Set(taken.filter((h) => h === base || h.startsWith(`${base}-`)));
  if (!used.has(base)) return base;
  for (let i = 2; i < 50; i++) if (!used.has(`${base}-${i}`)) return `${base}-${i}`;
  return `${base}-${Date.now().toString(36)}`;
}

const ms = (d: Date | null | undefined): number | null | undefined =>
  d == null ? d : new Date(d).getTime();

export const convexAdapter: Adapter = {
  async createUser(user) {
    const c = client();
    const handle = await deriveHandle(c, user.email ?? null);
    const now = Date.now();
    const created = await convexAuthUserCreate(c, {
      id: crypto.randomUUID(),
      name: user.name ?? null,
      email: user.email ?? null,
      emailVerified: ms(user.emailVerified ?? null),
      image: (user.image as string | null) ?? null,
      handle,
      createdAt: now,
    });
    return mapUser(created);
  },
  async getUser(id) {
    const u = await convexAuthUserById(client(), id);
    return u ? mapUser(u) : null;
  },
  async getUserByEmail(email) {
    const u = await convexAuthUserByEmail(client(), email);
    return u ? mapUser(u) : null;
  },
  async getUserByAccount({ provider, providerAccountId }) {
    const u = await convexAuthUserByAccount(client(), {
      provider,
      providerAccountId,
    });
    return u ? mapUser(u) : null;
  },
  async updateUser({ id, ...data }) {
    // Whitelisted columns only (mirrors the SQLite adapter).
    const patch: Record<string, unknown> = {};
    for (const key of ["name", "email", "emailVerified", "image", "handle", "bio"] as const) {
      if (key in data) {
        const v = (data as Record<string, unknown>)[key];
        patch[key] =
          key === "emailVerified"
            ? v instanceof Date
              ? v.toISOString()
              : (v as string | null)
            : (v as string | null);
      }
    }
    const updated = await convexAuthUserPatch(client(), {
      id,
      ...(patch as {
        name?: string | null;
        email?: string | null;
        emailVerified?: string | null;
        image?: string | null;
        handle?: string | null;
        bio?: string | null;
      }),
    });
    return mapUser(updated);
  },
  async linkAccount(account) {
    await convexAuthAccountLink(client(), {
      userLegacyId: account.userId,
      type: account.type,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      refreshToken: account.refresh_token ?? null,
      accessToken: account.access_token ?? null,
      expiresAt: account.expires_at ?? null,
      tokenType: account.token_type ?? null,
      scope: account.scope ?? null,
      idToken: account.id_token ?? null,
      sessionState: (account.session_state as string | undefined) ?? null,
    });
  },
  async createSession(session) {
    const created = await convexAuthSessionCreate(client(), {
      sessionToken: session.sessionToken,
      userLegacyId: session.userId,
      expires: new Date(session.expires).getTime(),
    });
    return {
      sessionToken: created.sessionToken,
      userId: created.userId,
      expires: new Date(created.expires),
    } as AdapterSession;
  },
  async getSessionAndUser(sessionToken) {
    const res = await convexAuthSessionAndUser(client(), sessionToken);
    if (!res) return null;
    return {
      session: {
        sessionToken: res.session.sessionToken,
        userId: res.session.userId,
        expires: new Date(res.session.expires),
      } as AdapterSession,
      user: mapUser(res.user),
    };
  },
  async updateSession({ sessionToken, ...data }) {
    if (!("expires" in data)) return undefined;
    const updated = await convexAuthSessionPatch(client(), {
      sessionToken,
      expires: new Date((data as { expires?: Date }).expires!).getTime(),
    });
    if (!updated) return null;
    return {
      sessionToken: updated.sessionToken,
      userId: updated.userId,
      expires: new Date(updated.expires),
    } as AdapterSession;
  },
  async deleteSession(sessionToken) {
    await convexAuthSessionDelete(client(), sessionToken);
  },
  async createVerificationToken(token) {
    await convexAuthVerificationTokenCreate(client(), {
      identifier: token.identifier,
      token: token.token,
      expires: new Date(token.expires).getTime(),
    });
    return token as AdapterVerificationToken;
  },
  async useVerificationToken({ identifier, token }) {
    // Atomic consume (single mutation — mirrors DELETE … RETURNING).
    const consumed = await convexAuthVerificationTokenConsume(client(), {
      identifier,
      token,
    });
    if (!consumed) return null;
    return {
      identifier: consumed.identifier,
      token: consumed.token,
      expires: new Date(consumed.expires),
    } as AdapterVerificationToken;
  },
};

/** True when the Convex store serves NextAuth (requires server restart). */
export function isConvexAuthStoreEnabled(): boolean {
  return (process.env.AUTH_STORE ?? "").trim().toLowerCase() === "convex";
}
