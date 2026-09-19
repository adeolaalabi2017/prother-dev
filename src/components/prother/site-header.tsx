"use client";

import { useState } from "react";
import { Hexagon, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Feed", href: "#feed" },
  { label: "Categories", href: "#categories" },
  { label: "Standards", href: "#standards" },
  { label: "FAQ", href: "#faq" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2" aria-label="Prother home">
          <Hexagon className="size-6 fill-ember text-ember" aria-hidden />
          <span className="text-lg font-black tracking-tight text-white">Prother</span>
        </a>

        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-white/70 transition-colors hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="#feed"
            className="hidden text-sm text-white/70 transition-colors hover:text-white lg:block"
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
              className="rounded-lg px-3 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-white"
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
        </nav>
      </div>
    </header>
  );
}
