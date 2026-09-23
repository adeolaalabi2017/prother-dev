"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  Feather,
  Grid2x2,
  Hexagon,
  Info,
  Menu,
  MessagesSquare,
  Search,
  Settings2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useExplorer } from "./explorer-store";
import { AuthMenu } from "./auth-menu";

/**
 * Nav points at dedicated routes; "Categories" is the one homepage anchor
 * (scrolls to the CategoryGrid section on /). Anchor shortcuts never render
 * an active state — only real route matches light up, so the default state
 * on the homepage is neutral.
 */
const NAV_LINKS = [
  { label: "Tools", href: "/tools", id: "tools", icon: Compass },
  { label: "Categories", href: "/#categories", id: "categories", icon: Grid2x2 },
  { label: "Journal", href: "/journal", id: "journal", icon: Feather },
  { label: "Forums", href: "/forums", id: "forums", icon: MessagesSquare },
  { label: "About", href: "/about", id: "about", icon: Info },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const setSearch = useExplorer((s) => s.setSearch);

  const isActive = (id: string) => {
    const link = NAV_LINKS.find((l) => l.id === id);
    if (!link) return false;
    // Anchor shortcuts (Categories → /#categories) are scroll helpers, not
    // routes — they never light up, keeping the homepage default neutral.
    if (link.href.startsWith("/#")) return false;
    // Route links stay active on their sub-routes too (/journal/<slug>,
    // /forums/<slug>) — exact match OR a nested path under the link.
    return pathname === link.href || pathname.startsWith(`${link.href}/`);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink/85 backdrop-blur-md">
      {/* Full-bleed header row: the border above/below span the viewport, so the
          content cap is set wider than the page column (max-w-7xl vs max-w-6xl)
          to keep side margins tight and give the nav room to breathe. */}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
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
          {/* No search box in the bar — the hero search, /tools directory and
              the global ⌘K palette (mounted in layout.tsx) already cover it. */}
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
            className="hidden rounded-lg bg-ember font-semibold text-coal shadow-none hover:bg-ember-hot sm:inline-flex dark:text-coal"
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
            className="mt-2 rounded-lg bg-ember font-semibold text-coal shadow-none hover:bg-ember-hot dark:text-coal"
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
