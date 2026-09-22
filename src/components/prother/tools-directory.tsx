"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Compass, Search, SearchX, Triangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "./categories";
import type { DirectoryRow } from "@/app/api/tools/route";

/**
 * /tools — the open discovery directory. Search + category chips + sort,
 * all client-side against GET /api/tools. Cards are real links to the
 * server-rendered /tools/[slug] pages (Task 25) — the overlay stays a
 * homepage-feed-only enhancement.
 *
 * The page can bootstrap this component with the first page of live tools
 * (`initialRows`/`initialTotal`, rendered by /tools) so the HTML carries real
 * content before any client fetch; on top of the SERP (`?q=`) it renders with
 * `hideHeader` (the SERP header owns the page's H1) and `initialQuery` so the
 * toolbar mirrors the searched query.
 */

type Sort = "top" | "new";

const PAGE_LIMIT = 60;

export type ToolsDirectoryProps = {
  /** SSR'd first page (directory default ordering) — skips the boot fetch. */
  initialRows?: DirectoryRow[];
  initialTotal?: number;
  /** Hide the big hero/head block (used on the ?q= SERP). */
  hideHeader?: boolean;
  /** Query the page already rendered results for (mirrored into the input). */
  initialQuery?: string;
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

function launchLabel(row: DirectoryRow): string {
  if (!row.launchDate) return "Listed";
  return new Date(row.launchDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function ToolsDirectory({
  initialRows,
  initialTotal,
  hideHeader = false,
  initialQuery,
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
            .slice(0, 64))
  );
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("top");
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
      window.history.replaceState(
        null,
        "",
        q ? `/tools?q=${encodeURIComponent(q)}` : "/tools"
      );
      const sp = new URLSearchParams({ sort, limit: String(PAGE_LIMIT) });
      if (q) sp.set("q", q);
      if (category !== "all") sp.set("category", category);
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
  }, [query, category, sort, initialRows]);

  const activeCat = useMemo(
    () => CATEGORIES.find((c) => c.slug === category) ?? null,
    [category]
  );
  const hasFilters = query.trim() !== "" || category !== "all";
  const loading = rows === null;
  const count = rows?.length ?? 0;

  const clearFilters = useCallback(() => {
    interactedRef.current = true;
    setQuery("");
    setCategory("all");
  }, []);

  const openCategoryInDirectory = useCallback(
    (slug: string) => {
      interactedRef.current = true;
      setCategory(slug);
    },
    []
  );

  return (
    <section className="bg-ink">
      {/* Page head */}
      {!hideHeader && (
        <div className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
          <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.3em] text-ember uppercase">
            <Compass className="size-3.5" aria-hidden />
            The directory
          </p>
          <h1 className="mt-3 text-5xl font-black tracking-tighter text-white md:text-6xl">
            Every AI tool.
            <br />
            One shelf.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-white/60">
            Search the full archive of launches — ranked by community votes or
            newest first. Free, open, no account needed.
          </p>
        </div>
      )}

      {/* Sticky toolbar */}
      <div className="sticky top-16 z-30 mt-8 border-y border-white/10 bg-ink/90 backdrop-blur-md">
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
                aria-label="Search tools by name or tagline"
                value={query}
                onChange={(e) => {
                  interactedRef.current = true;
                  setQuery(e.target.value);
                }}
                placeholder="Search tools…"
                autoComplete="off"
                spellCheck={false}
                className="h-10 w-full rounded-lg border border-white/15 bg-white/[0.04] pl-10 pr-9 text-sm text-white outline-none transition-colors placeholder:text-white/35 focus:border-ember/60 focus:ring-2 focus:ring-ember/25"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    interactedRef.current = true;
                    setQuery("");
                  }}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-white/40 transition-colors hover:text-ember"
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
                  { key: "top", label: "Top voted" },
                  { key: "new", label: "Newest" },
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
                    "rounded-md px-3 py-1.5 font-mono text-[11px] tracking-wider uppercase transition-colors",
                    sort === s.key
                      ? "bg-ember font-semibold text-black"
                      : "text-white/55 hover:text-white"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category chips */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => openCategoryInDirectory("all")}
              aria-pressed={category === "all"}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 font-mono text-[11px] tracking-wider uppercase transition-all active:scale-95",
                category === "all"
                  ? "border-ember bg-ember font-semibold text-black"
                  : "border-white/10 bg-white/[0.03] text-white/55 hover:border-ember/40 hover:text-white"
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
                  "shrink-0 rounded-full border px-3 py-1.5 font-mono text-[11px] tracking-wider uppercase transition-all active:scale-95",
                  category === c.slug
                    ? "border-ember bg-ember font-semibold text-black"
                    : "border-white/10 bg-white/[0.03] text-white/55 hover:border-ember/40 hover:text-white"
                )}
              >
                <span aria-hidden className="mr-1">{c.emoji}</span>
                {c.short}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Result count */}
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6" aria-live="polite">
        <p className="font-mono text-[11px] tracking-[0.25em] text-white/40 uppercase">
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
              Couldn&apos;t load the directory — please refresh the page.
            </p>
          </div>
        )}

        {!loading && !failed && count === 0 && (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center">
            <SearchX className="mx-auto size-8 text-white/25" aria-hidden />
            <p className="mt-4 font-mono text-sm tracking-wider text-white/60 uppercase">
              No tools match
            </p>
            <p className="mt-2 text-sm text-white/40">
              Try a shorter query or a different category.
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-ember/40 bg-ember/10 px-4 py-2 font-mono text-[11px] font-semibold tracking-wider text-ember uppercase transition-colors hover:bg-ember/20"
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
                  aria-label={`${row.name} — ${row.tagline}. Open full listing.`}
                  className="group flex h-full w-full flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-left transition-all hover:-translate-y-0.5 hover:border-ember/40 hover:bg-white/[0.04]"
                >
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

                  <h2 className="mt-4 text-lg leading-snug font-bold text-white transition-colors group-hover:text-ember">
                    {row.name}
                  </h2>
                  <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-white/55">
                    {row.tagline}
                  </p>

                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] tracking-wider text-white/60 uppercase">
                      {row.category.emoji} {row.category.name}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] tracking-wider text-white/60 uppercase">
                      {pricingLabel(row)}
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] tracking-wider text-white/35 uppercase">
                      {launchLabel(row)}
                      <ArrowUpRight
                        className="size-3.5 text-white/30 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ember"
                        aria-hidden
                      />
                    </span>
                  </div>
                </Link>
                {/* Directory banner — one full-width sponsored cell after the
                    first row (server-gated; house creative when unsold). */}
                {sponsorSlot && i === 2 && (
                  <div className="sm:col-span-2 lg:col-span-3">{sponsorSlot}</div>
                )}
              </Fragment>
            ))}
          </div>
        )}

        {/* Category SEO blurb — scoped to one category */}
        {!loading && !failed && activeCat && count > 0 && (
          <p className="mt-10 text-center font-mono text-[10px] tracking-[0.2em] text-white/30 uppercase">
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
