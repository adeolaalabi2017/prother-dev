import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { isUserBanned } from "@/lib/users";
import { FORUM_TOPICS } from "@/lib/forum-topics";
import { slugifyName } from "@/lib/prother";
import { convexThreadCreate, shadowForumList } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

const listQuerySchema = z.object({
  topic: z.enum(["all", ...FORUM_TOPICS]).default("all"),
  sort: z.enum(["hot", "new", "top"]).default("hot"),
  voterKey: z.string().min(8).max(64).optional(),
});

const createSchema = z.object({
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(10).max(5000),
  topic: z.enum(FORUM_TOPICS),
});

/**
 * GET /api/forum?topic=<all|general|vibecoding|show|introduce>&sort=<hot|new|top>
 * &voterKey=<optional anon key> — thread list with per-topic counts.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = listQuerySchema.safeParse({
    topic: url.searchParams.get("topic") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
    voterKey: url.searchParams.get("voterKey") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_query" }, { status: 422 });
  }

  try {
    const payload = await shadowForumList(
      createServerConvexClient()!,
      parsed.data.topic,
      parsed.data.sort,
      parsed.data.voterKey
    );
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store", "x-data-backend": "convex" },
    });
  } catch (err) {
    console.error("[api:forum] GET failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

/**
 * POST /api/forum — create a thread. Signed-in only (401 otherwise),
 * mirroring the reviews/collections auth gate.
 */
export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 422 });
  }

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }
  if (await isUserBanned(user.id)) {
    return NextResponse.json(
      { error: "account_banned", message: "This account can no longer post." },
      { status: 403 }
    );
  }

  const { title, body, topic } = parsed.data;
  const client = createServerConvexClient()!;

  // Slug from the title + a short random suffix, unique-checked.
  const base = slugifyName(title);
  let slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  for (let i = 0; i < 8; i++) {
    try {
      const thread = await convexThreadCreate(client, {
        id: crypto.randomUUID(),
        slug,
        title,
        body,
        topic,
        author: `@${user.handle}`,
        authorId: user.id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return NextResponse.json({ thread }, { status: 201 });
    } catch (err) {
      if (String(err).includes("slug_taken")) {
        slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
        continue;
      }
      console.error("[api:forum] POST failed:", err);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "server_error" }, { status: 500 });
}
