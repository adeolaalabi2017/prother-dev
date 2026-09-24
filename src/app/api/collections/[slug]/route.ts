import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import {
  convexCollectionDelete,
  convexCollectionUpdate,
  shadowCollectionDetail,
} from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  description: z.string().trim().max(280).optional(),
  isPublic: z.boolean().optional(),
});

/**
 * GET /api/collections/[slug] — one collection with its tool items.
 * Private collections 404 unless the viewer is the owner (F-39/40).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const user = await getAuthUser();

  try {
    const res = await shadowCollectionDetail(
      createServerConvexClient()!,
      slug,
      user?.email
    );
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
    console.error("[api:collections/[slug]] GET failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

/**
 * PATCH /api/collections/[slug] — owner-only metadata edit
 * (name / description / visibility).
 */
export async function PATCH(
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
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 422 });
  }

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  const client = createServerConvexClient()!;
  try {
    // Ownership is enforced inside the detail read: private collections
    // 404 for non-owners before any write lands.
    const existing = await shadowCollectionDetail(client, slug, user.email);
    if ("error" in existing || !existing.collection.isOwner) {
      const status = "error" in existing ? 404 : 403;
      const error = "error" in existing ? existing : { error: "not_owner" };
      return NextResponse.json(error, { status });
    }

    const { name, description, isPublic } = parsed.data;
    if (
      name === undefined &&
      description === undefined &&
      isPublic === undefined
    ) {
      // No-op patch still returns the collection (mirrors the original,
      // which skips the UPDATE but re-reads and responds).
    } else {
      await convexCollectionUpdate(client, {
        slug,
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(isPublic !== undefined ? { isPublic } : {}),
      });
    }

    const updated = await shadowCollectionDetail(client, slug, user.email);
    if ("error" in updated) {
      return NextResponse.json(updated, { status: 404 });
    }
    // PATCH responds with the bare collection (no items array).
    const { items: _items, ...base } = updated.collection;
    void _items;
    return NextResponse.json({
      collection: { ...base, ownerEmail: user.email },
    });
  } catch (err) {
    console.error("[api:collections/[slug]] PATCH failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

/** DELETE /api/collections/[slug] — owner-only; 204 on success. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  const client = createServerConvexClient()!;
  try {
    const existing = await shadowCollectionDetail(client, slug, user.email);
    if ("error" in existing) {
      return NextResponse.json(existing, { status: 404 });
    }
    if (!existing.collection.isOwner) {
      return NextResponse.json({ error: "not_owner" }, { status: 403 });
    }
    await convexCollectionDelete(client, { slug });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[api:collections/[slug]] DELETE failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
