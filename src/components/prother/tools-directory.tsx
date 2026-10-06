"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { ArrowUpRight, Compass, Search, SearchX, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "./categories";
import type { DirectoryRow } from "@/app/api/tools/route";
import { ToolLogo } from "./tool-logo";

/**
 * /tools — the discovery directory. Search + category chips + sort,
 * all client-side against GET /api/tools. Cards are real links to the
 * server-rendered /tools/[slug] pages (Task 25) — the overlay stays a
 * homepage-explorer-only enhancement.
 *
 * The page can bootstrap this component with the first page of live tools
 * (`initialRows`/`initialTotal`, rendered by /tools) so the HTML carries real
 * content before any client fetch; on top of the SERP (`?q=`) it renders with
 * `hideHeader` (the SERP header owns the page's H1) and `initialQuery` so the
 * toolbar mirrors the searched query.
 */

type Sort = "featured" | "top-rated" | "newest" | "trending";

const PAGE_LIMIT = 60;

export type ToolsDirectoryProps = {
  /** SSR'd first page (directory default ordering) — skips the boot fetch. */
  initialRows?: DirectoryRow[];
  initialTotal?: number;
  /** Hide the big hero/head block (used on the ?q= SERP). */
  hideHeader?: boolean;
  /** Query the page already rendered results for (mirrored into the input). */
  initialQuery?: string;
  /**
   * Server-rendered filters the page is already scoped to. The homepage intent
   * cards link here as /tools?tag=…, so without these the SSR pass would render
   * the unfiltered directory and then the client would silently drop the tag on
   * its first fetch — the visitor would land on "all 107 tools" instead of the
   * 15 they asked for.
   */
  initialCategory?: string;
  initialTag?: string;
  initialPricing?: string;
  initialSort?: string;
  /** Server-gated ad island (Task 27) — rendered as a full-width cell after
   *  the first row of tool cards. undefined when ad serving is off. */
  sponsorSlot?: ReactNode;
};

