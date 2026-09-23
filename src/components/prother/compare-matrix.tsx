"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { CompareMatrix, CompareMatrixTool } from "@/lib/compare";

/**
 * Client half of /compare (Task 32): category picker, tool chips, and the
 * feature matrix. Data comes from GET /api/compare/matrix; the server page
 * passes an SSR-built matrix for first paint. URL state (?category=&tools=)
 * is synced with history.replaceState — no navigation, no scroll jump.
 *
 * MAX_TOOLS mirrors MAX_COMPARE_TOOLS in lib/compare. It is redeclared here
 * (and lib/compare is imported type-only) because a runtime import would pull
 * the Prisma client into the browser bundle.
 */
const MAX_TOOLS = 4;

type CategoryOption = { slug: string; name: string; emoji: string; toolCount: number };

type CompareMatrixViewProps = {
  categories: CategoryOption[];
  initialMatrix: CompareMatrix | null;
  initialCategory: string;
  initialTools: string[];
};

function pricingLabel(model: string, price: string | null): string {
  const base = model.replace(/_/g, " ");
  return price ? `${base} · ${price}` : base;
}

/** Address-bar sync without navigation (replace: no history entry, no scroll). */
function applyUrl(category: string, tools: string[]): void {
  const params = new URLSearchParams();
  params.set("category", category);
  if (tools.length > 0) params.set("tools", tools.join(","));
  window.history.replaceState(null, "", `/compare?${params.toString()}`);
}

/** Case-insensitive, trim-normalized feature value for diff detection. */
function normValue(v: string | undefined): string {
  return (v ?? "").trim().toLowerCase();
}

// ── Table atoms ───────────────────────────────────────────────────────────

function Row({ label, cells }: { label: React.ReactNode; cells: React.ReactNode[] }) {
  return (
    <tr className="border-t border-white/10">
      <th
        scope="row"
        className="sticky left-0 z-10 border-r border-white/10 bg-ink p-4 text-left align-top font-mono text-xs font-medium uppercase tracking-wider text-white/60"
      >
        {label}
      </th>
      {cells.map((cell, i) => (
        <td key={i} className="p-4 align-top text-sm text-white/80">
          {cell}
        </td>
      ))}
    </tr>
  );
}

/** No-data glyph (the one allowed dash: a placeholder, not punctuation). */
function MissingValue({ title }: { title: string }) {
  return (
    <span className="text-white/40" title={title}>
      —
    </span>
  );
}

