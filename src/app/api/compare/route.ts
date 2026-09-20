import { NextResponse } from "next/server";
import { db } from "@/lib/prother";
import { commentCountsByTool } from "@/lib/discussion";
import {
  anonVotesByLaunch,
  bumpComparison,
  popularComparisons,
  reviewStats,
  toolCommunityFieldsBySlugs,
} from "@/lib/community";
import type { ReviewAggregate } from "@/lib/community";

export const dynamic = "force-dynamic";

/** Side-by-side comparison row (F-08). */
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
  votes: number;
  rating: ReviewAggregate | null;
  reviewCount: number;
  comments: number;
  launchDate: string | null;
  verified: boolean;
  claimed: boolean;
  hasApi: boolean;
  track: "editor_seed" | "community";
  maker: string;
  relaunchCount: number;
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
  launch: {
    id: string;
    baseUpvotes: number;
    launchDate: Date;
    scheduled: boolean;
    _count: { votes: number };
  } | null;
  category: { slug: string; name: string; emoji: string };
};

const compareInclude = {
  launch: { include: { _count: { select: { votes: true } } } },
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
    db.tool.findUnique({ where: { slug: a }, include: compareInclude }),
    db.tool.findUnique({ where: { slug: b }, include: compareInclude }),
  ]);
  if (!toolA || !toolB) {
    return NextResponse.json({ error: "tool_not_found" }, { status: 404 });
  }

  // One row per unordered pair, alphabetically normalized.
  const [left, right] = toolA.slug <= toolB.slug ? [toolA, toolB] : [toolB, toolA];
  await bumpComparison(left.slug, right.slug);

  // relaunchCount is a post-boot column — fetched raw (stale-client note).
  const fieldsBySlug = await toolCommunityFieldsBySlugs([toolA.slug, toolB.slug]);

  const [rowA, rowB] = await Promise.all([
    buildCompareRow(toolA, fieldsBySlug.get(toolA.slug)?.relaunchCount ?? 0),
    buildCompareRow(toolB, fieldsBySlug.get(toolB.slug)?.relaunchCount ?? 0),
  ]);

  return NextResponse.json(
    { a: rowA, b: rowB, popular },
    { headers: { "Cache-Control": "no-store" } }
  );
}

async function buildCompareRow(t: CompareTool, relaunchCount: number): Promise<CompareRow> {
  const [stats, commentCounts, voteCounts] = await Promise.all([
    reviewStats(t.id),
    commentCountsByTool([t.id]),
    t.launch ? anonVotesByLaunch([t.launch.id]) : Promise.resolve(new Map<string, number>()),
  ]);
  const scheduled = t.launch?.scheduled ?? false;

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
    votes: (t.launch?.baseUpvotes ?? 0) + (t.launch ? voteCounts.get(t.launch.id) ?? 0 : 0),
    rating: stats.aggregate,
    reviewCount: stats.count,
    comments: commentCounts.get(t.id) ?? 0,
    launchDate: t.launch?.launchDate.toISOString() ?? null,
    verified: t.verifiedAt != null && !scheduled,
    claimed: t.claimed,
    hasApi: t.hasApi,
    track: t.track === "community" ? "community" : "editor_seed",
    maker: t.makerHandle,
    relaunchCount,
  };
}
