"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  Check,
  Flag,
  Share2,
  Triangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getVoterKey } from "./voter";
import { useBookmark } from "./use-bookmarks";
import { ReportDialog } from "./report-dialog";

/**
 * Client island for the SSR tool page (Task 25) — the interactive sliver of
 * /tools/[slug]. Mirrors the ToolFullPage overlay's action mechanics exactly:
 *  · UPVOTE  → POST /api/vote { launchId, voterKey }, optimistic toggle with
 *    revert + toast on failure, broadcasts the `prother:vote` event so the
 *    homepage feed (if ever sharing the page) stays in sync. The visitor's
 *    existing ballot is learned on mount via the ?vk detail fetch (same
 *    pattern as the forum vote pill) — setState only in fetch continuations.
 *  · SAVE    → the shared useBookmark store ("tool", slug) so the Saved
 *    overlay (?saved=mine) and the overlay's save button stay in sync.
 *  · SHARE   → navigator.share with clipboard fallback on the clean URL
 *    /tools/<slug>.
 *  · REPORT  → the shared ReportDialog with the overlay's exact props.
 */

export function ToolDetailActions({
  slug,
  name,
  launchId,
  initialVotes,
}: {
  slug: string;
  name: string;
  launchId: string | null;
  /** Server-rendered vote total (baseUpvotes + vote count). */
  initialVotes: number;
}) {
  const { toast } = useToast();
  const [vote, setVote] = useState({ votes: initialVotes, voted: false });
  const [copied, setCopied] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  // Learn this visitor's existing ballot (1 vote per visitor per launch,
  // F-14) — the SSR HTML can't know the localStorage voterKey.
  useEffect(() => {
    if (!launchId) return;
    let alive = true;
    fetch(`/api/tools/${encodeURIComponent(slug)}?vk=${encodeURIComponent(getVoterKey())}`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? (r.json() as Promise<{ voted?: boolean; votes?: number }>) : null))
      .then((j) => {
        if (alive && j && typeof j.votes === "number") {
          setVote({ votes: j.votes, voted: !!j.voted });
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [launchId, slug]);

  const onVote = useCallback(async () => {
    if (!launchId) return;
    const prev = vote;
    const nextVoted = !prev.voted;
    setVote({ votes: prev.votes + (nextVoted ? 1 : -1), voted: nextVoted });
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ launchId, voterKey: getVoterKey() }),
      });
      const data = (await res.json()) as { voted: boolean; votes: number };
      setVote({ votes: data.votes, voted: data.voted });
      window.dispatchEvent(
        new CustomEvent("prother:vote", {
          detail: { launchId, votes: data.votes, voted: data.voted },
        })
      );
    } catch {
      setVote(prev);
      toast({ title: "Vote failed", description: "Please try again.", variant: "destructive" });
    }
  }, [launchId, vote, toast]);

  // Same store/wiring as the overlay (Task 23): targetType "tool",
  // targetId = slug, label + href exactly as tool-full-page passes them.
  const {
    bookmarked,
    pending: bookmarkPending,
    toggle: toggleBookmark,
  } = useBookmark("tool", slug);

  const onBookmark = useCallback(() => {
    void toggleBookmark({ label: name, href: `/?tool=${slug}` });
  }, [toggleBookmark, name, slug]);

  const onShare = useCallback(async () => {
    const url = `${window.location.origin}/tools/${slug}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `${name} — Prother`, url });
        return;
      } catch (err) {
        // User dismissed the share sheet — not an error.
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Unsupported-ish or denied → fall through to the clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
      toast({ title: "Link copied" });
    } catch {
      toast({
        title: "Could not copy the link",
        description: url,
        variant: "destructive",
      });
    }
  }, [slug, name, toast]);

  const iconBtn =
    "inline-flex size-11 items-center justify-center rounded-full border bg-white/[0.03] transition-colors hover:bg-white/[0.08]";

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={`${name} actions`}>
      <button
        type="button"
        onClick={() => void onVote()}
        disabled={!launchId}
        aria-label={vote.voted ? "Remove upvote" : "Upvote this tool"}
        aria-pressed={vote.voted}
        className={cn(
          "inline-flex h-11 items-center gap-2 rounded-full px-5 text-base font-black tabular-nums transition active:scale-95",
          vote.voted
            ? "border border-ember bg-ember/10 text-ember"
            : "bg-ember text-[#0A0A0A] hover:bg-ember-hot",
          !launchId && "cursor-not-allowed opacity-40"
        )}
      >
        <Triangle
          className="size-4"
          fill={vote.voted ? "currentColor" : "none"}
          aria-hidden
        />
        {vote.votes}
      </button>

      <button
        type="button"
        aria-label={bookmarked ? `Remove ${name} from saved` : `Save ${name} for later`}
        aria-pressed={bookmarked}
        disabled={bookmarkPending}
        onClick={onBookmark}
        className={cn(
          iconBtn,
          "border-white/10 hover:border-ember/40",
          bookmarked ? "text-ember" : "text-white/70 hover:text-ember"
        )}
      >
        {bookmarked ? (
          <BookmarkCheck className="size-4 fill-ember" aria-hidden />
        ) : (
          <Bookmark className="size-4" aria-hidden />
        )}
      </button>

      <button
        type="button"
        aria-label={`Share ${name}`}
        onClick={() => void onShare()}
        className={cn(
          iconBtn,
          "border-white/10 hover:border-ember/40",
          copied ? "text-mint" : "text-white/70 hover:text-ember"
        )}
      >
        {copied ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <Share2 className="size-4" aria-hidden />
        )}
      </button>

      <button
        type="button"
        aria-label={`Report ${name}`}
        onClick={() => setReportOpen(true)}
        className={cn(
          iconBtn,
          "border-white/10 text-white/40 hover:border-ember/40 hover:text-ember"
        )}
      >
        <Flag className="size-4" aria-hidden />
      </button>

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="tool"
        targetId={slug}
        targetLabel={name}
      />
    </div>
  );
}
