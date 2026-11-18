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
 *  and no full page is stacked on top of the feed. Every full page that
 *  GlobalOverlays mounts counts: the tray sits above them (z-65 over the
 *  shell's z-60), and none of them offers a way to add tools to compare. */
export function useCompareTrayVisible(): boolean {
  return useExplorer(
    (s) =>
      s.compare.length > 0 &&
      !s.compareOpen &&
      !s.slug &&
      !s.postSlug &&
      !s.categoryView &&
      !s.collectionSlug &&
      !s.mineView &&
      !s.savedView
  );
}

/** Granular count selector (number identity — re-renders only on change). */
export function useCompareCount(): number {
  return useExplorer((s) => s.compare.length);
}

/** The 0 to 4 selected slugs (array identity changes only on add/remove). */
export function useCompareSlugs(): string[] {
  return useExplorer((s) => s.compare);
}
