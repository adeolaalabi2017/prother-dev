/**
 * Bookmarks (Task 23) — personal saved items across tools / forum threads /
 * journal posts. Owner namespace: "user:{email}" when signed-in, otherwise
 * "anon:{visitorKey}" (localStorage, same scheme as votes).
 *
 * $queryRaw is deliberate (stale-PrismaClient case — see lib/forum.ts).
 */
import { db } from "@/lib/db";

export const BOOKMARK_TARGET_TYPES = ["tool", "thread", "post"] as const;
export type BookmarkTargetType = (typeof BOOKMARK_TARGET_TYPES)[number];

export type BookmarkItem = {
  id: string;
  targetType: BookmarkTargetType;
  targetId: string;
  targetLabel: string;
  targetHref: string;
  createdAt: string;
};

export type BookmarkListResponse = {
  items: BookmarkItem[];
  owner: string; // masked owner namespace (for client confirmation)
};

function toIso(v: number | string | null): string | null {
  if (v == null) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function bookmarkOwnerKey(opts: {
  email?: string | null;
  visitorKey?: string | null;
}): string | null {
  if (opts.email) return `user:${opts.email.toLowerCase()}`;
  if (opts.visitorKey) return `anon:${opts.visitorKey}`;
  return null;
}

export async function listBookmarks(ownerKey: string): Promise<BookmarkListResponse> {
  const rows = await db.$queryRaw<
    {
      id: string;
      targetType: string;
      targetId: string;
      targetLabel: string;
      targetHref: string;
      createdAt: number | string;
    }[]
  >`
    SELECT id, targetType, targetId, targetLabel, targetHref, createdAt
    FROM Bookmark
    WHERE ownerKey = ${ownerKey}
    ORDER BY createdAt DESC
    LIMIT 200`;

  const items: BookmarkItem[] = rows.map((r) => ({
    id: r.id,
    targetType: (BOOKMARK_TARGET_TYPES.includes(r.targetType as BookmarkTargetType)
      ? r.targetType
      : "tool") as BookmarkTargetType,
    targetId: r.targetId,
    targetLabel: r.targetLabel || r.targetId,
    targetHref: r.targetHref,
    createdAt: toIso(r.createdAt) ?? new Date().toISOString(),
  }));

  const [prefix] = ownerKey.split(":");
  const masked = `${prefix}:…`;
  return { items, owner: masked };
}

/**
 * Toggle (or explicitly add/remove) a bookmark. Label/href are snapshots so
 * the saved list renders without re-joining the target tables.
 */
export async function toggleBookmark(
  ownerKey: string,
  input: {
    targetType: BookmarkTargetType;
    targetId: string;
    targetLabel?: string;
    targetHref?: string;
    action?: "toggle" | "add" | "remove";
  }
): Promise<{ bookmarked: boolean }> {
  const existing = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM Bookmark
    WHERE ownerKey = ${ownerKey} AND targetType = ${input.targetType}
      AND targetId = ${input.targetId}
    LIMIT 1`;

  const isBookmarked = Boolean(existing[0]);
  const remove =
    input.action === "remove" || (input.action !== "add" && isBookmarked);

  if (remove) {
    await db.$executeRaw`
      DELETE FROM Bookmark
      WHERE ownerKey = ${ownerKey} AND targetType = ${input.targetType}
        AND targetId = ${input.targetId}`;
    return { bookmarked: false };
  }

  if (!isBookmarked) {
    // Resolve fresh label/href when the caller didn't supply them.
    let label = input.targetLabel ?? "";
    let href = input.targetHref ?? "";
    try {
      if (input.targetType === "tool" && (!label || !href)) {
        const r = await db.$queryRaw<{ name: string; slug: string }[]>`
          SELECT name, slug FROM Tool WHERE slug = ${input.targetId} LIMIT 1`;
        label = label || r[0]?.name || "";
        href = href || (r[0] ? `/?tool=${r[0].slug}` : "");
      } else if (input.targetType === "thread" && (!label || !href)) {
        const r = await db.$queryRaw<{ title: string; slug: string }[]>`
          SELECT title, slug FROM ForumThread WHERE id = ${input.targetId} LIMIT 1`;
        label = label || r[0]?.title || "";
        href = href || (r[0] ? `/forums/${r[0].slug}` : "");
      } else if (input.targetType === "post" && (!label || !href)) {
        const r = await db.$queryRaw<{ title: string; slug: string }[]>`
          SELECT title, slug FROM Post WHERE slug = ${input.targetId} LIMIT 1`;
        label = label || r[0]?.title || "";
        href = href || (r[0] ? `/?post=${r[0].slug}` : "");
      }
    } catch {
      /* fall back to the caller's snapshots */
    }

    await db.$executeRaw`
      INSERT INTO Bookmark (id, ownerKey, targetType, targetId, targetLabel, targetHref, createdAt)
      VALUES (${crypto.randomUUID()}, ${ownerKey}, ${input.targetType}, ${input.targetId},
              ${label.slice(0, 160)}, ${href.slice(0, 200)}, ${new Date().toISOString()})`;
  }
  return { bookmarked: true };
}

/** Bulk existence check — the tool/thread pages verify bookmark state here. */
export async function bookmarkedSet(
  ownerKey: string,
  targetType: BookmarkTargetType,
  targetIds: string[]
): Promise<Set<string>> {
  if (targetIds.length === 0) return new Set();
  const placeholders = targetIds.map(() => "?").join(",");
  const rows = await db.$queryRawUnsafe<{ targetId: string }[]>(
    `SELECT targetId FROM Bookmark
     WHERE ownerKey = ? AND targetType = ? AND targetId IN (${placeholders})`,
    ownerKey, targetType, ...targetIds
  );
  return new Set(rows.map((r) => r.targetId));
}

export async function bookmarkCounts(): Promise<{ tools: number; threads: number; posts: number }> {
  const rows = await db.$queryRaw<{ targetType: string; n: number | bigint }[]>`
    SELECT targetType, COUNT(*) AS n FROM Bookmark GROUP BY targetType`;
  const out = { tools: 0, threads: 0, posts: 0 };
  for (const r of rows) {
    const n = Number(r.n);
    if (r.targetType === "tool") out.tools = n;
    if (r.targetType === "thread") out.threads = n;
    if (r.targetType === "post") out.posts = n;
  }
  return out;
}
