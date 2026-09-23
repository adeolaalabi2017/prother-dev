/**
 * Forum/community user management (Task 23) — powers the Admin Console's
 * Users module: searchable roster with activity counts, role + ban controls.
 *
 * $queryRaw is deliberate (stale-PrismaClient case — see lib/forum.ts): the
 * long-running dev server caches a PRE-GENERATION client, so the new
 * User.role/status columns and count aggregates are ORM-unusable until a
 * restart. Raw SQL works before and after.
 */
import { db } from "@/lib/db";

export type ManagedRole = "member" | "moderator" | "admin";
export type ManagedStatus = "active" | "banned";

export type ManagedUser = {
  id: string;
  name: string | null;
  email: string | null;
  handle: string | null;
  image: string | null;
  role: ManagedRole;
  status: ManagedStatus;
  createdAt: string;
  threads: number;
  replies: number;
  reviews: number;
  bookmarks: number;
  reportsFiled: number;
  lastActivityAt: string | null;
};

export type UserListResponse = {
  users: ManagedUser[];
  stats: { total: number; banned: number; moderators: number; admins: number };
};

/** SQLite DateTime reads may be ms-epoch numbers or ISO strings. */
function toIso(v: number | string | null): string | null {
  if (v == null) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Latest forum activity (thread or reply) for a set of user ids. */
async function lastActivityMap(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const placeholders = ids.map(() => "?").join(",");
  try {
    const rows = await db.$queryRawUnsafe<{ authorId: string; at: number | string }[]>(
      `SELECT authorId, MAX(createdAt) AS at FROM (
         SELECT authorId, createdAt FROM ForumThread WHERE authorId IN (${placeholders})
         UNION ALL
         SELECT authorId, createdAt FROM ForumReply WHERE authorId IN (${placeholders})
       ) WHERE authorId IS NOT NULL GROUP BY authorId`,
      ...ids, ...ids
    );
    for (const r of rows) {
      const iso = toIso(r.at);
      if (r.authorId && iso) map.set(r.authorId, iso);
    }
  } catch {
    /* cosmetic field — never break the list */
  }
  return map;
}

export async function listManagedUsers(opts: {
  q?: string;
  status?: string;
  role?: string;
}): Promise<UserListResponse> {
  const q = opts.q?.trim() ?? "";
  const status = opts.status && opts.status !== "all" ? opts.status : "";
  const role = opts.role && opts.role !== "all" ? opts.role : "";

  const like = `%${q}%`;
  const rows = await db.$queryRaw<
    {
      id: string;
      name: string | null;
      email: string | null;
      handle: string | null;
      image: string | null;
      role: string;
      status: string;
      createdAt: number | string;
      threads: number | bigint;
      replies: number | bigint;
      reviews: number | bigint;
      bookmarks: number | bigint;
      reportsFiled: number | bigint;
    }[]
  >`
    SELECT u.id, u.name, u.email, u.handle, u.image, u.role, u.status, u.createdAt,
      (SELECT COUNT(*) FROM ForumThread t WHERE t.authorId = u.id) AS threads,
      (SELECT COUNT(*) FROM ForumReply r  WHERE r.authorId = u.id)  AS replies,
      (SELECT COUNT(*) FROM Review rv     WHERE rv.userId  = u.id)  AS reviews,
      (SELECT COUNT(*) FROM Bookmark b    WHERE b.ownerKey = 'user:' || u.email) AS bookmarks,
      (SELECT COUNT(*) FROM Report rp     WHERE rp.reporterEmail = u.email)      AS reportsFiled
    FROM "User" u
    WHERE (${q} = '' OR u.name LIKE ${like} OR u.email LIKE ${like} OR u.handle LIKE ${like})
      AND (${status} = '' OR u.status = ${status})
      AND (${role} = '' OR u.role = ${role})
    ORDER BY u.createdAt DESC
    LIMIT 300`;

  const lastActivity = await lastActivityMap(rows.map((r) => r.id));

  const users: ManagedUser[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    handle: r.handle,
    image: r.image,
    role: (["member", "moderator", "admin"].includes(r.role) ? r.role : "member") as ManagedRole,
    status: (r.status === "banned" ? "banned" : "active") as ManagedStatus,
    createdAt: toIso(r.createdAt) ?? new Date().toISOString(),
    threads: Number(r.threads),
    replies: Number(r.replies),
    reviews: Number(r.reviews),
    bookmarks: Number(r.bookmarks),
    reportsFiled: Number(r.reportsFiled),
    lastActivityAt: lastActivity.get(r.id) ?? null,
  }));

  const statRows = await db.$queryRaw<{ status: string; role: string; n: number | bigint }[]>`
    SELECT status, role, COUNT(*) AS n FROM "User" GROUP BY status, role`;
  const stats = { total: users.length, banned: 0, moderators: 0, admins: 0 };
  // Group-by reflects the whole table, not just this page.
  const totals = await db.$queryRaw<{ n: number | bigint }[]>`
    SELECT COUNT(*) AS n FROM "User"`;
  for (const s of statRows) {
    const n = Number(s.n);
    if (s.status === "banned") stats.banned += n;
    if (s.role === "moderator") stats.moderators += n;
    if (s.role === "admin") stats.admins += n;
  }
  stats.total = Number(totals[0]?.n ?? users.length);

  return { users, stats };
}

export async function updateUserModeration(
  id: string,
  patch: { role?: ManagedRole; status?: ManagedStatus; image?: string | null }
): Promise<{ ok: true } | { ok: false; error: "not_found" }> {
  const keys: string[] = [];
  const values: unknown[] = [];
  if (patch.role) { keys.push('"role" = ?'); values.push(patch.role); }
  if (patch.status) { keys.push('"status" = ?'); values.push(patch.status); }
  // Avatar media URL (Task 34) — validated by the route's MEDIA_URL schema.
  if (patch.image !== undefined) { keys.push('"image" = ?'); values.push(patch.image); }
  if (keys.length === 0) return { ok: true };

  const res = await db.$executeRawUnsafe(
    `UPDATE "User" SET ${keys.join(", ")} WHERE "id" = ?`,
    ...values, id
  );
  if (res === 0) return { ok: false, error: "not_found" };

  // Banning revokes live sessions immediately.
  if (patch.status === "banned") {
    await db.$executeRawUnsafe(`DELETE FROM "Session" WHERE "userId" = ?`, id).catch(() => {});
  }
  return { ok: true };
}

/** True when the account is banned — checked by every community write route. */
export async function isUserBanned(userId: string): Promise<boolean> {
  const rows = await db.$queryRaw<{ status: string }[]>`
    SELECT status FROM "User" WHERE id = ${userId} LIMIT 1`;
  return rows[0]?.status === "banned";
}

/** Owner namespace for bookmarks/reports: signed-in email or anon key. */
export function userOwnerKey(email: string): string {
  return `user:${email.toLowerCase()}`;
}
