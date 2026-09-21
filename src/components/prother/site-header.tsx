"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  Feather,
  Hexagon,
  Info,
  Menu,
  Rss,
  Search,
  Settings2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useExplorer } from "./explorer-store";
import { AuthMenu } from "./auth-menu";

/**
 * Nav points at dedicated routes; the Feed link is the one anchor that
 * scroll-spies — and only while the user is on the homepage.
 */
const NAV_LINKS = [
  { label: "Feed", href: "/#feed", id: "feed", icon: Rss },
  { label: "Tools", href: "/tools", id: "tools", icon: Compass },
  { label: "Journal", href: "/journal", id: "journal", icon: Feather },
  { label: "About", href: "/about", id: "about", icon: Info },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [feedInView, setFeedInView] = useState(false);
  const pathname = usePathname();
  const setSearch = useExplorer((s) => s.setSearch);

  const isHome = pathname === "/";

  // Scroll-spy: on the homepage only, highlight the Feed link while the
  // #feed section is in view. Route links use exact pathname matching.
  // (feedInView may go stale off-home — the isHome guard at the usage site
  // keeps it from ever rendering as active.)
  useEffect(() => {
    if (!isHome) return;
    const section = document.getElementById("feed");
    if (!section) return;
    const onScroll = () => {
      const top = section.getBoundingClientRect().top;
      setFeedInView(top <= 96 && top > -section.clientHeight + 96);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  const isActive = (id: string) => {
    if (id === "feed") return isHome && feedInView;
    const link = NAV_LINKS.find((l) => l.id === id);
    return link ? pathname === link.href : false;
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label="Prother home"
        >
          <Hexagon className="size-6 fill-ember text-ember" aria-hidden />
          <span className="text-lg font-black tracking-tight text-white">Prother</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-7 md:flex xl:gap-8">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.id) ? "true" : undefined}
              className={cn(
                "relative py-1 text-sm transition-colors",
                isActive(l.id) ? "text-ember" : "text-white/70 hover:text-white"
              )}
            >
              {l.label}
              {/* ember underline for the active route / section */}
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-0 -bottom-0.5 h-0.5 origin-center rounded-full bg-ember transition-transform duration-200",
                  isActive(l.id) ? "scale-x-100" : "scale-x-0"
                )}
              />
            </Link>
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
          <AuthMenu />
          <Link
            href="/admin"
            aria-label="Admin console"
            title="Admin console (⌘⇧A)"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/50 transition-colors hover:border-ember/40 hover:text-ember"
          >
            <Settings2 className="size-4" aria-hidden />
          </Link>
          <Button
            asChild
            className="hidden rounded-lg bg-ember font-semibold text-black shadow-none hover:bg-ember-hot sm:inline-flex dark:text-black"
          >
            <Link href="/submit">Submit your tool</Link>
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
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              aria-current={isActive(l.id) ? "true" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-white/5 hover:text-white",
                isActive(l.id) ? "text-ember" : "text-white/80"
              )}
            >
              <l.icon className="size-4 text-ember" aria-hidden />
              {l.label}
            </Link>
          ))}
          <Button
            asChild
            className="mt-2 rounded-lg bg-ember font-semibold text-black shadow-none hover:bg-ember-hot dark:text-black"
          >
            <Link href="/submit" onClick={() => setOpen(false)}>
              Submit your tool
            </Link>
          </Button>
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Settings2 className="size-4 text-ember" aria-hidden />
            Admin console
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setSearch(true);
            }}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Search className="size-4 text-ember" aria-hidden />
            Search tools
          </button>
        </nav>
      </div>
    </header>
  );
}
