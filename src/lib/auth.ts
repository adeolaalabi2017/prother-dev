/**
 * NextAuth v4 configuration (PRD F-37: email + Google OAuth + magic links).
 *
 * - EmailProvider = the magic-link flow. The sandbox has no SMTP, so
 *   `sendVerificationRequest` stores the link in a globalThis inbox that
 *   /api/auth/dev-inbox exposes (set AUTH_DEV_LINKS=false in production with
 *   a real EMAIL_* provider). The link is also logged to the server console.
 * - GoogleProvider activates automatically when GOOGLE_CLIENT_ID/SECRET exist.
 * - Custom dependency-free adapter for the User/Account/Session/
 *   VerificationToken tables (schema.prisma).
 *
 * ADAPTER NOTE (same "stale-PrismaClient" case as lib/prother.ts:133): a
 * long-running `next dev` process can keep a PRE-GENERATION @prisma/client
 * class cached (externalized package → module require cache), so `db.user`,
 * `db.session`, `db.verificationToken` can be undefined even though the
 * tables exist and the on-disk client is current. The adapter therefore
 * goes through $queryRaw/$executeRaw — model-independent and always
 * available. Once the dev server restarts on a current client these queries
 * hit the exact same tables/columns, so nothing changes.
 */
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import type {
  Adapter,
  AdapterSession,
  AdapterUser,
  VerificationToken as AdapterVerificationToken,
} from "next-auth/adapters";
// NOTE: authdb (better-sqlite3, native) must never load on Workers — the
// Convex store is the only backend there. Every use below goes through the
// adb() dynamic import so workerd never evaluates the native binding.
async function adb() {
  return import("@/lib/authdb");
}
import { convexAdapter, isConvexAuthStoreEnabled } from "@/lib/auth-convex-adapter";
import { createServerConvexClient } from "@/lib/convex";
import { api } from "../../convex/_generated/api.js";

// ── Convex identity bridge (Phase 4 step 7, plan §3.5) ───────────────────
// NextAuth stays authoritative for sessions. These fire-and-forget syncs
// keep the Convex users table fresh (admin roster, ban checks) without ever
// blocking sign-in: a Convex outage must never break auth.

type BridgeUser = {
  id?: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  handle?: string | null;
  bio?: string | null;
  createdAt?: Date | string | null;
};

function syncUserToConvex(user: BridgeUser): void {
  const id = user.id;
  if (!id) return;
  void (async () => {
    try {
      const client = createServerConvexClient();
      if (!client) return;
      const createdAtRaw = user.createdAt;
      const createdAt =
        createdAtRaw instanceof Date
          ? createdAtRaw.getTime()
          : typeof createdAtRaw === "string" && !Number.isNaN(new Date(createdAtRaw).getTime())
            ? new Date(createdAtRaw).getTime()
            : Date.now();
      await client.mutation(api.users.ensureFromAuth, {
        id,
        email: user.email ?? undefined,
        name: user.name ?? undefined,
        handle: user.handle ?? undefined,
        image: user.image ?? undefined,
        bio: user.bio ?? undefined,
        createdAt,
      });
    } catch (err) {
      console.error("[auth-bridge] user sync failed:", id, err);
    }
  })();
}

// ── Dev magic-link inbox (sandbox stand-in for SMTP) ─────────────────────
type InboxEntry = { url: string; at: number };
const g = globalThis as typeof globalThis & {
  __protherDevInbox?: Map<string, InboxEntry>;
};
const devInbox: Map<string, InboxEntry> = (g.__protherDevInbox ??= new Map());

/** True when magic links may be surfaced through the dev-inbox endpoint. */
export const DEV_LINKS_ENABLED = process.env.AUTH_DEV_LINKS !== "false";

