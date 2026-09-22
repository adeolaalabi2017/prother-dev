import { NextResponse } from "next/server";
import { db } from "@/lib/prother";
import { commentCountsByTool } from "@/lib/discussion";
import { bumpComparison, popularComparisons, reviewStats } from "@/lib/community";
import type { ReviewAggregate } from "@/lib/community";

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

type CompareTool = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string | null;
  websiteUrl: string;
  logoEmoji: string;
  logoGradient: string;
  pricingModel: string;
  startingPrice: string | null;
  pricingNote: string | null;
  hasApi: boolean;
  githubUrl: string | null;
  docsUrl: string | null;
  twitterUrl: string | null;
  tags: string;
  claimed: boolean;
  verifiedAt: Date | null;
  track: string;
  makerHandle: string;
  category: { slug: string; name: string; emoji: string };
};

/**
 * Explicit select — full-row Tool reads break on a stale pre-v6 cached
 * PrismaClient (it still SELECTs the dropped relaunch columns). Selecting
 * named columns makes the query version-agnostic (see worklog Task 27).
 */
const compareSelect = {
  id: true,
  slug: true,
  name: true,
  tagline: true,
  description: true,
  websiteUrl: true,
  logoEmoji: true,
  logoGradient: true,
  pricingModel: true,
  startingPrice: true,
  pricingNote: true,
  hasApi: true,
  githubUrl: true,
  docsUrl: true,
  twitterUrl: true,
  tags: true,
  claimed: true,
  verifiedAt: true,
  track: true,
  makerHandle: true,
  category: { select: { slug: true, name: true, emoji: true } },
} as const;

/**
 * GET /api/compare?a=<slug>&b=<slug> — side-by-side comparison; logs a view
 * (pair normalized a<b) and returns the 5 most-viewed pairs.
 * GET /api/compare?popular=1 — just the popular list.
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;

  const popular = (await popularComparisons(5)).map((p) => ({
    aSlug: p.aSlug,
    bSlug: p.bSlug,
    views: Number(p.views),
    aName: p.aName,
    aEmoji: p.aEmoji,
    bName: p.bName,
    bEmoji: p.bEmoji,
  }));

  if (sp.get("popular")) {
    return NextResponse.json({ popular }, { headers: { "Cache-Control": "no-store" } });
  }

  const a = sp.get("a")?.trim() || "";
  const b = sp.get("b")?.trim() || "";
  if (!a || !b) {
    return NextResponse.json({ error: "a_and_b_required" }, { status: 400 });
  }

  const [toolA, toolB] = await Promise.all([
    db.tool.findUnique({ where: { slug: a }, select: compareSelect }),
    db.tool.findUnique({ where: { slug: b }, select: compareSelect }),
  ]);
  if (!toolA || !toolB) {
    return NextResponse.json({ error: "tool_not_found" }, { status: 404 });
  }

  // One row per unordered pair, alphabetically normalized.
  const [left, right] = toolA.slug <= toolB.slug ? [toolA, toolB] : [toolB, toolA];
  await bumpComparison(left.slug, right.slug);

  const [rowA, rowB] = await Promise.all([
    buildCompareRow(toolA),
    buildCompareRow(toolB),
  ]);

  return NextResponse.json(
    { a: rowA, b: rowB, popular },
    { headers: { "Cache-Control": "no-store" } }
  );
}

async function buildCompareRow(t: CompareTool): Promise<CompareRow> {
  const [stats, commentCounts] = await Promise.all([
    reviewStats(t.id),
    commentCountsByTool([t.id]),
  ]);

  return {
    slug: t.slug,
    name: t.name,
    tagline: t.tagline,
    emoji: t.logoEmoji,
    gradient: t.logoGradient,
    description: t.description,
    websiteUrl: t.websiteUrl,
    pricing: { model: t.pricingModel, price: t.startingPrice, note: t.pricingNote },
    category: t.category,
    tags: t.tags.split("|").filter(Boolean),
    links: { github: t.githubUrl, docs: t.docsUrl, twitter: t.twitterUrl },
    rating: stats.aggregate,
    reviewCount: stats.count,
    comments: commentCounts.get(t.id) ?? 0,
    verified: t.verifiedAt != null,
    claimed: t.claimed,
    hasApi: t.hasApi,
    track: t.track === "community" ? "community" : "editor_seed",
    maker: t.makerHandle,
  };
}
