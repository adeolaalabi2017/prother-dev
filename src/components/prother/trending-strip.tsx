"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { ToolLogo } from "./tool-logo";
import { cn } from "@/lib/utils";

/**
 * TrendingStrip — discovery-era UI surface. Engagement-ranked tools from
 * /api/trending (lib/trending.ts scoring: comments/reviews/saves + editorial
 * bonus — no votes), rendered as a ranked grid with a week/month window
 * toggle. Fails soft: renders null.
 */

type TrendingWindow = "week" | "month";

type TrendingRow = {
  slug: string;
  name: string;
  tagline: string;
  emoji: string;
  gradient: string;
  logoUrl?: string | null;
  score: number;
  signals: { comments: number; reviews: number; saves: number };
  category: { slug: string; name: string; emoji: string };
};

const WINDOWS: { value: TrendingWindow; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

/** Human reason line, e.g. "3 new reviews · 5 saves this week". */
function reasonLine(
  signals: TrendingRow["signals"],
  window: TrendingWindow,
): string {
  const span = window === "month" ? "this month" : "this week";
  const parts: string[] = [];
  if (signals.reviews > 0)
    parts.push(
      `${signals.reviews} new review${signals.reviews === 1 ? "" : "s"}`,
    );
  if (signals.saves > 0)
    parts.push(
      `${signals.saves} save${signals.saves === 1 ? "" : "s"} ${span}`,
    );
  if (signals.comments > 0)
    parts.push(
      `${signals.comments} comment${signals.comments === 1 ? "" : "s"}`,
    );
  return parts.join(" · ");
}

export function TrendingStrip() {
  const [window, setWindow] = useState<TrendingWindow>("week");
  // null → loading (skeletons); [] → fetch failed or nothing to show (render null)
  const [rows, setRows] = useState<TrendingRow[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/trending?window=${window}&limit=8`)
      .then((r) => {
        if (!r.ok) throw new Error("trending fetch failed");
        return r.json() as Promise<{ rows: TrendingRow[] }>;
      })
      .then((d) => {
        if (alive) setRows(d.rows);
      })
      .catch(() => {
        if (alive) setRows([]);
      });
    return () => {
      alive = false;
    };
  }, [window]);

  const switchWindow = (w: TrendingWindow) => {
    if (w === window) return;
    setWindow(w);
    setRows(null); // skeletons while refetching
  };

  // Failure, empty feed, or nothing that actually happened in the window.
  //
  // With no comments/reviews/saves every score is 0, and a wall of "+0.0"
  // rows reads as fake telemetry — worse than no section. Hide it until
  // there is genuine engagement to show.
  const engaged = rows?.filter(
    (r) => r.signals.comments + r.signals.reviews + r.signals.saves > 0,
  );
  if (rows !== null && (engaged?.length ?? 0) === 0) return null;

  return (
    <section
      id="trending"
      className="border-t border-white/[0.08] bg-ink py-20 md:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* header */}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="inline-flex items-center font-mono text-xs font-semibold tracking-[0.25em] text-ember uppercase">
              <Flame className="mr-1.5 size-3.5 text-ember-tint" aria-hidden />
              Trending telemetry ({window})
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl text-balance">
              What the community is testing.
            </h2>
            <p className="mt-3 max-w-xl text-sm text-white/60 text-pretty">
              Ranked by real engagement (comments, reviews, and collection
              saves) over the selected window. No paid placement, no editorial
              weighting: a tool ranks here because people used it.
            </p>
          </div>

          {/* window toggle - precision segmented control */}
          <div
            className="flex rounded-lg border border-white/10 bg-white/[0.03] p-1"
            role="group"
            aria-label="Trending window"
          >
            {WINDOWS.map((w) => (
              <button
                key={w.value}
                type="button"
                onClick={() => switchWindow(w.value)}
                aria-pressed={window === w.value}
                className={cn(
                  "rounded-md px-3.5 py-1 font-mono text-xs font-medium tracking-wider uppercase transition-all",
                  window === w.value
                    ? "bg-ember text-coal font-semibold shadow-sm"
                    : "text-white/60 hover:text-white",
                )}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* ranked grid */}
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {rows === null &&
            Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg border border-white/10 bg-white/[0.03]"
              />
            ))}

          {engaged?.slice(0, 8).map((row, i) => (
            <div
              key={row.slug}
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 transition-colors hover:border-ember/40 hover:bg-white/[0.04]"
            >
              <span className="w-6 shrink-0 text-center font-mono text-xs font-bold text-white/60 tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>

              <ToolLogo
                slug={row.slug}
                name={row.name}
                logoUrl={row.logoUrl}
                emoji={row.emoji}
                gradient={row.gradient}
                size="md"
              />

              <div className="min-w-0 flex-1">
                <Link
                  href={`/tools/${row.slug}`}
                  aria-label={`Open ${row.name} on Prother`}
                  className="block max-w-full truncate text-left text-sm font-bold text-white transition-colors hover:text-ember"
                >
                  {row.name}
                </Link>
                <p className="truncate text-xs text-white/55">{row.tagline}</p>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1">
                <span
                  title="Trending engagement score"
                  className="rounded border border-mint/30 bg-mint/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-mint"
                >
                  +{row.score.toFixed(1)}
                </span>
                <span className="whitespace-nowrap font-mono text-[11px] text-white/50">
                  {reasonLine(row.signals, window) ||
                    `${row.category.emoji} ${row.category.name}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