export function popDevMagicLink(email: string): string | null {
  const entry = devInbox.get(email.toLowerCase());
  if (!entry) return null;
  // Links expire after 15 minutes (matches the VerificationToken TTL).
  if (Date.now() - entry.at > 15 * 60_000) {
    devInbox.delete(email.toLowerCase());
    return null;
  }
  return entry.url;
}

// ── Raw-SQL adapter helpers (see ADAPTER NOTE above) ─────────────────────
type RawUserRow = {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: string | null;
  image: string | null;
  handle: string | null;
  bio: string | null;
  createdAt: string;
};

/** TEXT (ISO) columns → Date objects, matching what the Prisma client returns. */
function mapUser(row: RawUserRow): AdapterUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: row.emailVerified ? new Date(row.emailVerified) : null,
    image: row.image,
    handle: row.handle,
    bio: row.bio,
    createdAt: new Date(row.createdAt),
  } as AdapterUser;
}

/** Dates → ISO strings for SQLite TEXT columns (raw params aren't mapped). */
function sql(v: unknown): unknown {
  return v instanceof Date ? v.toISOString() : v;
}

// ── Handle derivation ("dana@x.com" → "@dana", collision-safe) ───────────
async function deriveHandle(email: string | null): Promise<string | null> {
  if (!email) return null;
  const base =
    email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "")
      .slice(0, 24) || "maker";
  const { aq } = await adb();
  const taken = await aq<{ handle: string }>`
    SELECT handle FROM "User" WHERE handle LIKE ${base + "%"} LIMIT 500`;
  const used = new Set(taken.map((t) => t.handle));
  if (!used.has(base)) return base;
  for (let i = 2; i < 50; i++) if (!used.has(`${base}-${i}`)) return `${base}-${i}`;
  return `${base}-${Date.now().toString(36)}`;
}

async function rawGetUserById(id: string): Promise<AdapterUser | null> {
  const { aq } = await adb();
  const rows = await aq<RawUserRow>`
    SELECT id, name, email, emailVerified, image, handle, bio, createdAt
    FROM "User" WHERE id = ${id} LIMIT 1`;
  return rows[0] ? mapUser(rows[0]) : null;
}

