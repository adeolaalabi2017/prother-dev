import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guard, logAudit } from "@/lib/admin";
import { convexPostCreate, shadowAdminPosts } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/** Media library URLs only — uploads must come from /api/media. */
const MEDIA_URL = z
  .string()
  .regex(/^\/api\/media\/[A-Za-z0-9_-]+$/, "must be an uploaded media URL")
  .max(200);

/**
 * Journal post management (Admin Console → Blog tab).
 *  GET  /api/admin/posts?status= — all posts incl. drafts
 *  POST /api/admin/posts — create (draft or published)
 */

const postInput = z.object({
  title: z.string().min(4).max(120),
  slug: z
    .string()
    .max(80)
    .regex(/^[a-z0-9-]*$/, "lowercase-dash only")
    .optional()
    .or(z.literal("")),
  excerpt: z.string().min(20).max(200),
  body: z.string().min(50),
  category: z.string().min(2).max(40).default("Playbooks"),
  tags: z.string().max(120).default(""),
  coverEmoji: z.string().max(8).default("📝"),
  coverGradient: z.string().max(80).default("from-orange-500 to-amber-700"),
  author: z.string().max(60).default("Prother Editorial"),
  status: z.enum(["draft", "published"]).default("draft"),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(170).optional(),
  keywords: z.string().max(200).optional(),
  /** Uploaded cover image (POST-boot column → raw SQL, lib/media.ts). */
  coverUrl: MEDIA_URL.nullable().optional(),
});

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

/** Post-namespace slug uniquifier (tools and posts are separate URL spaces).
 *  Convex-only: candidates resolve by retrying the create on slug_taken. */
function slugCandidates(base: string): string[] {
  return [
    base,
    ...Array.from({ length: 48 }, (_, i) => `${base}-${i + 2}`),
    `${base}-${Date.now().toString(36)}`,
  ];
}

export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  const status = req.nextUrl.searchParams.get("status");
  // Convex-only (admin cutover).
  const res = await shadowAdminPosts(createServerConvexClient()!, status ?? "");
  return NextResponse.json(res, {
    headers: { "x-data-backend": "convex" },
  });
}

export async function POST(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  const parsed = postInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues.slice(0, 3) },
      { status: 400 }
    );
  }
  const data = parsed.data;
  const readingMinutes = Math.max(1, Math.round(data.body.split(/\s+/).length / 220));
  const publishedAtMs = data.status === "published" ? Date.now() : undefined;

  // Convex-only: one id + timestamps for the insert; slug candidates retry
  // on the mutation's slug_taken error (atomic check-and-insert).
  const postId = crypto.randomUUID();
  const nowMs = Date.now();
  const client = createServerConvexClient()!;
  const base = data.slug ? slugify(data.slug) : slugify(data.title);
  for (const slug of slugCandidates(base)) {
    try {
      await convexPostCreate(client, {
        id: postId,
        slug,
        title: data.title,
        excerpt: data.excerpt,
        body: data.body,
        category: data.category,
        tagsPipe: data.tags,
        coverEmoji: data.coverEmoji,
        coverGradient: data.coverGradient,
        author: data.author,
        status: data.status,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        keywords: data.keywords,
        coverUrl: data.coverUrl ?? undefined,
        readingMinutes,
        publishedAt: publishedAtMs,
        createdAt: nowMs,
        updatedAt: nowMs,
      });
      logAudit(
        data.status === "published" ? "post.publish" : "post.create",
        "post",
        postId,
        slug
      );
      return NextResponse.json({ ok: true, id: postId, slug });
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      if (m.includes("slug_taken")) continue;
      console.error("[api:admin/posts] create failed:", data.title, err);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "server_error" }, { status: 500 });
}
