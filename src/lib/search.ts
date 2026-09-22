/**
 * Server-side tool search for the /tools?q= SERP.
 *
 * The scoring mirrors GET /api/search (name.startsWith > name.includes >
 * tagline > tags > description; tiebreak by editorial signals) so the
 * server-rendered results page and the hero dropdown agree on relevance.
 * Duplicating the small relevance function is deliberate — refactoring the
 * route would risk the live dropdown payload.
 *
 * Live tools only (status="live") — same visibility rule as the directory.
 */
import { db } from "@/lib/db";

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

export type SerpResult = {
  rows: SerpToolRow[];
  /** Total matching tools across all pages. */
  total: number;
  /** 1-based page actually rendered (clamped into [1, pages]). */
  page: number;
  pages: number;
};

/** Relevance score — name hits outrank tagline hits outrank tags/description. */
function relevance(ql: string, name: string, tagline: string, tags: string, description: string | null): number {
  const n = name.toLowerCase();
  if (n.startsWith(ql)) return 100;
  if (n.includes(ql)) return 80;
  if (tagline.toLowerCase().includes(ql)) return 55;
  if (tags.toLowerCase().includes(ql)) return 40;
  if ((description ?? "").toLowerCase().includes(ql)) return 25;
  return 10;
}

/**
 * Scored, paginated tool search for the /tools?q= server-rendered results.
 * `q` is matched (case-sensitively, like the API on SQLite) across name,
 * tagline, tags and description; ordering is relevance-then-editorial.
 */
export async function searchToolsForSerp(
  q: string,
  page: number,
  pageSize: number,
): Promise<SerpResult> {
  const ql = q.toLowerCase();

  const candidates = await db.tool.findMany({
    where: {
      status: "live",
      OR: [
        { name: { contains: q } },
        { tagline: { contains: q } },
        { tags: { contains: q } },
        { description: { contains: q } },
      ],
    },
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
    .map((t) => ({
      t,
      score: relevance(ql, t.name, t.tagline, t.tags, t.description),
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
