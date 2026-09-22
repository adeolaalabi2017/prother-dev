/**
 * Server-side tool search for the /tools?q= SERP (Task 25).
 *
 * The scoring mirrors GET /api/search (name.startsWith > name.includes >
 * tagline > tags > description; tiebreak by votes desc) so the server-rendered
 * results page and the hero dropdown agree on relevance. The API route keeps
 * its own compact payload for the dropdown; this module returns the fuller
 * row the SERP cards render. Duplicating the small relevance function is
 * deliberate — refactoring the route would risk the live dropdown payload.
 *
 * Live tools only (status="live", launch.scheduled=false) — same visibility
 * rule as the public directory.
 */
import { db } from "@/lib/db";

/** One scored result row on the /tools?q= SERP. */
export type SerpToolRow = {
  slug: string;
  name: string;
  tagline: string;
  emoji: string;
  gradient: string;
  votes: number;
  pricingModel: string;
  startingPrice: string | null;
  category: { slug: string; name: string; emoji: string };
  /** ISO launch date, null when the launch row is missing. */
  launchDate: string | null;
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
 * tagline, tags and description; ordering is relevance-then-votes.
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
      launch: { is: { scheduled: false } },
      OR: [
        { name: { contains: q } },
        { tagline: { contains: q } },
        { tags: { contains: q } },
        { description: { contains: q } },
      ],
    },
    include: {
      launch: { include: { _count: { select: { votes: true } } } },
      category: { select: { slug: true, name: true, emoji: true } },
    },
    take: 500,
  });

  const scored = candidates
    .map((t) => ({
      t,
      score: relevance(ql, t.name, t.tagline, t.tags, t.description),
      votes: (t.launch?.baseUpvotes ?? 0) + (t.launch?._count.votes ?? 0),
    }))
    .sort((a, b) => b.score * 1000 + b.votes - (a.score * 1000 + a.votes));

  const total = scored.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pages);

  const rows: SerpToolRow[] = scored
    .slice((safePage - 1) * pageSize, safePage * pageSize)
    .map(({ t, votes }) => ({
      slug: t.slug,
      name: t.name,
      tagline: t.tagline,
      emoji: t.logoEmoji,
      gradient: t.logoGradient,
      votes,
      pricingModel: t.pricingModel,
      startingPrice: t.startingPrice,
      category: t.category,
      launchDate: t.launch?.launchDate.toISOString() ?? null,
    }));

  return { rows, total, page: safePage, pages };
}
