"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useViewable } from "@/hooks/use-viewable";

/**
 * AdSlot (Task 27) — the single rendering surface for every Prother placement
 * across the directory, journal, categories, and SERP.
 *
 * Waterfall, UX-first per the Task 26 plan:
 *   1. direct-sold campaign  — /api/ads/serve picks a weighted ACTIVE campaign
 *      (impression counted server-side on the serve call, click through
 *      /api/ads/click 302 so CTR is real)
 *   2. house creative        — when the slot is unsold we never leave blank
 *      air: a fixed Prother house card (currently the /advertise pitch for
 *      the slot itself) renders instead — internal link, no tracking
 *   3. collapse              — serve returns fallback:"none" only when ad
 *      serving is disabled server-side (server pages don't even mount the
 *      island then; this is a belt-and-braces path for mid-flight toggles)
 *
 * Zero-CLS contract: every variant renders a skeleton with the SAME fixed
 * min-height as the creative, so loading and swap cause no layout shift.
 * No external scripts are ever loaded here — when a network (EthicalAds /
 * Carbon) is switched on, its script goes behind the unfilled state of this
 * component, still inside the reserved box.
 */

/** Fields of /api/ads/serve the slot renders. */
type ServedAd = {
  id: string;
  headline: string;
  body: string;
  emoji: string;
  gradient: string;
  advertiser: string;
};

type ServePayload = {
  ad: ServedAd | null;
  clickHref?: string;
  fallback?: "house" | "none";
};

type Phase =
  | { k: "loading" }
  | { k: "ad"; ad: ServedAd; clickHref: string }
  | { k: "house" }
  | { k: "empty" };

export type AdSlotVariant = "bar" | "spotlight";

/** Fixed reserved heights per variant — MUST match between skeleton & creative. */
const MIN_H: Record<AdSlotVariant, string> = {
  bar: "min-h-[104px]",
  spotlight: "min-h-[176px]",
};

const HouseCard = ({ variant }: { variant: AdSlotVariant }) => {
  const spotlight = variant === "spotlight";
  return (
    <Link
      href="/advertise"
      aria-label="Prother house ad — this advertising slot is open. See placements and pricing."
      className={cn(
        "group flex h-full w-full items-center gap-4 rounded-xl border border-dashed border-ember/30 bg-ember/[0.04] transition-colors hover:border-ember/60 hover:bg-ember/[0.07] focus-visible:outline-2 focus-visible:outline-ember/60",
        spotlight ? "flex-col items-start justify-center gap-3 p-6" : "p-4 sm:gap-5"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-stone-600 to-orange-700 shadow-inner",
          spotlight ? "size-14 text-2xl" : "size-12 text-xl"
        )}
      >
        📣
      </span>
      <span className={cn("min-w-0", spotlight && "flex-1")}>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="inline-flex shrink-0 items-center rounded-full border border-white/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/50">
            Prother
          </span>
          <span className={cn("leading-snug font-bold text-white", spotlight ? "text-xl" : "text-lg")}>
            {spotlight ? "Spotlight this category" : "This slot is open"}
          </span>
        </span>
        <span
          className={cn(
            "mt-1 block text-sm leading-relaxed text-white/60",
            spotlight ? "" : "line-clamp-1"
          )}
        >
          {spotlight
            ? "Hold the top slot of this category — one sponsor, fixed price, clearly labeled."
            : "Fixed price, one sponsor, clearly labeled. See what advertising on Prother buys."}
        </span>
      </span>
      <span className="ml-auto inline-flex shrink-0 items-center gap-1 font-mono text-[10px] tracking-wider text-ember uppercase">
        Advertise
        <ArrowUpRight
          className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          aria-hidden
        />
      </span>
    </Link>
  );
};

