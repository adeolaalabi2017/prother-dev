import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guard, logAudit } from "@/lib/admin";
import { convexPostDelete, convexPostPatch, shadowAdminPosts } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/** Media library URLs only — uploads must come from /api/media. */
const MEDIA_URL = z
  .string()
  .regex(/^\/api\/media\/[A-Za-z0-9_-]+$/, "must be an uploaded media URL")
  .max(200);

/**
 * Single-post admin operations:
 *  PATCH  /api/admin/posts/[id] — partial edit (publish toggle stamps publishedAt)
 *  DELETE /api/admin/posts/[id]
 */

const patchSchema = z.object({
  title: z.string().min(4).max(120).optional(),
  slug: z
    .string()
    .max(80)
    .regex(/^[a-z0-9-]+$/, "lowercase-dash only")
    .optional(),
  excerpt: z.string().min(20).max(200).optional(),
  body: z.string().min(50).optional(),
  category: z.string().min(2).max(40).optional(),
  tags: z.string().max(120).optional(),
  coverEmoji: z.string().max(8).optional(),
  coverGradient: z.string().max(80).optional(),
  author: z.string().max(60).optional(),
  status: z.enum(["draft", "published"]).optional(),
  seoTitle: z.string().max(70).nullable().optional(),
  seoDescription: z.string().max(170).nullable().optional(),
  keywords: z.string().max(200).nullable().optional(),
  /** Uploaded cover image (POST-boot column → raw SQL, lib/media.ts). */
  coverUrl: MEDIA_URL.nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = guard(req);
  if (denied) return denied;

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { body, coverUrl, tags, ...rest } = parsed.data;
  const client = createServerConvexClient()!;
  const data: Record<string, unknown> = { ...rest };
  if (body) {
    data.body = body;
    data.readingMinutes = Math.max(1, Math.round(body.split(/\s+/).length / 220));
  }

  // Stamp publishedAt on the draft → published transition (keep original date
  // when re-publishing an already-published post). Current state resolves
  // from the Convex table read.
  let current: { publishedAt: string | null; status: string; slug: string } | null = null;
  try {
    const table = await shadowAdminPosts(client, "all");
    current = table.posts.find((p) => p.id === id) ?? null;
  } catch (err) {
    console.error("[api:admin/posts] table read failed:", id, err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
  let stampedAtMs: number | undefined;
  if (data.status === "published" && !current.publishedAt) {
    stampedAtMs = Date.now();
  }

  // Convex-only: single-transaction patch. Tags travel as the pipe string.
  const nowMs = Date.now();
  try {
    await convexPostPatch(client, {
      postLegacyId: id,
      data: {
        ...data,
        ...(tags !== undefined ? { tagsPipe: tags } : {}),
        ...(stampedAtMs ? { publishedAt: stampedAtMs } : {}),
        updatedAt: nowMs,
      },
      coverUrl,
    });
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m.includes("not_found")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[api:admin/posts] PATCH failed:", id, err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  logAudit(
    data.status === "draft" ? "post.unpublish" : "post.update",
    "post",
    id,
    (data.slug as string | undefined) ?? current.slug
  );
  return NextResponse.json({ ok: true, slug: (data.slug as string | undefined) ?? current.slug });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const denied = guard(req);
  if (denied) return denied;

  const { id } = await params;
  // Convex-only: the mutation throws not_found for unknown ids.
  try {
    const res = await convexPostDelete(createServerConvexClient()!, { postLegacyId: id });
    logAudit("post.delete", "post", id, res.slug);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m.includes("not_found")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[api:admin/posts] DELETE failed:", id, err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
