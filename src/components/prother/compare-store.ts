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

/** The floating compare tray shows when there is something to compare,
 *  except under the compare, tool, post and mine full pages. The tray sits
 *  above full pages (z-65 over the shell's z-60), so it stays visible over
 *  the category, collection and saved pages. */
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

/** The 0 to 4 selected slugs (array identity changes only on add/remove). */
export function useCompareSlugs(): string[] {
  return useExplorer((s) => s.compare);
}
