"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { create } from "zustand";
import { useSession } from "next-auth/react";
import { getVoterKey } from "./voter";

/**
 * Bookmarks (Task 23) — client side of /api/bookmarks.
 *
 * One module-level zustand store holds the whole saved list for the current
 * owner, fetched lazily ONCE (no per-row requests): every useBookmark()
 * consumer checks membership locally and toggles via POST, updating the
 * same store so the Saved overlay (?saved=mine) stays in sync for free.
 *
 * Owner identity mirrors the server: signed-in scope wins (email, resolved
 * server-side — the client omits ownerKey), anonymous visitors use the same
 * localStorage voterKey as votes (`anon:<visitorKey>` server-side). The list
 * is (re)loaded whenever the session resolves or the owner hint changes.
 */

export type BookmarkTargetType = "tool" | "thread" | "post";

export type BookmarkItem = {
  id: string;
  targetType: BookmarkTargetType;
  targetId: string;
  targetLabel: string;
  targetHref: string;
  createdAt: string;
};

/** Owner hint: "session" = signed-in (server resolves), else the raw visitor key. */
type OwnerHint = string;

function ownerHintFor(status: "authenticated" | "unauthenticated" | "loading"): OwnerHint | null {
  if (status === "authenticated") return "session";
  if (status === "unauthenticated") {
    const key = getVoterKey();
    return key || null;
  }
  // Session still resolving — wait, so we never load the anon list twice.
  return null;
}

