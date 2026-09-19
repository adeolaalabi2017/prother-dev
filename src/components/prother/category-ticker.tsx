"use client";

import { CATEGORIES } from "./categories";

function TickerContent({ hidden }: { hidden?: boolean }) {
  return (
    <div aria-hidden={hidden} className="flex w-max shrink-0 items-center">
      {CATEGORIES.map((c) => (
        <span
          key={c.slug}
          className="mx-6 font-mono text-xs tracking-widest whitespace-nowrap text-white/60 uppercase"
        >
          {c.emoji} {c.slug} •
        </span>
      ))}
    </div>
  );
}

export function CategoryTicker() {
  return (
    <section id="categories" className="overflow-hidden border-y border-white/10 bg-ink py-4">
      <div className="animate-marquee flex w-max">
        <TickerContent />
        <TickerContent hidden />
      </div>
    </section>
  );
}
