"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, CalendarDays, Clock3, Feather, Rss } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * /journal — index client shell. Same card language as the landing section,
 * but cards are real <Link>s to /journal/[slug] (SEO-friendly navigation).
 * Category chips filter client-side.
 */

export type JournalCard = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  coverEmoji: string;
  coverGradient: string;
  author: string;
  readingMinutes: number;
  publishedAt: string | null;
};

function dateLabel(iso: string | null): string {
  if (!iso) return "Draft";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function JournalIndex({
  initialPosts,
  breadcrumbs,
}: {
  initialPosts: JournalCard[];
  /** Server-rendered slot (Breadcrumbs) — mounted inside the container, above the H1. */
  breadcrumbs?: ReactNode;
}) {
  const [active, setActive] = useState<string>("all");

  const categories = useMemo(() => {
    const set = new Set(initialPosts.map((p) => p.category));
    return ["all", ...Array.from(set)];
  }, [initialPosts]);

  const shown = useMemo(
    () => initialPosts.filter((p) => active === "all" || p.category === active),
    [initialPosts, active]
  );

  return (
    <section className="bg-ink py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {breadcrumbs && <div className="mb-8">{breadcrumbs}</div>}
        {/* header */}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.3em] text-ember uppercase">
              <Feather className="size-3.5" aria-hidden />
              The Prother Journal
            </p>
            <h1 className="mt-3 text-5xl font-black tracking-tighter text-white md:text-6xl">
              Notes from
              <br />
              the directory.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-white/60">
              Evaluation guides, taxonomy notes, and ecosystem trends —
              written by the people who watch the AI tool ecosystem.
            </p>
          </div>
          <Link
            href="/api/rss?kind=journal"
            className="hidden items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 font-mono text-xs text-white/60 transition-colors hover:border-ember/40 hover:text-ember sm:inline-flex"
            title="Journal RSS feed"
          >
            <Rss className="size-3.5" aria-hidden />
            RSS
          </Link>
        </div>

        {/* category chips */}
        <div className="mt-8 flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActive(c)}
              aria-pressed={active === c}
              className={cn(
                "rounded-full border px-3.5 py-1.5 font-mono text-[11px] tracking-wider uppercase transition-all active:scale-95",
                active === c
                  ? "border-ember bg-ember/15 text-ember"
                  : "border-white/10 bg-white/[0.03] text-white/50 hover:border-white/25 hover:text-white/80"
              )}
            >
              {c === "all" ? "All posts" : c}
            </button>
          ))}
        </div>

        {/* cards */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-white/15 p-12 text-center text-white/40">
              The first issue ships soon.
            </div>
          )}

          {shown.map((p, i) => (
            <motion.article
              key={p.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.05, ease: "easeOut" }}
            >
              <Link
                href={`/journal/${p.slug}`}
                className="group flex h-full w-full flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-left transition-all hover:-translate-y-1 hover:border-ember/40 hover:bg-white/[0.04]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    aria-hidden
                    className={cn(
                      "flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xl shadow-inner",
                      p.coverGradient
                    )}
                  >
                    {p.coverEmoji}
                  </div>
                  <span className="rounded-full border border-ember/30 bg-ember/10 px-2.5 py-1 font-mono text-[10px] tracking-wider text-ember uppercase">
                    {p.category}
                  </span>
                </div>

                <h2 className="mt-4 text-lg leading-snug font-bold text-white transition-colors group-hover:text-ember">
                  {p.title}
                </h2>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/55">
                  {p.excerpt}
                </p>

                <div className="mt-auto flex items-center gap-4 pt-5 font-mono text-[10px] tracking-wider text-white/40 uppercase">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3" aria-hidden />
                    {dateLabel(p.publishedAt)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="size-3" aria-hidden />
                    {p.readingMinutes} min
                  </span>
                  <ArrowUpRight
                    className="ml-auto size-4 text-white/30 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ember"
                    aria-hidden
                  />
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
