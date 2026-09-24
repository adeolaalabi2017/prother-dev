import { NextResponse } from "next/server";
import { shadowForumThread } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/**
 * GET /api/forum/[slug] — thread + replies (oldest first). An optional
 * `?voterKey=` (same anon scheme as /api/vote) fills the viewer's `voted`.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const voterKey = new URL(req.url).searchParams.get("voterKey") ?? undefined;
  if (voterKey && (voterKey.length < 8 || voterKey.length > 64)) {
    return NextResponse.json({ error: "invalid_query" }, { status: 422 });
  }

  try {
    const payload = await shadowForumThread(createServerConvexClient()!, slug, voterKey);
    if (!payload) {
      return NextResponse.json({ error: "thread_not_found" }, { status: 404 });
    }
    if ("hidden" in payload) {
      // Moderated threads stay hidden — same 404 as a missing thread.
      return NextResponse.json({ error: "thread_not_found" }, { status: 404 });
    }
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store", "x-data-backend": "convex" },
    });
  } catch (err) {
    console.error("[api:forum] GET [slug] failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