// ── Custom raw adapter (stale-client safe — see ADAPTER NOTE) ────────────
const prismaAdapter: Adapter = {
  async createUser(user) {
    const handle = await deriveHandle(user.email ?? null);
    const { aq } = await adb();
    const rows = await aq<RawUserRow>`
      INSERT INTO "User" (id, name, email, emailVerified, image, handle, bio, createdAt)
      VALUES (
        ${crypto.randomUUID()}, ${sql(user.name ?? null)}, ${sql(user.email ?? null)},
        ${sql(user.emailVerified ?? null)}, ${sql(user.image ?? null)},
        ${handle}, null, ${new Date().toISOString()}
      )
      RETURNING id, name, email, emailVerified, image, handle, bio, createdAt`;
    return mapUser(rows[0]!);
  },
  async getUser(id) {
    return rawGetUserById(id);
  },
  async getUserByEmail(email) {
    const { aq } = await adb();
    const rows = await aq<RawUserRow>`
      SELECT id, name, email, emailVerified, image, handle, bio, createdAt
      FROM "User" WHERE email = ${email} LIMIT 1`;
    return rows[0] ? mapUser(rows[0]) : null;
  },
  async getUserByAccount({ provider, providerAccountId }) {
    const { aq } = await adb();
    const rows = await aq<RawUserRow>`
      SELECT u.id, u.name, u.email, u.emailVerified, u.image, u.handle, u.bio, u.createdAt
      FROM "Account" a JOIN "User" u ON u.id = a.userId
      WHERE a.provider = ${provider} AND a.providerAccountId = ${providerAccountId}
      LIMIT 1`;
    return rows[0] ? mapUser(rows[0]) : null;
  },
  async updateUser({ id, ...data }) {
    // Whitelisted columns only; every value is a bound parameter.
    const patch: Record<string, unknown> = {};
    for (const key of ["name", "email", "emailVerified", "image", "handle", "bio"] as const) {
      if (key in data) patch[key] = sql((data as Record<string, unknown>)[key] ?? null);
    }
    const keys = Object.keys(patch);
    if (keys.length > 0) {
      const { axUnsafe } = await adb();
      await axUnsafe(
        `UPDATE "User" SET ${keys.map((k) => `"${k}" = ?`).join(", ")} WHERE "id" = ?`,
        ...keys.map((k) => patch[k]),
        id
      );
    }
    return (await rawGetUserById(id)) as AdapterUser;
  },
  async linkAccount(account) {
    const { ax } = await adb();
    await ax`
      INSERT INTO "Account" (
        id, userId, type, provider, providerAccountId, refresh_token,
        access_token, expires_at, token_type, scope, id_token, session_state
      ) VALUES (
        ${crypto.randomUUID()}, ${account.userId}, ${account.type},
        ${account.provider}, ${account.providerAccountId},
        ${sql(account.refresh_token ?? null)}, ${sql(account.access_token ?? null)},
        ${account.expires_at ?? null}, ${sql(account.token_type ?? null)},
        ${sql(account.scope ?? null)}, ${sql(account.id_token ?? null)},
        ${sql(account.session_state ?? null)}
      )`;
  },
  async createSession(session) {
    const { ax } = await adb();
    await ax`
      INSERT INTO "Session" (id, sessionToken, userId, expires)
      VALUES (${crypto.randomUUID()}, ${session.sessionToken}, ${session.userId}, ${sql(session.expires)})`;
    return session as AdapterSession;
  },
  async getSessionAndUser(sessionToken) {
    const { aq } = await adb();
    const rows = await aq<
      {
        sessionToken: string;
        userId: string;
        expires: string;
        id: string;
        name: string | null;
        email: string | null;
        emailVerified: string | null;
        image: string | null;
        handle: string | null;
        bio: string | null;
        createdAt: string;
      }
    >`
      SELECT s.sessionToken, s.userId, s.expires,
             u.id, u.name, u.email, u.emailVerified, u.image, u.handle, u.bio, u.createdAt
      FROM "Session" s JOIN "User" u ON u.id = s.userId
      WHERE s.sessionToken = ${sessionToken} LIMIT 1`;
    const row = rows[0];
    if (!row) return null;
    return {
      session: {
        sessionToken: row.sessionToken,
        userId: row.userId,
        expires: new Date(row.expires),
      } as AdapterSession,
      user: mapUser(row),
    };
  },
  async updateSession({ sessionToken, ...data }) {
    const patch: Record<string, unknown> = {};
    if ("expires" in data) patch.expires = sql((data as { expires?: Date }).expires);
    const keys = Object.keys(patch);
    if (keys.length > 0) {
      const { aqUnsafe } = await adb();
      const rows = await aqUnsafe<
        { sessionToken: string; userId: string; expires: string }
      >(
        `UPDATE "Session" SET ${keys.map((k) => `"${k}" = ?`).join(", ")}
         WHERE "sessionToken" = ?
         RETURNING sessionToken, userId, expires`,
        ...keys.map((k) => patch[k]),
        sessionToken
      );
      const row = rows[0];
      if (!row) return null;
      return {
        sessionToken: row.sessionToken,
        userId: row.userId,
        expires: new Date(row.expires),
      } as AdapterSession;
    }
    return undefined;
  },
  async deleteSession(sessionToken) {
    const { ax } = await adb();
    await ax`DELETE FROM "Session" WHERE sessionToken = ${sessionToken}`;
  },
  async createVerificationToken(token) {
    const { ax } = await adb();
    await ax`
      INSERT INTO "VerificationToken" (identifier, token, expires)
      VALUES (${token.identifier}, ${token.token}, ${sql(token.expires)})`;
    return token as AdapterVerificationToken;
  },
  async useVerificationToken({ identifier, token }) {
    // Atomic consume: DELETE … RETURNING keeps find-then-delete semantics.
    const { aq } = await adb();
    const rows = await aq<{ identifier: string; token: string; expires: string }>`
      DELETE FROM "VerificationToken"
      WHERE identifier = ${identifier} AND token = ${token}
      RETURNING identifier, token, expires`;
    const row = rows[0];
    if (!row) return null;
    return {
      identifier: row.identifier,
      token: row.token,
      expires: new Date(row.expires),
    } as AdapterVerificationToken;
  },
};

