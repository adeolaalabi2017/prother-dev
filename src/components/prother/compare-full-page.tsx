"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, FileText, Github, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { FullPageShell, PageSkeleton } from "./page-shell";
import { useExplorer } from "./explorer-store";

// ── Types (per the compare API contract) ──────────────────────────────────

type CompareRow = {
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
  /** Aggregate object (unlocks at ≥3 published reviews) — see /api/compare. */
  rating: { count: number; ease: number; power: number; value: number; overall: number } | null;
  reviewCount: number;
  comments: number;
  verified: boolean;
  claimed: boolean;
  hasApi: boolean;
  track: string;
  maker: string;
};

type PopularPair = {
  aSlug: string;
  bSlug: string;
  views: number;
  aName: string;
  aEmoji: string;
  bName: string;
  bEmoji: string;
};

type CompareResponse = {
  a: CompareRow;
  b: CompareRow;
  popular?: PopularPair[];
};

type DirectoryRow = {
  slug: string;
  name: string;
  tagline: string;
  emoji: string;
  gradient: string;
  editorsPick?: boolean;
};

const MONO = "font-mono text-xs uppercase tracking-[0.25em] text-white/60";
const PRICING_LABEL: Record<string, string> = {
  free: "Free",
  freemium: "Freemium",
  paid: "Paid",
  open_source: "Open Source",
};

// ── Tool picker combobox ──────────────────────────────────────────────────

