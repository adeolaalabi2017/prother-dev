import { NextResponse } from "next/server";
import type { Badge } from "@/lib/prother";
import { blurbFor } from "@/lib/category-blurbs";
import { shadowToolsDirectory } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/** Public directory row (F-02/03/05) — consumed by the explorer + SEO pages. */
export type DirectoryRow = {
  slug: string;
  name: string;
  tagline: string;
  emoji: string;
  gradient: string;
  pricing: { model: string; price: string | null; note: string | null };
  category: { slug: string; name: string; emoji: string };
  editorsPick: boolean;
  curated: boolean;
  badges: Badge;
  /** Uploaded logo image, when the listing has one (falls back to emoji). */
  logoUrl?: string | null;
  /** Present only when the listing has discussion (count > 0). */
  comments?: number;
  /** ISO date the tool was listed in the directory. */
  listedAt: string;
  reviews: { count: number };
};

const PRICING_FILTERS = new Set(["free", "freemium", "paid", "open_source"]);
const SORTS = new Set(["featured", "newest", "top-rated", "trending"]);

type Sort = "featured" | "newest" | "top-rated" | "trending";

/**
 * GET /api/tools — public directory (PRD F-02/03/05).
 * ?category=&q=&pricing=free|freemium|paid|open_source&tag=
 * &page=1..&pageSize=1..60
 * &sort=featured|newest|top-rated|trending
 *  · featured (default) — pinned, then Editor's Picks, then curated,
 *    then newest listings first
 *  · newest — createdAt desc
 *  · top-rated — published-review average of (ease+power+value)/3;
 *    listings with 0 reviews rank last
 *  · trending — 7-day engagement score (comments/reviews/saves)
 * Only status="live" tools are listed.
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;

  const categorySlug = sp.get("category")?.trim() || null;
  const q = sp.get("q")?.trim() || null;
  const pricingRaw = sp.get("pricing")?.trim() || null;
  const pricing = pricingRaw && PRICING_FILTERS.has(pricingRaw) ? pricingRaw : null;
  const tag = sp.get("tag")?.trim() || null;
  const sortRaw = sp.get("sort")?.trim() || "featured";
  const sort: Sort = (SORTS.has(sortRaw) ? sortRaw : "featured") as Sort;
  const pageRaw = Number.parseInt(sp.get("page") ?? "", 10);
  const page = Number.isFinite(pageRaw) ? Math.max(1, pageRaw) : 1;
  const pageSizeRaw = Number.parseInt(sp.get("pageSize") ?? "", 10);
  const pageSize = Number.isFinite(pageSizeRaw) ? Math.min(60, Math.max(1, pageSizeRaw)) : 40;

  try {
    const res = await shadowToolsDirectory(createServerConvexClient()!, {
      categorySlug,
      q,
      pricing,
      tag,
      sort,
      page,
      pageSize,
    });
    if ("error" in res) {
      return NextResponse.json(res, {
        status: 404,
        headers: { "x-data-backend": "convex" },
      });
    }
    // Category SEO meta — only when the request is scoped to one category.
    // The blurb stays a Next-side presentation constant (lib/category-blurbs).
    const { categoryMeta, ...rest } = res;
    return NextResponse.json(
      {
        ...rest,
        ...(categoryMeta
          ? {
              categoryMeta: {
                ...categoryMeta,
                blurb: blurbFor(categoryMeta.slug, categoryMeta.name),
              },
            }
          : {}),
      },
      {
        headers: { "Cache-Control": "no-store", "x-data-backend": "convex" },
      }
    );
  } catch (err) {
    console.error("[api:tools] failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
