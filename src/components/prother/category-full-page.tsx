"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Scale, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useExplorer } from "./explorer-store";
import { FullPageShell, PageError, PageSkeleton } from "./page-shell";
import type { DirectoryRow } from "@/app/api/tools/route";

/**
 * Category browse FULL PAGE — every tool in one category, opened via
 * ?category=<slug> (explorer-store.categoryView). The tool page stacks on
 * top when a card is clicked. API contract:
 * GET /api/tools?category=<slug>&sort=<featured|top-rated|newest>&pageSize=60 →
 * { rows: DirectoryRow[], total, pages, categoryMeta: { slug, name, emoji, blurb, count } }
 */

type CategoryMeta = {
  slug: string;
  name: string;
  emoji: string;
  blurb: string;
  count: number;
};

type CategoryToolsResponse = {
  rows: DirectoryRow[];
  total: number;
  categoryMeta: CategoryMeta;
};

type Sort = "featured" | "top-rated" | "newest";

function pricingLabel(row: DirectoryRow): string {
  const { model, price } = row.pricing ?? { model: "free", price: null };
  switch (model) {
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

/** True when the listing went live within the last 14 days. */
function isNewListing(iso: string): boolean {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && Date.now() - t < 14 * 86_400_000;
}

export function CategoryFullPage() {
  const { toast } = useToast();
  const slug = useExplorer((s) => s.categoryView);
  const closeCategory = useExplorer((s) => s.closeCategory);
  const openTool = useExplorer((s) => s.openTool);

  const [sort, setSort] = useState<Sort>("featured");
  const [data, setData] = useState<
    (CategoryToolsResponse & { slug: string; sort: Sort }) | null
  >(null);
  const [failedFor, setFailedFor] = useState<{ slug: string; sort: Sort } | null>(
    null
  );
  /** Per-category follow toggles (survives sort switches). */
  const [following, setFollowing] = useState<Record<string, boolean>>({});
  const [followBusy, setFollowBusy] = useState(false);

  const error =
    slug !== null && failedFor !== null && failedFor.slug === slug && failedFor.sort === sort;
  const loading =
    slug !== null && !error && (data === null || data.slug !== slug || data.sort !== sort);

  // Fetch tools for this category (state updates only in async callbacks).
  useEffect(() => {
    if (!slug) return;
    let alive = true;
    fetch(
      `/api/tools?category=${encodeURIComponent(slug)}&sort=${sort}&pageSize=60`
    )
      .then(async (r) => {
        if (!r.ok) throw new Error("not found");
        return r.json() as Promise<CategoryToolsResponse>;
      })
      .then((d) => {
        if (!alive) return;
        setData({ ...d, slug, sort });
        setFailedFor(null);
      })
      .catch(() => {
        if (alive) setFailedFor({ slug, sort });
      });
    return () => {
      alive = false;
    };
  }, [slug, sort]);

  const meta = data && data.slug === slug ? data.categoryMeta : null;
  const rows = data && data.slug === slug && data.sort === sort ? data.rows : [];
  const isEmpty = !loading && !error && rows.length === 0;

  const toggleFollow = useCallback(async () => {
    if (!meta || followBusy) return;
    setFollowBusy(true);
    try {
      const r = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "category",
          targetId: meta.slug,
          targetLabel: meta.name,
        }),
      });
      if (r.status === 401) {
        window.dispatchEvent(new CustomEvent("prother:auth-open"));
        toast({ title: "Sign in to follow" });
        return;
      }
      if (!r.ok) throw new Error("follow failed");
      const d = (await r.json()) as { following: boolean };
      setFollowing((prev) => ({ ...prev, [meta.slug]: d.following }));
      toast({
        title: d.following ? `Following ${meta.name}` : `Unfollowed ${meta.name}`,
      });
    } catch {
      toast({
        title: "Could not update follow",
        description: "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setFollowBusy(false);
    }
  }, [meta, followBusy, toast]);

  if (!slug) return null;

  const breadcrumb = [
    { label: "Home", onClick: () => closeCategory() },
    { label: "Categories" },
    { label: meta?.name ?? "…" },
  ];

  const isFollowing = meta ? following[meta.slug] ?? false : false;

  return (
    <FullPageShell
      breadcrumb={breadcrumb}
      onClose={closeCategory}
      ariaLabel={meta ? `${meta.name} category` : "Category"}
      wide
      shareUrl={`/?category=${encodeURIComponent(slug)}`}
    >
      {error && (
        <PageError
          title="Category unavailable"
          message="This category may have been renamed or removed."
          action={
            <button
              type="button"
              onClick={() => closeCategory()}
              className="rounded-lg border border-white/15 px-4 py-2 font-mono text-sm uppercase tracking-[0.2em] text-white/70 transition-colors hover:border-ember/50 hover:text-ember"
            >
              Back to the directory
            </button>
          }
        />
      )}

      {loading && <PageSkeleton />}

      {isEmpty && (
        <PageError
          title="No tools yet"
          message="Nothing has been submitted to this category so far. Browse all tools in this category from the directory."
          action={
            <button
              type="button"
              onClick={() => closeCategory()}
              className="rounded-lg border border-white/15 px-4 py-2 font-mono text-sm uppercase tracking-[0.2em] text-white/70 transition-colors hover:border-ember/50 hover:text-ember"
            >
              Browse all tools
            </button>
          }
        />
      )}

      {meta && !loading && !error && !isEmpty && (
        <>
          {/* header block */}
          <header className="mt-4">
            <div className="flex flex-wrap items-start gap-4">
              <div
                aria-hidden
                className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-ember/25 to-ember/5 text-3xl shadow-inner"
              >
                {meta.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl font-black tracking-tight text-white">
                  {meta.name}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    aria-label={`${meta.count} tools in this category`}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-xs tracking-[0.2em] text-white/60 uppercase"
                  >
                    {meta.count} tools
                  </span>
                  <button
                    type="button"
                    onClick={() => void toggleFollow()}
                    aria-pressed={isFollowing}
                    disabled={followBusy}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-sm tracking-[0.2em] uppercase transition-colors disabled:opacity-50",
                      isFollowing
                        ? "border-ember/60 bg-ember/10 text-ember"
                        : "border-white/15 text-white/70 hover:border-ember/50 hover:text-ember"
                    )}
                  >
                    <Bell className="size-3.5" aria-hidden />
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                  <Link
                    href={`/compare?category=${meta.slug}`}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-ember/40 px-3 py-1.5 font-mono text-sm tracking-[0.2em] text-ember uppercase transition-colors hover:bg-ember/10"
                  >
                    <Scale className="size-3.5" aria-hidden />
                    Compare tools
                  </Link>
                </div>
              </div>
            </div>
          </header>

          {/* SEO intro block */}
          {meta.blurb && (
            <section
              aria-label="About this category"
              className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5"
            >
              <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-white/60">
                <span aria-hidden className="h-px w-6 bg-ember/70" />
                About this category
              </p>
              <p className="mt-2.5 text-sm leading-relaxed text-white/60">
                {meta.blurb}
              </p>
            </section>
          )}

          {/* sort toggle */}
          <div className="mt-6 flex items-center justify-between gap-3">
            <div
              role="group"
              aria-label="Sort tools"
              className="flex items-center gap-2"
            >
              {(["featured", "top-rated", "newest"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSort(s)}
                  aria-pressed={sort === s}
                  className={cn(
                    "rounded-full border px-3 py-1 font-mono text-sm tracking-[0.2em] uppercase transition-colors",
                    sort === s
                      ? "border-ember bg-ember/10 text-ember"
                      : "border-white/10 text-white/50 hover:border-white/25 hover:text-white/80"
                  )}
                >
                  {s === "featured" ? "Featured" : s === "top-rated" ? "Top rated" : "Newest"}
                </button>
              ))}
            </div>
            <p className="font-mono text-xs tracking-[0.2em] text-white/55 uppercase">
              Sorted by {sort === "featured" ? "editorial picks" : sort === "top-rated" ? "review rating" : "recency"}
            </p>
          </div>

          {/* tool grid */}
          <ul
            role="list"
            aria-label={`Tools in ${meta.name}`}
            className="mt-4 grid gap-3 sm:grid-cols-2"
          >
            {rows.map((row, i) => (
              <li key={row.slug}>
                <button
                  type="button"
                  onClick={() => openTool(row.slug)}
                  aria-label={`View ${row.name} details`}
                  className="flex h-full w-full flex-col rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left transition hover:border-ember/40 hover:bg-white/5"
                >
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-lg shadow-inner",
                        row.gradient || "from-white/10 to-white/5"
                      )}
                    >
                      {row.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-white">
                        <span aria-hidden className="mr-1.5 font-mono text-xs text-white/55">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {row.name}
                      </span>
                    </span>
                  </span>
                  <span className="mt-2 line-clamp-2 text-xs leading-relaxed text-white/60">
                    {row.tagline}
                  </span>
                  <span className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 font-mono text-xs tracking-wider text-white/60 uppercase">
                    {row.editorsPick && (
                      <span className="inline-flex items-center gap-1 text-ember">
                        <Star className="size-3" fill="currentColor" aria-hidden />
                        Editor&apos;s Pick
                      </span>
                    )}
                    {row.reviews.count > 0 && (
                      <span className="inline-flex items-center gap-1 text-ember">
                        <Star className="size-3" aria-hidden />
                        {row.reviews.count}
                      </span>
                    )}
                    {isNewListing(row.listedAt) && (
                      <span className="rounded border border-mint/30 bg-mint/10 px-1.5 py-0.5 text-mint">
                        New
                      </span>
                    )}
                    <span aria-hidden className="text-white/55">
                      ·
                    </span>
                    <span className="rounded border border-white/10 px-1.5 py-0.5 text-white/55">
                      {pricingLabel(row)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </FullPageShell>
  );
}