function ToolPicker({
  label,
  current,
  excludeSlug,
  rows,
  onPick,
  onClear,
}: {
  label: string;
  current: DirectoryRow | null;
  excludeSlug: string | null;
  rows: DirectoryRow[];
  onPick: (slug: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => r.slug !== excludeSlug)
      .filter(
        (r) =>
          needle === "" ||
          r.name.toLowerCase().includes(needle) ||
          r.slug.includes(needle) ||
          r.tagline.toLowerCase().includes(needle)
      )
      .slice(0, 40);
  }, [rows, excludeSlug, q]);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className={cn(MONO, "w-14 shrink-0")}>{label}</span>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setQ("");
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={current ? `Change tool ${label}` : `Pick tool for ${label}`}
            className={cn(
              "flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl border px-3 text-left transition-colors",
              current
                ? "border-white/10 bg-white/[0.02] hover:border-ember/40"
                : "border-dashed border-white/20 text-white/60 hover:border-ember/40 hover:text-white/70"
            )}
          >
            {current ? (
              <>
                <span
                  aria-hidden
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-md bg-gradient-to-br text-sm",
                    current.gradient
                  )}
                >
                  {current.emoji}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white/90">
                  {current.name}
                </span>
              </>
            ) : (
              <span className="flex items-center gap-2 text-sm">
                <Search className="size-4" aria-hidden /> Pick a tool…
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={8}
          className="w-80 border-white/10 bg-coal p-0 text-white"
          aria-label={`Choose ${label}`}
        >
          <div className="border-b border-white/10 p-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value.slice(0, 60))}
              placeholder="Filter tools…"
              aria-label={`Filter tools for ${label}`}
              className="h-9 border-white/10 bg-transparent text-sm focus-visible:border-ember/50 focus-visible:ring-0"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1.5">
            {filtered.map((r) => (
              <button
                key={r.slug}
                type="button"
                onClick={() => {
                  onPick(r.slug);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-ember/10"
              >
                <span
                  aria-hidden
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-md bg-gradient-to-br text-sm",
                    r.gradient
                  )}
                >
                  {r.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white/90">{r.name}</span>
                  <span className="block truncate text-xs text-white/60">{r.tagline}</span>
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-white/60">
                No tools match “{q}”.
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {current && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Clear ${label}`}
          onClick={onClear}
          className="bg-white/[0.03] hover:bg-white/[0.08] size-11 shrink-0 border-white/10 text-white/50 hover:border-ember/40 hover:text-white"
        >
          <X className="size-4" aria-hidden />
        </Button>
      )}
    </div>
  );
}

// ── Metric row ────────────────────────────────────────────────────────────

function MetricRow({
  label,
  a,
  b,
}: {
  label: string;
  a: React.ReactNode;
  b: React.ReactNode;
}) {
  return (
    <div className="grid gap-2 border-b border-white/[0.06] py-3 last:border-0 lg:grid-cols-[110px_minmax(0,1fr)_minmax(0,1fr)] lg:gap-4">
      <div className={cn(MONO, "lg:pt-0.5")}>{label}</div>
      <div className="flex min-w-0 items-center gap-2 text-sm text-white/85">
        <span className="shrink-0 font-mono text-xs text-white/55 lg:hidden">A</span>
        <span className="min-w-0">{a}</span>
      </div>
      <div className="flex min-w-0 items-center gap-2 text-sm text-white/85">
        <span className="shrink-0 font-mono text-xs text-white/55 lg:hidden">B</span>
        <span className="min-w-0">{b}</span>
      </div>
    </div>
  );
}

function MiniBar({ value }: { value: number }) {
  return (
    <span className="inline-flex min-w-0 flex-1 items-center gap-2">
      <span className="h-1.5 min-w-16 max-w-40 flex-1 overflow-hidden rounded-full bg-white/10">
        <span
          className="block h-full rounded-full bg-ember"
          style={{ width: `${Math.max(4, Math.min(100, (value / 5) * 100))}%` }}
        />
      </span>
      <span className="font-mono text-xs tabular-nums text-white/60">
        {value.toFixed(1)}
      </span>
    </span>
  );
}

function YesNo({ yes, yesLabel = "YES" }: { yes: boolean; yesLabel?: string }) {
  return yes ? (
    <span className="text-mint">✓ {yesLabel}</span>
  ) : (
    <span className="text-white/55">✗</span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export function CompareFullPage() {
  const compareOpen = useExplorer((s) => s.compareOpen);
  const compare = useExplorer((s) => s.compare);
  const closeCompare = useExplorer((s) => s.closeCompare);
  const openCompare = useExplorer((s) => s.openCompare);
  const addCompare = useExplorer((s) => s.addCompare);
  const removeCompare = useExplorer((s) => s.removeCompare);
  const openCategory = useExplorer((s) => s.openCategory);

  const [rows, setRows] = useState<DirectoryRow[]>([]);
  const [directoryLoaded, setDirectoryLoaded] = useState(false);
  const [data, setData] = useState<CompareResponse | null>(null);
  /** Slug pair the stored head-to-head data was fetched for — guards staleness. */
  const [dataPair, setDataPair] = useState<string[]>([]);
  const [popular, setPopular] = useState<PopularPair[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState(false);

  const a = compare[0] ?? null;
  const b = compare[1] ?? null;

  // Directory list powers both pickers (client-side filtering).
  useEffect(() => {
    if (!compareOpen || directoryLoaded) return;
    let alive = true;
    fetch("/api/tools?pageSize=60")
      .then(async (res) => {
        if (!res.ok) throw new Error("failed");
        return (await res.json()) as { rows: DirectoryRow[] };
      })
      .then((json) => {
        if (!alive) return;
        setRows(json.rows ?? []);
        setDirectoryLoaded(true);
      })
      .catch(() => {
        /* pickers stay empty; the page still renders chips/slugs */
        if (alive) setDirectoryLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [compareOpen, directoryLoaded]);

  // Head-to-head data (only when both slugs are chosen).
  const loadPair = useCallback(async (aSlug: string, bSlug: string) => {
    setLoading(true);
    setLoadErr(false);
    try {
      const res = await fetch(
        `/api/compare?a=${encodeURIComponent(aSlug)}&b=${encodeURIComponent(bSlug)}`
      );
      if (!res.ok) throw new Error("failed");
      const json = (await res.json()) as CompareResponse;
      setData(json);
      setDataPair([aSlug, bSlug]);
      setPopular(json.popular ?? []);
    } catch {
      setLoadErr(true);
      setData(null);
      setDataPair([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!compareOpen || !a || !b) return;
    // Stale responses are harmless: rendering is guarded by dataPair.
    void loadPair(a, b);
  }, [compareOpen, a, b, loadPair]);

  // Popular strip for the picker view (when no head-to-head yet).
  useEffect(() => {
    if (!compareOpen || (a && b)) return;
    let alive = true;
    fetch("/api/compare?popular=1")
      .then(async (res) => {
        if (!res.ok) throw new Error("failed");
        return (await res.json()) as { popular: PopularPair[] };
      })
      .then((json) => {
        if (alive) setPopular(json.popular ?? []);
      })
      .catch(() => {
        /* strip is optional */
      });
    return () => {
      alive = false;
    };
  }, [compareOpen, a, b]);

  const rowOf = useCallback(
    (slug: string | null) => rows.find((r) => r.slug === slug) ?? null,
    [rows]
  );

  /** Head-to-head data matches the currently selected pair. */
  const dataValid =
    !!data && dataPair.length === 2 && dataPair[0] === a && dataPair[1] === b;

  const pickA = useCallback(
    (slug: string) => {
      if (b) openCompare(slug, b);
      else {
        if (a) removeCompare(a);
        addCompare(slug);
      }
    },
    [a, b, openCompare, removeCompare, addCompare]
  );

  const pickB = useCallback(
    (slug: string) => {
      if (a) openCompare(a, slug);
      else addCompare(slug);
    },
    [a, openCompare, addCompare]
  );

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/?compare=${encodeURIComponent(a ?? "")},${encodeURIComponent(b ?? "")}`
      : `/?compare=${encodeURIComponent(a ?? "")},${encodeURIComponent(b ?? "")}`;

  const verdict = useMemo(() => {
    if (!dataValid) return null;
    const a = data!.a.rating;
    const b = data!.b.rating;
    // No vote winner — the honest verdict is the review aggregate (when both
    // tools have one). Otherwise no banner; the table below does the talking.
    if (!a || !b) return null;
    const diff = Math.round((a.overall - b.overall) * 10) / 10;
    if (diff === 0) return "EVEN ON REVIEW RATING";
    const winner = diff > 0 ? data!.a.name : data!.b.name;
    return `${winner.toUpperCase()} LEADS · BY REVIEW RATING (+${Math.abs(diff).toFixed(1)})`;
  }, [data, dataValid]);

  if (!compareOpen) return null;

  const rowA = dataValid ? data!.a : null;
  const rowB = dataValid ? data!.b : null;
  const hasPair = !!a && !!b;

  return (
    <FullPageShell
      kicker="Side-by-side"
      breadcrumb={[{ label: "Home" }, { label: "Compare" }]}
      onClose={closeCompare}
      shareUrl={hasPair ? shareUrl : undefined}
      wide
      ariaLabel="Compare tools side by side"
    >
      <div className="space-y-8">
        {/* Pickers */}
        <section aria-label="Choose tools to compare" className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <ToolPicker
              label="TOOL A"
              current={rowOf(a)}
              excludeSlug={b}
              rows={rows}
              onPick={pickA}
              onClear={() => a && removeCompare(a)}
            />
            <ToolPicker
              label="TOOL B"
              current={rowOf(b)}
              excludeSlug={a}
              rows={rows}
              onPick={pickB}
              onClear={() => b && removeCompare(b)}
            />
          </div>
          {!hasPair && (
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/60">
              {a || b
                ? "Pick the second tool to unlock the side-by-side."
                : "Pick two tools to compare, or start from a popular matchup below."}
            </p>
          )}
        </section>

        {/* Loading */}
        {hasPair && loading && <PageSkeleton />}

        {/* Load failure — pickers stay usable */}
        {hasPair && !loading && (loadErr || !rowA || !rowB) && (
          <p className="rounded-xl border border-red-500/25 bg-red-500/[0.04] p-4 text-sm text-red-300">
            Couldn&apos;t load the comparison for this pair. Try different tools.
          </p>
        )}

        {/* Comparison grid */}
        {hasPair && !loading && rowA && rowB && (
          <section aria-label="Comparison" className="space-y-6">
            {/* Header cards */}
            <div className="grid gap-4 sm:grid-cols-2">
              {[rowA, rowB].map((r, i) => (
                <div
                  key={r.slug}
                  className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-ember/40"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-3xl",
                      r.gradient
                    )}
                  >
                    {r.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-xl font-black text-white">{r.name}</h2>
                      <span className="shrink-0 rounded-full border border-white/15 px-1.5 py-px font-mono text-xs tracking-wider text-white/50">
                        {i === 0 ? "TOOL A" : "TOOL B"}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-white/55">{r.tagline}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-ember/10 px-3 py-1.5 font-mono text-sm font-black tabular-nums text-ember">
                    {r.rating != null ? (
                      <>★ {r.rating.overall.toFixed(1)}/5</>
                    ) : (
                      <>{r.reviewCount} reviews</>
                    )}
                  </span>
                </div>
              ))}
            </div>

            {/* Auto-verdict */}
            {verdict && (
              <p className="text-center font-mono text-xs uppercase tracking-[0.25em] text-white/50" aria-live="polite">
                {verdict}
              </p>
            )}

            {/* Metric table */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-1 sm:px-5">
              <MetricRow
                label="Rating"
                a={
                  rowA.rating != null ? (
                    <span className="tabular-nums">
                      {rowA.rating.overall.toFixed(1)}{" "}
                      <span className="font-mono text-xs text-white/60">({rowA.rating.count})</span>
                    </span>
                  ) : (
                    <span className="font-mono text-xs text-white/60">
                      UNRATED · {rowA.reviewCount} reviews
                    </span>
                  )
                }
                b={
                  rowB.rating != null ? (
                    <span className="tabular-nums">
                      {rowB.rating.overall.toFixed(1)}{" "}
                      <span className="font-mono text-xs text-white/60">({rowB.rating.count})</span>
                    </span>
                  ) : (
                    <span className="font-mono text-xs text-white/60">
                      UNRATED · {rowB.reviewCount} reviews
                    </span>
                  )
                }
              />
              {rowA.rating?.ease != null && rowB.rating?.ease != null && (
                <MetricRow label="Ease" a={<MiniBar value={rowA.rating.ease} />} b={<MiniBar value={rowB.rating.ease} />} />
              )}
              {rowA.rating?.power != null && rowB.rating?.power != null && (
                <MetricRow label="Power" a={<MiniBar value={rowA.rating.power} />} b={<MiniBar value={rowB.rating.power} />} />
              )}
              {rowA.rating?.value != null && rowB.rating?.value != null && (
                <MetricRow label="Value" a={<MiniBar value={rowA.rating.value} />} b={<MiniBar value={rowB.rating.value} />} />
              )}
              <MetricRow
                label="Pricing"
                a={
                  <span>
                    <span className="font-semibold text-white">
                      {PRICING_LABEL[rowA.pricing.model] ?? "Free"}
                    </span>
                    {rowA.pricing.price && (
                      <span className="ml-1.5 font-mono text-xs text-ember">{rowA.pricing.price}</span>
                    )}
                  </span>
                }
                b={
                  <span>
                    <span className="font-semibold text-white">
                      {PRICING_LABEL[rowB.pricing.model] ?? "Free"}
                    </span>
                    {rowB.pricing.price && (
                      <span className="ml-1.5 font-mono text-xs text-ember">{rowB.pricing.price}</span>
                    )}
                  </span>
                }
              />
              <MetricRow label="API" a={<YesNo yes={rowA.hasApi} yesLabel="AVAILABLE" />} b={<YesNo yes={rowB.hasApi} yesLabel="AVAILABLE" />} />
              <MetricRow label="Open source" a={<YesNo yes={rowA.pricing.model === "open_source"} />} b={<YesNo yes={rowB.pricing.model === "open_source"} />} />
              <MetricRow
                label="Category"
                a={
                  <button
                    type="button"
                    onClick={() => openCategory(rowA.category.slug)}
                    aria-label={`Browse the ${rowA.category.name} category`}
                    className="text-left transition-colors hover:text-ember"
                  >
                    {rowA.category.emoji} {rowA.category.name}
                  </button>
                }
                b={
                  <button
                    type="button"
                    onClick={() => openCategory(rowB.category.slug)}
                    aria-label={`Browse the ${rowB.category.name} category`}
                    className="text-left transition-colors hover:text-ember"
                  >
                    {rowB.category.emoji} {rowB.category.name}
                  </button>
                }
              />
              <MetricRow label="Comments" a={<span className="tabular-nums">{rowA.comments}</span>} b={<span className="tabular-nums">{rowB.comments}</span>} />
              <MetricRow
                label="Maker"
                a={<span className="text-ember">{rowA.maker}</span>}
                b={<span className="text-ember">{rowB.maker}</span>}
              />
              <MetricRow
                label="Links"
                a={
                  <span className="flex items-center gap-1.5">
                    <Button asChild variant="outline" size="icon" className="bg-white/[0.03] hover:bg-white/[0.08] size-9 border-white/10 text-white/70 hover:border-ember/40 hover:text-ember">
                      <a href={rowA.websiteUrl} target="_blank" rel="noopener noreferrer" aria-label={`${rowA.name} website`}>
                        <ExternalLink className="size-3.5" aria-hidden />
                      </a>
                    </Button>
                    {rowA.links.github && (
                      <Button asChild variant="outline" size="icon" className="bg-white/[0.03] hover:bg-white/[0.08] size-9 border-white/10 text-white/70 hover:border-ember/40 hover:text-ember">
                        <a href={rowA.links.github} target="_blank" rel="noopener noreferrer" aria-label={`${rowA.name} on GitHub`}>
                          <Github className="size-3.5" aria-hidden />
                        </a>
                      </Button>
                    )}
                    {rowA.links.docs && (
                      <Button asChild variant="outline" size="icon" className="bg-white/[0.03] hover:bg-white/[0.08] size-9 border-white/10 text-white/70 hover:border-ember/40 hover:text-ember">
                        <a href={rowA.links.docs} target="_blank" rel="noopener noreferrer" aria-label={`${rowA.name} documentation`}>
                          <FileText className="size-3.5" aria-hidden />
                        </a>
                      </Button>
                    )}
                  </span>
                }
                b={
                  <span className="flex items-center gap-1.5">
                    <Button asChild variant="outline" size="icon" className="bg-white/[0.03] hover:bg-white/[0.08] size-9 border-white/10 text-white/70 hover:border-ember/40 hover:text-ember">
                      <a href={rowB.websiteUrl} target="_blank" rel="noopener noreferrer" aria-label={`${rowB.name} website`}>
                        <ExternalLink className="size-3.5" aria-hidden />
                      </a>
                    </Button>
                    {rowB.links.github && (
                      <Button asChild variant="outline" size="icon" className="bg-white/[0.03] hover:bg-white/[0.08] size-9 border-white/10 text-white/70 hover:border-ember/40 hover:text-ember">
                        <a href={rowB.links.github} target="_blank" rel="noopener noreferrer" aria-label={`${rowB.name} on GitHub`}>
                          <Github className="size-3.5" aria-hidden />
                        </a>
                      </Button>
                    )}
                    {rowB.links.docs && (
                      <Button asChild variant="outline" size="icon" className="bg-white/[0.03] hover:bg-white/[0.08] size-9 border-white/10 text-white/70 hover:border-ember/40 hover:text-ember">
                        <a href={rowB.links.docs} target="_blank" rel="noopener noreferrer" aria-label={`${rowB.name} documentation`}>
                          <FileText className="size-3.5" aria-hidden />
                        </a>
                      </Button>
                    )}
                  </span>
                }
              />
              <MetricRow
                label="About"
                a={<span className="line-clamp-3 text-xs leading-relaxed text-white/55">{rowA.description ?? "—"}</span>}
                b={<span className="line-clamp-3 text-xs leading-relaxed text-white/55">{rowB.description ?? "—"}</span>}
              />
            </div>
          </section>
        )}

        {/* Popular matchups */}
        {popular.length > 0 && (
          <section aria-label="Popular comparisons" className="space-y-3">
            <h2 className={MONO}>Popular matchups</h2>
            <div className="flex flex-wrap gap-2">
              {popular.map((p) => (
                <button
                  key={`${p.aSlug}-${p.bSlug}`}
                  type="button"
                  onClick={() => openCompare(p.aSlug, p.bSlug)}
                  aria-label={`Compare ${p.aName} vs ${p.bName}, viewed ${p.views} times`}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-3.5 py-2 text-sm text-white/80 transition-colors hover:border-ember/40 hover:bg-ember/[0.05]"
                >
                  <span aria-hidden>{p.aEmoji}</span>
                  <span className="font-semibold">{p.aName}</span>
                  <span className="font-mono text-xs text-ember">VS</span>
                  <span aria-hidden>{p.bEmoji}</span>
                  <span className="font-semibold">{p.bName}</span>
                  <span className="font-mono text-xs tabular-nums text-white/55">· {p.views}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </FullPageShell>
  );
}
