"use client";

import { useEffect, useState } from "react";
import { Hexagon, Menu, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useExplorer } from "./explorer-store";

const NAV_LINKS = [
  { label: "Feed", href: "#feed", id: "feed" },
  { label: "Categories", href: "#categories", id: "categories" },
  { label: "Standards", href: "#standards", id: "standards" },
  { label: "FAQ", href: "#faq", id: "faq" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const setSearch = useExplorer((s) => s.setSearch);

  // Scroll-spy: highlight the section currently in view (desktop nav).
  useEffect(() => {
    const sections = NAV_LINKS.map((l) => document.getElementById(l.id)).filter(
      (el): el is HTMLElement => el !== null
    );
    if (sections.length === 0) return;
    const onScroll = () => {
      // Pick the section closest ABOVE the header line (document position wins,
      // not array order — the ticker sits between hero and the feed).
      let current: string | null = null;
      let currentTop = -Infinity;
      for (const el of sections) {
        const top = el.getBoundingClientRect().top;
        if (top <= 96 && top > currentTop) {
          currentTop = top;
          current = el.id;
        }
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2" aria-label="Prother home">
          <Hexagon className="size-6 fill-ember text-ember" aria-hidden />
          <span className="text-lg font-black tracking-tight text-white">Prother</span>
        </a>

        <nav aria-label="Main" className="hidden items-center gap-7 md:flex xl:gap-8">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              aria-current={active === l.id ? "true" : undefined}
              className={cn(
                "relative py-1 text-sm transition-colors",
                active === l.id ? "text-ember" : "text-white/70 hover:text-white"
              )}
            >
              {l.label}
              {/* ember underline for the section in view */}
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-0 -bottom-0.5 h-0.5 origin-center rounded-full bg-ember transition-transform duration-200",
                  active === l.id ? "scale-x-100" : "scale-x-0"
                )}
              />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSearch(true)}
            aria-label="Search tools (Command K)"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white/60 transition-colors hover:border-ember/40 hover:text-white"
          >
            <Search className="size-4" aria-hidden />
            <span className="hidden lg:inline">Search tools</span>
            <kbd className="hidden rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/50 lg:inline">
              ⌘K
            </kbd>
          </button>
          <a
            href="#feed"
            className="hidden text-sm text-white/70 transition-colors hover:text-white xl:block"
          >
            The Daily
          </a>
          <Button
            asChild
            className="hidden rounded-lg bg-ember font-semibold text-black shadow-none hover:bg-ember-hot sm:inline-flex dark:text-black"
          >
            <a href="#submit">Submit your tool</a>
          </Button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex size-10 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white md:hidden"
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      <div
        className={cn(
          "absolute inset-x-0 top-full border-b border-white/10 bg-ink shadow-xl transition-all md:hidden",
          open ? "visible opacity-100" : "invisible -translate-y-2 opacity-0"
        )}
      >
        <nav aria-label="Mobile" className="flex flex-col gap-1 px-4 py-4">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={cn(
                "rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-white/5 hover:text-white",
                active === l.id ? "text-ember" : "text-white/80"
              )}
            >
              {l.label}
            </a>
          ))}
          <a
            href="#feed"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-white"
          >
            The Daily
          </a>
          <Button
            asChild
            className="mt-2 rounded-lg bg-ember font-semibold text-black shadow-none hover:bg-ember-hot dark:text-black"
          >
            <a href="#submit" onClick={() => setOpen(false)}>
              Submit your tool
            </a>
          </Button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setSearch(true);
            }}
            className="rounded-lg px-3 py-2.5 text-left text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-white"
          >
            🔍 Search tools
          </button>
        </nav>
      </div>
    </header>
  );
}
