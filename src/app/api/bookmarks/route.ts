import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import {
  BOOKMARK_TARGET_TYPES,
  bookmarkOwnerKey,
} from "@/lib/bookmarks";
import { convexBookmarkToggle, shadowBookmarks } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/**
 * Bookmarks (Task 23).
 *  GET  /api/bookmarks?ownerKey=<anon key> — saved list (signed-in scope wins)
 *  POST /api/bookmarks { targetType, targetId, action? } — toggle by default
 *
 * Owner resolution: signed-in users are scoped by email; anonymous visitors
 * by their localStorage key (same scheme as votes).
 */
const postSchema = z.object({
  targetType: z.enum(BOOKMARK_TARGET_TYPES),
  targetId: z.string().trim().min(1).max(120),
  action: z.enum(["toggle", "add", "remove"]).default("toggle"),
  visitorKey: z.string().min(8).max(64).optional(),
});

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  const visitorKey = req.nextUrl.searchParams.get("ownerKey");
  const owner = bookmarkOwnerKey({ email: user?.email, visitorKey });
  if (!owner) {
    return NextResponse.json({ items: [], owner: null });
  }
  try {
    const payload = await shadowBookmarks(createServerConvexClient()!, owner);
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store", "x-data-backend": "convex" },
    });
  } catch (err) {
    console.error("[api:bookmarks] GET failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 422 });
  }

  const user = await getAuthUser();
  const owner = bookmarkOwnerKey({
    email: user?.email,
    visitorKey: parsed.data.visitorKey,
  });
  if (!owner) {
    return NextResponse.json({ error: "owner_required" }, { status: 400 });
  }

  try {
    const res = await convexBookmarkToggle(createServerConvexClient()!, {
      id: crypto.randomUUID(),
      ownerKey: owner,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      action: parsed.data.action,
      createdAt: Date.now(),
    });
    return NextResponse.json(res, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[api:bookmarks] POST failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
