/**
 * Server-side tool search for the /tools?q= SERP.
 *
 * Matching + scoring live in the shared token matcher (lib/match) — the
 * exact same semantics as GET /api/search, so the server-rendered results
 * page and the hero dropdown always agree on relevance.
 *
 * Live tools only (status="live") — same visibility rule as the directory.
 */
import { db } from "@/lib/db";
import { matchTokens, relevanceScore, tokenize } from "@/lib/match";

/** One scored result row on the /tools?q= SERP. */
export type SerpToolRow = {
  slug: string;
  name: string;
  tagline: string;
  emoji: string;
  gradient: string;
  editorsPick: boolean;
  pricingModel: string;
  startingPrice: string | null;
  category: { slug: string; name: string; emoji: string };
  /** ISO date the tool was added to the directory. */
  listedAt: string;
};

/**
 * The SERP mirrors GET /api/search — per-token relevance lives in the shared
 * matcher (lib/match relevanceScore); ranking = token score → editorial → page slice.
 */
export type SerpResult = {
  rows: SerpToolRow[];
  /** Total matching tools across all pages. */
  total: number;
  /** 1-based page actually rendered (clamped into [1, pages]). */
  page: number;
  pages: number;
};

/**
 * Scored, paginated tool search for the /tools?q= server-rendered results.
 * `q` is TOKEN-matched (shared matcher in lib/match, same semantics as
 * GET /api/search: every token must hit name/tagline/tags/description,
 * case-insensitive, light stemming) and candidates are ranked by summed
 * token score, then editorial signals. The candidate set is small, so
 * filtering happens in JS after a single live-tools fetch.
 */
export async function searchToolsForSerp(
  q: string,
  page: number,
  pageSize: number,
): Promise<SerpResult> {
  const tokens = tokenize(q);

  const candidates = await db.tool.findMany({
    where: { status: "live" },
    // Explicit select — full-row Tool reads break on a stale pre-v6 cached
    // PrismaClient (it still SELECTs the dropped relaunch columns).
    select: {
      slug: true,
      name: true,
      tagline: true,
      logoEmoji: true,
      logoGradient: true,
      pricingModel: true,
      startingPrice: true,
      tags: true,
      description: true,
      editorsPick: true,
      curated: true,
      pinned: true,
      createdAt: true,
      category: { select: { slug: true, name: true, emoji: true } },
    },
    take: 500,
  });

  const scored = candidates
    .filter((t) => matchTokens([t.name, t.tagline, t.tags, t.description], tokens))
    .map((t) => ({
      t,
      score: relevanceScore(tokens, {
        name: t.name,
        tagline: t.tagline,
        tags: t.tags,
        description: t.description,
      }),
      editorial: (t.editorsPick ? 3 : 0) + (t.curated ? 2 : 0) + (t.pinned ?? 0),
    }))
    .sort((a, b) => b.score * 1000 + b.editorial - (a.score * 1000 + a.editorial));

  const total = scored.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pages);

  const rows: SerpToolRow[] = scored
    .slice((safePage - 1) * pageSize, safePage * pageSize)
    .map(({ t }) => ({
      slug: t.slug,
      name: t.name,
      tagline: t.tagline,
      emoji: t.logoEmoji,
      gradient: t.logoGradient,
      editorsPick: t.editorsPick,
      pricingModel: t.pricingModel,
      startingPrice: t.startingPrice,
      category: t.category,
      listedAt: t.createdAt.toISOString(),
    }));

  return { rows, total, page: safePage, pages };
}
