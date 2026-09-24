import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import {
  convexCollectionItemToggle,
  shadowCollectionDetail,
} from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  toolSlug: z.string().min(1).max(80),
});

/**
 * POST /api/collections/[slug]/items — owner-only toggle of a tool inside
 * the collection. New items are appended (position = current item count).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 422 });
  }

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  const client = createServerConvexClient()!;
  try {
    // Ownership + existence gate through the detail read (404/403 parity).
    const existing = await shadowCollectionDetail(client, slug, user.email);
    if ("error" in existing) {
      return NextResponse.json(existing, { status: 404 });
    }
    if (!existing.collection.isOwner) {
      return NextResponse.json({ error: "not_owner" }, { status: 403 });
    }

    const res = await convexCollectionItemToggle(client, {
      id: crypto.randomUUID(),
      collectionSlug: slug,
      toolSlug: parsed.data.toolSlug,
      createdAt: Date.now(),
    });
    return NextResponse.json(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("tool_not_found")) {
      return NextResponse.json({ error: "tool_not_found" }, { status: 404 });
    }
    console.error("[api:collections/[slug]/items] POST failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
