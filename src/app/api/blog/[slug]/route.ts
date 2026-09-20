import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prother";

export const dynamic = "force-dynamic";

/**
 * GET  /api/blog/[slug] — published post + related posts (same bucket).
 * POST /api/blog/[slug] — view counter (fire-and-forget from the reader).
 */
type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;

  const post = await db.post.findUnique({
    where: { slug },
    select: {
      slug: true,
      title: true,
      excerpt: true,
      body: true,
      category: true,
      tags: true,
      coverEmoji: true,
      coverGradient: true,
      author: true,
      status: true,
      readingMinutes: true,
      views: true,
      seoTitle: true,
      seoDescription: true,
      keywords: true,
      publishedAt: true,
      updatedAt: true,
    },
  });

  // Drafts 404 for the public API (the admin editor uses its own route).
  if (!post || post.status !== "published") {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const related = await db.post.findMany({
    where: { status: "published", category: post.category, slug: { not: post.slug } },
    orderBy: { publishedAt: "desc" },
    take: 3,
    select: {
      slug: true,
      title: true,
      coverEmoji: true,
      coverGradient: true,
      readingMinutes: true,
      category: true,
    },
  });

  return NextResponse.json(
    {
      post: {
        ...post,
        tags: post.tags ? post.tags.split("|").filter(Boolean) : [],
        publishedAt: post.publishedAt?.toISOString() ?? null,
        updatedAt: post.updatedAt.toISOString(),
      },
      related,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { slug } = await params;
  try {
    await db.post.update({
      where: { slug },
      data: { views: { increment: 1 } },
    });
  } catch {
    /* view counting must never surface as an error */
  }
  return NextResponse.json({ ok: true });
}
