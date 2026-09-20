import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prother";
import { guard, logAudit } from "@/lib/admin";

export const dynamic = "force-dynamic";

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
});

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

/** Post-namespace slug uniquifier (tools and posts are separate URL spaces). */
async function uniquePostSlug(base: string): Promise<string> {
  const taken = await db.post.findMany({
    select: { slug: true },
    where: { slug: { startsWith: base } },
  });
  const takenSet = new Set(taken.map((t) => t.slug));
  if (!takenSet.has(base)) return base;
  for (let i = 2; i < 50; i++) {
    if (!takenSet.has(`${base}-${i}`)) return `${base}-${i}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  const status = req.nextUrl.searchParams.get("status");
  const posts = await db.post.findMany({
    where: status && status !== "all" ? { status } : undefined,
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      category: true,
      tags: true,
      coverEmoji: true,
      coverGradient: true,
      status: true,
      author: true,
      readingMinutes: true,
      views: true,
      seoTitle: true,
      seoDescription: true,
      keywords: true,
      publishedAt: true,
      updatedAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json({
    posts: posts.map((p) => ({
      ...p,
      publishedAt: p.publishedAt?.toISOString() ?? null,
      updatedAt: p.updatedAt.toISOString(),
      createdAt: p.createdAt.toISOString(),
    })),
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
  const slug = await uniquePostSlug(data.slug ? slugify(data.slug) : slugify(data.title));

  const post = await db.post.create({
    data: {
      ...data,
      slug,
      readingMinutes: Math.max(1, Math.round(data.body.split(/\s+/).length / 220)),
      publishedAt: data.status === "published" ? new Date() : null,
    },
  });
  logAudit(
    data.status === "published" ? "post.publish" : "post.create",
    "post",
    post.id,
    post.slug
  );
  return NextResponse.json({ ok: true, id: post.id, slug: post.slug });
}
