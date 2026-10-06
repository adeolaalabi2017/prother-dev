"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Compass,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import GatewayFlow from "@/components/ui/gateway-flow";

// Client-only: hero-search subscribes via convex/react, whose module
// evaluation pulls the `ws` Node client and throws on Workers (see
// convex-provider.tsx). The search box hydrates after mount; SSR keeps
// the static hero copy.
const HeroSearch = dynamic(
  () => import("./hero-search").then((m) => ({ default: m.HeroSearch })),
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
  // the locked defaults when the store is empty — the hero never breaks.
  const [copy, setCopy] = useState(() => ({
    announcement:
      initialSettings?.["hero.announcement"] ||
      "{count} tools indexed: free forever",
    headline: initialSettings?.["hero.headline"] || "Find the best AI Tools.",
    subline:
      initialSettings?.["hero.subline"] ||
      "A curated directory of AI products and tools. Search, compare, and read real reviews, before you commit your workflow.",
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
      {/* Gateway Flow background — subtle ember particles and convergence */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 40%, rgba(255,106,0,0.12) 0%, rgba(255,106,0,0.04) 36%, transparent 64%)",
          }}
        />
        <GatewayFlow
          className="absolute inset-0"
          speed={0.8}
          density={0.75}
          opacity={0.85}
        />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* Architectural Telemetry Badge */}
          <div className="inline-flex items-center gap-2 rounded border border-ember/30 bg-ember/10 px-3.5 py-1 font-mono text-[11px] font-medium tracking-wider uppercase text-ember-tint shadow-[0_0_16px_rgba(255,106,0,0.15)]">
            <span
              className="inline-block size-1.5 rounded-full bg-ember-tint animate-status-pulse"
              aria-hidden
            />
            <span className="font-semibold text-ember">VERIFIED REGISTRY</span>
            <span aria-hidden className="text-white/50">
              /
            </span>
            <span>{announcement}</span>
          </div>

          {/* Balanced High-Impact Headline */}
          <h1 className="mt-6 text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl text-balance">
            {cleanHeadline}
            <span className="text-ember">.</span>
          </h1>

          {/* Clear Value Proposition: What it is + Who it is for + Why it matters */}
          <p className="mx-auto mt-5 max-w-2xl text-base text-white/75 sm:text-lg sm:leading-relaxed text-pretty">
            The independent software & model directory for engineers, founders,
            and technical teams. Compare production specs, verified pricing, and
            real developer reviews, with{" "}
            <strong className="font-semibold text-white">
              zero pay-to-play ranking
            </strong>
            .
          </p>

          {/* Clear Next Steps: Primary & Secondary CTAs */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#directory"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ember px-6 text-sm font-semibold text-coal shadow-[0_0_24px_rgba(255,106,0,0.28)] transition-all hover:bg-ember-hot hover:shadow-[0_0_32px_rgba(255,106,0,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            >
              <Compass className="size-4" />
              <span>Explore {stats ? stats.tools : 108}+ Vetted Tools</span>
              <ArrowRight className="size-4 opacity-70" />
            </a>
            <Link
              href="/compare"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-5 text-sm font-medium text-white/90 backdrop-blur-sm transition-colors hover:border-white/30 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            >
              <Scale className="size-4 text-ember-tint" />
              <span>Compare Stacks</span>
            </Link>
          </div>

          {/* Discovery Console: Hero Search */}
          <div className="mx-auto mt-7 w-full max-w-2xl">
            <HeroSearch />
          </div>

          {/* Structured Telemetry Proof Bar */}
          <div className="mx-auto mt-10 max-w-3xl border-t border-white/[0.08] pt-6">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="text-center">
                <dt className="font-mono text-[10px] tracking-widest text-white/55 uppercase">
                  VERIFIED INDEX
                </dt>
                <dd className="mt-1 font-mono text-sm font-bold text-white tabular-nums">
                  {stats ? stats.tools : 108} Tools
                </dd>
              </div>
              <div className="text-center">
                <dt className="font-mono text-[10px] tracking-widest text-white/55 uppercase">
                  RANKING INTEGRITY
                </dt>
                <dd className="mt-1 font-mono text-sm font-bold text-ember">
                  0% Pay-to-Win
                </dd>
              </div>
              <div className="text-center">
                <dt className="font-mono text-[10px] tracking-widest text-white/55 uppercase">
                  TAXONOMY
                </dt>
                <dd className="mt-1 font-mono text-sm font-bold text-white tabular-nums">
                  {stats ? stats.categories : 8} Domains
                </dd>
              </div>
              <div className="text-center">
                <dt className="font-mono text-[10px] tracking-widest text-white/55 uppercase">
                  ACCESS MODEL
                </dt>
                <dd className="mt-1 font-mono text-sm font-bold text-mint">
                  $0 Free Forever
                </dd>
              </div>
            </dl>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
