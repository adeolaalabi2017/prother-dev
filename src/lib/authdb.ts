/**
 * Micro-SQLite auth store (Phase 5).
 *
 * NextAuth (sessions, magic-link tokens, OAuth links, user profiles) keeps a
 * tiny local SQLite database instead of Prisma — everything else moved to
 * Convex and `db/custom.db` is deleted. better-sqlite3 is synchronous and
 * zero-dependency; the NextAuth adapter only ever needs simple statements.
 *
 * The `aq`/`ax`/`axUnsafe` helpers mirror the Prisma raw API the adapter
 * was written against (`$queryRaw` / `$executeRaw` / `$queryRawUnsafe`),
 * including template-tag interpolation, so the adapter diff stays minimal:
 *   - `db.$queryRaw`…`` → `aq`…``
 *   - `db.$executeRaw`…`` → `ax`…``
 *   - `db.$queryRawUnsafe(sql, ...params)` → `axUnsafe(sql, ...params)`
 *     (SELECT variant: `aqUnsafe`).
 *
 * Value mapping matches the old behavior: Date → ISO string (callers
 * pre-convert via sql()), boolean → 0/1, undefined → null.
 */
import Database from "better-sqlite3";
import { join } from "node:path";

const DB_PATH =
  process.env.AUTH_DATABASE_URL ??
  join(process.cwd(), "db", "auth.db");

type GlobalAuthDb = typeof globalThis & { __protherAuthDb?: Database.Database };
const g = globalThis as GlobalAuthDb;

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS "User" (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      emailVerified TEXT,
      image TEXT,
      handle TEXT UNIQUE,
      bio TEXT,
      role TEXT NOT NULL DEFAULT 'member',
      status TEXT NOT NULL DEFAULT 'active',
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "Account" (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      providerAccountId TEXT NOT NULL,
      refresh_token TEXT,
      access_token TEXT,
      expires_at INTEGER,
      token_type TEXT,
      scope TEXT,
      id_token TEXT,
      session_state TEXT,
      UNIQUE(provider, providerAccountId)
    );
    CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"(userId);
    CREATE TABLE IF NOT EXISTS "Session" (
      id TEXT PRIMARY KEY,
      sessionToken TEXT NOT NULL UNIQUE,
      userId TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      expires TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"(userId);
    CREATE TABLE IF NOT EXISTS "VerificationToken" (
      identifier TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires TEXT NOT NULL,
      UNIQUE(identifier, token)
    );
  `);
}

function getDb(): Database.Database {
  if (!g.__protherAuthDb) {
    g.__protherAuthDb = new Database(DB_PATH);
    g.__protherAuthDb.pragma("journal_mode = WAL");
    g.__protherAuthDb.pragma("foreign_keys = ON");
    initSchema(g.__protherAuthDb);
  }
  return g.__protherAuthDb;
}

/** better-sqlite3 binding normalization (mirrors old Prisma behavior). */
function bind(v: unknown): unknown {
  if (v === undefined) return null;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "bigint") return Number(v);
  return v;
}

function build(
  strings: TemplateStringsArray,
  values: unknown[],
): { sql: string; params: unknown[] } {
  let sql = strings[0] ?? "";
  for (let i = 0; i < values.length; i++) {
    sql += `?${strings[i + 1] ?? ""}`;
  }
  return { sql, params: values.map(bind) };
}

/** SELECT… → rows (template-tag form of the old `db.$queryRaw`). */
export function aq<T>(strings: TemplateStringsArray, ...values: unknown[]): T[] {
  const { sql, params } = build(strings, values);
  return getDb().prepare(sql).all(...(params as never[])) as T[];
}

/** INSERT/UPDATE/DELETE (template-tag form of the old `db.$executeRaw`). */
export function ax(strings: TemplateStringsArray, ...values: unknown[]): number {
  const { sql, params } = build(strings, values);
  return Number(getDb().prepare(sql).run(...(params as never[])).changes);
}

/** SELECT with an explicit SQL string (old `db.$queryRawUnsafe`). */
export function aqUnsafe<T>(sql: string, ...params: unknown[]): T[] {
  return getDb()
    .prepare(sql)
    .all(...(params.map(bind) as never[])) as T[];
}

/** Write with an explicit SQL string (old `db.$executeRawUnsafe`). */
export function axUnsafe(sql: string, ...params: unknown[]): number {
  return Number(
    getDb()
      .prepare(sql)
      .run(...(params.map(bind) as never[])).changes,
  );
}

/** Raw handle for backfills and one-off ops (same-process singleton). */
export function authDb(): Database.Database {
  return getDb();
}
