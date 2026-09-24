import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { convexFollowToggle, shadowFollows } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  targetType: z.enum(["tool", "category", "maker"]),
  targetId: z.string().min(1).max(120),
  targetLabel: z.string().min(1).max(120),
});

/**
 * GET /api/follows — the viewer's follows (F-41). Anonymous → empty list
 * (the UI treats it as "sign in to follow").
 */
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ follows: [] }, { headers: { "Cache-Control": "no-store" } });
  }
  try {
    const payload = await shadowFollows(createServerConvexClient()!, user.email);
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store", "x-data-backend": "convex" },
    });
  } catch (err) {
    console.error("[api:follows] GET failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

/**
 * POST /api/follows — toggle a tool/category/maker follow. Returns the new
 * state so the UI can flip its button optimistically-reconciled.
 */
export async function POST(req: Request) {
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

  const { targetType, targetId, targetLabel } = parsed.data;
  try {
    const res = await convexFollowToggle(createServerConvexClient()!, {
      userEmail: user.email,
      targetType,
      targetId,
      targetLabel,
    });
    return NextResponse.json(res);
  } catch (err) {
    console.error("[api:follows] POST failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
