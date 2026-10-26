"use client";

import Link from "next/link";
import { ArrowRight, Scale } from "lucide-react";
import { POPULAR_SHOWDOWNS } from "@/lib/showdowns";
import { ToolLogo } from "./tool-logo";

export function CompareSection() {
  const showdowns = POPULAR_SHOWDOWNS.slice(0, 6);

  return (
    <section
      id="compare"
      aria-label="Compare AI Tools"
      className="border-t border-white/[0.08] bg-ink py-20 md:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold tracking-[0.25em] text-ember uppercase">
              <Scale className="size-3.5 text-ember" aria-hidden />
              <span>HEAD-TO-HEAD SHOWDOWNS</span>
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl text-balance">
              Side-by-side spec showdowns.
            </h2>
            <p className="mt-3 max-w-xl text-sm text-white/60 text-pretty">
              Evaluate context windows, API latency, benchmark throughput, and verified pricing before introducing dependencies to your codebase.
            </p>
          </div>

          <Link
            href="/compare"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.04] px-4 font-mono text-xs font-semibold tracking-wider text-white uppercase transition-colors hover:border-white/30 hover:bg-white/[0.08]"
          >
            <span>Full Comparison Matrix</span>
            <ArrowRight className="size-3.5 text-ember" aria-hidden />
          </Link>
        </div>

        {/* Showdown Cards Grid */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {showdowns.map((s) => (
            <Link
              key={s.slug}
              href={`/compare/${s.slug}`}
              className="group relative flex flex-col justify-between rounded-xl border border-white/10 bg-[#0c0d10] p-5 transition-all duration-200 hover:border-ember/40 hover:bg-white/[0.035] hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            >
              <div>
                {/* Category kicker */}
                <div className="flex items-center justify-between font-mono text-[10px] tracking-wider text-white/45 uppercase">
                  <span>{s.categoryName}</span>
                  <span className="font-semibold text-ember">VS SHOWDOWN</span>
                </div>

                {/* Faceoff Arena */}
                <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  {/* Tool A */}
                  <div className="flex min-w-0 items-center gap-2.5">
                    <ToolLogo slug={s.toolA} name={s.toolA} size="sm" />
                    <span className="truncate text-sm font-semibold text-white">
                      {s.title.split(" vs ")[0]}
                    </span>
                  </div>

                  {/* VS badge */}
                  <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-widest text-white/70">
                    VS
                  </span>

                  {/* Tool B */}
                  <div className="flex min-w-0 items-center justify-end gap-2.5 text-right">
                    <span className="truncate text-sm font-semibold text-white">
                      {s.title.split(" vs ")[1]}
                    </span>
                    <ToolLogo slug={s.toolB} name={s.toolB} size="sm" />
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                <span className="font-mono text-xs text-white/50">
                  Direct spec analysis
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-ember transition-transform group-hover:translate-x-0.5 group-hover:text-ember-hot">
                  <span>Compare</span>
                  <span aria-hidden>&rarr;</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