function pricingLabel(row: DirectoryRow): string {
  const { model, price } = row.pricing;
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

/** ISO listing date → "Mar 2026" (UTC, deterministic). */
function listedLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** True when the listing went live within the last 14 days. */
function isNewListing(iso: string): boolean {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && Date.now() - t < 14 * 86_400_000;
}

export function ToolsDirectory({
  initialRows,
  initialTotal,
  hideHeader = false,
  initialQuery,
  initialCategory,
  initialTag,
  initialPricing,
  initialSort,
  sponsorSlot,
}: ToolsDirectoryProps) {
  // Hydration-safe: the server rendered the same value via the initialQuery
  // prop when a query is in the URL; the window fallback covers mounts
  // without the prop (both read the same ?q=, so server/client agree).
  const [query, setQuery] = useState(
    () =>
      initialQuery ??
      (typeof window === "undefined"
        ? ""
        : (new URLSearchParams(window.location.search).get("q") ?? "")
            .trim()
            .slice(0, 64)),
  );
  // Tag/pricing are entered via the URL (?tag=…&pricing=…) from the homepage
  // intent cards, so they seed state and — unlike the category chips — are not
  // user-clearable in the toolbar. The active-tag chip below is their escape
  // hatch: clicking it resets to "all" and drops both from the URL.
  const [tag, setTag] = useState<string>(initialTag ?? "");
  const [pricing, setPricing] = useState<string>(initialPricing ?? "");
  const [category, setCategory] = useState<string>(initialCategory ?? "all");
  const [sort, setSort] = useState<Sort>((initialSort as Sort) ?? "featured");
  const [rows, setRows] = useState<DirectoryRow[] | null>(initialRows ?? null);
  const [total, setTotal] = useState(initialTotal ?? 0);
  const [failed, setFailed] = useState(false);

  // Boot guard: while the visitor hasn't touched a filter, the SSR'd rows
  // stand — no redundant mount fetch. Handlers flip this before the effect runs.
  const interactedRef = useRef(false);

  // Debounced directory fetch (250ms) — results land in async continuations.
  // The query is mirrored into the URL (replaceState) alongside the fetch so
  // /tools?q=… stays shareable without a navigation.
  useEffect(() => {
    if (!interactedRef.current && initialRows) return;
    const q = query.trim();
    const ctrl = new AbortController();
    const t = window.setTimeout(() => {
      // Mirror every active filter into the URL so the scoped view stays
      // shareable. Previously only ?q= was written, which meant a
      // /tools?tag=… link lost its tag the moment the visitor touched a chip.
      const url = new URLSearchParams();
      if (q) url.set("q", q);
      if (category !== "all") url.set("category", category);
      if (tag) url.set("tag", tag);
      if (pricing) url.set("pricing", pricing);
      if (sort !== "featured") url.set("sort", sort);
      const qs = url.toString();
      window.history.replaceState(null, "", qs ? `/tools?${qs}` : "/tools");
      const sp = new URLSearchParams({ sort, pageSize: String(PAGE_LIMIT) });
      if (q) sp.set("q", q);
      if (category !== "all") sp.set("category", category);
      if (tag) sp.set("tag", tag);
      if (pricing) sp.set("pricing", pricing);
      fetch(`/api/tools?${sp.toString()}`, { signal: ctrl.signal })
        .then((r) => {
          if (!r.ok) throw new Error(`directory failed: ${r.status}`);
          return r.json() as Promise<{ rows: DirectoryRow[]; total: number }>;
        })
        .then((d) => {
          setRows(d.rows);
          setTotal(d.total);
          setFailed(false);
        })
        .catch(() => {
          if (ctrl.signal.aborted) return; // a newer keystroke took over
          setFailed(true);
          setRows([]);
        });
    }, 250);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [query, category, tag, pricing, sort, initialRows]);

  const activeCat = useMemo(
    () => CATEGORIES.find((c) => c.slug === category) ?? null,
    [category],
  );
  const hasFilters =
    query.trim() !== "" || category !== "all" || tag !== "" || pricing !== "";
  const loading = rows === null;
  const count = rows?.length ?? 0;

  const clearFilters = useCallback(() => {
    interactedRef.current = true;
    setQuery("");
    setCategory("all");
    setTag("");
    setPricing("");
  }, []);

  const openCategoryInDirectory = useCallback((slug: string) => {
    interactedRef.current = true;
    setCategory(slug);
  }, []);

  return (
    <section className="bg-ink">
      {/* Page head */}
      {!hideHeader && (
        <div className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
          <p className="flex items-center gap-2 font-mono text-xs tracking-[0.3em] text-ember uppercase">
            <Compass className="size-3.5" aria-hidden />
            The directory
          </p>
          <h1 className="mt-3 text-5xl font-black tracking-tighter text-white md:text-6xl">
            Every AI tool.
            <br />
            One shelf.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-white/60">
            Search the full directory: {total} tools, honestly listed. Filter by
            category, pricing, and tags. Free, open, no account needed.
          </p>
        </div>
      )}

      {/* Sticky toolbar */}
      <div className="sticky top-16 z-30 mt-8 border-y border-white/10 bg-ink/90 backdrop-blur-md">
        {/* Active intent scope. The homepage intent cards link to
            /tools?tag=…; without this the visitor sees a filtered list with
            no indication of why it is short or how to get back to everything. */}
        {(tag || pricing) && (
          <div className="mx-auto max-w-6xl px-4 pt-3 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] tracking-widest text-white/55 uppercase">
                Showing
              </span>
              {tag && (
                <button
                  type="button"
                  onClick={() => {
                    interactedRef.current = true;
                    setTag("");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ember/40 bg-ember/10 px-3 py-1 font-mono text-[11px] font-medium text-ember transition-colors hover:bg-ember/20"
                >
                  {tag}
                  <X className="size-3" aria-hidden />
                  <span className="sr-only">Clear tag filter</span>
                </button>
              )}
              {pricing && (
                <button
                  type="button"
                  onClick={() => {
                    interactedRef.current = true;
                    setPricing("");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ember/40 bg-ember/10 px-3 py-1 font-mono text-[11px] font-medium text-ember capitalize transition-colors hover:bg-ember/20"
                >
                  {pricing}
                  <X className="size-3" aria-hidden />
                  <span className="sr-only">Clear pricing filter</span>
                </button>
              )}
              <span className="font-mono text-[11px] text-white/50">
                {total} {total === 1 ? "tool" : "tools"}
              </span>
            </div>
          </div>
        )}
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Search */}
            <div className="relative w-full lg:max-w-sm">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ember"
                aria-hidden
              />
              <input
                type="search"
                role="searchbox"
                aria-label="Search tools by name"
                value={query}
                onChange={(e) => {
                  interactedRef.current = true;
                  setQuery(e.target.value);
                }}
                placeholder="Search tools…"
                autoComplete="off"
                spellCheck={false}
                className="h-10 w-full rounded-lg border border-white/15 bg-white/[0.04] pl-10 pr-9 text-sm text-white outline-none transition-colors placeholder:text-white/60 focus:border-ember/60 focus:ring-2 focus:ring-ember/25"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    interactedRef.current = true;
                    setQuery("");
                  }}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-white/60 transition-colors hover:text-ember"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              )}
            </div>

            {/* Sort segmented control */}
            <div
              role="group"
              aria-label="Sort tools"
              className="inline-flex shrink-0 self-start rounded-lg border border-white/10 bg-white/[0.04] p-1 lg:ml-auto"
            >
              {(
                [
                  { key: "featured", label: "Featured" },
                  { key: "top-rated", label: "Top rated" },
                  { key: "newest", label: "Newest" },
                  { key: "trending", label: "Trending" },
                ] as const
              ).map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => {
                    interactedRef.current = true;
                    setSort(s.key);
                  }}
                  aria-pressed={sort === s.key}
                  className={cn(
                    "rounded-md px-3 py-1.5 font-mono text-xs tracking-wider uppercase transition-colors",
                    sort === s.key
                      ? "bg-ember font-semibold text-coal"
                      : "text-white/55 hover:text-white",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category chips */}
          <div className="mt-3 flex gap-2 overflow-x-auto scroll-px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [mask-image:linear-gradient(to_right,black_88%,transparent)] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => openCategoryInDirectory("all")}
              aria-pressed={category === "all"}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 font-mono text-sm tracking-wider uppercase transition-all active:scale-95",
                category === "all"
                  ? "border-ember bg-ember font-semibold text-coal"
                  : "border-white/10 bg-white/[0.03] text-white/55 hover:border-ember/40 hover:text-white",
              )}
            >
              All
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => openCategoryInDirectory(c.slug)}
                aria-pressed={category === c.slug}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 font-mono text-sm tracking-wider uppercase transition-all active:scale-95",
                  category === c.slug
                    ? "border-ember bg-ember font-semibold text-coal"
                    : "border-white/10 bg-white/[0.03] text-white/55 hover:border-ember/40 hover:text-white",
                )}
              >
                <span aria-hidden className="mr-1">
                  {c.emoji}
                </span>
                {c.short}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Result count */}
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6" aria-live="polite">
        <p className="font-mono text-xs tracking-[0.25em] text-white/60 uppercase">
          {loading ? (
            "Scanning…"
          ) : (
            <>
              {total} {total === 1 ? "tool" : "tools"}
              {activeCat && <> · {activeCat.short}</>}
              {query.trim() && <> · &ldquo;{query.trim()}&rdquo;</>}
            </>
          )}
        </p>
      </div>

      {/* Cards */}
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-4 sm:px-6">
        {loading && (
          <div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            aria-busy="true"
            aria-label="Loading tools"
          >
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"
              />
            ))}
          </div>
        )}

        {!loading && failed && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
            <p className="font-mono text-sm text-white/60">
              Couldn&apos;t load the directory. Please refresh the page.
            </p>
          </div>
        )}

        {!loading && !failed && count === 0 && (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center">
            <SearchX className="mx-auto size-8 text-white/55" aria-hidden />
            <p className="mt-4 font-mono text-sm tracking-wider text-white/60 uppercase">
              No tools match
            </p>
            <p className="mt-2 text-sm text-white/60">
              Try a shorter query or a different category.
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-ember/40 bg-ember/10 px-4 py-2 font-mono text-sm font-semibold tracking-wider text-ember uppercase transition-colors hover:bg-ember/20"
              >
                <X className="size-3.5" aria-hidden />
                Clear filters
              </button>
            )}
          </div>
        )}

        {!loading && !failed && count > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows!.map((row, i) => (
              <Fragment key={row.slug}>
                <Link
                  href={`/tools/${row.slug}`}
                  aria-label={`${row.name}: ${row.tagline}. Open full listing.`}
                  className="group flex h-full w-full flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-left transition-all hover:-translate-y-0.5 hover:border-ember/40 hover:bg-white/[0.04]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <ToolLogo
                      slug={row.slug}
                      name={row.name}
                      logoUrl={row.logoUrl}
                      emoji={row.emoji}
                      gradient={row.gradient}
                      size="lg"
                    />
                    {row.editorsPick && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-ember/30 bg-ember/15 px-2.5 py-1 font-mono text-xs tracking-wider text-ember uppercase">
                        <Star className="size-2.5 fill-current" aria-hidden />
                        Editor&apos;s Pick
                      </span>
                    )}
                  </div>

                  <h2 className="mt-4 text-lg leading-snug font-bold text-white transition-colors group-hover:text-ember">
                    {row.name}
                  </h2>
                  <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-white/55">
                    {row.tagline}
                  </p>

                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                    <span
                      title={`Category: ${row.category.name}`}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-xs tracking-wider text-white/60 uppercase"
                    >
                      {row.category.emoji} {row.category.name}
                    </span>
                    <span
                      title={`Pricing: ${pricingLabel(row)}`}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-xs tracking-wider text-white/60 uppercase"
                    >
                      {pricingLabel(row)}
                    </span>
                    {row.reviews.count > 0 && (
                      <span
                        title={`${row.reviews.count} published hands-on reviews`}
                        className="inline-flex items-center gap-1 rounded-full border border-ember/30 bg-ember/10 px-2.5 py-1 font-mono text-xs tracking-wider text-ember uppercase"
                      >
                        <Star className="size-2.5 fill-current" aria-hidden />
                        {row.reviews.count}
                      </span>
                    )}
                    {isNewListing(row.listedAt) && (
                      <span
                        title="Listed within the last 14 days"
                        className="rounded-full border border-mint/30 bg-mint/10 px-2.5 py-1 font-mono text-xs tracking-wider text-mint uppercase"
                      >
                        New
                      </span>
                    )}
                    <span
                      title={`Listed on Prother ${listedLabel(row.listedAt)}`}
                      className="ml-auto inline-flex items-center gap-1 font-mono text-xs tracking-wider text-white/55 uppercase"
                    >
                      Listed {listedLabel(row.listedAt)}
                      <ArrowUpRight
                        className="size-3.5 text-white/55 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ember"
                        aria-hidden
                      />
                    </span>
                  </div>
                </Link>
                {/* Directory banner — one full-width sponsored cell after the
                    first row (server-gated; house creative when unsold). */}
                {sponsorSlot && i === 2 && (
                  <div className="sm:col-span-2 lg:col-span-3">
                    {sponsorSlot}
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        )}

        {/* Category SEO blurb — scoped to one category */}
        {!loading && !failed && activeCat && count > 0 && (
          <p className="mt-10 text-center font-mono text-xs tracking-[0.2em] text-white/55 uppercase">
            Viewing the {activeCat.name} shelf ·{" "}
            <button
              type="button"
              onClick={() => openCategoryInDirectory("all")}
              className="text-ember/80 transition-colors hover:text-ember"
            >
              show everything
            </button>
          </p>
        )}
      </div>
    </section>
  );
}
