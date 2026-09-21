"use client";

import { useSyncExternalStore, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Bookmark,
  BookmarkCheck,
  Flag,
  Loader2,
  MessageSquare,
  Triangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getVoterKey } from "@/components/prother/voter";
import { requestSignIn } from "@/components/prother/auth-menu";
import { useBookmark } from "@/components/prother/use-bookmarks";
import { ReportDialog } from "@/components/prother/report-dialog";
import type { ForumReplyRow } from "@/lib/prother";

/**
 * /forums/[slug] interactive layer: anon vote toggle (same voterKey scheme
 * as the launch feed), thread bookmark + report (Task 23), reply list with
 * client-computed relative times and per-reply report flags, and the
 * signed-in reply composer. Thread header/body are server-rendered on
 * the page; only these parts hydrate.
 */

// ── Relative time (hydration-safe) ───────────────────────────────────────
// Before mount: stable UTC date (identical on server + client). After mount:
// "3h ago". No hydration mismatch by construction.

export function timeAgo(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime();
  const diff = Math.max(0, now - t);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return stableDate(iso);
}

function stableDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// Hydration gate without setState-in-effect: server snapshot = false,
// client snapshot = true (subscribe is a no-op — nothing external changes).
const falseSnapshot = () => false;
const trueSnapshot = () => true;
const noopSubscribe = () => () => {};

export function ForumTime({ iso, className }: { iso: string; className?: string }) {
  const mounted = useSyncExternalStore(noopSubscribe, trueSnapshot, falseSnapshot);
  return (
    <span className={className}>
      {mounted ? timeAgo(iso) : stableDate(iso)}
    </span>
  );
}

// ── Vote toggle ──────────────────────────────────────────────────────────

type VoteApi = { voted: boolean; votes: number };

