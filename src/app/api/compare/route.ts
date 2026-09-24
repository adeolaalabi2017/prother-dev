import { NextResponse } from "next/server";
import type { ReviewAggregate } from "@/lib/community";
import { convexCompareBump, shadowCompareView } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/**
 * Side-by-side comparison row (F-08). No vote winner — quality signals are
 * the review aggregates (null until ≥3 published reviews) plus discussion;
 * the client renders the verdict.
 */
export type CompareRow = {
  slug: string;
  name: string;
  tagline: string;
  emoji: string;
  gradient: string;
  description: string | null;
  websiteUrl: string;
  pricing: { model: string; price: string | null; note: string | null };
  category: { slug: string; name: string; emoji: string };
  tags: string[];
  links: { github: string | null; docs: string | null; twitter: string | null };
  rating: ReviewAggregate | null;
  reviewCount: number;
  comments: number;
  verified: boolean;
  claimed: boolean;
  hasApi: boolean;
  track: "editor_seed" | "community";
  maker: string;
};

/**
 * GET /api/compare?a=<slug>&b=<slug> — side-by-side comparison; logs a view
 * (pair normalized a<b) and returns the 5 most-viewed pairs.
 * GET /api/compare?popular=1 — just the popular list.
 *
 * Order mirrors the original: popular is read pre-bump, then the view is
 * logged, then rows are served.
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const client = createServerConvexClient()!;

  try {
    if (sp.get("popular")) {
      // The error variant still carries popular — serve it regardless.
      const res = await shadowCompareView(client, "__none__", "__none__", 5);
      return NextResponse.json(
        { popular: res.popular },
        {
          headers: { "Cache-Control": "no-store", "x-data-backend": "convex" },
        },
      );
    }
    const a = sp.get("a")?.trim() || "";
    const b = sp.get("b")?.trim() || "";
    if (!a || !b) {
      return NextResponse.json(
        { error: "a_and_b_required" },
        { status: 400, headers: { "x-data-backend": "convex" } },
      );
    }
    const res = await shadowCompareView(client, a, b, 5);
    if ("error" in res) {
      return NextResponse.json(res, {
        status: 404,
        headers: { "x-data-backend": "convex" },
      });
    }
    const [left, right] =
      res.a.slug <= res.b.slug ? [res.a.slug, res.b.slug] : [res.b.slug, res.a.slug];
    await convexCompareBump(client, { aSlug: left, bSlug: right });
    return NextResponse.json(res, {
      headers: { "Cache-Control": "no-store", "x-data-backend": "convex" },
    });
  } catch (err) {
    console.error("[api:compare] failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