function MatrixSkeleton() {
  return (
    <div>
      <p className="sr-only" role="status">
        Loading comparison
      </p>
      <div
        aria-hidden="true"
        className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
      >
        <div className="flex gap-4 border-b border-white/10 p-4">
          <Skeleton className="h-10 w-24 shrink-0" />
          <Skeleton className="h-16 w-40 shrink-0" />
          <Skeleton className="h-16 w-40 shrink-0" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 border-b border-white/10 p-4 last:border-b-0">
            <Skeleton className="h-4 w-20 shrink-0" />
            <Skeleton className="h-4 w-36 shrink-0" />
            <Skeleton className="h-4 w-36 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────

export function CompareMatrixView({
  categories,
  initialMatrix,
  initialCategory,
  initialTools,
}: CompareMatrixViewProps) {
  const [category, setCategory] = useState(initialCategory);
  const [selected, setSelected] = useState<string[]>(() => initialTools.slice(0, MAX_TOOLS));
  const [matrix, setMatrix] = useState<CompareMatrix | null>(initialMatrix);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [diffOnly, setDiffOnly] = useState(false);

  // Refs mirror category/selection so async continuations read fresh values
  // without re-creating callbacks (all state writes stay in handlers).
  const categoryRef = useRef(initialCategory);
  const selectedRef = useRef(selected);
  const abortRef = useRef<AbortController | null>(null);
  const genRef = useRef(0);

  // Halt any in-flight request on unmount (DOM-only cleanup).
  useEffect(() => () => abortRef.current?.abort(), []);

  // First-visit URL sync: the server may have auto-selected the top 2 tools;
  // mirror that into the address bar once (replace, not push, no scroll).
  const urlSyncedRef = useRef(false);
  useEffect(() => {
    if (urlSyncedRef.current) return;
    urlSyncedRef.current = true;
    if (!initialCategory) return;
    const current = new URLSearchParams(window.location.search);
    if ((current.get("tools") ?? "").trim() !== "") return;
    const resolved = initialMatrix?.tools.map((t) => t.slug) ?? [];
    if (resolved.length > 0) applyUrl(initialCategory, resolved);
  }, [initialCategory, initialMatrix]);

  const commitSelection = useCallback((next: string[]) => {
    selectedRef.current = next;
    setSelected(next);
  }, []);

  /** Fetch a matrix; returns it so callers can auto-select from `options`. */
  const fetchMatrix = useCallback(
    async (catSlug: string, toolSlugs: string[]): Promise<CompareMatrix | null> => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      const gen = ++genRef.current;
      setLoading(true);
      setFailed(false);
      const params = new URLSearchParams();
      params.set("category", catSlug);
      if (toolSlugs.length > 0) params.set("tools", toolSlugs.join(","));
      try {
        const res = await fetch(`/api/compare/matrix?${params.toString()}`, {
          signal: ac.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as CompareMatrix;
        if (gen !== genRef.current) return null;
        setMatrix(data);
        return data;
      } catch {
        if (gen !== genRef.current || ac.signal.aborted) return null;
        setFailed(true);
        return null;
      } finally {
        if (gen === genRef.current) setLoading(false);
      }
    },
    []
  );

  const onCategoryChange = useCallback(
    async (slug: string) => {
      categoryRef.current = slug;
      setCategory(slug);
      commitSelection([]);
      setDiffOnly(false);
      const data = await fetchMatrix(slug, []);
      if (!data || categoryRef.current !== slug) return;
      // Make the first pick instantly useful: feature the top 2 options.
      if (selectedRef.current.length === 0 && data.options.length >= 2) {
        const auto = data.options.slice(0, 2).map((o) => o.slug);
        commitSelection(auto);
        applyUrl(slug, auto);
        await fetchMatrix(slug, auto);
      }
    },
    [commitSelection, fetchMatrix]
  );

  const toggleTool = useCallback(
    (slug: string) => {
      const cat = categoryRef.current;
      if (!cat) return;
      const current = selectedRef.current;
      const next = current.includes(slug)
        ? current.filter((s) => s !== slug)
        : current.length >= MAX_TOOLS
          ? current
          : [...current, slug];
      if (next === current) return;
      commitSelection(next);
      applyUrl(cat, next);
      void fetchMatrix(cat, next);
    },
    [commitSelection, fetchMatrix]
  );

  const compareTopPicks = useCallback(() => {
    const cat = categoryRef.current;
    if (!cat || !matrix || matrix.category.slug !== cat) return;
    const auto = matrix.options.slice(0, 2).map((o) => o.slug);
    if (auto.length < 2) return;
    commitSelection(auto);
    applyUrl(cat, auto);
    void fetchMatrix(cat, auto);
  }, [matrix, commitSelection, fetchMatrix]);

  const retry = useCallback(() => {
    const cat = categoryRef.current;
    if (!cat) return;
    void fetchMatrix(cat, selectedRef.current);
  }, [fetchMatrix]);

  // Derived render state. matrixForCategory guards against showing the
  // previous category's chips/rows while a category switch is in flight.
  const matrixForCategory = matrix && matrix.category.slug === category ? matrix : null;
  const options = matrixForCategory?.options ?? [];
  const tools = matrixForCategory?.tools ?? [];
  const axes = matrixForCategory?.category.features ?? [];

  const axisDiffers = new Map<string, boolean>();
  for (const axis of axes) {
    axisDiffers.set(axis, new Set(tools.map((t) => normValue(t.features[axis]))).size > 1);
  }
  const visibleAxes = diffOnly ? axes.filter((a) => axisDiffers.get(a)) : axes;

  // "LEADS" badge: exactly one tool strictly holds the top overall rating
  // (only meaningful when at least two tools are rated).
  const ratedOveralls = tools
    .filter((t) => t.rating != null)
    .map((t) => t.rating!.overall);
  const topOverall = ratedOveralls.length >= 2 ? Math.max(...ratedOveralls) : null;
  const leadCount =
    topOverall != null ? ratedOveralls.filter((v) => v === topOverall).length : 0;
  const leads = (t: CompareMatrixTool): boolean =>
    topOverall != null &&
    leadCount === 1 &&
    t.rating != null &&
    t.rating.overall === topOverall;

  return (
    <section aria-label="Feature comparison" className="space-y-6">
      {/* Picker panel: category select, counter, tool chips */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="w-full max-w-sm">
            <label
              htmlFor="compare-category"
              className="font-mono text-xs uppercase tracking-[0.25em] text-white/60"
            >
              Category
            </label>
            <Select value={category} onValueChange={(v) => void onCategoryChange(v)}>
              <SelectTrigger
                id="compare-category"
                aria-label="Category"
                className="mt-2 h-11 w-full border-white/15 bg-white/5 text-sm text-white data-[placeholder]:text-white/60"
              >
                <SelectValue placeholder="Pick a category" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-coal text-white">
                {categories.map((c) => (
                  <SelectItem
                    key={c.slug}
                    value={c.slug}
                    className="text-sm text-white/80 focus:bg-white/10 focus:text-white"
                  >
                    <span aria-hidden className="mr-1">
                      {c.emoji}
                    </span>
                    {c.name}
                    <span className="ml-1 font-mono text-xs text-white/55">
                      ({c.toolCount})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {category !== "" && (
            <p
              aria-live="polite"
              className="shrink-0 font-mono text-xs uppercase tracking-[0.2em] text-white/60 sm:pt-1"
            >
              {selected.length} of {MAX_TOOLS} selected
            </p>
          )}
        </div>

        {!category && (
          <p className="mt-4 text-sm text-white/60">
            Pick a category to start a comparison.
          </p>
        )}

        {category && (loading || !matrixForCategory) && (
          <div className="mt-4 flex flex-wrap gap-2" aria-hidden="true">
            {["w-28", "w-36", "w-24", "w-32", "w-28"].map((w, i) => (
              <Skeleton key={i} className={cn("h-11 rounded-full", w)} />
            ))}
          </div>
        )}

        {category && matrixForCategory && options.length > 0 && (
          <div role="group" aria-label="Tools to compare" className="mt-4 flex flex-wrap gap-2">
            {options.map((o) => {
              const active = selected.includes(o.slug);
              const capped = !active && selected.length >= MAX_TOOLS;
              return (
                <button
                  key={o.slug}
                  type="button"
                  onClick={() => toggleTool(o.slug)}
                  aria-pressed={active}
                  disabled={capped}
                  title={capped ? `Up to ${MAX_TOOLS} tools can be compared` : o.tagline}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm transition-colors",
                    active
                      ? "border-ember/60 bg-ember/10 text-white"
                      : "border-white/15 bg-white/[0.03] text-white/70 hover:border-white/30",
                    capped && "cursor-not-allowed opacity-40 hover:border-white/15"
                  )}
                >
                  <span aria-hidden>{o.emoji}</span>
                  <span className="font-medium">{o.name}</span>
                  {o.editorsPick && (
                    <Star className="size-3.5 fill-ember text-ember" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {category && matrixForCategory && options.length === 0 && (
          <p className="mt-4 text-sm text-white/60">No live tools in this category yet.</p>
        )}
      </div>

      {/* Body: error / skeleton / not-enough-tools / matrix */}
      {category === "" ? null : failed ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-red-500/25 bg-red-500/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-red-300">
            Couldn&apos;t load the comparison data. Check your connection and try
            again.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={retry}
            className="h-11 shrink-0 border-white/20 bg-transparent text-sm text-white hover:bg-white/10 hover:text-white"
          >
            Retry
          </Button>
        </div>
      ) : !matrixForCategory ? (
        loading ? (
          <MatrixSkeleton />
        ) : null
      ) : loading && tools.length < 2 ? (
        <MatrixSkeleton />
      ) : tools.length < 2 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
          <p className="font-mono text-sm uppercase tracking-[0.2em] text-white/60">
            Select at least 2 tools to compare
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
            Tap the tool chips above, or start with the top of this category.
          </p>
          {options.length >= 2 && (
            <Button
              type="button"
              onClick={compareTopPicks}
              className="mt-5 h-11 rounded-full bg-ember px-6 font-mono text-sm font-bold uppercase tracking-[0.15em] text-coal shadow-none hover:bg-ember-hot"
            >
              Compare top picks
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Table toolbar: counts + diff toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/60">
              {tools.length} {tools.length === 1 ? "tool" : "tools"} · {axes.length}{" "}
              {axes.length === 1 ? "feature" : "features"}
            </p>
            <label
              htmlFor="diff-only"
              className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-white/70"
            >
              <Switch
                id="diff-only"
                checked={diffOnly}
                onCheckedChange={setDiffOnly}
                aria-label="Show only rows where the selected tools differ"
                className="data-[state=checked]:bg-ember data-[state=unchecked]:bg-white/15"
              />
              Only differences
            </label>
          </div>

          {/* Matrix table (horizontal scroll; sticky feature column) */}
          <div
            className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]"
            aria-busy={loading}
          >
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">
                Feature comparison of {tools.map((t) => t.name).join(", ")}
              </caption>
              <thead>
                <tr className="border-b border-white/10">
                  <th
                    scope="col"
                    className="sticky left-0 z-10 min-w-[140px] border-r border-white/10 bg-ink p-4 text-left font-mono text-xs font-medium uppercase tracking-wider text-white/60"
                  >
                    Feature
                  </th>
                  {tools.map((t) => (
                    <th
                      key={t.slug}
                      scope="col"
                      className="min-w-[190px] p-4 text-left align-top font-normal"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          aria-hidden
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xl",
                            t.gradient
                          )}
                        >
                          {t.emoji}
                        </span>
                        <div className="min-w-0">
                          <Link
                            href={`/tools/${t.slug}`}
                            className="text-sm font-bold text-white hover:text-ember"
                          >
                            {t.name}
                          </Link>
                          <p className="mt-0.5 line-clamp-2 text-xs text-white/55">
                            {t.tagline}
                          </p>
                        </div>
                      </div>
                      <p className="mt-2 font-mono text-xs text-white/60">
                        {pricingLabel(t.pricing.model, t.pricing.price)}
                      </p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <Row
                  label="Pricing"
                  cells={tools.map((t) => (
                    <span
                      key={t.slug}
                      className="font-mono text-sm text-white/80"
                      title={t.pricing.note ?? undefined}
                    >
                      {pricingLabel(t.pricing.model, t.pricing.price)}
                    </span>
                  ))}
                />
                <Row
                  label="Rating"
                  cells={tools.map((t) =>
                    t.rating ? (
                      <span
                        key={t.slug}
                        className={cn(
                          "inline-flex flex-wrap items-center gap-1.5",
                          leads(t) && "font-bold"
                        )}
                      >
                        <Star className="size-3.5 fill-ember text-ember" aria-hidden />
                        <span className="tabular-nums">{t.rating.overall.toFixed(1)}/5</span>
                        {leads(t) && (
                          <span className="rounded border border-ember/40 bg-ember/10 px-1.5 py-0.5 font-mono text-xs font-medium tracking-wider text-ember">
                            Leads
                          </span>
                        )}
                      </span>
                    ) : (
                      <span key={t.slug} className="text-white/55">
                        Unrated
                        {t.reviewCount > 0
                          ? ` · ${t.reviewCount} ${t.reviewCount === 1 ? "review" : "reviews"}`
                          : ""}
                      </span>
                    )
                  )}
                />
                <Row
                  label="Reviews"
                  cells={tools.map((t) =>
                    t.reviewCount > 0 ? (
                      <span key={t.slug} className="tabular-nums">
                        {t.reviewCount}
                      </span>
                    ) : (
                      <MissingValue key={t.slug} title="No reviews yet" />
                    )
                  )}
                />
                <Row
                  label="API access"
                  cells={tools.map((t) =>
                    t.hasApi ? (
                      <span key={t.slug} className="text-emerald-400" title="Offers an API">
                        ✓
                      </span>
                    ) : (
                      <MissingValue key={t.slug} title="No public API" />
                    )
                  )}
                />
                {axes.length === 0 ? (
                  <tr className="border-t border-white/10">
                    <td colSpan={tools.length + 1} className="p-4 text-sm text-white/60">
                      This category doesn&apos;t have feature rows yet. The universal
                      rows above still apply.
                    </td>
                  </tr>
                ) : visibleAxes.length === 0 ? (
                  <tr className="border-t border-white/10">
                    <td colSpan={tools.length + 1} className="p-4 text-sm text-white/60">
                      These tools match on every listed feature. Turn off &quot;Only
                      differences&quot; to see the full matrix.
                    </td>
                  </tr>
                ) : (
                  visibleAxes.map((axis) => (
                    <Row
                      key={axis}
                      label={
                        <span className="flex items-center gap-2">
                          {axisDiffers.get(axis) && (
                            <span
                              aria-hidden
                              title="Tools differ here"
                              className="size-1.5 shrink-0 rounded-full bg-ember"
                            />
                          )}
                          {axis}
                        </span>
                      }
                      cells={tools.map((t) => {
                        const value = t.features[axis]?.trim();
                        return value ? (
                          <span key={t.slug} className="text-white/80">
                            {value}
                          </span>
                        ) : (
                          <MissingValue key={t.slug} title="Not provided by the listing yet" />
                        );
                      })}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="font-mono text-xs text-white/55">
            Missing values are shown as a dash. Makers can enrich their listing at
            any time: <Link href="/submit" className="text-ember hover:underline">submit a tool</Link>.
          </p>
        </>
      )}
    </section>
  );
}
