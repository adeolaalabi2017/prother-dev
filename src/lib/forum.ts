/**
 * Forums data access (Task 22-b) — threads, replies, anon votes.
 *
 * NOTE: $queryRaw is deliberate — a long-running `next dev` process keeps a
 * PRE-GENERATION PrismaClient cached (see the notes in lib/discussion.ts and
 * lib/prother.ts), so freshly added models are ORM-unusable until restart.
 * $queryRaw/$executeRaw are model-independent; the ForumThread /
 * ForumReply / ForumThreadVote TABLES exist after db:push.
 *
 * Sorting mirrors the launch feed: "hot" reuses the PRD F-36 decay
 * (rankScore in lib/prother.ts), pinned threads lead for hot/top.
 */
import { db } from "@/lib/db";
import { asForumTopic, type ForumSort, type ForumTopic } from "@/lib/forum-topics";
import { rankScore, slugifyName } from "@/lib/prother";
import type {
  ForumListResponse,
  ForumReplyRow,
  ForumThreadDetailResponse,
  ForumThreadRow,
  ForumTopicCounts,
} from "@/lib/prother";

// ── Raw row shapes (SQLite: DateTime = ms-epoch, Boolean = 0/1) ──────────
type RawThread = {
  id: string;
  slug: string;
  title: string;
  body: string;
  topic: string;
  author: string;
  pinned: number | boolean;
  baseUpvotes: number;
  createdAt: number | string;
};

/** SQLite stores DateTime as ms-epoch; raw reads may return number or string. */
function toIso(v: number | string | null): string {
  if (v == null) return new Date().toISOString();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function toRow(
  r: RawThread,
  replyCount: number,
  voteCount: number,
  voted: boolean
): ForumThreadRow {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    body: r.body,
    topic: asForumTopic(r.topic),
    author: r.author,
    pinned: Boolean(r.pinned),
    votes: r.baseUpvotes + voteCount,
    voted,
    replyCount,
    createdAt: toIso(r.createdAt),
  };
}

// ── List (shared by GET /api/forum and the /forums server page) ──────────
export async function forumListPayload(
  topic: "all" | ForumTopic,
  sort: ForumSort,
  voterKey?: string
): Promise<ForumListResponse> {
  const [rows, groupRows, votedRows] = await Promise.all([
    db.$queryRaw<(RawThread & { replyCount: number; voteCount: number })[]>`
      SELECT t.id, t.slug, t.title, t.body, t.topic, t.author, t.pinned,
             t.baseUpvotes, t.createdAt,
             (SELECT COUNT(*) FROM ForumReply fr WHERE fr.threadId = t.id AND fr.hidden = 0) AS replyCount,
             (SELECT COUNT(*) FROM ForumThreadVote fv WHERE fv.threadId = t.id) AS voteCount
      FROM ForumThread t
      WHERE (${topic} = 'all' OR t.topic = ${topic}) AND t.hidden = 0
      ORDER BY t.createdAt DESC
      LIMIT 200`,
    db.$queryRaw<{ topic: string; n: number }[]>`
      SELECT topic, COUNT(*) AS n FROM ForumThread WHERE hidden = 0 GROUP BY topic`,
    voterKey
      ? db.$queryRaw<{ threadId: string }[]>`
          SELECT threadId FROM ForumThreadVote WHERE voterKey = ${voterKey}`
      : Promise.resolve([] as { threadId: string }[]),
  ]);

  const votedSet = new Set(votedRows.map((v) => v.threadId));

  const threads = rows.map((r) =>
    toRow(r, Number(r.replyCount), Number(r.voteCount), votedSet.has(r.id))
  );

  const pinnedFirst = (a: ForumThreadRow, b: ForumThreadRow) =>
    Number(b.pinned) - Number(a.pinned);
  const byNewest = (a: ForumThreadRow, b: ForumThreadRow) =>
    b.createdAt.localeCompare(a.createdAt);

  if (sort === "new") {
    threads.sort(byNewest);
  } else if (sort === "top") {
    threads.sort((a, b) => pinnedFirst(a, b) || b.votes - a.votes || byNewest(a, b));
  } else {
    // hot — F-36 decay, same function the launch feed ranks with.
    const now = Date.now();
    const score = (t: ForumThreadRow) => rankScore(t.votes, new Date(t.createdAt), now);
    threads.sort((a, b) => pinnedFirst(a, b) || score(b) - score(a) || byNewest(a, b));
  }

  const counts: ForumTopicCounts = {
    all: 0,
    general: 0,
    vibecoding: 0,
    show: 0,
    introduce: 0,
  };
  for (const g of groupRows) {
    const n = Number(g.n);
    counts.all += n;
    const t = asForumTopic(g.topic);
    // Only count known topics — asForumTopic falls back to "general" for
    // unknown stored values and those must not inflate p/general.
    if (g.topic === t) counts[t] = n;
  }

  return { threads, counts };
}

