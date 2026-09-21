"use client";

import {
  useEffect,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import {
  Bookmark,
  BookmarkX,
  Loader2,
  MessagesSquare,
  Newspaper,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FullPageShell } from "./page-shell";
import { useExplorer } from "./explorer-store";
import {
  removeBookmark,
  useBookmarksList,
  type BookmarkItem,
  type BookmarkTargetType,
} from "./use-bookmarks";
import { ForumTime } from "./forum-thread-actions";

/**
 * Saved bookmarks full page (?saved=mine). Backed by the shared bookmark
 * store (use-bookmarks.ts) — one GET per owner, membership kept in sync with
 * every useBookmark() toggle on tool/thread pages. Works signed-out: anon
 * visitors own their bookmarks via the localStorage voter key.
 *
 * DEV-SERVER NOTE (Task 23-c): the long-running `next dev` process has the
 * ROOT LAYOUT module graph pinned (the documented stale-dev gotcha — child
 * modules hot-apply, layout.tsx's own output does not). layout.tsx on disk
 * already mounts this overlay in the deep-link stack for the post-restart
 * state; until that controlled restart the overlay is ALSO mounted from
 * back-to-top.tsx so ?saved=mine works today. The module-level claim below
 * guarantees exactly ONE live overlay instance before AND after the restart.
 * Orchestrator: after the next controlled restart, drop the temporary mount
 * in back-to-top.tsx (the layout mount is the permanent home).
 */

// Claim primitives — ALL module-state mutation lives in these functions and
// is only ever invoked from effects (render stays pure, react-hooks/globals).
let overlayOwnerToken: string | null = null;
const overlayClaimSubs = new Set<() => void>();

function claimOverlayInstance(token: string): boolean {
  if (overlayOwnerToken !== null) return false;
  overlayOwnerToken = token;
  for (const l of overlayClaimSubs) l();
  return true;
}

function releaseOverlayInstance(token: string): void {
  if (overlayOwnerToken !== token) return;
  overlayOwnerToken = null;
  for (const l of overlayClaimSubs) l();
}

function subscribeOverlayClaim(onChange: () => void): () => void {
  overlayClaimSubs.add(onChange);
  return () => {
    overlayClaimSubs.delete(onChange);
  };
}

const MONO = "font-mono text-[10px] uppercase tracking-[0.25em] text-white/40";
const PANEL = "rounded-xl border border-white/10 bg-white/[0.02]";

const TYPE_META: Record<
  BookmarkTargetType,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  tool: { label: "Tool", icon: Wrench },
  thread: { label: "Thread", icon: MessagesSquare },
  post: { label: "Post", icon: Newspaper },
};

type Filter = "all" | BookmarkTargetType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "tool", label: "Tools" },
  { value: "thread", label: "Threads" },
  { value: "post", label: "Posts" },
];

