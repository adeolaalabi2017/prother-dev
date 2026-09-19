"use client";

import { create } from "zustand";

/**
 * Module-level UI store shared by the header, feed rows, sidebar chips,
 * and the ToolExplorer dialogs (detail modal + ⌘K command palette).
 */
type ExplorerState = {
  /** Slug of the tool shown in the detail modal, if any. */
  slug: string | null;
  /** Whether the ⌘K command palette is open. */
  searchOpen: boolean;
  /** Category slug currently filtering the launch feed, if any. */
  categoryFilter: string | null;
  openTool: (slug: string) => void;
  closeTool: () => void;
  setSearch: (open: boolean) => void;
  setCategoryFilter: (slug: string | null) => void;
};

/** URL hash used for shareable tool deep links (#tool=<slug>). */
export function toolHash(slug: string): string {
  return `#tool=${encodeURIComponent(slug)}`;
}

/**
 * Keep the active category filter in the URL (?cat=<slug>) so filtered
 * views are shareable and survive reloads. Uses replaceState — no history spam.
 */
function syncCatParam(slug: string | null): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  let changed = false;
  if (slug) {
    if (url.searchParams.get("cat") !== slug) {
      url.searchParams.set("cat", slug);
      changed = true;
    }
  } else if (url.searchParams.has("cat")) {
    url.searchParams.delete("cat");
    changed = true;
  }
  if (changed) {
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }
}

export const useExplorer = create<ExplorerState>((set) => ({
  slug: null,
  searchOpen: false,
  categoryFilter: null,
  openTool: (slug) => {
    set({ slug });
    // Keep the URL in sync so the modal state is shareable (no history entries).
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", toolHash(slug));
    }
  },
  closeTool: () => {
    set({ slug: null });
    if (typeof window !== "undefined") {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }
  },
  setSearch: (searchOpen) => set({ searchOpen }),
  setCategoryFilter: (categoryFilter) => {
    set({ categoryFilter });
    syncCatParam(categoryFilter);
  },
}));