// ── Providers ────────────────────────────────────────────────────────────
const googleConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

export const authOptions: NextAuthOptions = {
  // Auth phase (option C): AUTH_STORE=convex serves sessions from Convex
  // (default sqlite keeps the micro-SQLite adapter until verified).
  adapter: isConvexAuthStoreEnabled() ? convexAdapter : prismaAdapter,
  session: { strategy: "database", maxAge: 30 * 24 * 3600 },
  pages: {}, // default pages; the header opens its own sign-in popover that posts to /api/auth/*
  providers: [
    EmailProvider({
      from: process.env.EMAIL_FROM || "Prother <noreply@prother.dev>",
      async sendVerificationRequest({ identifier, url }) {
        // Sandbox transport: capture into the dev inbox + server log.
        if (DEV_LINKS_ENABLED) {
          devInbox.set(identifier.toLowerCase(), { url, at: Date.now() });
        }
        // Production transport: Resend (requires RESEND_API_KEY; the
        // sending-restricted key is enough). Failures log loud but never
        // break sign-in — the dev inbox still holds the link when enabled.
        const apiKey = (process.env.RESEND_API_KEY ?? "").trim();
        if (apiKey) {
          try {
            const { Resend } = await import("resend");
            const { error } = await new Resend(apiKey).emails.send({
              from:
                process.env.EMAIL_FROM || "Prother <noreply@prother.dev>",
              to: identifier,
              subject: "Sign in to Prother",
              html: `<p>Click the link below to sign in to Prother. It expires in 15 minutes.</p><p><a href="${url}">Sign in to Prother</a></p><p>If you didn't request this, you can ignore this email.</p>`,
            });
            if (error) throw new Error(`${error.name}: ${error.message}`);
          } catch (err) {
            console.error("[prother:auth] resend send failed:", identifier, err);
          }
        } else {
          console.log(`[prother:auth] magic link for ${identifier}: ${url}`);
        }
      },
      // Shorter than the default 24h — magic links should be short-lived.
      maxAge: 15 * 60,
    }),
    ...(googleConfigured
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: false,
          }),
        ]
      : []),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.handle = user.handle ?? null;
        // Avatar passthrough (Task 34): User.image is a PRE-boot column, so
        // the ORM-typed AdapterUser always carries it; the client header chip
        // and profile popover read session.user.image.
        session.user.image = user.image ?? null;
        session.user.createdAt = user.createdAt;
      }
      return session;
    },
  },
  events: {
    // Identity bridge (Phase 4 step 7): keep Convex users in sync on every
    // signup and sign-in (also backfills pre-bridge rows via externalAuthId).
    // Fire-and-forget — sync failures only log.
    async createUser({ user }) {
      syncUserToConvex(user as BridgeUser);
    },
    async signIn({ user }) {
      syncUserToConvex(user as BridgeUser);
    },
  },
};

// ── Route-handler helper (used by every community API) ───────────────────
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  handle: string;
  createdAt: Date;
};

/** Current signed-in user for API routes, or null. */
export async function getAuthUser(): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const id = session?.user?.id;
  if (!session?.user || !email || !id) return null;
  return {
    id,
    email,
    name: session.user.name || session.user.handle || email.split("@")[0],
    handle: session.user.handle ?? email.split("@")[0],
    createdAt: session.user.createdAt ?? new Date(),
  };
}
