import type { Metadata } from "next";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { ArrowUpRight, ChevronLeft, ChevronRight, Compass, SearchX, Star } from "lucide-react";
import { ToolsDirectory } from "@/components/prother/tools-directory";
import { AdSlot } from "@/components/prother/ad-slot";
import { db } from "@/lib/prother";
import { searchToolsForSerp } from "@/lib/search";
import type { SerpToolRow } from "@/lib/search";
import { commentCountsByTool } from "@/lib/discussion";
import type { DirectoryRow } from "@/app/api/tools/route";
import { placementEnabled } from "@/lib/ad-config";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: {
    canonical: "/tools",
    types: { "application/rss+xml": "/api/rss" },
  },
  title: "AI tools · search & compare | Prother",
  description:
    "The curated directory for AI tools: search, compare, and save your stack. Filter by category, pricing, and tags. No gates. Browse free.",
  keywords: [
    "AI tools directory",
    "browse AI tools",
    "AI tool search",
    "search AI tools",
    "compare AI tools",
  ],
  openGraph: {
    title: "AI tools · search & compare | Prother",
    description:
      "The curated directory for AI tools: search, compare, and save your stack. Filter by category, pricing, and tags. No gates. Browse free.",
    siteName: "Prother",
    type: "website",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI tools · search & compare | Prother",
    description:
      "The curated directory for AI tools: search, compare, and save your stack.",
    images: ["/api/og"],
  },
};

/** Results per SERP page. */
const SERP_PAGE_SIZE = 12;
/** How many rows the client directory bootstraps with (matches its PAGE_LIMIT). */
const DIRECTORY_PAGE_LIMIT = 60;

function pricingLabel(model: string, price: string | null): string {
  switch (model) {
    case "free":
      return "Free";
    case "freemium":
      return `Freemium ${price ?? ""}`.trim();
    case "paid":
      return `Paid ${price ?? ""}`.trim();
    case "open_source":
      return "Open Source";
    default:
      return "Free";
  }
}

/** True when the ISO listing date is within the last 14 days. */
function isNewListing(iso: string): boolean {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && Date.now() - t < 14 * 86_400_000;
}

/**
 * First page of live tools in the directory's default ordering (pinned →
 * Editor's Picks → curated → newest — mirrors GET /api/tools, sort=featured).
 * Rendered into the HTML so /tools carries real crawlable content before any
 * client fetch, then handed to <ToolsDirectory /> as its initial state.
 */
async function directoryInitialRows(): Promise<{ rows: DirectoryRow[]; total: number }> {
  const [tools, total] = await Promise.all([
    db.tool.findMany({
      where: { status: "live" },
      // Explicit select — a long-running dev server can hold a pre-generation
      // PrismaClient whose full-row selects reference dropped columns.
      select: {
        id: true,
        slug: true,
        name: true,
        tagline: true,
        logoEmoji: true,
        logoGradient: true,
        pricingModel: true,
        startingPrice: true,
        pricingNote: true,
        editorsPick: true,
        curated: true,
        claimed: true,
        hasApi: true,
        createdAt: true,
        category: { select: { slug: true, name: true, emoji: true } },
      },
      orderBy: [
        { pinned: "desc" },
        { editorsPick: "desc" },
        { curated: "desc" },
        { createdAt: "desc" },
      ],
      take: DIRECTORY_PAGE_LIMIT,
    }),
    db.tool.count({ where: { status: "live" } }),
  ]);

  const commentCounts = await commentCountsByTool(tools.map((t) => t.id));
  const reviewCounts = await publishedReviewCounts(tools.map((t) => t.id));

  const rows: DirectoryRow[] = tools.map((t) => {
    const commentCount = commentCounts.get(t.id) ?? 0;
    return {
      slug: t.slug,
      name: t.name,
      tagline: t.tagline,
      emoji: t.logoEmoji,
      gradient: t.logoGradient,
      pricing: { model: t.pricingModel, price: t.startingPrice, note: t.pricingNote },
      category: t.category,
      editorsPick: t.editorsPick,
      curated: t.curated,
      badges: {
        editorsPick: t.editorsPick,
        curated: t.curated,
        unclaimed: !t.claimed,
        hasApi: t.hasApi,
        openSource: t.pricingModel === "open_source",
      },
      ...(commentCount > 0 ? { comments: commentCount } : {}),
      listedAt: t.createdAt.toISOString(),
      reviews: { count: reviewCounts.get(t.id) ?? 0 },
    };
  });

  return { rows, total };
}

