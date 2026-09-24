import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { isUserBanned } from "@/lib/users";
import { convexReplyCreate } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

const replySchema = z.object({
  body: z.string().trim().min(1).max(3000),
});

/**
 * POST /api/forum/[slug]/reply — add a reply. Signed-in only (401),
 * same auth gate as POST /api/forum.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = replySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 422 });
  }

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }
  if (await isUserBanned(user.id)) {
    return NextResponse.json(
      { error: "account_banned", message: "This account can no longer reply." },
      { status: 403 }
    );
  }

  const { slug } = await ctx.params;

  try {
    const reply = await convexReplyCreate(createServerConvexClient()!, {
      id: crypto.randomUUID(),
      threadSlug: slug,
      author: `@${user.handle}`,
      authorId: user.id,
      body: parsed.data.body,
      createdAt: Date.now(),
    });
    return NextResponse.json({ reply }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("thread_not_found")) {
      return NextResponse.json({ error: "thread_not_found" }, { status: 404 });
    }
    console.error("[api:forum] reply failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
