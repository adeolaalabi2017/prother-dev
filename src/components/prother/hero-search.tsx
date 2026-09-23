"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  History,
  Loader2,
  Search,
  TrendingUp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "./categories";
import type { SearchResponse } from "@/app/api/search/route";

// ── Types ────────────────────────────────────────────────────────────────

type TrendRow = {
  slug: string;
  name: string;
  tagline: string;
  emoji: string;
  gradient: string;
  score: number;
  signals: { comments: number; reviews: number; saves: number };
  category?: { slug: string; name: string; emoji: string };
};

type Recent = { slug: string; name: string; emoji: string; gradient: string };

type Item =
  | {
      kind: "tool";
      slug: string;
      name: string;
      tagline: string;
      emoji: string;
      gradient: string;
      editorsPick: boolean;
      pricing: { model: string; price: string | null };
      category: { slug: string; name: string; emoji: string };
    }
  | { kind: "category"; slug: string; name: string; emoji: string; count: number }
  | {
      kind: "post";
      slug: string;
      title: string;
      excerpt: string;
      emoji: string;
      gradient: string;
      minutes: number;
    }
  | { kind: "recent"; slug: string; name: string; emoji: string; gradient: string };

type Group = { label: string; hint?: string; items: Item[]; start: number };

const RECENTS_KEY = "prother:recent-tools";
const LIST_ID = "hero-search-listbox";

/** Mono right-side chip for a tool row — honest pricing, no vote counters. */
function pricingChip(model: string, price: string | null): string {
  if (model === "paid" && price) return `FROM ${price}`;
  return model.replace(/_/g, " ").toUpperCase();
}

// ── HeroSearch ───────────────────────────────────────────────────────────

