import { NextResponse } from "next/server";
import { z } from "zod";
import { convexCommentAdd, shadowComments, shadowCommentsLastAge } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

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
  try {
    const res = await shadowComments(createServerConvexClient()!, slug);
    if ("error" in res) {
      return NextResponse.json(res, {
        status: 404,
        headers: { "x-data-backend": "convex" },
      });
    }
    return NextResponse.json(res, {
      headers: { "Cache-Control": "no-store", "x-data-backend": "convex" },
    });
  } catch (err) {
    console.error("[api:comments] GET failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

/** POST /api/tools/[slug]/comments — post a comment (auth-lite display name).
 *  isMaker is derived inside the mutation: author matching the makerHandle
 *  (with or without the leading @, case-insensitive) gets the MAKER badge. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Unknown slugs 404 before validation (mirrors the original order).
  const client = createServerConvexClient()!;
  try {
    const existing = await shadowComments(client, slug);
    if ("error" in existing) {
      return NextResponse.json(existing, { status: 404 });
    }
  } catch (err) {
    console.error("[api:comments] lookup failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
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

  try {
    const { ageSec } = await shadowCommentsLastAge(client, slug, parsed.data.author);
    if (ageSec !== null && ageSec < 15) {
      return NextResponse.json(
        { error: "Slow down. Try again in a few seconds." },
        { status: 429 }
      );
    }
  } catch (err) {
    console.error("[api:comments] rate-limit check failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const author = parsed.data.author;
  try {
    const comment = await convexCommentAdd(client, {
      id: crypto.randomUUID(),
      toolSlug: slug,
      author,
      body: parsed.data.body,
      createdAt: Date.now(),
    });
    return NextResponse.json(comment, { status: 201 });
  } catch (err) {
    console.error("[api:comments] POST failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
