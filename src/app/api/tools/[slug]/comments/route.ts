import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prother";
import {
  createComment,
  lastCommentAgeSec,
  listComments,
  type CommentsResponse,
} from "@/lib/discussion";

export const dynamic = "force-dynamic";

const BODY_MIN = 4;
const BODY_MAX = 280;
const NAME_MIN = 2;
const NAME_MAX = 24;

const postSchema = z.object({
  author: z
    .string()
    .trim()
    .min(NAME_MIN, `Name needs ${NAME_MIN}+ characters`)
    .max(NAME_MAX, `Name is capped at ${NAME_MAX} characters`),
  body: z
    .string()
    .trim()
    .min(BODY_MIN, `Comment needs ${BODY_MIN}+ characters`)
    .max(BODY_MAX, `Comment is capped at ${BODY_MAX} characters`),
});

/** GET /api/tools/[slug]/comments — chronological discussion for a tool. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const tool = await db.tool.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!tool) {
    return NextResponse.json({ error: "Tool not found" }, { status: 404 });
  }
  const items = await listComments(tool.id);
  const body: CommentsResponse = { items, count: items.length };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}

/** POST /api/tools/[slug]/comments — post a comment (auth-lite display name).
 *  isMaker is derived server-side: author matching the makerHandle (with or
 *  without the leading @, case-insensitive) gets the MAKER badge. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const tool = await db.tool.findUnique({
    where: { slug },
    select: { id: true, makerHandle: true },
  });
  if (!tool) {
    return NextResponse.json({ error: "Tool not found" }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid comment" },
      { status: 422 }
    );
  }

  const author = parsed.data.author;
  const age = await lastCommentAgeSec(tool.id, author);
  if (age !== null && age < 15) {
    return NextResponse.json(
      { error: "Slow down. Try again in a few seconds." },
      { status: 429 }
    );
  }

  const norm = (s: string) => s.replace(/^@/, "").toLowerCase();
  const isMaker = norm(author) === norm(tool.makerHandle);

  const comment = await createComment({
    toolId: tool.id,
    author,
    body: parsed.data.body,
    isMaker,
  });
  return NextResponse.json(comment, { status: 201 });
}