// ── Detail ───────────────────────────────────────────────────────────────
export async function getForumThreadDetail(
  slug: string,
  voterKey?: string
): Promise<ForumThreadDetailResponse | null> {
  const threadRows = await db.$queryRaw<(RawThread & { updatedAt: number | string })[]>`
    SELECT id, slug, title, body, topic, author, pinned, baseUpvotes,
           createdAt, updatedAt
    FROM ForumThread
    WHERE slug = ${slug} AND hidden = 0
    LIMIT 1`;
  const raw = threadRows[0];
  if (!raw) return null;

  const [replyRows, voteRows, myVote] = await Promise.all([
    db.$queryRaw<{ id: string; author: string; body: string; createdAt: number | string }[]>`
      SELECT id, author, body, createdAt
      FROM ForumReply
      WHERE threadId = ${raw.id} AND hidden = 0
      ORDER BY createdAt ASC
      LIMIT 500`,
    db.$queryRaw<{ n: number }[]>`
      SELECT COUNT(*) AS n FROM ForumThreadVote WHERE threadId = ${raw.id}`,
    voterKey
      ? db.$queryRaw<{ id: string }[]>`
          SELECT id FROM ForumThreadVote
          WHERE threadId = ${raw.id} AND voterKey = ${voterKey} LIMIT 1`
      : Promise.resolve([] as { id: string }[]),
  ]);

  const replies: ForumReplyRow[] = replyRows.map((r) => ({
    id: r.id,
    author: r.author,
    body: r.body,
    createdAt: toIso(r.createdAt),
  }));

  const voted = myVote.length > 0;

  return {
    thread: {
      ...toRow(raw, replies.length, Number(voteRows[0]?.n ?? 0), voted),
      updatedAt: toIso(raw.updatedAt),
    },
    replies,
    voted,
  };
}

// ── Moderation ──────────────────────────────────────────────────────────

/**
 * True when the slug exists but is hidden by moderators. The detail/list
 * queries filter hidden rows, so /forums/[slug] uses this to keep the page
 * 200 + noindex and render a "removed by moderators" notice instead of the
 * content (hidden rows stay in the DB for the audit trail).
 */
export async function isForumThreadHidden(slug: string): Promise<boolean> {
  const rows = await db.$queryRaw<{ hidden: number | boolean }[]>`
    SELECT hidden FROM ForumThread WHERE slug = ${slug} LIMIT 1`;
  return Boolean(rows[0]?.hidden);
}

// ── Mutations ────────────────────────────────────────────────────────────

/** Thread id lookup for the reply/vote routes (null → 404). */
export async function getForumThreadIdBySlug(slug: string): Promise<string | null> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM ForumThread WHERE slug = ${slug} LIMIT 1`;
  return rows[0]?.id ?? null;
}

/** Slug from the title + a short random suffix, unique-checked. */
export async function uniqueForumSlug(title: string): Promise<string> {
  const base = slugifyName(title);
  for (let i = 0; i < 8; i++) {
    const candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const rows = await db.$queryRaw<{ id: string }[]>`
      SELECT id FROM ForumThread WHERE slug = ${candidate} LIMIT 1`;
    if (rows.length === 0) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function createForumThread(input: {
  slug: string;
  title: string;
  body: string;
  topic: ForumTopic;
  author: string;
  authorId: string | null;
  /** Dual-write overrides (Phase 4 step 3) — shared id/timestamps. */
  id?: string;
  createdAt?: number;
  updatedAt?: number;
}): Promise<ForumThreadRow> {
  const now = input.createdAt ?? Date.now();
  const rows = await db.$queryRaw<RawThread[]>`
    INSERT INTO ForumThread (
      id, slug, title, body, topic, author, authorId,
      pinned, baseUpvotes, createdAt, updatedAt
    ) VALUES (
      ${input.id ?? crypto.randomUUID()}, ${input.slug}, ${input.title}, ${input.body},
      ${input.topic}, ${input.author}, ${input.authorId},
      0, 0, ${now}, ${input.updatedAt ?? now}
    )
    RETURNING id, slug, title, body, topic, author, pinned, baseUpvotes, createdAt`;
  return toRow(rows[0]!, 0, 0, false);
}

export async function createForumReply(input: {
  threadId: string;
  author: string;
  authorId: string | null;
  body: string;
  /** Dual-write overrides (Phase 4 step 3) — shared id/timestamp. */
  id?: string;
  createdAt?: number;
}): Promise<ForumReplyRow> {
  const rows = await db.$queryRaw<{
    id: string;
    author: string;
    body: string;
    createdAt: number | string;
  }[]>`
    INSERT INTO ForumReply (id, threadId, author, authorId, body, createdAt)
    VALUES (${input.id ?? crypto.randomUUID()}, ${input.threadId}, ${input.author},
            ${input.authorId}, ${input.body}, ${input.createdAt ?? Date.now()})
    RETURNING id, author, body, createdAt`;
  const r = rows[0]!;
  return {
    id: r.id,
    author: r.author,
    body: r.body,
    createdAt: toIso(r.createdAt),
  };
}

/**
 * Toggle the viewer's vote (same anon voterKey scheme as POST /api/vote).
 * Atomic-ish: DELETE…RETURNING decides add vs remove; the unique
 * (threadId, voterKey) index guards double-inserts.
 */
export async function toggleForumThreadVote(
  threadId: string,
  voterKey: string
): Promise<{ voted: boolean; votes: number }> {
  const deleted = await db.$queryRaw<{ id: string }[]>`
    DELETE FROM ForumThreadVote
    WHERE threadId = ${threadId} AND voterKey = ${voterKey}
    RETURNING id`;

  if (deleted.length === 0) {
    await db.$executeRaw`
      INSERT INTO ForumThreadVote (id, threadId, voterKey)
      VALUES (${crypto.randomUUID()}, ${threadId}, ${voterKey})`;
  }

  const [base, count] = await Promise.all([
    db.$queryRaw<{ baseUpvotes: number }[]>`
      SELECT baseUpvotes FROM ForumThread WHERE id = ${threadId} LIMIT 1`,
    db.$queryRaw<{ n: number }[]>`
      SELECT COUNT(*) AS n FROM ForumThreadVote WHERE threadId = ${threadId}`,
  ]);

  return {
    voted: deleted.length === 0,
    votes: Number(base[0]?.baseUpvotes ?? 0) + Number(count[0]?.n ?? 0),
  };
}
