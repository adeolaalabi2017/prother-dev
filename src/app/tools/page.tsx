import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight, Compass, SearchX, Triangle } from "lucide-react";
import { ToolsDirectory } from "@/components/prother/tools-directory";
import { db } from "@/lib/prother";
import { searchToolsForSerp } from "@/lib/search";
import type { SerpToolRow } from "@/lib/search";
import { commentCountsByTool } from "@/lib/discussion";
import type { DirectoryRow } from "@/app/api/tools/route";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: {
    canonical: "/tools",
    types: { "application/rss+xml": "/api/rss" },
  },
  title: "Browse thousands of AI tools — Prother",
  description:
    "The open directory of AI tools: every launch, ranked by community votes and searchable by category, pricing, and tags. No gates — browse free.",
  keywords: [
    "AI tools directory",
    "browse AI tools",
    "AI tool search",
    "AI launches",
    "AI tools ranked",
  ],
  openGraph: {
    title: "Browse thousands of AI tools — Prother",
    description:
      "The open directory of AI tools: every launch, ranked by community votes and searchable by category, pricing, and tags. No gates — browse free.",
    siteName: "Prother",
    type: "website",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Browse thousands of AI tools — Prother",
    description:
      "The open directory of AI tools: every launch, ranked by community votes and searchable by category, pricing, and tags.",
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

function launchLabel(iso: string | null): string {
  if (!iso) return "Listed";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * First page of live tools in the directory's default ordering (votes desc,
 * votes = launch.baseUpvotes + Vote count — see GET /api/tools, sort=votes).
 * Rendered into the HTML so /tools carries real crawlable content before any
 * client fetch, then handed to <ToolsDirectory /> as its initial state.
 */
async function directoryInitialRows(): Promise<{ rows: DirectoryRow[]; total: number }> {
  const tools = await db.tool.findMany({
    where: { status: "live", launch: { is: { scheduled: false } } },
    include: {
      launch: { include: { _count: { select: { votes: true } } } },
      category: { select: { slug: true, name: true, emoji: true } },
    },
  });

  const scored = tools
    .map((t) => ({
      t,
      votes: (t.launch?.baseUpvotes ?? 0) + (t.launch?._count.votes ?? 0),
    }))
    .sort((a, b) => b.votes - a.votes);

  const total = scored.length;
  const top = scored.slice(0, DIRECTORY_PAGE_LIMIT);
  const commentCounts = await commentCountsByTool(top.map((s) => s.t.id));

  const rows: DirectoryRow[] = top.map(({ t, votes }) => ({
    slug: t.slug,
    name: t.name,
    tagline: t.tagline,
    emoji: t.logoEmoji,
    gradient: t.logoGradient,
    votes,
    comments: commentCounts.get(t.id) ?? 0,
    maker: t.makerHandle,
    track: t.track === "community" ? "community" : "editor_seed",
    pricing: { model: t.pricingModel, price: t.startingPrice },
    tags: t.tags.split("|").filter(Boolean),
    badges: {
      editorsPick: t.editorsPick,
      curated: t.curated,
      relaunch: t.relaunch,
      unclaimed: !t.claimed,
      hasApi: t.hasApi,
      openSource: t.pricingModel === "open_source",
    },
    launchDate: t.launch?.launchDate.toISOString() ?? null,
    category: t.category,
  }));

  return { rows, total };
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
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] tracking-wider text-ember uppercase">
          <Triangle className="size-2.5 fill-current" aria-hidden />
          {row.votes}
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
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] tracking-wider text-white/60 uppercase">
          {row.category.emoji} {row.category.name}
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] tracking-wider text-white/60 uppercase">
          {pricingLabel(row.pricingModel, row.startingPrice)}
        </span>
        <span className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] tracking-wider text-white/35 uppercase">
          {launchLabel(row.launchDate)}
          <ArrowUpRight
            className="size-3.5 text-white/30 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ember"
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
    "inline-flex h-9 items-center gap-1 rounded-lg border px-3 font-mono text-[11px] tracking-wider uppercase transition-colors";
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
        <span aria-disabled="true" className={cn(navBtn, "cursor-not-allowed border-white/5 bg-transparent text-white/20")}>
          <ChevronLeft className="size-3.5" aria-hidden />
          Prev
        </span>
      )}

      {serpPageNumbers(page, pages).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} aria-hidden className="px-1 font-mono text-xs text-white/25">
            …
          </span>
        ) : p === page ? (
          <span
            key={p}
            aria-current="page"
            className={cn(numBtn, "border-ember bg-ember font-semibold text-black")}
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
        <span aria-disabled="true" className={cn(navBtn, "cursor-not-allowed border-white/5 bg-transparent text-white/20")}>
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
            <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.3em] text-ember uppercase">
              <Compass className="size-3.5" aria-hidden />
              Search results
            </p>
            <h1 className="mt-3 break-words text-4xl font-black tracking-tighter text-white md:text-5xl">
              &ldquo;{q}&rdquo; — AI tool search results
            </h1>
            <p
              className="mt-4 font-mono text-[11px] tracking-[0.25em] text-white/40 uppercase"
              aria-live="polite"
            >
              {serp.total} {serp.total === 1 ? "result" : "results"} · page {serp.page} of{" "}
              {serp.pages}
            </p>
          </div>

          <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
            {serp.rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center">
                <SearchX className="mx-auto size-8 text-white/25" aria-hidden />
                <p className="mt-4 font-mono text-sm tracking-wider text-white/60 uppercase">
                  No results for &ldquo;{q}&rdquo;
                </p>
                <p className="mt-2 text-sm text-white/40">
                  Try a shorter query, check the spelling, or browse the full directory.
                </p>
                <Link
                  href="/tools"
                  className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-ember/40 bg-ember/10 px-4 py-2 font-mono text-[11px] font-semibold tracking-wider text-ember uppercase transition-colors hover:bg-ember/20"
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
      "Every AI tool that ever launched on Prother — ranked by community votes.",
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
      <ToolsDirectory initialRows={initial.rows} initialTotal={initial.total} />
    </div>
  );
}
