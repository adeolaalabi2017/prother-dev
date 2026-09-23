import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prother";
import { guard, logAudit } from "@/lib/admin";
import { setPostCover } from "@/lib/media";

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
  const { body, coverUrl, ...rest } = parsed.data;
  const data: Parameters<typeof db.post.update>[0]["data"] = { ...rest };
  if (body) {
    data.readingMinutes = Math.max(1, Math.round(body.split(/\s+/).length / 220));
  }

  // Stamp publishedAt on the draft → published transition (keep original date
  // when re-publishing an already-published post).
  if (data.status === "published") {
    const current = await db.post.findUnique({
      where: { id },
      select: { publishedAt: true, status: true },
    });
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!current.publishedAt) (data as { publishedAt?: Date }).publishedAt = new Date();
  }

  try {
    const post = await db.post.update({ where: { id }, data });
    // POST-boot column → raw SQL (stale-PrismaClient rule).
    if (coverUrl !== undefined) {
      await setPostCover(id, coverUrl);
    }
    logAudit(
      data.status === "draft" ? "post.unpublish" : "post.update",
      "post",
      id,
      post.slug
    );
    return NextResponse.json({ ok: true, slug: post.slug });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const denied = guard(req);
  if (denied) return denied;

  const { id } = await params;
  const post = await db.post.delete({ where: { id } }).catch(() => null);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  logAudit("post.delete", "post", id, post.slug);
  return NextResponse.json({ ok: true });
}