/** Published review counts per tool id (Review is a post-boot model → raw). */
async function publishedReviewCounts(toolIds: string[]): Promise<Map<string, number>> {
  if (toolIds.length === 0) return new Map();
  const rows = await db.$queryRaw<{ toolId: string; n: number }[]>`
    SELECT toolId, COUNT(*) as n
    FROM Review
    WHERE status = 'published' AND toolId IN (${Prisma.join(toolIds)})
    GROUP BY toolId`;
  return new Map(rows.map((r) => [r.toolId, Number(r.n)]));
}

/** One scored SERP result card — name is the real anchor text; the stretched
 *  link (after:absolute inset-0) makes the whole card clickable with no JS. */
function SerpResultCard({ row }: { row: SerpToolRow }) {
  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-all hover:-translate-y-0.5 hover:border-ember/40 hover:bg-white/[0.04]">
      <div className="flex items-start justify-between gap-3">
        <div
          aria-hidden
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xl shadow-inner",
            row.gradient
          )}
        >
          {row.emoji}
        </div>
        <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {row.editorsPick && (
            <span className="inline-flex items-center gap-1 rounded-full border border-ember/30 bg-ember/15 px-2.5 py-1 font-mono text-xs tracking-wider text-ember uppercase">
              <Star className="size-2.5 fill-current" aria-hidden />
              Editor&apos;s Pick
            </span>
          )}
          {isNewListing(row.listedAt) && (
            <span className="rounded-full border border-mint/30 bg-mint/10 px-2.5 py-1 font-mono text-xs tracking-wider text-mint uppercase">
              New
            </span>
          )}
        </span>
      </div>

      <h2 className="mt-4 text-lg leading-snug font-bold text-white">
        <a
          href={`/tools/${row.slug}`}
          className="rounded-2xl outline-none transition-colors after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-ember/60 group-hover:text-ember"
        >
          {row.name}
        </a>
      </h2>
      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-white/55">
        {row.tagline}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-xs tracking-wider text-white/60 uppercase">
          {row.category.emoji} {row.category.name}
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-xs tracking-wider text-white/60 uppercase">
          {pricingLabel(row.pricingModel, row.startingPrice)}
        </span>
        <span className="ml-auto inline-flex items-center gap-1 font-mono text-xs tracking-wider text-white/55 uppercase">
          Listed {new Date(row.listedAt).toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
            timeZone: "UTC",
          })}
          <ArrowUpRight
            className="size-3.5 text-white/55 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ember"
            aria-hidden
          />
        </span>
      </div>
    </article>
  );
}

/** Page numbers with ellipsis gaps: 1 … 4 5 6 … 12. */
function serpPageNumbers(page: number, pages: number): (number | "gap")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out: (number | "gap")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pages - 1, page + 1);
  if (start > 2) out.push("gap");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < pages - 1) out.push("gap");
  out.push(pages);
  return out;
}

/** Real-link pagination — no client JS; crawlers and JS users both work. */
function SerpPagination({ q, page, pages }: { q: string; page: number; pages: number }) {
  if (pages <= 1) return null;
  const href = (p: number) =>
    `/tools?${new URLSearchParams({ q, page: String(p) }).toString()}`;

  const navBtn =
    "inline-flex h-9 items-center gap-1 rounded-lg border px-3 font-mono text-xs tracking-wider uppercase transition-colors";
  const numBtn =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 font-mono text-xs transition-colors";

  return (
    <nav aria-label="Search result pages" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={href(page - 1)} className={cn(navBtn, "border-white/10 bg-white/[0.03] text-white/60 hover:border-ember/40 hover:text-ember")}>
          <ChevronLeft className="size-3.5" aria-hidden />
          Prev
        </Link>
      ) : (
        <span aria-disabled="true" className={cn(navBtn, "cursor-not-allowed border-white/5 bg-transparent text-white/55")}>
          <ChevronLeft className="size-3.5" aria-hidden />
          Prev
        </span>
      )}

      {serpPageNumbers(page, pages).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} aria-hidden className="px-1 font-mono text-xs text-white/55">
            …
          </span>
        ) : p === page ? (
          <span
            key={p}
            aria-current="page"
            className={cn(numBtn, "border-ember bg-ember font-semibold text-coal")}
          >
            {p}
          </span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            className={cn(numBtn, "border-white/10 bg-white/[0.03] text-white/55 hover:border-ember/40 hover:text-ember")}
          >
            {p}
          </Link>
        )
      )}

      {page < pages ? (
        <Link href={href(page + 1)} className={cn(navBtn, "border-white/10 bg-white/[0.03] text-white/60 hover:border-ember/40 hover:text-ember")}>
          Next
          <ChevronRight className="size-3.5" aria-hidden />
        </Link>
      ) : (
        <span aria-disabled="true" className={cn(navBtn, "cursor-not-allowed border-white/5 bg-transparent text-white/55")}>
          Next
          <ChevronRight className="size-3.5" aria-hidden />
        </span>
      )}
    </nav>
  );
}

