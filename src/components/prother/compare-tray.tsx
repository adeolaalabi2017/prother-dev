"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Scale, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExplorer } from "./explorer-store";
import { useCompareTrayVisible } from "./compare-store";

/**
 * Floating compare tray (PRD F-08 lite) — a bottom pill that follows the
 * visitor across the feed after they add tools to a comparison. One slug:
 * nudge to pick another. Two slugs: jump straight into the side-by-side page.
 * Hidden whenever any full page (tool / post / mine) is stacked on top.
 */

type DirectoryRow = { slug: string; name: string };

export function CompareTray() {
  const visible = useCompareTrayVisible();
  const slugs = useExplorer((s) => s.compare);
  const removeCompare = useExplorer((s) => s.removeCompare);
  const openCompare = useExplorer((s) => s.openCompare);
  const reducedMotion = useReducedMotion();
  const [names, setNames] = useState<Record<string, string>>({});

  // Resolve slug → display name from the public directory (graceful: the
  // tray falls back to the raw slug if the directory is unreachable).
  useEffect(() => {
    if (!visible || slugs.length === 0) return;
    let alive = true;
    fetch("/api/tools?limit=60&sort=votes")
      .then(async (res) => {
        if (!res.ok) throw new Error("directory unavailable");
        return (await res.json()) as { rows: DirectoryRow[] };
      })
      .then((data) => {
        if (!alive) return;
        const map: Record<string, string> = {};
        for (const r of data.rows ?? []) map[r.slug] = r.name;
        setNames(map);
      })
      .catch(() => {
        /* tray still works — chips fall back to slugs */
      });
    return () => {
      alive = false;
    };
  }, [visible, slugs.length]);

  const nameOf = (slug: string) => names[slug] ?? slug;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="region"
          aria-label="Compare tray"
          initial={reducedMotion ? false : { opacity: 0, y: 24, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={reducedMotion ? undefined : { opacity: 0, y: 24, x: "-50%" }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="fixed bottom-4 left-1/2 z-[65] -translate-x-1/2"
        >
          <div className="flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full border border-ember/40 bg-coal px-4 py-2.5 shadow-2xl shadow-black/60">
            <Scale className="size-4 shrink-0 text-ember" aria-hidden />
            {slugs.length === 1 && (
              <>
                <p className="truncate font-mono text-xs uppercase tracking-[0.2em] text-white/80">
                  Compare · {nameOf(slugs[0]!)}
                </p>
                <p className="hidden truncate font-mono text-xs uppercase tracking-[0.2em] text-white/60 sm:block">
                  Pick one more tool
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${nameOf(slugs[0]!)} from comparison`}
                  onClick={() => removeCompare(slugs[0]!)}
                  className="ml-1 size-9 shrink-0 rounded-full text-white/50 hover:bg-white/10 hover:text-white"
                >
                  <X className="size-4" aria-hidden />
                </Button>
              </>
            )}

            {slugs.length === 2 && (
              <>
                <div className="flex min-w-0 items-center gap-1.5">
                  {slugs.map((slug, i) => (
                    <span
                      key={slug}
                      className="flex min-w-0 items-center gap-1 rounded-full border border-white/15 bg-white/[0.04] py-1 pl-2.5 pr-1"
                    >
                      <span className="max-w-28 truncate text-xs font-semibold text-white/90 sm:max-w-36">
                        {nameOf(slug)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeCompare(slug)}
                        aria-label={`Remove ${nameOf(slug)} from comparison`}
                        className="flex size-6 shrink-0 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <X className="size-3" aria-hidden />
                      </button>
                      {i === 0 && (
                        <span
                          aria-hidden
                          className="mr-1 shrink-0 font-mono text-xs text-ember"
                        >
                          VS
                        </span>
                      )}
                    </span>
                  ))}
                </div>
                <Button
                  type="button"
                  onClick={() => openCompare(slugs[0]!, slugs[1]!)}
                  className="h-10 shrink-0 rounded-full bg-ember px-4 font-mono text-sm font-black tracking-wider text-[#0A0A0A] hover:bg-ember-hot"
                >
                  COMPARE →
                </Button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
