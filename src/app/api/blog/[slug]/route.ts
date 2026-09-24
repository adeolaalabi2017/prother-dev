import { NextRequest, NextResponse } from "next/server";
import { convexPostBumpViews, shadowBlogDetail } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/**
 * GET  /api/blog/[slug] — published post + related posts (same bucket).
 * POST /api/blog/[slug] — view counter (fire-and-forget from the reader).
 */
type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;

  // Convex-only (SEO cutover complete): tags arrive as an array from Convex.
  const res = await shadowBlogDetail(createServerConvexClient()!, slug);
  if ("error" in res) {
    return NextResponse.json(res, {
      status: 404,
      headers: { "x-data-backend": "convex" },
    });
  }
  return NextResponse.json(
    {
      post: {
        ...res.post,
        tags: res.post.tags.filter(Boolean),
      },
      related: res.related,
    },
    {
      headers: { "Cache-Control": "no-store", "x-data-backend": "convex" },
    },
  );
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { slug } = await params;
  // Convex-only view counting (SEO cutover complete; silent on error).
  try {
    await convexPostBumpViews(createServerConvexClient()!, { slug });
  } catch {
    // view counting must never surface as an error
  }
  return NextResponse.json({ ok: true });
}