/**
 * /tools — the discovery directory, now a real server-rendered surface:
 *  - no ?q=  → SSR'd first page of live tools hydrates the client browser.
 *  - ?q=x    → server-rendered scored results (the SERP) with real-link
 *              pagination over /tools?q=…&page=N; the client directory sits
 *              below with the query mirrored into its toolbar.
 */
export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const first = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
  const q = first(params.q).slice(0, 64);
  const pageRaw = Number.parseInt(first(params.page), 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
  // Ad slots are gated server-side — a disabled placement mounts no client
  // island at all (zero ad JS when off; kill switch lives in the KV).
  const serpFooterOn = await placementEnabled("serp_footer");
  const directoryBannerOn = await placementEnabled("directory_banner");

  // ── SERP: ?q= is present — render scored results server-side ──────────
  if (q) {
    const serp = await searchToolsForSerp(q, page, SERP_PAGE_SIZE);

    const serpJsonLd = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `AI tool search results for “${q}”`,
      numberOfItems: serp.rows.length,
      itemListElement: serp.rows.map((r, i) => ({
        "@type": "ListItem",
        position: (serp.page - 1) * SERP_PAGE_SIZE + i + 1,
        name: r.name,
        url: `/tools/${r.slug}`,
      })),
    };

    return (
      <div className="pb-16 md:pb-0">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(serpJsonLd) }}
        />

        {/* Results header — the page's single H1 (the directory's hero is hidden) */}
        <section className="bg-ink">
          <div className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
            <p className="flex items-center gap-2 font-mono text-xs tracking-[0.3em] text-ember uppercase">
              <Compass className="size-3.5" aria-hidden />
              Search results
            </p>
            <h1 className="mt-3 break-words text-4xl font-black tracking-tighter text-white md:text-5xl">
              &ldquo;{q}&rdquo; · AI tool search results
            </h1>
            <p
              className="mt-4 font-mono text-xs tracking-[0.25em] text-white/60 uppercase"
              aria-live="polite"
            >
              {serp.total} {serp.total === 1 ? "result" : "results"} · page {serp.page} of{" "}
              {serp.pages}
            </p>
          </div>

          <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
            {serp.rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center">
                <SearchX className="mx-auto size-8 text-white/55" aria-hidden />
                <p className="mt-4 font-mono text-sm tracking-wider text-white/60 uppercase">
                  No results for &ldquo;{q}&rdquo;
                </p>
                <p className="mt-2 text-sm text-white/60">
                  Try a shorter query, check the spelling, or browse the full directory.
                </p>
                <Link
                  href="/tools"
                  className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-ember/40 bg-ember/10 px-4 py-2 font-mono text-sm font-semibold tracking-wider text-ember uppercase transition-colors hover:bg-ember/20"
                >
                  Browse all tools
                </Link>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {serp.rows.map((row) => (
                    <SerpResultCard key={row.slug} row={row} />
                  ))}
                </div>
                <SerpPagination q={q} page={serp.page} pages={serp.pages} />
              </>
            )}

            {/* SERP footer — after the results (never between rows 1–3),
                category context passed for targeted campaigns. */}
            {serpFooterOn && (
              <AdSlot
                placement="serp_footer"
                category={q}
                variant="bar"
                className="mt-10"
              />
            )}
          </div>
        </section>

        {/* Interactive directory below — hero hidden (the SERP header owns the
            page head); its toolbar mirrors ?q= so the query is editable. */}
        <ToolsDirectory hideHeader initialQuery={q} />
      </div>
    );
  }

  // ── Default directory: SSR the first page the client browser would fetch ──
  const initial = await directoryInitialRows();

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "AI tools on Prother",
    description:
      "The curated directory of AI tools: search, compare, and save your stack.",
    numberOfItems: initial.rows.length,
    itemListElement: initial.rows.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      url: `/tools/${t.slug}`,
    })),
  };

  return (
    <div className="pb-16 md:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <ToolsDirectory
        initialRows={initial.rows}
        initialTotal={initial.total}
        sponsorSlot={
          directoryBannerOn ? (
            <AdSlot placement="directory_banner" variant="bar" />
          ) : undefined
        }
      />
    </div>
  );
}
