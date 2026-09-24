"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  MailSearch,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "./categories";
import { useExplorer } from "./explorer-store";
import type { SearchToolHit } from "@/app/api/search/route";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api.js";

/**
 * Phase 4 step 2: realtime palette. With a Convex URL baked in, trending
 * and results subscribe via useQuery; otherwise the /api fetch fallback
 * serves (same shapes — the shadow harness pins them equal).
 */
const CONVEX_LIVE =
  typeof process.env.NEXT_PUBLIC_CONVEX_URL === "string" &&
  process.env.NEXT_PUBLIC_CONVEX_URL.length > 0;

// ── Types ────────────────────────────────────────────────────────────────

type TrendingRow = {
  slug: string;
  name: string;
  tagline: string;
  emoji: string;
  gradient: string;
  score: number;
  signals: { comments: number; reviews: number; saves: number };
  category: { slug: string; name: string; emoji: string };
};

/** Mono right-side chip for a tool row — honest pricing, no vote counters. */
function pricingChip(model: string, price: string | null): string {
  if (model === "paid" && price) return `FROM ${price}`;
  return model.replace(/_/g, " ").toUpperCase();
}

// ── Command palette (⌘K) ────────────────────────────────────────────────
function CommandPalette() {
  const router = useRouter();
  const searchOpen = useExplorer((s) => s.searchOpen);
  const setSearch = useExplorer((s) => s.setSearch);
  const openTool = useExplorer((s) => s.openTool);
  const setSubmitOpen = useExplorer((s) => s.setSubmitOpen);
  const setTrackOpen = useExplorer((s) => s.setTrackOpen);

  // Trending rows load once per open; typed queries hit /api/search (≥2 chars).
  const [trending, setTrending] = useState<TrendingRow[]>([]);
  const [results, setResults] = useState<{ q: string; tools: SearchToolHit[] } | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  // Realtime subscriptions (no-op "skip" without a Convex URL).
  const liveTrending = useQuery(
    api.trending.list,
    CONVEX_LIVE && searchOpen ? { window: "week", limit: 6 } : "skip",
  );
  const liveSearch = useQuery(
    api.search.search,
    CONVEX_LIVE && debouncedQ.trim().length >= 2 ? { q: debouncedQ.trim() } : "skip",
  );

  useEffect(() => {
    if (!searchOpen) return;
    if (CONVEX_LIVE) return; // subscription above owns trending
    // Trending rows load once per open (async setState in the fetch callback).
    // Trending rows load once per open (async setState in the fetch callback).
    // Input/results reset happens in the dialog's onOpenChange close handler —
    // synchronous setState inside an effect body is a cascading-render hazard.
    let alive = true;
    fetch("/api/trending?window=week&limit=6")
      .then((r) => r.json() as Promise<{ rows?: TrendingRow[] }>)
      .then((d) => {
        if (alive) setTrending(d.rows ?? []);
      })
      .catch(() => {
        if (alive) setTrending([]);
      });
    return () => {
      alive = false;
    };
  }, [searchOpen]);

  // ── Debounced live search (180ms, ≥2 chars) ───────────────────────────
  // Results carry the query they answered, so stale rows self-invalidate via
  // the `results.q === q` derivation below — no synchronous clearing needed.
  // When live, the debounce feeds the subscription; otherwise the fetch.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setDebouncedQ("");
      return;
    }
    if (CONVEX_LIVE) {
      const t = window.setTimeout(() => setDebouncedQ(q), 180);
      return () => window.clearTimeout(t);
    }
    const ctrl = new AbortController();
    const t = window.setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => r.json() as Promise<{ tools?: SearchToolHit[] }>)
        .then((d) => setResults({ q, tools: d.tools ?? [] }))
        .catch(() => {
          if (!ctrl.signal.aborted) setResults({ q, tools: [] });
        });
    }, 180);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [query]);

  const pickTool = useCallback(
    (slug: string) => {
      setSearch(false);
      // Let the command dialog finish closing before opening the detail page.
      window.setTimeout(() => openTool(slug), 80);
    },
    [setSearch, openTool],
  );

  // The palette works on every route — jump targets are real navigation.
  const goTo = useCallback(
    (href: string) => {
      setSearch(false);
      window.setTimeout(() => router.push(href), 80);
    },
    [setSearch, router],
  );

  const q = query.trim();
  // Live subscription wins when its answer matches the current input;
  // the fetch fallback covers the no-Convex build.
  const liveTools =
    liveSearch && liveSearch.q === q ? liveSearch.tools : null;
  const shownResults = CONVEX_LIVE
    ? (liveTools ?? (results && results.q === q ? results.tools : null))
    : results && results.q === q
      ? results.tools
      : null;
  const trendingRows = CONVEX_LIVE ? (liveTrending?.rows ?? []) : trending;

  return (
    <CommandDialog
      open={searchOpen}
      onOpenChange={(o) => {
        setSearch(o);
        // Closing the palette starts a fresh session next time it opens.
        if (!o) {
          setQuery("");
          setDebouncedQ("");
          setResults(null);
        }
      }}
      className="border-white/10 bg-coal text-white [&_[cmdk-group-heading]]:text-white/60 [&_[cmdk-input]]:text-white [&_[cmdk-input]::placeholder]:text-white/55 [&_[cmdk-item]]:text-white/80 [&_[cmdk-item][data-selected=true]]:bg-ember/15 [&_[cmdk-item][data-selected=true]]:text-ember [&_[cmdk-separator]]:bg-white/10"
    >
      <CommandInput
        placeholder="Search tools, categories, actions…"
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>
          No results. Try &quot;chatbot&quot; or &quot;video&quot;.
        </CommandEmpty>

        {q.length < 2 && trendingRows.length > 0 && (
          <CommandGroup heading="Trending now">
            {trendingRows.map((r) => (
              <CommandItem
                key={r.slug}
                value={`${r.name} ${r.tagline} ${r.category.name}`}
                onSelect={() => pickTool(r.slug)}
              >
                <TrendingUp aria-hidden className="text-ember/85" />
                <span
                  aria-hidden
                  className={cn(
                    "flex size-6 items-center justify-center rounded-md bg-gradient-to-br text-xs",
                    r.gradient,
                  )}
                >
                  {r.emoji}
                </span>
                <span className="font-semibold">{r.name}</span>
                <span className="truncate text-white/60">{r.tagline}</span>
                <span className="ml-auto font-mono text-xs uppercase tracking-wider text-white/60">
                  {r.category.name}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {shownResults && shownResults.length > 0 && (
          <>
            {q.length < 2 && trendingRows.length > 0 && <CommandSeparator />}
            <CommandGroup heading="Results">
              {shownResults.map((r) => (
                <CommandItem
                  key={r.slug}
                  value={`${r.name} ${r.tagline} ${r.category.name}`}
                  onSelect={() => pickTool(r.slug)}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-6 items-center justify-center rounded-md bg-gradient-to-br text-xs",
                      r.gradient,
                    )}
                  >
                    {r.emoji}
                  </span>
                  <span className="font-semibold">{r.name}</span>
                  <span className="truncate text-white/60">{r.tagline}</span>
                  {r.editorsPick ? (
                    <span className="ml-auto shrink-0 font-mono text-xs uppercase tracking-wider text-ember">
                      ★ PICK
                    </span>
                  ) : (
                    <span className="ml-auto shrink-0 font-mono text-xs uppercase tracking-wider text-white/60">
                      {pricingChip(r.pricing.model, r.pricing.price)}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Categories">
          {CATEGORIES.map((c) => (
            <CommandItem
              key={c.slug}
              value={`category ${c.slug} ${c.name}`}
              onSelect={() => goTo(`/categories/${c.slug}`)}
            >
              <span aria-hidden>{c.emoji}</span>
              <span>{c.name}</span>
              <span className="ml-auto font-mono text-xs text-white/55">
                BROWSE
              </span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            value="submit a tool to the directory listing wizard"
            onSelect={() => {
              setSearch(false);
              window.setTimeout(() => setSubmitOpen(true), 80);
            }}
          >
            <Sparkles aria-hidden />
            <span>Submit a tool to the directory</span>
          </CommandItem>
          <CommandItem
            value="track my submission status makers"
            onSelect={() => {
              setSearch(false);
              window.setTimeout(() => setTrackOpen(true), 80);
            }}
          >
            <MailSearch aria-hidden />
            <span>Track my submission</span>
          </CommandItem>
          <CommandItem
            value="read the standards quality bar"
            onSelect={() => goTo("/about#standards")}
          >
            <Check aria-hidden />
            <span>Read the standards</span>
          </CommandItem>
          <CommandItem
            value="browse the directory all tools"
            onSelect={() => goTo("/tools")}
          >
            <ArrowRight aria-hidden />
            <span>Browse the directory</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

// ── Mounted-once explorer + ⌘K shortcut ──────────────────────────────────

export function ToolExplorer() {
  const router = useRouter();
  const setSearch = useExplorer((s) => s.setSearch);

  // ⌘K / ctrl+K opens the command palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSearch]);

  // ⌘⇧A / ctrl+⇧A navigates to the admin console route.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "a"
      ) {
        e.preventDefault();
        router.push("/admin");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  // Legacy shared links (?cat=<slug>) used to filter the retired homepage
  // feed — they now land on the matching category page instead.
  useEffect(() => {
    const cat = new URLSearchParams(window.location.search).get("cat");
    if (cat && CATEGORIES.some((c) => c.slug === cat)) {
      const t = window.setTimeout(() => {
        router.replace(`/categories/${cat}`);
      }, 0);
      return () => window.clearTimeout(t);
    }
  }, [router]);

  return <CommandPalette />;
}