export function SavedFullPage() {
  const savedView = useExplorer((s) => s.savedView);
  const closeSaved = useExplorer((s) => s.closeSaved);
  const { items, loading, error, refresh } = useBookmarksList();

  // Single-live-instance claim (see DEV-SERVER NOTE above): the earliest
  // mounted instance wins; every other instance renders null for its whole
  // lifetime. The instance's useId() is the claim token — stable per mounted
  // instance, render-readable without refs — and useSyncExternalStore makes
  // ownership reactive without any setState-in-effect. Server snapshot (null)
  // keeps hydration stable.
  const myInstanceId = useId();
  const overlayOwner = useSyncExternalStore(
    subscribeOverlayClaim,
    () => overlayOwnerToken,
    () => null
  );

  useEffect(() => {
    claimOverlayInstance(myInstanceId);
    return () => releaseOverlayInstance(myInstanceId);
  }, [myInstanceId]);

  // Take over if the owner went away while this instance stayed mounted
  // (e.g. the claimant unmounted during HMR) — idempotent, effect-side only.
  useEffect(() => {
    if (overlayOwner === null) claimOverlayInstance(myInstanceId);
  }, [overlayOwner, myInstanceId]);

  const [filter, setFilter] = useState<Filter>("all");
  const [removing, setRemoving] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, tool: 0, thread: 0, post: 0 };
    for (const i of items ?? []) c[i.targetType] += 1;
    c.all = items?.length ?? 0;
    return c;
  }, [items]);

  const rows = useMemo(() => {
    const list = items ?? [];
    if (filter === "all") return list;
    return list.filter((i) => i.targetType === filter);
  }, [items, filter]);

  const onRemove = async (item: BookmarkItem) => {
    const key = `${item.targetType}:${item.targetId}`;
    if (removing) return;
    setRemoving(key);
    const ok = await removeBookmark(item.targetType, item.targetId);
    setRemoving(null);
    if (!ok && typeof window !== "undefined") {
      // removeBookmark already restored the snapshot; nudge with a toast-free
      // retry affordance via a plain alert-free path: re-fetch the list.
      void refresh();
    }
  };

  if (savedView !== "mine") return null;
  // Exactly one live instance — duplicates (the layout.tsx mount once it goes
  // live, while the back-to-top.tsx TEMP mount still exists) render nothing.
  if (overlayOwner !== myInstanceId) return null;

  return (
    <FullPageShell
      kicker="Account"
      breadcrumb={[{ label: "Home" }, { label: "Saved" }]}
      onClose={closeSaved}
      ariaLabel="Saved tools, threads, and posts"
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Saved
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/55">
            Your bookmarked tools, threads, and posts — kept on this device
            until you sign in, then kept with your account.
          </p>
        </div>

        {/* type filter chips */}
        <div
          role="tablist"
          aria-label="Filter saved items by type"
          className="flex flex-wrap gap-1.5"
        >
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors",
                filter === f.value
                  ? "border-ember bg-ember/15 text-ember"
                  : "border-white/10 bg-white/[0.03] text-white/55 hover:border-ember/40 hover:text-white"
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-px text-[10px] tabular-nums",
                  filter === f.value ? "bg-ember/20 text-ember" : "bg-white/10 text-white/45"
                )}
              >
                {counts[f.value]}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2" role="status" aria-live="polite" aria-label="Loading saved items">
            <span className="sr-only">Loading saved items…</span>
            {[0, 1, 2].map((i) => (
              <div key={i} className={cn(PANEL, "h-16 animate-pulse bg-white/[0.04]")} />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-red-300">
              Couldn&apos;t load your saved items — check your connection and retry.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void refresh()}
              className="shrink-0 border-white/20 text-white/70 hover:text-white"
            >
              Retry
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/15 p-10 text-center">
            <span
              aria-hidden
              className="grid size-12 place-items-center rounded-2xl border border-ember/30 bg-ember/[0.06]"
            >
              <Bookmark className="size-5 text-ember" />
            </span>
            <p className="max-w-sm text-sm leading-relaxed text-white/70">
              Nothing saved yet — tap the bookmark on any tool or thread.
            </p>
            <Link
              href="/tools"
              className="mt-1 font-mono text-[11px] uppercase tracking-[0.25em] text-ember transition-colors hover:text-ember-hot"
            >
              Browse the directory →
            </Link>
          </div>
        ) : (
          <ul className={cn(PANEL, "divide-y divide-white/[0.06]")} aria-label="Saved items">
            {rows.map((item) => {
              const meta = TYPE_META[item.targetType] ?? TYPE_META.tool;
              const Icon = meta.icon;
              const busy = removing === `${item.targetType}:${item.targetId}`;
              return (
                <li key={item.id} className="flex items-center gap-3 p-3.5 sm:gap-4">
                  <span
                    aria-hidden
                    className="grid size-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.03]"
                  >
                    <Icon className="size-4 text-ember" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={item.targetHref}
                      className="block truncate text-sm font-semibold text-white/90 transition-colors hover:text-ember"
                    >
                      {item.targetLabel}
                    </Link>
                    <p className={cn(MONO, "mt-0.5 flex items-center gap-1.5")}>
                      {meta.label}
                      <span aria-hidden>·</span>
                      saved <ForumTime iso={item.createdAt} />
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => void onRemove(item)}
                    disabled={busy}
                    aria-label={`Remove ${item.targetLabel} from saved`}
                    className="size-9 shrink-0 text-white/40 hover:bg-red-500/10 hover:text-red-400"
                  >
                    {busy ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <BookmarkX className="size-4" aria-hidden />
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </FullPageShell>
  );
}
