"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import GatewayFlow from "@/components/ui/gateway-flow";

// Client-only: hero-search subscribes via convex/react, whose module
// evaluation pulls the `ws` Node client and throws on Workers (see
// convex-provider.tsx). The search box hydrates after mount; SSR keeps
// the static hero copy.
const HeroSearch = dynamic(
  () => import("./hero-search-with-provider").then((m) => ({ default: m.HeroSearchWithProvider })),
  { ssr: false },
);

export type SiteStats = {
  tools: number;
  categories: number;
  reviews: number;
  comments: number;
};

export type HeroProps = {
  initialStats?: SiteStats | null;
  initialSettings?: Record<string, string>;
};

export function formatAnnouncement(
  template: string,
  stats: SiteStats | null,
): string {
  const toolCount = stats ? stats.tools : 108;
  const catCount = stats ? stats.categories : 8;
  const revCount = stats ? stats.reviews : 0;
  const comCount = stats ? stats.comments : 0;

  let formatted = template
    .replace(/\{tools\}|\{count\}/gi, String(toolCount))
    .replace(/\{categories\}/gi, String(catCount))
    .replace(/\{reviews\}/gi, String(revCount))
    .replace(/\{comments\}/gi, String(comCount));

  if (stats && stats.tools > 0) {
    formatted = formatted.replace(/\b\d+(\s+tools\b)/gi, `${stats.tools}$1`);
  }
  if (stats && stats.categories > 0) {
    formatted = formatted.replace(
      /\b\d+(\s+categories\b)/gi,
      `${stats.categories}$1`,
    );
  }
  return formatted;
}

export function Hero({ initialStats, initialSettings }: HeroProps = {}) {
  // Admin-manageable site copy (/api/site ← Site settings KV). Falls back to
  // the locked defaults when the store is empty: the hero never breaks.
  const [copy, setCopy] = useState(() => ({
    announcement:
      initialSettings?.["hero.announcement"] ||
      "INDEPENDENTLY REVIEWED",
    headline:
      initialSettings?.["hero.headline"] ||
      "Find the right AI tool. Know what it costs.",
    subline:
      initialSettings?.["hero.subline"] ||
      "Compare AI models, agents, and developer tools using verified pricing, real capabilities, and production-ready specifications.",
  }));
  const [stats, setStats] = useState<SiteStats | null>(initialStats ?? null);

  useEffect(() => {
    let alive = true;
    fetch("/api/site")
      .then(
        (r) =>
          r.json() as Promise<{
            settings: Record<string, string>;
            stats?: SiteStats;
          }>,
      )
      .then((d) => {
        if (!alive) return;
        if (d.settings) {
          setCopy((prev) => ({
            announcement: d.settings["hero.announcement"] || prev.announcement,
            headline: d.settings["hero.headline"] || prev.headline,
            subline: d.settings["hero.subline"] || prev.subline,
          }));
        }
        if (d.stats) setStats(d.stats);
      })
      .catch(() => {
        /* defaults hold */
      });
    return () => {
      alive = false;
    };
  }, []);

  const cleanHeadline = copy.headline.replace(/\.$/, "");
  const announcement = formatAnnouncement(copy.announcement, stats);

  return (
    <section id="top" className="relative pt-12 pb-16 md:pt-16 md:pb-20">
      {/* Gateway Flow background: subtle ember particles and convergence */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 40%, rgba(255,106,0,0.07) 0%, rgba(255,106,0,0.03) 36%, transparent 64%)",
          }}
        />
        <GatewayFlow
          className="absolute inset-0"
          speed={0.8}
          density={0.75}
          opacity={0.55}
        />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", bounce: 0, duration: 0.4 }}
        >
          {/* Announcement chip / eyebrow badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-ember/30 bg-ember/[0.08] px-3.5 py-1 font-mono text-[11px] font-medium tracking-wider uppercase text-ember-tint">
            <span
              className="inline-block size-1.5 rounded-full bg-ember-tint animate-status-pulse"
              aria-hidden
            />
            <span>{announcement}</span>
          </div>

          {/* Display headline: size and space carry the hierarchy, weight
              stays house-standard semibold. */}
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl text-balance">
            {cleanHeadline}
            <span className="text-ember">.</span>
          </h1>

          {/* Clear Value Proposition: What it is + Who it is for + Why it matters */}
          <p className="mx-auto mt-5 max-w-2xl text-base text-white/75 sm:text-lg sm:leading-relaxed text-pretty">
            {copy.subline}
          </p>

          {/* Clear next steps: text-first CTAs */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#directory"
              className="pressable inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-ember px-6 text-sm font-semibold text-coal transition-colors hover:bg-ember-hot focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink active:bg-ember-hot"
            >
              <span>Explore AI Tools</span>
              <span aria-hidden>&rarr;</span>
            </a>
            <Link
              href="/compare"
              className="pressable inline-flex h-11 items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] px-5 text-sm font-medium text-white/90 transition-colors hover:border-white/30 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            >
              <span>Compare Models</span>
            </Link>
          </div>

          {/* Discovery Console: Hero Search */}
          <div className="mx-auto mt-7 w-full max-w-2xl">
            <HeroSearch />
          </div>

          {/* Value Proposition Pillars */}
          <div className="mx-auto mt-10 max-w-2xl">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-left transition-colors hover:border-white/15">
                <dt className="font-mono text-[11px] font-semibold tracking-wider text-white/50 uppercase">
                  PRICING
                </dt>
                <dd className="mt-1 text-sm sm:text-base font-semibold text-white/95">
                  Verified costs
                </dd>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-left transition-colors hover:border-white/15">
                <dt className="font-mono text-[11px] font-semibold tracking-wider text-white/50 uppercase">
                  RANKINGS
                </dt>
                <dd className="mt-1 text-sm sm:text-base font-semibold text-white/95">
                  Independent
                </dd>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-left transition-colors hover:border-white/15">
                <dt className="font-mono text-[11px] font-semibold tracking-wider text-white/50 uppercase">
                  SPECS
                </dt>
                <dd className="mt-1 text-sm sm:text-base font-semibold text-white/95">
                  Comparable
                </dd>
              </div>
            </dl>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
