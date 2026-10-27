"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, BookOpen, CalendarDays, Clock3, Feather, Rss, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { classifyPillar, CONTENT_PILLARS, type ContentPillarId } from "@/lib/journal-pillars";

/**
 * /journal: index client shell. Same card language as the landing section,
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
  /** Uploaded cover image; when set it replaces the emoji banner (Task 34). */
  coverUrl?: string | null;
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
  /** Server-rendered slot (Breadcrumbs): mounted inside the container, above the H1. */
  breadcrumbs?: ReactNode;
}) {
  const [active, setActive] = useState<string>("all");
  const [selectedPillar, setSelectedPillar] = useState<ContentPillarId | "all">("all");

  const postPillars = useMemo(() => {
    const map = new Map<string, ReturnType<typeof classifyPillar>>();
    for (const p of initialPosts) {
      map.set(p.slug, classifyPillar(p.slug, p.category, p.tags, p.title));
    }
    return map;
  }, [initialPosts]);

  const categories = useMemo(() => {
    const set = new Set(initialPosts.map((p) => p.category));
    return ["all", ...Array.from(set)];
  }, [initialPosts]);

  const shown = useMemo(() => {
    return initialPosts.filter((p) => {
      const matchCategory = active === "all" || p.category === active;
      const matchPillar =
        selectedPillar === "all" ||
        postPillars.get(p.slug)?.id === selectedPillar;
      return matchCategory && matchPillar;
    });
  }, [initialPosts, active, selectedPillar, postPillars]);

  return (
    <section className="bg-ink py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {breadcrumbs && <div className="mb-8">{breadcrumbs}</div>}
        {/* header */}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="flex items-center gap-2 font-mono text-xs tracking-[0.3em] text-ember-tint uppercase">
              <Feather className="size-3.5" aria-hidden />
              The Prother Journal
            </p>
            <h1 className="mt-3 text-5xl font-semibold tracking-tighter text-white md:text-6xl">
              Notes from
              <br />
              the directory.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-white/60">
              Evaluation guides, taxonomy notes, and ecosystem trends:
              written by the people who watch the AI tool ecosystem.
            </p>
          </div>
          <Link
            href="/api/rss?kind=journal"
            className="hidden items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 font-mono text-sm text-white/60 transition-colors hover:border-ember/40 hover:text-ember sm:inline-flex"
            title="Journal RSS feed"
          >
            <Rss className="size-3.5" aria-hidden />
            RSS
          </Link>
        </div>

        {/* Editorial Charter: Connected Directory Content Ecosystem */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-ember/30 bg-ember/10 text-ember">
                <ShieldCheck className="size-5" aria-hidden />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Original Research and Directory Integration
                </h2>
                <p className="mt-0.5 text-xs text-white/55">
                  Prother publishes verified engineering guides, benchmark shootouts, and ecosystem updates linked directly to directory tools and comparison matrices. Zero synthetic filler.
                </p>
              </div>
            </div>
            <Link
              href="/tools"
              className="inline-flex shrink-0 items-center gap-1 font-mono text-xs text-ember hover:text-ember-hot"
            >
              Explore Full Directory &rarr;
            </Link>
          </div>
        </div>

        {/* 3 Content Pillars Selector */}
        <div className="mt-8">
          <p className="font-mono text-xs tracking-wider text-white/45 uppercase">
            Content Pillars
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => setSelectedPillar("all")}
              className={cn(
                "rounded-xl border p-3 text-left transition-all",
                selectedPillar === "all"
                  ? "border-ember bg-ember/15 text-white"
                  : "border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20 hover:text-white"
              )}
            >
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wider">
                All Pillars
              </p>
              <p className="mt-1 line-clamp-1 text-xs text-white/50">
                Complete publication stream
              </p>
            </button>

            {(Object.keys(CONTENT_PILLARS) as ContentPillarId[]).map((pid) => {
              const p = CONTENT_PILLARS[pid];
              const isSelected = selectedPillar === pid;
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => setSelectedPillar(pid)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-all",
                    isSelected
                      ? "border-ember bg-ember/15 text-white"
                      : "border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20 hover:text-white"
                  )}
                >
                  <p className="font-mono text-[11px] font-semibold text-ember uppercase tracking-wider">
                    {p.shortLabel}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs text-white/50">
                    {p.goal}
                  </p>
                </button>
              );
            })}
          </div>
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
                "rounded-full border px-3.5 py-1.5 font-mono text-sm tracking-wider uppercase transition-all active:scale-95",
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
            <div className="col-span-full rounded-lg border border-dashed border-white/15 p-12 text-center text-white/60">
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
                className="group flex h-full w-full flex-col rounded-lg border border-white/10 bg-white/[0.02] p-5 text-left transition-all hover:-translate-y-1 hover:border-ember/40 hover:bg-white/[0.04]"
              >
                {/* Uploaded cover art (Task 34): wide banner; the emoji tile
                    below stays as the fallback when a post has no image. */}
                {p.coverUrl && (
                  <div className="overflow-hidden rounded-xl border border-white/10">
                    <img
                      src={p.coverUrl}
                      alt={`${p.title} cover`}
                      loading="lazy"
                      className="aspect-video w-full object-cover"
                    />
                  </div>
                )}

                <div
                  className={cn(
                    "flex items-start justify-between gap-3",
                    p.coverUrl && "mt-4"
                  )}
                >
                  {!p.coverUrl && (
                    <div
                      aria-hidden
                      className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-sm font-semibold tracking-tight text-white/70"
                    >
                      {p.title
                        .replace(/[^a-zA-Z0-9 ]/g, " ")
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((w) => w[0]!.toUpperCase())
                        .join("")}
                    </div>
                  )}
                  <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
                    {postPillars.get(p.slug) && (
                      <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[10px] tracking-wider text-white/70 uppercase">
                        {postPillars.get(p.slug)!.shortLabel}
                      </span>
                    )}
                    <span className="rounded-full border border-ember/30 bg-ember/10 px-2 py-0.5 font-mono text-xs tracking-wider text-ember uppercase">
                      {p.category}
                    </span>
                  </div>
                </div>

                <h2 className="mt-4 text-lg leading-snug font-bold text-white transition-colors group-hover:text-ember">
                  {p.title}
                </h2>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/55">
                  {p.excerpt}
                </p>

                <div className="mt-auto flex items-center gap-4 pt-5 font-mono text-xs tracking-wider text-white/60 uppercase">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3" aria-hidden />
                    {dateLabel(p.publishedAt)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="size-3" aria-hidden />
                    {p.readingMinutes} min
                  </span>
                  <ArrowUpRight
                    className="ml-auto size-4 text-white/55 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ember"
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