async function fetchBookmarkList(hint: OwnerHint): Promise<BookmarkItem[]> {
  const url =
    hint === "session"
      ? "/api/bookmarks"
      : `/api/bookmarks?ownerKey=${encodeURIComponent(hint)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`bookmarks_list_${res.status}`);
  const j = (await res.json()) as { items?: BookmarkItem[] };
  return Array.isArray(j.items) ? j.items : [];
}

type BookmarkStore = {
  /** null = not loaded yet. */
  items: BookmarkItem[] | null;
  /** Owner hint the current list belongs to. */
  owner: OwnerHint | null;
  loadError: boolean;
  ensure: (hint: OwnerHint, force?: boolean) => Promise<void>;
  upsert: (item: BookmarkItem) => void;
  remove: (targetType: BookmarkTargetType, targetId: string) => void;
  replaceAll: (items: BookmarkItem[]) => void;
};

// In-flight dedupe lives outside the store — two consumers mounting at once
// share one request instead of racing two.
let inflight: Promise<void> | null = null;
let inflightFor: OwnerHint | null = null;

const useBookmarkStore = create<BookmarkStore>((set, get) => ({
  items: null,
  owner: null,
  loadError: false,

  ensure: async (hint, force = false) => {
    const s = get();
    if (!force && !s.loadError && s.owner === hint && s.items !== null) return;
    if (inflight && inflightFor === hint) return inflight;
    inflightFor = hint;
    inflight = (async () => {
      try {
        const items = await fetchBookmarkList(hint);
        set({ items, owner: hint, loadError: false });
      } catch {
        set({ loadError: true, owner: hint });
      } finally {
        inflight = null;
        inflightFor = null;
      }
    })();
    return inflight;
  },

  upsert: (item) =>
    set((s) => {
      const rest = (s.items ?? []).filter(
        (i) => !(i.targetType === item.targetType && i.targetId === item.targetId)
      );
      return { items: [item, ...rest] };
    }),

  remove: (targetType, targetId) =>
    set((s) => ({
      items: (s.items ?? []).filter(
        (i) => !(i.targetType === targetType && i.targetId === targetId)
      ),
    })),

  replaceAll: (items) => set({ items }),
}));

// ── Whole-list hook (Saved overlay) ─────────────────────────────────────

export function useBookmarksList() {
  const { status } = useSession();
  const items = useBookmarkStore((s) => s.items);
  const loadError = useBookmarkStore((s) => s.loadError);

  // Load (or reload on owner change) once the session has resolved.
  useEffect(() => {
    const hint = ownerHintFor(status);
    if (!hint) return;
    const store = useBookmarkStore.getState();
    // Owner changed (e.g. signed in after bookmarking anonymously) → refetch.
    void store.ensure(hint, store.owner !== null && store.owner !== hint);
  }, [status]);

  const refresh = useCallback(async () => {
    // Re-fetch for whatever owner the list currently belongs to (falls back
    // to the anon key when the list was never loaded — a refresh before the
    // first load is a no-op in practice).
    const hint = useBookmarkStore.getState().owner ?? getVoterKey();
    if (!hint) return;
    await useBookmarkStore.getState().ensure(hint, true);
  }, []);

  return {
    items,
    loading: items === null && !loadError,
    error: loadError,
    refresh,
  };
}

// ── Single-target hook (tool page, thread page) ─────────────────────────

export function useBookmark(targetType: BookmarkTargetType, targetId?: string | null) {
  const { status } = useSession();

  const items = useBookmarkStore((s) => s.items);
  const loadError = useBookmarkStore((s) => s.loadError);

  useEffect(() => {
    const hint = ownerHintFor(status);
    if (!hint) return;
    const store = useBookmarkStore.getState();
    void store.ensure(hint, store.owner !== null && store.owner !== hint);
  }, [status]);

  const bookmarked = useMemo(
    () =>
      !!targetId &&
      (items ?? []).some((i) => i.targetType === targetType && i.targetId === targetId),
    [items, targetType, targetId]
  );

  const [pending, setPending] = useState(false);

  const toggle = useCallback(
    async (meta?: { label?: string; href?: string }): Promise<boolean | null> => {
      if (!targetId || pending) return null;
      const key = getVoterKey();
      const store = useBookmarkStore.getState();
      const wasBookmarked = (store.items ?? []).some(
        (i) => i.targetType === targetType && i.targetId === targetId
      );
      const prevItem = (store.items ?? []).find(
        (i) => i.targetType === targetType && i.targetId === targetId
      );

      // Optimistic — instant feedback, reconciled against the server reply.
      if (wasBookmarked) {
        store.remove(targetType, targetId);
      } else {
        store.upsert({
          id: `local:${targetType}:${targetId}`,
          targetType,
          targetId,
          targetLabel: meta?.label ?? targetId,
          targetHref: meta?.href ?? "#",
          createdAt: new Date().toISOString(),
        });
      }

      setPending(true);
      try {
        const res = await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetType,
            targetId,
            action: "toggle",
            visitorKey: key || undefined,
          }),
        });
        if (!res.ok) throw new Error(`bookmark_${res.status}`);
        const j = (await res.json()) as { bookmarked: boolean };
        // Server truth (covers scope surprises — signed-in wins server-side).
        if (j.bookmarked) {
          useBookmarkStore.getState().upsert({
            id: prevItem?.id ?? `local:${targetType}:${targetId}`,
            targetType,
            targetId,
            targetLabel: meta?.label ?? prevItem?.targetLabel ?? targetId,
            targetHref: meta?.href ?? prevItem?.targetHref ?? "#",
            createdAt: prevItem?.createdAt ?? new Date().toISOString(),
          });
        } else {
          useBookmarkStore.getState().remove(targetType, targetId);
        }
        return j.bookmarked;
      } catch {
        // Revert to the pre-toggle state.
        if (wasBookmarked && prevItem) {
          useBookmarkStore.getState().upsert(prevItem);
        } else if (!wasBookmarked) {
          useBookmarkStore.getState().remove(targetType, targetId);
        }
        return null;
      } finally {
        setPending(false);
      }
    },
    [targetType, targetId, pending]
  );

  return {
    bookmarked,
    /** True while the owner's list is still loading (first paint). */
    ready: items !== null || loadError,
    pending,
    toggle,
  };
}

/** Remove a saved item (Saved overlay rows) — optimistic with revert. */
export async function removeBookmark(
  targetType: BookmarkTargetType,
  targetId: string
): Promise<boolean> {
  const key = getVoterKey();
  const store = useBookmarkStore.getState();
  const snapshot = store.items ?? [];
  store.remove(targetType, targetId);
  try {
    const res = await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType,
        targetId,
        action: "remove",
        visitorKey: key || undefined,
      }),
    });
    if (!res.ok) throw new Error(`bookmark_${res.status}`);
    return true;
  } catch {
    useBookmarkStore.getState().replaceAll(snapshot);
    return false;
  }
}
