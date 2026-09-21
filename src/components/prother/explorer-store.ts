"use client";

import { create } from "zustand";
import type { SubmitPrefill } from "@/lib/submit";

/**
 * Module-level UI store shared by the header, feed rows, sidebar chips,
 * and the full-page deep-link views (tool page, journal reader, category,
 * launch archive, compare, collections).
 *
 * URL model (single-route sandbox — the post-sandbox real routes are
 * /tool/{slug}, /journal/{slug}, /category/{slug}, /launches/{date},
 * /compare/{a}/{b}, /collections/{slug}):
 *   ?tool=<slug>          tool full page
 *   ?post=<slug>          journal article full page
 *   ?category=<slug>      category browse full page
 *   ?launches=<date>      launch archive full page (YYYY-MM-DD)
 *   ?compare=<a>,<b>      side-by-side comparison full page
 *   ?collection=<slug>    public collection full page
 *   ?mine=collections     my collections + follows full page
 *   ?cat=<slug>           launch-feed category FILTER (not a page)
 *
 * Every open/close pushes a history entry, so the browser Back button
 * closes pages naturally. DeepLinkHost (page.tsx tree) replays
 * ?params into the store on boot (replace) and on popstate (sync).
 */
type ExplorerState = {
  /** Slug of the tool full page, if any. */
  slug: string | null;
  /** Whether the ⌘K command palette is open. */
  searchOpen: boolean;
  /** Whether the submission wizard (PRD §11) is open. */
  submitOpen: boolean;
  /** Wizard prefill ("Resubmit with fixes") — null for plain opens. */
  submitPrefill: SubmitPrefill | null;
  /** Whether the editor review console is open. */
  editorOpen: boolean;
  /** Whether the maker status tracker is open. */
  trackOpen: boolean;
  /** Email pre-filled into the tracker lookup. */
  trackEmail: string;
  /** Category slug currently filtering the launch feed (not a page). */
  categoryFilter: string | null;
  /** Slug of the journal article full page, if any. */
  postSlug: string | null;
  /** Category browse full page slug. */
  categoryView: string | null;
  /** Launch archive full page date (YYYY-MM-DD). */
  launchesDate: string | null;
  /** Compare tray selection (max 2) + whether the compare page is open. */
  compare: string[];
  compareOpen: boolean;
  /** Public collection full page slug. */
  collectionSlug: string | null;
  /** "collections" — my collections + follows page. */
  mineView: string | null;

  openTool: (slug: string, opts?: OpenOpts) => void;
  closeTool: (opts?: OpenOpts) => void;
  setSearch: (open: boolean) => void;
  setSubmitOpen: (open: boolean, prefill?: SubmitPrefill) => void;
  setEditorOpen: (open: boolean) => void;
  setTrackOpen: (open: boolean, email?: string) => void;
  setCategoryFilter: (slug: string | null) => void;
  openPost: (slug: string, opts?: OpenOpts) => void;
  closePost: (opts?: OpenOpts) => void;
  openCategory: (slug: string, opts?: OpenOpts) => void;
  closeCategory: (opts?: OpenOpts) => void;
  openLaunches: (date: string, opts?: OpenOpts) => void;
  closeLaunches: (opts?: OpenOpts) => void;
  addCompare: (slug: string) => void;
  removeCompare: (slug: string) => void;
  openCompare: (a: string, b: string, opts?: OpenOpts) => void;
  closeCompare: (opts?: OpenOpts) => void;
  openCollection: (slug: string, opts?: OpenOpts) => void;
  closeCollection: (opts?: OpenOpts) => void;
  openMine: (view?: string, opts?: OpenOpts) => void;
  closeMine: (opts?: OpenOpts) => void;
  /** Replay a URL's ?params into the store without touching history. */
  syncFromUrl: (search: string) => void;
};

export type OpenOpts = {
  /** Write the change to history (default true). */
  sync?: boolean;
  /** Use replaceState instead of pushState (boot-time deep links). */
  replace?: boolean;
};

/** Canonical share URL for a tool (?tool=<slug>). */
export function toolShareUrl(slug: string): string {
  return `/?tool=${encodeURIComponent(slug)}`;
}

/** Legacy hash helpers kept for back-compat with older shared links. */
export function toolHash(slug: string): string {
  return `#tool=${encodeURIComponent(slug)}`;
}

export function postHash(slug: string): string {
  return `#post=${encodeURIComponent(slug)}`;
}

/** Query params owned by full-page views (in stack order). */
const PAGE_PARAMS = ["mine", "collection", "category", "launches", "compare", "post", "tool"] as const;

function urlWith(mutate: (u: URL) => void): string {
  const url = new URL(window.location.href);
  mutate(url);
  return url.pathname + url.search + url.hash;
}

/** Stable write helper: push (default) or replace. */
function writeHistory(href: string, replace: boolean): void {
  if (replace) window.history.replaceState(null, "", href);
  else window.history.pushState(null, "", href);
}

/** Set or delete a query param on the current URL string. */
function withParam(key: string, value: string | null, replace: boolean, extraHash?: string): void {
  if (typeof window === "undefined") return;
  writeHistory(
    urlWith((u) => {
      if (value === null) u.searchParams.delete(key);
      else u.searchParams.set(key, value);
      if (extraHash !== undefined && value !== null) u.hash = extraHash;
    }),
    replace
  );
}

