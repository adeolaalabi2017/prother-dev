import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prother";

export const dynamic = "force-dynamic";

/**
 * GET /api/blog — published journal posts (public).
 * Query: ?limit=6&category=Playbooks
 * Powers the on-page Journal section and any embeds. Drafts never leak.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const limit = Math.min(24, Math.max(1, Number(sp.get("limit") ?? 12)));
  const category = sp.get("category");

  const posts = await db.post.findMany({
    where: {
      status: "published",
      ...(category ? { category } : {}),
    },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: {
      slug: true,
      title: true,
      excerpt: true,
      category: true,
      tags: true,
      coverEmoji: true,
      coverGradient: true,
      author: true,
      readingMinutes: true,
      publishedAt: true,
    },
  });

  return NextResponse.json(
    {
      posts: posts.map((p) => ({
        ...p,
        tags: p.tags ? p.tags.split("|").filter(Boolean) : [],
        publishedAt: p.publishedAt?.toISOString() ?? null,
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
