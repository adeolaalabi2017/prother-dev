/**
 * Launch discussion (comments on tool listings).
 *
 * NOTE: $queryRaw is deliberate — a long-running `next dev` process keeps a
 * PRE-GENERATION PrismaClient cached on globalThis (see the note in
 * lib/prother.ts), so the `Comment` model is ORM-unusable until restart.
 * $queryRaw is model-independent; the Comment TABLE exists after db:push.
 *
 * Client components import ONLY the types (erased at build time).
 */
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type CommentRow = {
  id: string;
  author: string;
  body: string;
  isMaker: boolean;
  /** ISO timestamp. */
  createdAt: string;
};

export type CommentsResponse = {
  items: CommentRow[];
  count: number;
};

/** SQLite stores DateTime as ms-epoch; raw reads may return number or string. */
function toIso(v: number | string | null): string {
  if (v == null) return new Date().toISOString();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export async function listComments(toolId: string): Promise<CommentRow[]> {
  const rows = await db.$queryRaw<{
    id: string;
    author: string;
    body: string;
    isMaker: number | boolean;
    createdAt: number | string;
  }[]>`
    SELECT id, author, body, isMaker, createdAt
    FROM Comment
    WHERE toolId = ${toolId}
    ORDER BY createdAt ASC
    LIMIT 200`;
  return rows.map((r) => ({
    id: r.id,
    author: r.author,
    body: r.body,
    isMaker: Boolean(r.isMaker),
    createdAt: toIso(r.createdAt),
  }));
}

/** One grouped query → per-tool comment counts (powers feed row badges). */
export async function commentCountsByTool(
  toolIds: string[]
): Promise<Map<string, number>> {
  if (toolIds.length === 0) return new Map();
  const rows = await db.$queryRaw<{ toolId: string; n: number }[]>`
    SELECT toolId, COUNT(*) as n
    FROM Comment
    WHERE toolId IN (${Prisma.join(toolIds)})
    GROUP BY toolId`;
  return new Map(rows.map((r) => [r.toolId, Number(r.n)]));
}

export async function createComment(input: {
  toolId: string;
  author: string;
  body: string;
  isMaker: boolean;
}): Promise<CommentRow> {
  const rows = await db.$queryRaw<{
    id: string;
    author: string;
    body: string;
    isMaker: number | boolean;
    createdAt: number | string;
  }[]>`
    INSERT INTO Comment (id, toolId, author, body, isMaker, createdAt)
    VALUES (
      ${crypto.randomUUID()}, ${input.toolId}, ${input.author}, ${input.body},
      ${input.isMaker ? 1 : 0}, ${new Date().toISOString()}
    )
    RETURNING id, author, body, isMaker, createdAt`;
  const r = rows[0]!;
  return {
    id: r.id,
    author: r.author,
    body: r.body,
    isMaker: Boolean(r.isMaker),
    createdAt: toIso(r.createdAt),
  };
}

/** Anti-spam-lite: same author on same tool within 15s → 409. */
export async function lastCommentAgeSec(
  toolId: string,
  author: string
): Promise<number | null> {
  const rows = await db.$queryRaw<{ createdAt: number | string }[]>`
    SELECT createdAt FROM Comment
    WHERE toolId = ${toolId} AND author = ${author}
    ORDER BY createdAt DESC
    LIMIT 1`;
  const last = rows[0];
  if (!last) return null;
  const t =
    typeof last.createdAt === "number"
      ? last.createdAt
      : new Date(last.createdAt).getTime();
  return Math.max(0, (Date.now() - t) / 1000);
}