export const useExplorer = create<ExplorerState>((set, get) => ({
  slug: null,
  searchOpen: false,
  submitOpen: false,
  submitPrefill: null,
  editorOpen: false,
  trackOpen: false,
  trackEmail: "",
  categoryFilter: null,
  postSlug: null,
  categoryView: null,
  launchesDate: null,
  compare: [],
  compareOpen: false,
  collectionSlug: null,
  mineView: null,

  openTool: (slug, opts) => {
    set({ slug });
    if (opts?.sync !== false && typeof window !== "undefined") {
      withParam("tool", slug, opts?.replace ?? false);
    }
  },
  closeTool: (opts) => {
    if (get().slug === null) return;
    set({ slug: null });
    if (opts?.sync !== false && typeof window !== "undefined") {
      withParam("tool", null, opts?.replace ?? false);
    }
  },
  setSearch: (searchOpen) => set({ searchOpen }),
  setSubmitOpen: (submitOpen, prefill) =>
    set({ submitOpen, submitPrefill: submitOpen ? prefill ?? null : null }),
  setEditorOpen: (editorOpen) => set({ editorOpen }),
  setTrackOpen: (trackOpen, email) =>
    set((s) => ({
      trackOpen,
      trackEmail: email !== undefined ? email : s.trackEmail,
    })),
  setCategoryFilter: (categoryFilter) => {
    set({ categoryFilter });
    // Feed filter stays replaceState — it's a view state, not a page.
    if (typeof window === "undefined") return;
    const href = urlWith((u) => {
      if (categoryFilter) u.searchParams.set("cat", categoryFilter);
      else u.searchParams.delete("cat");
    });
    window.history.replaceState(null, "", href);
  },
  openPost: (slug, opts) => {
    set({ postSlug: slug });
    if (opts?.sync !== false && typeof window !== "undefined") {
      withParam("post", slug, opts?.replace ?? false, postHash(slug));
    }
  },
  closePost: (opts) => {
    if (get().postSlug === null) return;
    set({ postSlug: null });
    if (opts?.sync !== false && typeof window !== "undefined") {
      withParam("post", null, opts?.replace ?? false);
    }
  },
  openCategory: (slug, opts) => {
    set({ categoryView: slug });
    if (opts?.sync !== false && typeof window !== "undefined") {
      withParam("category", slug, opts?.replace ?? false);
    }
  },
  closeCategory: (opts) => {
    if (get().categoryView === null) return;
    set({ categoryView: null });
    if (opts?.sync !== false && typeof window !== "undefined") {
      withParam("category", null, opts?.replace ?? false);
    }
  },
  openLaunches: (date, opts) => {
    set({ launchesDate: date });
    if (opts?.sync !== false && typeof window !== "undefined") {
      withParam("launches", date, opts?.replace ?? false);
    }
  },
  closeLaunches: (opts) => {
    if (get().launchesDate === null) return;
    set({ launchesDate: null });
    if (opts?.sync !== false && typeof window !== "undefined") {
      withParam("launches", null, opts?.replace ?? false);
    }
  },
  addCompare: (slug) => {
    const cur = get().compare;
    if (cur.includes(slug)) return;
    set({ compare: [...cur, slug].slice(-2) });
  },
  removeCompare: (slug) => set({ compare: get().compare.filter((s) => s !== slug) }),
  openCompare: (a, b, opts) => {
    set({ compare: [a, b], compareOpen: true });
    if (opts?.sync !== false && typeof window !== "undefined") {
      withParam(
        "compare",
        `${encodeURIComponent(a)},${encodeURIComponent(b)}`,
        opts?.replace ?? false
      );
    }
  },
  closeCompare: (opts) => {
    if (!get().compareOpen) return;
    set({ compareOpen: false });
    if (opts?.sync !== false && typeof window !== "undefined") {
      withParam("compare", null, opts?.replace ?? false);
    }
  },
  openCollection: (slug, opts) => {
    set({ collectionSlug: slug });
    if (opts?.sync !== false && typeof window !== "undefined") {
      withParam("collection", slug, opts?.replace ?? false);
    }
  },
  closeCollection: (opts) => {
    if (get().collectionSlug === null) return;
    set({ collectionSlug: null });
    if (opts?.sync !== false && typeof window !== "undefined") {
      withParam("collection", null, opts?.replace ?? false);
    }
  },
  openMine: (view = "collections", opts) => {
    set({ mineView: view });
    if (opts?.sync !== false && typeof window !== "undefined") {
      withParam("mine", view, opts?.replace ?? false);
    }
  },
  closeMine: (opts) => {
    if (get().mineView === null) return;
    set({ mineView: null });
    if (opts?.sync !== false && typeof window !== "undefined") {
      withParam("mine", null, opts?.replace ?? false);
    }
  },

  syncFromUrl: (search) => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(search);
    // Legacy #tool= / #post= hash deep links still boot their page.
    const hash = window.location.hash;
    const tool = sp.get("tool") ?? (hash.startsWith("#tool=") ? decodeURIComponent(hash.slice(6)) : null);
    const post = sp.get("post") ?? (hash.startsWith("#post=") ? decodeURIComponent(hash.slice(6)) : null);
    const compareRaw = sp.get("compare") ?? "";
    const compare = compareRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 2);
    set({
      slug: tool,
      postSlug: post,
      categoryView: sp.get("category"),
      launchesDate: sp.get("launches"),
      collectionSlug: sp.get("collection"),
      mineView: sp.get("mine"),
      compare,
      compareOpen: compare.length === 2,
    });
  },
}));

/** Exposed for the DeepLinkHost: param names, stack order matters for z-index. */
export const FULL_PAGE_PARAMS = PAGE_PARAMS;
