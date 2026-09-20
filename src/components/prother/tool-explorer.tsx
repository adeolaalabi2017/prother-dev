"use client";

import { useCallback, useEffect } from "react";
import {
  ArrowUpRight,
  Check,
  MailSearch,
  Sparkles,
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
import { useFeed } from "./use-feed";

// ── Command palette (⌘K) ────────────────────────────────────────────────
function CommandPalette() {
  const { feed } = useFeed();
  const searchOpen = useExplorer((s) => s.searchOpen);
  const setSearch = useExplorer((s) => s.setSearch);
  const openTool = useExplorer((s) => s.openTool);
  const setCategoryFilter = useExplorer((s) => s.setCategoryFilter);
  const setSubmitOpen = useExplorer((s) => s.setSubmitOpen);
  const setTrackOpen = useExplorer((s) => s.setTrackOpen);

  const pickTool = useCallback(
    (slug: string) => {
      setSearch(false);
      // Let the command dialog finish closing before opening the detail modal.
      window.setTimeout(() => openTool(slug), 80);
    },
    [setSearch, openTool],
  );

  const goTo = useCallback(
    (hash: string) => {
      setSearch(false);
      window.setTimeout(() => {
        document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
      }, 80);
    },
    [setSearch],
  );

  const filterCategory = useCallback(
    (slug: string) => {
      setCategoryFilter(slug);
      goTo("#feed");
    },
    [setCategoryFilter, goTo],
  );

  const seen = new Set<string>();
  const todayTools = (feed?.top ?? []).filter((r) => {
    if (seen.has(r.slug)) return false;
    seen.add(r.slug);
    return true;
  });

  return (
    <CommandDialog
      open={searchOpen}
      onOpenChange={setSearch}
      className="border-white/10 bg-coal text-white [&_[cmdk-group-heading]]:text-white/40 [&_[cmdk-input]]:text-white [&_[cmdk-input]::placeholder]:text-white/30 [&_[cmdk-item]]:text-white/80 [&_[cmdk-item][data-selected=true]]:bg-ember/15 [&_[cmdk-item][data-selected=true]]:text-ember [&_[cmdk-separator]]:bg-white/10"
    >
      <CommandInput placeholder="Search tools, categories, actions…" />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>
          No results — try &quot;agents&quot; or &quot;voice&quot;.
        </CommandEmpty>

        {todayTools.length > 0 && (
          <CommandGroup heading="Today's launches">
            {todayTools.map((r) => (
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
                <span className="truncate text-white/40">{r.tagline}</span>
                <span className="ml-auto font-mono text-xs text-ember">
                  ▲{r.votes}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {(feed?.tomorrow.length ?? 0) > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Tomorrow">
              {feed!.tomorrow.map((t) => (
                <CommandItem
                  key={t.slug}
                  value={`${t.name} ${t.tagline} ${t.category.name} tomorrow`}
                  onSelect={() => pickTool(t.slug)}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-6 items-center justify-center rounded-md bg-gradient-to-br text-xs",
                      t.gradient,
                    )}
                  >
                    {t.emoji}
                  </span>
                  <span className="font-semibold">{t.name}</span>
                  <span className="truncate text-white/40">{t.tagline}</span>
                  <span className="ml-auto font-mono text-[10px] text-white/40">
                    IN {t.goesLiveInH}H
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {(feed?.topWeek.length ?? 0) > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Top this week">
              {feed!.topWeek.map((t) => (
                <CommandItem
                  key={t.slug}
                  value={`${t.name} top week`}
                  onSelect={() => pickTool(t.slug)}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-6 items-center justify-center rounded-md bg-gradient-to-br text-xs",
                      t.gradient,
                    )}
                  >
                    {t.emoji}
                  </span>
                  <span className="font-semibold">{t.name}</span>
                  <span className="ml-auto font-mono text-xs text-ember">
                    ▲{t.votes}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Categories">
          {CATEGORIES.map((c) => {
            const count = feed?.categoryCounts?.[c.slug] ?? 0;
            return (
              <CommandItem
                key={c.slug}
                value={`category ${c.slug} ${c.name}`}
                onSelect={() => filterCategory(c.slug)}
              >
                <span aria-hidden>{c.emoji}</span>
                <span>{c.name}</span>
                {count > 0 && (
                  <span className="rounded-full bg-white/10 px-1.5 font-mono text-[10px] tabular-nums text-white/50">
                    {count} today
                  </span>
                )}
                <span className="ml-auto font-mono text-[10px] text-white/30">
                  FILTER
                </span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            value="submit your tool launch wizard"
            onSelect={() => {
              setSearch(false);
              window.setTimeout(() => setSubmitOpen(true), 80);
            }}
          >
            <Sparkles aria-hidden />
            <span>Submit your tool</span>
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
            onSelect={() => goTo("#standards")}
          >
            <Check aria-hidden />
            <span>Read the standards</span>
          </CommandItem>
          <CommandItem
            value="get the daily feed newsletter"
            onSelect={() => goTo("#feed")}
          >
            <ArrowUpRight aria-hidden />
            <span>Jump to the feed</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

// ── Mounted-once explorer + ⌘K shortcut ──────────────────────────────────

export function ToolExplorer() {
  const setSearch = useExplorer((s) => s.setSearch);
  const openTool = useExplorer((s) => s.openTool);

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

  // Restore a shared/filtered category from the URL on load (?cat=<slug>)
  // and jump straight to the feed — a shared ?cat= link is an intent to browse.
  useEffect(() => {
    const cat = new URLSearchParams(window.location.search).get("cat");
    if (cat && CATEGORIES.some((c) => c.slug === cat)) {
      useExplorer.getState().setCategoryFilter(cat);
      // Wait a beat for the feed to render before smooth-scrolling to it.
      const t = window.setTimeout(() => {
        document
          .querySelector("#feed")
          ?.scrollIntoView({ behavior: "smooth" });
      }, 500);
      return () => window.clearTimeout(t);
    }
  }, []);

  return <CommandPalette />;
}
