import { NextResponse } from "next/server";
import { z } from "zod";
import { convexVoteToggle } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  voterKey: z.string().min(8).max(64),
});

/**
 * POST /api/forum/[slug]/vote — anonymous toggle (1 vote per visitor per
 * thread). The key lives in localStorage ("prother_voter_key"); uniqueness
 * is enforced transactionally, so double-votes are impossible even under
 * concurrency. Returns { voted, votes }.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }
  const { voterKey } = parsed.data;
  const { slug } = await ctx.params;

  try {
    const result = await convexVoteToggle(createServerConvexClient()!, {
      threadSlug: slug,
      voterKey,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("thread_not_found")) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    console.error("[api:forum] vote failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
