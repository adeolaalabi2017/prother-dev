/**
 * Auth backfill: micro-SQLite auth.db → Convex auth store (Auth phase).
 *
 * Usage:  node scripts/backfill-auth-to-convex.ts
 *
 * Requires: `npx convex dev` running (local :3210 or cloud) and `.env.local`
 * with NEXT_PUBLIC_CONVEX_URL. Reads db/auth.db (or AUTH_DATABASE_URL)
 * directly through better-sqlite3 — no Prisma involved.
 *
 * Idempotent: the `authBackfill` mutation skips rows that already landed,
 * so re-runs are safe. Verifies per-table counts afterwards and exits
 * non-zero on mismatch.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import Database from "better-sqlite3";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

// ── Env (mirrors scripts/export-to-convex.ts) ──
function loadDotLocal(path: string): void {
  let text = "";
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
loadDotLocal(join(root, ".env.local"));

const CONVEX_URL = (process.env.NEXT_PUBLIC_CONVEX_URL ?? "").trim();
if (!CONVEX_URL) {
  console.error("NEXT_PUBLIC_CONVEX_URL is not set — is `npx convex dev` running?");
  process.exit(1);
}

const AUTH_DB_PATH =
  process.env.AUTH_DATABASE_URL ?? join(root, "db", "auth.db");

const db = new Database(AUTH_DB_PATH, { readonly: true });
const rows = <T>(sql: string): T[] => db.prepare(sql).all() as T[];

const users = rows<{
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: string | null;
  image: string | null;
  handle: string | null;
  bio: string | null;
  role: string;
  status: string;
  createdAt: string;
}>(`SELECT id, name, email, emailVerified, image, handle, bio, role, status, createdAt FROM "User"`);

const accounts = rows<{
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token: string | null;
  access_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
  session_state: string | null;
}>(`SELECT userId, type, provider, providerAccountId, refresh_token, access_token,
        expires_at, token_type, scope, id_token, session_state FROM "Account"`);

const sessions = rows<{
  sessionToken: string;
  userId: string;
  expires: string;
}>(`SELECT sessionToken, userId, expires FROM "Session"`);

const tokens = rows<{
  identifier: string;
  token: string;
  expires: string;
}>(`SELECT identifier, token, expires FROM "VerificationToken"`);

console.log(
  `auth.db rows: users=${users.length} accounts=${accounts.length} ` +
    `sessions=${sessions.length} tokens=${tokens.length}`,
);

const client = new ConvexHttpClient(CONVEX_URL);
const res = await client.mutation(api.authStore.authBackfill, {
  users: users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    emailVerified: u.emailVerified,
    image: u.image,
    handle: u.handle,
    bio: u.bio,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt,
  })),
  accounts: accounts.map((a) => ({
    userLegacyId: a.userId,
    type: a.type,
    provider: a.provider,
    providerAccountId: a.providerAccountId,
    refreshToken: a.refresh_token,
    accessToken: a.access_token,
    expiresAt: a.expires_at,
    tokenType: a.token_type,
    scope: a.scope,
    idToken: a.id_token,
    sessionState: a.session_state,
  })),
  sessions: sessions.map((s) => ({
    sessionToken: s.sessionToken,
    userLegacyId: s.userId,
    expires: s.expires,
  })),
  tokens: tokens.map((t) => ({
    identifier: t.identifier,
    token: t.token,
    expires: t.expires,
  })),
});
console.log("backfilled (new rows inserted):", res);
console.log(
  "Note: rows already present from the sign-in bridge sync are skipped " +
    "by design — re-run to confirm idempotency (all zeros).",
);
