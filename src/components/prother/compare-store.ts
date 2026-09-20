"use client";

/**
 * Compare selectors over the explorer store.
 *
 * The explorer-store already owns all compare state (`compare`, `compareOpen`)
 * and its actions (`addCompare` / `removeCompare` / `openCompare`) — this file
 * deliberately does NOT duplicate any of it. It only exports tiny granular
 * selectors so the tray and pages can subscribe without re-rendering on every
 * unrelated explorer state change.
 */

import { useExplorer } from "./explorer-store";

/** The floating compare tray shows only when there is something to compare
 *  and no full page is stacked on top of the feed. */
export function useCompareTrayVisible(): boolean {
  return useExplorer(
    (s) =>
      s.compare.length > 0 &&
      !s.compareOpen &&
      !s.slug &&
      !s.postSlug &&
      !s.mineView
  );
}

/** Granular count selector (number identity — re-renders only on change). */
export function useCompareCount(): number {
  return useExplorer((s) => s.compare.length);
}

/** The 0–2 selected slugs (array identity changes only on add/remove). */
export function useCompareSlugs(): string[] {
  return useExplorer((s) => s.compare);
}