export function AdSlot({
  placement,
  category,
  variant = "bar",
  className,
}: {
  placement: string;
  /** Category slug for category-targeted campaigns (spotlight / SERP context). */
  category?: string | null;
  variant?: AdSlotVariant;
  className?: string;
}) {
  // One serve per mount — ref-guard so React dev StrictMode's double effect
  // doesn't count two impressions.
  const requestedRef = useRef(false);
  const [phase, setPhase] = useState<Phase>({ k: "loading" });
  // MRC viewability (Task 28): one ping per served creative, ≥50% on screen ≥1s.
  const boxRef = useRef<HTMLElement | null>(null);
  useViewable(boxRef, phase.k === "ad", () => {
    if (phase.k !== "ad") return;
    fetch("/api/ads/viewable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: phase.ad.id }),
      keepalive: true,
    }).catch(() => {});
  });

  useEffect(() => {
    if (requestedRef.current) return;
    requestedRef.current = true;
    let alive = true;
    const params = new URLSearchParams({ placement });
    if (category) params.set("category", category);
    fetch(`/api/ads/serve?${params.toString()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.resolve({ ad: null, fallback: "house" })))
      .then((j: ServePayload) => {
        if (!alive) return;
        if (j.ad && j.clickHref) setPhase({ k: "ad", ad: j.ad, clickHref: j.clickHref });
        else if (j.fallback === "none") setPhase({ k: "empty" });
        else setPhase({ k: "house" });
      })
      .catch(() => {
        if (alive) setPhase({ k: "house" });
      });
    return () => {
      alive = false;
    };
  }, [placement, category]);

  // Disabled server-side → collapse silently (no empty box, no skeleton).
  if (phase.k === "empty") return null;

  return (
    <aside
      ref={boxRef}
      aria-label="Sponsored placement"
      data-placement={placement}
      className={cn("w-full", MIN_H[variant], className)}
    >
      {phase.k === "loading" ? (
        // Reserved-space skeleton — identical box to the creative, zero CLS.
        <div
          aria-hidden
          className={cn(
            "flex w-full animate-pulse items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02]",
            variant === "spotlight" ? "h-[176px] flex-col items-start justify-center p-6" : "h-[104px] p-4"
          )}
        >
          <div className="size-12 shrink-0 rounded-xl bg-white/[0.06]" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded bg-white/[0.06]" />
            <div className="h-3 w-2/3 rounded bg-white/[0.04]" />
          </div>
        </div>
      ) : phase.k === "house" ? (
        <HouseCard variant={variant} />
      ) : (
        /* ── Direct-sold creative — visually a sibling of a directory
              listing card: mono SPONSORED chip (ember outline), byline, one
              link through the click tracker. ── */
        <a
          href={phase.clickHref}
          target="_blank"
          rel="sponsored nofollow noopener"
          aria-label={`Sponsored by ${phase.ad.advertiser}: ${phase.ad.headline}`}
          className={cn(
            "group flex h-full w-full items-center gap-4 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition-colors hover:border-ember/40 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-ember/60",
            variant === "spotlight" ? "flex-col items-start justify-center gap-3 p-6 sm:gap-4" : "p-4 sm:gap-4"
          )}
        >
          <span
            aria-hidden
            className={cn(
              "flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-inner",
              phase.ad.gradient,
              variant === "spotlight" ? "size-14 text-2xl" : "size-12 text-xl"
            )}
          >
            {phase.ad.emoji}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="inline-flex shrink-0 items-center rounded-full border border-ember/50 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-ember">
                Sponsored
              </span>
              <span
                className={cn(
                  "leading-snug font-bold text-white",
                  variant === "spotlight" ? "text-xl" : "text-lg"
                )}
              >
                {phase.ad.headline}
              </span>
            </span>
            {phase.ad.body && (
              <span
                className={cn(
                  "mt-0.5 block text-sm text-white/70",
                  variant === "spotlight" ? "" : "line-clamp-2"
                )}
              >
                {phase.ad.body}
              </span>
            )}
            <span className="mt-1 block font-mono text-[10px] tracking-wider text-white/40 uppercase">
              by {phase.ad.advertiser} · Sponsored
            </span>
          </span>
          <ArrowUpRight
            className="size-4 shrink-0 text-white/30 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ember"
            aria-hidden
          />
        </a>
      )}
    </aside>
  );
}
