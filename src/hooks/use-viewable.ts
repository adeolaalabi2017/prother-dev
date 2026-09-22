"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * useViewable (Task 28, P4) — MRC viewability for Prother's own slots:
 * fires `onViewable` at most once per mount when the ref'd element has been
 * ≥50% visible on screen for a continuous ≥1s (the IAB/MRC standard behind
 * viewableImpressions / impressions = vRate).
 *
 * Implementation notes:
 *  · IntersectionObserver threshold 0.5; a 1s timer starts when the box
 *    crosses in and clears when it leaves — scrolling away cancels the count.
 *  · `active` gates arming (a slot only counts once a real creative has
 *    rendered — never while the reserved skeleton is up).
 *  · firedRef survives effect re-runs → exactly one ping per mount,
 *    StrictMode-safe; cbRef forwards the freshest callback without re-arming
 *    (closures passed by callers change identity every render).
 *  · `onViewable` must be fire-and-forget — the hook never awaits or renders.
 */
export function useViewable(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onViewable: () => void
) {
  const firedRef = useRef(false);
  const cbRef = useRef(onViewable);
  // Sync the latest callback post-render (react-hooks/refs forbids ref writes
  // during render). The ping itself fires ≥1s later, so this is always fresh.
  useEffect(() => {
    cbRef.current = onViewable;
  }, [onViewable]);

  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            if (!firedRef.current && timer === null) {
              timer = setTimeout(() => {
                if (firedRef.current) return;
                firedRef.current = true;
                cbRef.current();
              }, 1000);
            }
          } else if (timer !== null) {
            // Left the ≥50% zone before the second completed — restart on re-entry.
            clearTimeout(timer);
            timer = null;
          }
        }
      },
      { threshold: [0.5] }
    );

    io.observe(el);
    return () => {
      if (timer !== null) clearTimeout(timer);
      io.disconnect();
    };
  }, [ref, active]);
}
