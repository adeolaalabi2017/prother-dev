import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { isUserBanned } from "@/lib/users";
import { createForumReply, getForumThreadIdBySlug } from "@/lib/forum";

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
    const threadId = await getForumThreadIdBySlug(slug);
    if (!threadId) {
      return NextResponse.json({ error: "thread_not_found" }, { status: 404 });
    }

    const reply = await createForumReply({
      threadId,
      author: `@${user.handle}`,
      authorId: user.id,
      body: parsed.data.body,
    });

    return NextResponse.json({ reply }, { status: 201 });
  } catch (err) {
    console.error("[api:forum] reply failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
