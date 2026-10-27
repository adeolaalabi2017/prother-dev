import React from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Layers, Scale } from "lucide-react";
import { ToolLogo } from "@/components/prother/tool-logo";

export interface JournalDirectoryBridgeProps {
  toolSlugs: string[];
  comparisonSlugs?: string[];
  categorySlug?: string | null;
}

export function JournalDirectoryBridge({
  toolSlugs,
  comparisonSlugs = [],
  categorySlug,
}: JournalDirectoryBridgeProps) {
  if (toolSlugs.length === 0 && comparisonSlugs.length === 0 && !categorySlug) {
    return null;
  }

  return (
    <section
      aria-label="Directory connections for this article"
      className="my-10 rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-sm"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ember/30 bg-ember/10 px-2.5 py-0.5 font-mono text-[11px] font-medium tracking-wider text-ember uppercase">
            <BookOpen className="size-3" aria-hidden />
            Directory Reference
          </span>
          <h2 className="mt-2 text-base font-semibold text-white">
            Tools & Specifications Referenced
          </h2>
        </div>
        <p className="max-w-md text-right text-xs leading-relaxed text-white/50 hidden sm:block">
          Explore production specs, verified pricing, and alternatives for the products covered in this article.
        </p>
      </div>

      {/* Mentioned Directory Tools */}
      {toolSlugs.length > 0 && (
        <div className="mt-5">
          <p className="font-mono text-[11px] tracking-wider text-white/45 uppercase">
            Tools Analyzed in this Guide ({toolSlugs.length})
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {toolSlugs.map((slug) => {
              const formattedName = slug
                .split("-")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ");

              return (
                <Link
                  key={slug}
                  href={`/tools/${slug}`}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 transition-colors hover:border-ember/40 hover:bg-ember/[0.03]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ToolLogo
                      slug={slug}
                      name={formattedName}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white/90 group-hover:text-ember">
                        {formattedName}
                      </p>
                      <p className="truncate font-mono text-[10px] text-white/40">
                        /tools/{slug}
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight
                    className="size-3.5 shrink-0 text-white/40 transition-colors group-hover:text-ember"
                    aria-hidden
                  />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Comparisons & Category Links */}
      {(comparisonSlugs.length > 0 || categorySlug) && (
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4 text-xs">
          {categorySlug && (
            <Link
              href={`/categories/${categorySlug}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 font-medium text-white/70 transition-colors hover:border-ember/40 hover:text-ember"
            >
              <Layers className="size-3.5 text-ember" aria-hidden />
              Browse Category Directory
            </Link>
          )}

          {categorySlug && (
            <Link
              href={`/compare/${categorySlug}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 font-medium text-white/70 transition-colors hover:border-ember/40 hover:text-ember"
            >
              <Scale className="size-3.5 text-ember" aria-hidden />
              Open Category Comparison Matrix
            </Link>
          )}

          {comparisonSlugs.map((comp) => (
            <Link
              key={comp}
              href={`/compare/${comp}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 font-medium text-white/70 transition-colors hover:border-ember/40 hover:text-ember"
            >
              <Scale className="size-3.5 text-ember" aria-hidden />
              Showdown: {comp.replace("-vs-", " vs ")}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
