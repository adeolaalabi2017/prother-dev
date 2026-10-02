"use client";

import Link from "next/link";
import { CATEGORIES } from "./categories";

function TickerContent({ hidden }: { hidden?: boolean }) {
  return (
    <div aria-hidden={hidden} className="flex w-max shrink-0 items-center">
      {CATEGORIES.map((c) => (
        <Link
          key={c.slug}
          href={`/categories/${c.slug}`}
          className="group mx-6 flex items-center gap-2 py-2 font-mono text-xs tracking-wider whitespace-nowrap text-white/60 transition-colors hover:text-white uppercase"
        >
          <span className="size-1 rounded-full bg-ember/60 transition-transform group-hover:scale-150 group-hover:bg-ember" />
          <span className="group-hover:text-ember transition-colors">
            {c.name}
          </span>
          <span aria-hidden className="text-white/50">
            /
          </span>
        </Link>
      ))}
    </div>
  );
}

export function CategoryTicker() {
  return (
    <div className="relative overflow-hidden border-b border-white/[0.08] bg-ink/70 py-3.5 backdrop-blur-sm">
      {/* edge fade masks so items dissolve instead of hard-clipping */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-ink to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-ink to-transparent"
      />
      <div className="animate-marquee flex w-max items-center">
        <TickerContent />
        <TickerContent hidden />
      </div>
    </div>
  );
}