export function HeroSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<{ q: string; data: SearchResponse } | null>(null);
  const [trending, setTrending] = useState<TrendRow[]>([]);
  const [recents, setRecents] = useState<Recent[]>([]);
  const [indexCounts, setIndexCounts] = useState<{ tools: number; posts: number } | null>(null);
  const [active, setActive] = useState<{ q: string; i: number } | null>(null);
  /** Listbox max-height fitted to the space actually left below the input. */
  const [maxListH, setMaxListH] = useState(440);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const reduceMotion = useReducedMotion();

  // Recents load lazily each time the dropdown opens — fresher than an
  // effect-on-mount and avoids setState-during-effect cascades.
  const loadRecents = useCallback(() => {
    try {
      const raw = localStorage.getItem(RECENTS_KEY);
      const parsed = raw ? (JSON.parse(raw) as Recent[]) : [];
      setRecents(Array.isArray(parsed) ? parsed.slice(0, 4) : []);
    } catch {
      /* first visit / private mode — no recents */
    }
  }, []);

  // Fit the dropdown into the viewport: listbox height = space below the
  // input minus the dropdown's top gap (12) and footer bar (~30), clamped
  // to [220, 440] so tiny/short viewports still scroll internally instead
  // of clipping the box.
  const computeMaxH = useCallback(() => {
    const el = inputRef.current;
    if (!el || typeof window === "undefined") return;
    const room = window.innerHeight - el.getBoundingClientRect().bottom;
    const fitted = room - 12 - 30 - 10;
    setMaxListH(Math.max(220, Math.min(440, fitted)));
  }, []);

  const openDropdown = useCallback(() => {
    loadRecents();
    const el = inputRef.current;
    // Auto-center when there isn't room for a useful dropdown below the
    // bar (e.g. clicking it near the fold) — the native focus scroll only
    // does a minimal nearest-scroll and would clip the floating box.
    if (el && typeof window !== "undefined") {
      const room = window.innerHeight - el.getBoundingClientRect().bottom;
      if (room < 320) el.scrollIntoView({ block: "center", behavior: "instant" });
    }
    computeMaxH();
    setOpen(true);
  }, [loadRecents, computeMaxH]);

  useEffect(() => {
    let alive = true;
    fetch("/api/trending?window=week&limit=5")
      .then((r) => r.json() as Promise<{ rows?: TrendRow[] }>)
      .then((d) => {
        if (alive) setTrending(d.rows ?? []);
      })
      .catch(() => {
        /* empty state hides the trending group */
      });
    fetch("/api/search")
      .then((r) => r.json() as Promise<SearchResponse>)
      .then((d) => {
        if (alive && d.counts) setIndexCounts(d.counts);
      })
      .catch(() => {
        /* footer falls back to a static label */
      });
    return () => {
      alive = false;
    };
  }, []);

  // ── Debounced live search (180ms) ─────────────────────────────────────
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const ctrl = new AbortController();
    const t = window.setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => r.json() as Promise<SearchResponse>)
        .then((d) => setResults({ q, data: d }))
        .catch(() => {
          // Abort = a newer keystroke took over. Real failures materialize an
          // empty payload so the spinner resolves into the no-match state.
          if (!ctrl.signal.aborted) {
            setResults({
              q,
              data: { q, tools: [], categories: [], posts: [], counts: { tools: 0, posts: 0 } },
            });
          }
        });
    }, 180);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [query]);

  // Keep the fit correct if the window is resized while the dropdown is
  // open (scroll is locked, so only genuine resizes can move the input).
  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", computeMaxH);
    return () => window.removeEventListener("resize", computeMaxH);
  }, [open, computeMaxH]);

  // ── Click-outside closes the dropdown ─────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // ── Focus mode: lock page scroll while the dropdown is open ──────────
  // The blurred backdrop only makes sense if the page can't drift away
  // underneath the floating widget. Lock <html> (the real scrolling element
  // here — body-only locking proved unreliable) AND <body> (older Safari).
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const prev = { root: root.style.overflow, body: document.body.style.overflow };
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      root.style.overflow = prev.root;
      document.body.style.overflow = prev.body;
    };
  }, [open]);

  // ── "/" focuses the hero search from anywhere on the page ─────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
      e.preventDefault();
      inputRef.current?.focus();
      openDropdown();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openDropdown]);

  // ── Derived state (no stale clears — everything is computed) ──────────
  const q = query.trim();
  const shown = results && results.q === q ? results.data : null;
  const loading = q.length > 0 && shown === null;

  const groups = useMemo<Group[]>(() => {
    const out: Group[] = [];
    let start = 0;
    const push = (label: string, items: Item[], hint?: string) => {
      if (items.length === 0) return;
      out.push({ label, items, start, hint });
      start += items.length;
    };

    if (!q) {
      push(
        "Recent",
        recents.map((r) => ({ kind: "recent" as const, ...r })),
        "↩"
      );
      push(
        "Trending now",
        trending.map<Item>((t) => ({
          kind: "tool",
          slug: t.slug,
          name: t.name,
          tagline: t.tagline,
          emoji: t.emoji,
          gradient: t.gradient,
          editorsPick: false,
          pricing: { model: "", price: null },
          category: t.category ?? { slug: "", name: "", emoji: "" },
        })),
        "TOP 5"
      );
      push(
        "Browse categories",
        CATEGORIES.map<Item>((c) => ({
          kind: "category",
          slug: c.slug,
          name: c.name,
          emoji: c.emoji,
          count: 0,
        }))
      );
      return out;
    }

    if (!shown) return out;
    push(
      `AI tools${shown.tools.length ? ` · ${shown.tools.length}` : ""}`,
      shown.tools.map<Item>((t) => ({
        kind: "tool",
        slug: t.slug,
        name: t.name,
        tagline: t.tagline,
        emoji: t.emoji,
        gradient: t.gradient,
        editorsPick: t.editorsPick,
        pricing: t.pricing,
        category: t.category,
      }))
    );
    push(
      "Categories",
      shown.categories.map<Item>((c) => ({
        kind: "category",
        slug: c.slug,
        name: c.name,
        emoji: c.emoji,
        count: c.count,
      }))
    );
    push(
      "Journal",
      shown.posts.map<Item>((p) => ({
        kind: "post",
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        emoji: p.coverEmoji,
        gradient: p.coverGradient,
        minutes: p.readingMinutes,
      }))
    );
    return out;
  }, [q, shown, trending, recents]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const activeIdx = active && active.q === q && active.i < flat.length ? active.i : -1;

  // ── Actions ───────────────────────────────────────────────────────────
  const pushRecent = useCallback((r: Recent) => {
    setRecents((prev) => {
      const next = [r, ...prev.filter((p) => p.slug !== r.slug)].slice(0, 4);
      try {
        localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable — recents stay session-only */
      }
      return next;
    });
  }, []);

  const pick = useCallback(
    (item: Item) => {
      if (item.kind === "tool") {
        pushRecent({ slug: item.slug, name: item.name, emoji: item.emoji, gradient: item.gradient });
        setOpen(false);
        inputRef.current?.blur();
        // Tools are real routes now — navigate like journal posts (the
        // overlay stays for legacy ?tool= deep links on the homepage feed).
        router.push(`/tools/${item.slug}`);
      } else if (item.kind === "recent") {
        pushRecent(item);
        setOpen(false);
        inputRef.current?.blur();
        router.push(`/tools/${item.slug}`);
      } else if (item.kind === "category") {
        setOpen(false);
        inputRef.current?.blur();
        // Categories live at their real /categories/[slug] routes.
        router.push(`/categories/${item.slug}`);
      } else {
        // Journal posts are real routes now — navigate instead of opening
        // the overlay (PostFullPage stays for legacy ?post= deep links).
        setOpen(false);
        inputRef.current?.blur();
        router.push(`/journal/${item.slug}`);
      }
    },
    [pushRecent, router]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!open) {
          setOpen(true);
          return;
        }
        if (flat.length) setActive({ q, i: (activeIdx + 1) % flat.length });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (flat.length) setActive({ q, i: (activeIdx - 1 + flat.length) % flat.length });
      } else if (e.key === "Enter") {
        const item = activeIdx >= 0 ? flat[activeIdx] : flat.find((i) => i.kind === "tool") ?? flat[0];
        if (item) pick(item);
      } else if (e.key === "Escape") {
        if (open) {
          e.stopPropagation();
          setOpen(false);
          inputRef.current?.blur();
        }
      }
    },
    [open, flat, activeIdx, q, pick]
  );

  const noMatches = q.length > 0 && shown !== null && flat.length === 0;

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="w-full">
      {/* Spotlight backdrop — dims + blurs the whole page behind the floating
          search widget so the results own the user's attention. Layering:
          header (z-50) stays crisp above it as a navigation escape hatch,
          the widget sits at z-40, everything else sinks under z-30. */}
      {open && (
        <motion.div
          aria-hidden
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-ink/55 backdrop-blur-md"
        />
      )}

      <div ref={rootRef} className="relative z-40 w-full">
        {/* Input shell */}
        <div
          className={cn(
            "relative flex h-14 items-center rounded-2xl border bg-white/[0.04] pl-12 pr-14 transition-all duration-200",
            open
              ? "border-ember/60 shadow-[0_0_0_1px_rgba(255,106,0,0.25),0_12px_48px_-12px_rgba(255,106,0,0.35),0_28px_80px_-12px_rgba(0,0,0,0.85)] ring-2 ring-ember/25"
              : "border-white/15 hover:border-white/30"
          )}
        >
          <Search className="pointer-events-none absolute left-4 size-5 text-ember" aria-hidden />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded={open}
            aria-controls={LIST_ID}
            aria-haspopup="listbox"
            aria-activedescendant={activeIdx >= 0 ? `${LIST_ID}-${activeIdx}` : undefined}
            aria-label="Search AI tools, categories, and journal articles"
            aria-autocomplete="list"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => openDropdown()}
            onKeyDown={onKeyDown}
            placeholder={
              indexCounts && indexCounts.tools > 0
                ? `Search ${indexCounts.tools} AI tools. Try “translate video”`
                : "Search AI tools, categories, and tags…"
            }
            autoComplete="off"
            spellCheck={false}
            className="h-full w-full bg-transparent text-base text-white outline-none placeholder:text-white/55"
          />
          <div className="absolute right-3 flex items-center gap-2">
            {loading && <Loader2 className="size-4 animate-spin text-ember" aria-hidden />}
            {!loading && query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="flex size-7 items-center justify-center rounded-lg border border-white/10 text-white/50 transition hover:border-ember/40 hover:text-ember"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            )}
            {!query && (
              <kbd className="hidden rounded-md border border-white/15 bg-white/5 px-2 py-1 font-mono text-xs text-white/60 sm:block">
                /
              </kbd>
            )}
          </div>
        </div>

        {/* Dropdown */}
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute inset-x-0 top-full z-40 mt-3 overflow-hidden rounded-2xl border border-white/10 bg-[#141210]/95 shadow-2xl backdrop-blur-xl"
          >
            <div
              id={LIST_ID}
              role="listbox"
              aria-label="Search results"
              style={{ maxHeight: maxListH }}
              className="overflow-y-auto overscroll-contain"
            >
              {noMatches && (
                <div className="border-b border-white/10 px-5 py-6 text-center">
                  <p className="font-mono text-xs uppercase tracking-[0.25em] text-white/50">
                    No matches for &ldquo;{q}&rdquo;
                  </p>
                  <p className="mt-2 text-sm text-white/60">
                    Check the spelling or explore a category. Everything AI, one directory.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.slug}
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          router.push(`/categories/${c.slug}`);
                        }}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-sm text-white/55 transition hover:border-ember/50 hover:text-ember"
                      >
                        {c.emoji} {c.short}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {groups.map((group) => (
                <div key={group.label} className={cn(groups.length > 1 && "border-b border-white/[0.06] last:border-b-0")}>
                  <p className="flex items-center gap-2 px-4 pb-1.5 pt-3 font-mono text-xs uppercase tracking-[0.25em] text-white/60">
                    {group.label === "Trending now" && (
                      <TrendingUp className="size-3 text-ember" aria-hidden />
                    )}
                    {group.label === "Recent" && <History className="size-3 text-ember" aria-hidden />}
                    {group.label}
                    {group.hint && <span className="text-white/55">{group.hint}</span>}
                  </p>
                  {group.items.map((item, li) => {
                    const idx = group.start + li;
                    const isActive = idx === activeIdx;
                    const rank = group.label === "Trending now" ? li + 1 : null;
                    return (
                      <button
                        key={`${item.kind}-${item.slug}`}
                        type="button"
                        role="option"
                        id={`${LIST_ID}-${idx}`}
                        aria-selected={isActive}
                        onMouseEnter={() => setActive({ q, i: idx })}
                        onClick={() => pick(item)}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                          isActive
                            ? "bg-ember/10 ring-1 ring-inset ring-ember/30"
                            : "hover:bg-white/[0.04]"
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-base shadow-inner",
                            "gradient" in item && item.gradient ? item.gradient : "from-white/10 to-white/5"
                          )}
                        >
                          {item.emoji}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            {rank !== null && (
                              <span className="font-mono text-xs font-bold text-ember">#{rank}</span>
                            )}
                            <span className="truncate text-sm font-semibold text-white">
                              {"name" in item ? item.name : item.title}
                            </span>
                            {item.kind === "tool" && item.category.name && (
                              <span
                                title={`Category: ${item.category.name}`}
                                className="hidden truncate font-mono text-xs uppercase tracking-wider text-white/55 sm:inline"
                              >
                                {item.category.name}
                              </span>
                            )}
                          </span>
                          {"tagline" in item && item.tagline && (
                            <span className="block truncate text-xs text-white/60">{item.tagline}</span>
                          )}
                          {item.kind === "post" && (
                            <span className="block truncate text-xs text-white/60">{item.excerpt}</span>
                          )}
                        </span>

                        {item.kind === "tool" &&
                          (item.editorsPick ? (
                            <span
                              title="Earned through hands-on testing, never payment"
                              className="ml-auto shrink-0 whitespace-nowrap font-mono text-xs uppercase tracking-wider text-ember"
                            >
                              ★ Editor&apos;s Pick
                            </span>
                          ) : item.pricing.model ? (
                            <span
                              title={`Pricing: ${pricingChip(item.pricing.model, item.pricing.price)}`}
                              className="ml-auto shrink-0 whitespace-nowrap font-mono text-xs uppercase tracking-wider text-white/60"
                            >
                              {pricingChip(item.pricing.model, item.pricing.price)}
                            </span>
                          ) : null)}
                        {item.kind === "category" && (
                          <span className="ml-auto shrink-0 font-mono text-xs uppercase tracking-wider text-white/60">
                            {item.count > 0 ? `${item.count} tools` : "Browse"}
                          </span>
                        )}
                        {item.kind === "post" && (
                          <span className="ml-auto shrink-0 font-mono text-xs uppercase tracking-wider text-white/60">
                            {item.minutes} min
                          </span>
                        )}
                        {item.kind === "recent" && (
                          <span className="ml-auto shrink-0 font-mono text-xs uppercase tracking-wider text-white/55">
                            ↩ Recent
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Footer hints */}
            <div className="flex items-center justify-between border-t border-white/10 bg-black/20 px-4 py-2 font-mono text-xs tracking-[0.18em] text-white/55">
              <div className="flex gap-3">
                <span>↑↓ NAVIGATE</span>
                <span>↵ OPEN</span>
                <span>ESC CLOSE</span>
              </div>
              <span className="text-ember/85">
                {indexCounts ? `${indexCounts.tools} TOOLS INDEXED` : "PROTHER DISCOVERY"}
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Trending quick-query chips (always visible under the bar) */}
      {trending.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/55">
            Try:
          </span>
          {trending.slice(0, 4).map((t) => (
            <button
              key={t.slug}
              type="button"
              onClick={() => {
                setQuery(t.name);
                inputRef.current?.focus();
                openDropdown();
              }}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-sm text-white/60 transition hover:border-ember/50 hover:bg-ember/10 hover:text-ember"
            >
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
