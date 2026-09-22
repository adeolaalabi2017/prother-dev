"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { useExplorer } from "./explorer-store";
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
  window: TrendingWindow
): string {
  const span = window === "month" ? "this month" : "this week";
  const parts: string[] = [];
  if (signals.reviews > 0)
    parts.push(`${signals.reviews} new review${signals.reviews === 1 ? "" : "s"}`);
  if (signals.saves > 0)
    parts.push(`${signals.saves} save${signals.saves === 1 ? "" : "s"} ${span}`);
  if (signals.comments > 0)
    parts.push(`${signals.comments} comment${signals.comments === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

export function TrendingStrip() {
  const openTool = useExplorer((s) => s.openTool);
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

  // Failure or empty feed — the section quietly disappears.
  if (rows !== null && rows.length === 0) return null;

  return (
    <section id="trending" className="bg-ink py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* header */}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          >
            <p className="inline-flex items-center font-mono text-[10px] tracking-[0.25em] text-white/40 uppercase">
              <Flame className="mr-1.5 size-3.5 text-ember" aria-hidden />
              Trending this {window}
            </p>
            <h2 className="mt-3 text-5xl font-black tracking-tighter text-white md:text-6xl">
              What the community is <span className="text-ember">testing.</span>
            </h2>
            <p className="mt-4 max-w-xl text-lg text-white/60">
              Ranked by real engagement — comments, reviews, and collection
              saves — recalculated continuously, not by editorial whim.
            </p>
          </motion.div>

          {/* window toggle */}
          <div className="flex gap-2" role="group" aria-label="Trending window">
            {WINDOWS.map((w) => (
              <button
                key={w.value}
                type="button"
                onClick={() => switchWindow(w.value)}
                aria-pressed={window === w.value}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 font-mono text-[11px] tracking-wider uppercase transition-all active:scale-95",
                  window === w.value
                    ? "border-ember bg-ember/15 text-ember"
                    : "border-white/10 bg-white/[0.03] text-white/50 hover:border-white/25 hover:text-white/80"
                )}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* ranked grid */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {rows === null &&
            Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl border border-white/10 bg-white/[0.03]"
              />
            ))}

          {rows?.slice(0, 8).map((row, i) => (
            <motion.div
              key={row.slug}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: (i % 4) * 0.05, ease: "easeOut" }}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 transition-colors hover:border-ember/40"
            >
              <span className="w-6 shrink-0 text-center font-mono text-xs text-white/40 tabular-nums">
                {i + 1}
              </span>

              <div
                aria-hidden
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-lg shadow-inner",
                  row.gradient
                )}
              >
                {row.emoji}
              </div>

              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => openTool(row.slug)}
                  aria-label={`Open ${row.name} on Prother`}
                  className="block max-w-full truncate text-left text-sm font-bold text-white transition-colors hover:text-ember"
                >
                  {row.name}
                </button>
                <p className="truncate text-xs text-white/55">{row.tagline}</p>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1">
                <span
                  title="Trending engagement score"
                  className="rounded-full border border-mint/30 bg-mint/10 px-2 py-0.5 font-mono text-[10px] text-mint"
                >
                  +{row.score.toFixed(1)}
                </span>
                <span className="whitespace-nowrap font-mono text-[10px] text-white/40">
                  {reasonLine(row.signals, window) ||
                    `${row.category.emoji} ${row.category.name}`}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