function useAnonVote(slug: string, initialVotes: number) {
  const [votes, setVotes] = useState(initialVotes);
  const [voted, setVoted] = useState(false);
  const [pending, setPending] = useState(false);

  // Learn the viewer's existing vote once on mount (voterKey is
  // localStorage-only, so the server could not render it).
  useEffect(() => {
    const key = getVoterKey();
    if (!key) return;
    let alive = true;
    fetch(`/api/forum/${encodeURIComponent(slug)}?voterKey=${encodeURIComponent(key)}`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { voted?: boolean } | null) => {
        if (alive && j?.voted) setVoted(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [slug]);

  async function toggle(): Promise<void> {
    const key = getVoterKey();
    if (!key || pending) return;
    const prevVoted = voted;
    const prevVotes = votes;
    setPending(true);
    setVoted(!prevVoted);
    setVotes(prevVotes + (prevVoted ? -1 : 1));
    try {
      const res = await fetch(`/api/forum/${encodeURIComponent(slug)}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterKey: key }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const j = (await res.json()) as VoteApi;
      setVoted(j.voted);
      setVotes(j.votes);
    } catch {
      setVoted(prevVoted);
      setVotes(prevVotes);
    } finally {
      setPending(false);
    }
  }

  return { votes, voted, pending, toggle };
}

// ── Reply list + composer ────────────────────────────────────────────────

type Props = {
  slug: string;
  /** Thread id — the bookmark/report target (ids are stable; slugs are not). */
  threadId: string;
  /** Thread title — snapshot for the Saved overlay label. */
  threadTitle: string;
  /** baseUpvotes + anon votes, computed server-side. */
  initialVotes: number;
  replies: ForumReplyRow[];
};

export function ForumThreadActions({
  slug,
  threadId,
  threadTitle,
  initialVotes,
  replies: initialReplies,
}: Props) {
  const { votes, voted, pending, toggle } = useAnonVote(slug, initialVotes);
  const { status } = useSession();
  const [replies, setReplies] = useState(initialReplies);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bookmark + report (Task 23). Bookmark target = thread ID, not slug.
  const {
    bookmarked: threadBookmarked,
    pending: bookmarkPending,
    toggle: toggleThreadBookmark,
  } = useBookmark("thread", threadId);
  const [reportTarget, setReportTarget] = useState<
    | { targetType: "thread" | "reply"; targetId: string; targetLabel: string }
    | null
  >(null);

  const signedIn = status === "authenticated";
  const canPost = body.trim().length >= 1 && body.trim().length <= 3000 && !sending;

  async function submitReply(): Promise<void> {
    if (!canPost || sending) return;
    setSending(true);
    setError(null);
    setNeedsAuth(false);
    try {
      const res = await fetch(`/api/forum/${encodeURIComponent(slug)}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      if (res.status === 401) {
        setNeedsAuth(true);
        return;
      }
      if (!res.ok) {
        setError(res.status === 422 ? "Replies are 1–3000 characters." : "Could not post the reply. Try again.");
        return;
      }
      const j = (await res.json()) as { reply: ForumReplyRow };
      setReplies((r) => [...r, j.reply]);
      setBody("");
    } catch {
      setError("Could not post the reply. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      {/* vote toggle — anon voterKey scheme, ember when voted */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={pending}
          aria-pressed={voted}
          aria-label={voted ? "Remove your upvote" : "Upvote this thread"}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-lg border px-3.5 font-mono text-sm transition-colors disabled:opacity-60",
            voted
              ? "border-ember/60 bg-ember/15 text-ember"
              : "border-white/10 bg-white/[0.03] text-white/60 hover:border-ember/40 hover:text-ember"
          )}
        >
          <Triangle className={cn("size-4", voted && "fill-ember")} aria-hidden />
          {votes}
          <span className="sr-only">upvotes</span>
        </button>

        {/* Save thread (Task 23) — target is the thread ID */}
        <button
          type="button"
          onClick={() =>
            void toggleThreadBookmark({ label: threadTitle, href: `/forums/${slug}` })
          }
          disabled={bookmarkPending}
          aria-pressed={threadBookmarked}
          aria-label={
            threadBookmarked ? "Remove thread from saved" : "Save this thread"
          }
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-lg border px-3.5 transition-colors disabled:opacity-60",
            threadBookmarked
              ? "border-ember/60 bg-ember/15 text-ember"
              : "border-white/10 bg-white/[0.03] text-white/60 hover:border-ember/40 hover:text-ember"
          )}
        >
          {threadBookmarked ? (
            <BookmarkCheck className="size-4 fill-ember" aria-hidden />
          ) : (
            <Bookmark className="size-4" aria-hidden />
          )}
          <span className="font-mono text-[11px] uppercase tracking-wider">
            {threadBookmarked ? "Saved" : "Save"}
          </span>
        </button>

        {/* Report thread (Task 23) */}
        <button
          type="button"
          onClick={() =>
            setReportTarget({
              targetType: "thread",
              targetId: threadId,
              targetLabel: threadTitle,
            })
          }
          aria-label="Report this thread"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-transparent px-3 font-mono text-[11px] uppercase tracking-wider text-white/40 transition-colors hover:border-red-500/30 hover:text-red-400"
        >
          <Flag className="size-3.5" aria-hidden />
          Report
        </button>

        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wider text-white/40 uppercase">
          <MessageSquare className="size-3.5" aria-hidden />
          {replies.length} {replies.length === 1 ? "reply" : "replies"}
        </span>
      </div>

      {/* replies */}
      <section className="mt-10 border-t border-white/10 pt-8" aria-label="Replies">
        <h2 className="font-mono text-[11px] tracking-[0.3em] text-white/45 uppercase">
          Replies{" "}
          <span className="text-ember">
            ({replies.length})
          </span>
        </h2>

        <ul className="mt-5 space-y-4">
          {replies.map((r) => (
            <li
              key={r.id}
              className="group/reply relative rounded-xl border border-white/10 bg-white/[0.02] p-4"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] tracking-wider text-white/45">
                <span className="text-ember">{r.author}</span>
                <span aria-hidden>·</span>
                <ForumTime iso={r.createdAt} />

                {/* Report reply (Task 23) — hover/focus reveal on desktop,
                    dimmed but reachable on touch screens */}
                <button
                  type="button"
                  onClick={() =>
                    setReportTarget({
                      targetType: "reply",
                      targetId: r.id,
                      targetLabel: `Reply by ${r.author}`,
                    })
                  }
                  aria-label={`Report reply by ${r.author}`}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-white/30 transition-all hover:text-red-400 focus-visible:opacity-100 focus-visible:text-red-400 focus-visible:outline-none sm:opacity-0 sm:group-hover/reply:opacity-100 sm:focus-visible:opacity-100"
                >
                  <Flag className="size-3" aria-hidden />
                  <span className="sr-only sm:not-sr-only sm:text-[10px] uppercase tracking-wider">
                    Report
                  </span>
                </button>
              </div>
              <p className="mt-2.5 text-sm leading-relaxed whitespace-pre-line text-white/80">
                {r.body}
              </p>
            </li>
          ))}
          {replies.length === 0 && (
            <li className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-white/40">
              No replies yet. If you have been through this, say so below.
            </li>
          )}
        </ul>

        {/* composer */}
        <div className="mt-8 rounded-xl border border-white/10 bg-coal/60 p-4">
          {signedIn || status === "loading" ? (
            <>
              <label htmlFor="forum-reply-body" className="font-mono text-[11px] tracking-wider text-white/50 uppercase">
                Your reply
              </label>
              <Textarea
                id="forum-reply-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                maxLength={3000}
                placeholder="Add a specific, honest take — what you did and what happened."
                className="mt-2 resize-y border-white/10 bg-white/[0.03] text-white placeholder:text-white/30 focus-visible:border-ember/50 focus-visible:ring-ember/30"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] text-white/30">
                  {body.trim().length}/3000
                </span>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void submitReply()}
                  disabled={!canPost}
                  className="bg-ember text-black hover:bg-ember-hot disabled:opacity-50"
                >
                  {sending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
                  Post reply
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-white/80">Sign in to reply.</p>
                <p className="mt-0.5 text-xs text-white/45">
                  Replies are tied to an account — the header sign-in uses email magic links, no password.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => requestSignIn()}
                className="shrink-0 border-ember/50 text-ember hover:bg-ember/10 hover:text-ember"
              >
                Open sign in
              </Button>
            </div>
          )}

          {needsAuth && (
            <div className="mt-3 rounded-lg border border-ember/40 bg-ember/10 p-3 text-sm">
              <p className="text-white/80">Sign in to post.</p>
              <p className="mt-0.5 text-xs text-white/50">
                Your session expired — use the SIGN IN button in the header (email magic link).
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => requestSignIn()}
                className="mt-2 border-ember/50 text-ember hover:bg-ember/10 hover:text-ember"
              >
                Open sign in
              </Button>
            </div>
          )}
          {error && (
            <p role="alert" className="mt-3 text-xs text-red-400">
              {error}
            </p>
          )}
        </div>
      </section>

      {/* One report dialog serves the thread AND every reply */}
      <ReportDialog
        open={reportTarget !== null}
        onOpenChange={(next) => {
          if (!next) setReportTarget(null);
        }}
        targetType={reportTarget?.targetType ?? "thread"}
        targetId={reportTarget?.targetId ?? ""}
        targetLabel={reportTarget?.targetLabel}
      />
    </div>
  );
}
