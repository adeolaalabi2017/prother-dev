"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Loader2,
  MessageSquare,
  MessagesSquare,
  Pin,
  Plus,
  RefreshCw,
  Triangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getVoterKey } from "@/components/prother/voter";
import { requestSignIn } from "@/components/prother/auth-menu";
import { ForumTime } from "@/components/prother/forum-thread-actions";
import { FORUM_TOPICS, FORUM_TOPIC_LABELS } from "@/lib/forum-topics";
import type {
  ForumListResponse,
  ForumSort,
  ForumThreadRow,
  ForumTopic,
} from "@/lib/prother";

/**
 * /forums — index client shell. PH-forums-style layout in Prother tokens:
 * left topic rail + sortable thread rows. Rows navigate via a stretched
 * link; the two stacked buttons (replies / votes) sit above it.
 * Data comes from GET /api/forum (topic + sort server-driven); the voterKey
 * rides along after mount so voted triangles light up ember.
 */

type TopicFilter = "all" | ForumTopic;

const TOPIC_FILTERS: { value: TopicFilter; label: string }[] = [
  { value: "all", label: "All threads" },
  { value: "general", label: FORUM_TOPIC_LABELS.general },
  { value: "vibecoding", label: FORUM_TOPIC_LABELS.vibecoding },
  { value: "show", label: FORUM_TOPIC_LABELS.show },
  { value: "introduce", label: FORUM_TOPIC_LABELS.introduce },
];

const SORTS: { value: ForumSort; label: string }[] = [
  { value: "hot", label: "Hot" },
  { value: "new", label: "New" },
  { value: "top", label: "Top" },
];

const TOPIC_HINTS: Record<TopicFilter, string> = {
  all: "Everything the community is talking about right now.",
  general: "Launching, timing, pricing, validation, distribution.",
  vibecoding: "How you build with models and agents — workflows, prompts, stack.",
  show: "You shipped something. Demo it, share numbers, answer questions.",
  introduce: "Say hi — what you worked on before, what you are building now.",
};

export function ForumIndex({
  initial,
  breadcrumbs,
  sponsorSlot,
}: {
  initial: ForumListResponse;
  /** Server-rendered slot (Breadcrumbs) — mounted inside the container, above the H1. */
  breadcrumbs?: ReactNode;
  /** Server-gated ad island (Task 27) — rendered after the 3rd thread row.
   *  undefined when ad serving is off. */
  sponsorSlot?: ReactNode;
}) {
  const [topic, setTopic] = useState<TopicFilter>("all");
  const [sort, setSort] = useState<ForumSort>("hot");
  const [data, setData] = useState<ForumListResponse>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const firstFetch = useRef(true);

  // Fetch on mount (fills viewer voted states) + on every topic/sort change.
  // AbortController per fetch so rapid tab clicks don't race.
  useEffect(() => {
    const ctrl = new AbortController();
    const skipSkeleton = firstFetch.current;
    firstFetch.current = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ topic, sort });
    const key = getVoterKey();
    if (key) params.set("voterKey", key);

    fetch(`/api/forum?${params.toString()}`, {
      signal: ctrl.signal,
      cache: "no-store",
    })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<ForumListResponse>;
      })
      .then((payload) => setData(payload))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Could not load threads. Check your connection and retry.");
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [topic, sort]);

  async function toggleVote(row: ForumThreadRow): Promise<void> {
    const key = getVoterKey();
    if (!key) return;
    const prev = { voted: row.voted, votes: row.votes };
    setData((d) => ({
      ...d,
      threads: d.threads.map((t) =>
        t.id === row.id
          ? { ...t, voted: !prev.voted, votes: prev.votes + (prev.voted ? -1 : 1) }
          : t
      ),
    }));
    try {
      const res = await fetch(`/api/forum/${encodeURIComponent(row.slug)}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterKey: key }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const j = (await res.json()) as { voted: boolean; votes: number };
      setData((d) => ({
        ...d,
        threads: d.threads.map((t) =>
          t.id === row.id ? { ...t, voted: j.voted, votes: j.votes } : t
        ),
      }));
    } catch {
      setData((d) => ({
        ...d,
        threads: d.threads.map((t) =>
          t.id === row.id ? { ...t, voted: prev.voted, votes: prev.votes } : t
        ),
      }));
    }
  }

  return (
    <section className="py-14 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {breadcrumbs && <div className="mb-8">{breadcrumbs}</div>}
        {/* header */}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.3em] text-ember uppercase">
              <MessagesSquare className="size-3.5" aria-hidden />
              Prother Forums
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tighter text-white sm:text-5xl md:text-6xl">
              Compare notes with
              <br />
              the launch crowd.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-white/60">
              Ask, share, and compare notes with the makers behind the
              launches — timing, workflows, and what actually happened.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[240px_1fr]">
          {/* ── left rail ── */}
          <aside className="flex flex-col gap-4">
            <div className="rounded-xl border border-white/10 bg-coal/70 p-4">
              <p className="text-sm leading-relaxed text-white/70">
                Ask, share, and compare notes with the makers behind the
                launches.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => setDialogOpen(true)}
                className="mt-3 w-full bg-ember font-mono text-xs tracking-wider text-black uppercase hover:bg-ember-hot"
              >
                <Plus className="size-3.5" aria-hidden />
                Start new thread
              </Button>
            </div>

            <nav aria-label="Forum topics">
              <p className="px-1 font-mono text-[10px] tracking-[0.3em] text-white/35 uppercase">
                Topics
              </p>
              <ul className="mt-2 space-y-1">
                {TOPIC_FILTERS.map((f) => {
                  const count =
                    f.value === "all" ? data.counts.all : data.counts[f.value];
                  return (
                    <li key={f.value}>
                      <button
                        type="button"
                        onClick={() => setTopic(f.value)}
                        aria-pressed={topic === f.value}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left font-mono text-xs transition-colors",
                          topic === f.value
                            ? "border-ember/50 bg-ember/15 text-ember"
                            : "border-transparent text-white/55 hover:border-white/10 hover:bg-white/[0.03] hover:text-white/85"
                        )}
                      >
                        <span className="truncate">{f.label}</span>
                        <span
                          className={cn(
                            "ml-2 shrink-0 tabular-nums",
                            topic === f.value ? "text-ember/80" : "text-white/30"
                          )}
                        >
                          {count}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          {/* ── main column ── */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-white/45">{TOPIC_HINTS[topic]}</p>
              <div
                role="tablist"
                aria-label="Sort threads"
                className="inline-flex shrink-0 rounded-lg border border-white/10 bg-white/[0.03] p-0.5"
              >
                {SORTS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    role="tab"
                    aria-selected={sort === s.value}
                    onClick={() => setSort(s.value)}
                    className={cn(
                      "rounded-md px-3 py-1.5 font-mono text-[11px] tracking-wider uppercase transition-colors",
                      sort === s.value
                        ? "bg-ember/15 text-ember"
                        : "text-white/50 hover:text-white/85"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                <p className="text-sm text-red-300">{error}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setSort(sort)}
                  className="shrink-0 border-white/20 text-white/70 hover:text-white"
                >
                  <RefreshCw className="size-3.5" aria-hidden />
                  Retry
                </Button>
              </div>
            )}

            {loading && data.threads.length === 0 ? (
              <ThreadSkeletons />
            ) : (
              <ul
                className={cn(
                  "mt-4 space-y-3 transition-opacity",
                  loading && "pointer-events-none opacity-50"
                )}
                aria-busy={loading}
              >
                {data.threads.map((t, i) => (
                  <Fragment key={t.id}>
                    <ThreadRow thread={t} onVote={() => void toggleVote(t)} />
                    {/* Sponsored row — after the 3rd thread (server-gated). */}
                    {sponsorSlot && i === 2 && (
                      <li className="list-none">{sponsorSlot}</li>
                    )}
                  </Fragment>
                ))}
                {data.threads.length === 0 && !error && (
                  <li className="rounded-xl border border-dashed border-white/15 p-10 text-center">
                    <p className="text-white/60">
                      Nothing in {topic === "all" ? "any topic" : FORUM_TOPIC_LABELS[topic]} yet.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setDialogOpen(true)}
                      className="mt-4 border-ember/50 text-ember hover:bg-ember/10 hover:text-ember"
                    >
                      <Plus className="size-3.5" aria-hidden />
                      Start the first thread
                    </Button>
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>

      <NewThreadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultTopic={topic === "all" ? "general" : topic}
      />
    </section>
  );
}

// ── Thread row ───────────────────────────────────────────────────────────

function ThreadRow({ thread, onVote }: { thread: ForumThreadRow; onVote: () => void }) {
  return (
    <li>
      <article className="group relative rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-ember/40 hover:bg-white/[0.04] sm:p-5">
        {/* stretched link — the whole row navigates to the thread */}
        <Link
          href={`/forums/${thread.slug}`}
          className="absolute inset-0 rounded-xl focus-visible:ring-2 focus-visible:ring-ember focus-visible:outline-none"
          aria-label={`Open thread: ${thread.title}`}
        >
          <span className="sr-only">{thread.title}</span>
        </Link>

        <div className="flex items-start justify-between gap-4">
          {/* content — clicks fall through to the stretched link */}
          <div className="pointer-events-none min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] tracking-wider uppercase">
              <span className="rounded-full border border-ember/30 bg-ember/10 px-2 py-0.5 text-ember">
                {FORUM_TOPIC_LABELS[thread.topic]}
              </span>
              {thread.pinned && (
                <span className="inline-flex items-center gap-1 text-white/50">
                  <Pin className="size-3" aria-hidden />
                  Pinned
                </span>
              )}
              <span className="text-white/45">{thread.author}</span>
              <span aria-hidden className="text-white/25">
                ·
              </span>
              <ForumTime iso={thread.createdAt} className="text-white/45" />
            </div>
            <h3 className="mt-2 text-base leading-snug font-bold text-white transition-colors group-hover:text-ember sm:text-lg">
              {thread.title}
            </h3>
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-white/50">
              {thread.body}
            </p>
          </div>

          {/* stacked PH-style buttons (above the stretched link) */}
          <div className="flex shrink-0 flex-col gap-2">
            <Link
              href={`/forums/${thread.slug}`}
              aria-label={`${thread.replyCount} replies — open thread`}
              className="relative z-10 flex h-12 w-11 flex-col items-center justify-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.03] text-white/60 transition-colors hover:border-ember/40 hover:text-ember"
            >
              <MessageSquare className="size-3.5" aria-hidden />
              <span className="font-mono text-[11px] tabular-nums">
                {thread.replyCount}
              </span>
            </Link>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onVote();
              }}
              aria-pressed={thread.voted}
              aria-label={thread.voted ? "Remove your upvote" : "Upvote this thread"}
              className={cn(
                "relative z-10 flex h-12 w-11 flex-col items-center justify-center gap-0.5 rounded-lg border transition-colors",
                thread.voted
                  ? "border-ember/60 bg-ember/15 text-ember"
                  : "border-white/10 bg-white/[0.03] text-white/60 hover:border-ember/40 hover:text-ember"
              )}
            >
              <Triangle
                className={cn("size-3.5", thread.voted && "fill-ember")}
                aria-hidden
              />
              <span className="font-mono text-[11px] tabular-nums">{thread.votes}</span>
            </button>
          </div>
        </div>
      </article>
    </li>
  );
}

function ThreadSkeletons() {
  return (
    <ul className="mt-4 space-y-3" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <li
          key={i}
          className="rounded-xl border border-white/10 bg-white/[0.02] p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="h-3 w-36 animate-pulse rounded bg-white/10" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-full animate-pulse rounded bg-white/5" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-white/5" />
            </div>
            <div className="flex flex-col gap-2">
              <div className="h-12 w-11 animate-pulse rounded-lg bg-white/10" />
              <div className="h-12 w-11 animate-pulse rounded-lg bg-white/10" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ── New-thread dialog ────────────────────────────────────────────────────

function NewThreadDialog({
  open,
  onOpenChange,
  defaultTopic,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultTopic: ForumTopic;
}) {
  const router = useRouter();
  const { status } = useSession();
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState<ForumTopic>(defaultTopic);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset + pick up the topic currently filtered in the rail.
  useEffect(() => {
    if (open) {
      setTopic(defaultTopic);
      setNeedsAuth(false);
      setError(null);
    }
  }, [open, defaultTopic]);

  const signedIn = status === "authenticated";
  const titleOk = title.trim().length >= 3 && title.trim().length <= 120;
  const bodyOk = body.trim().length >= 10 && body.trim().length <= 5000;
  const canSubmit = signedIn && titleOk && bodyOk && !sending;

  async function submit(): Promise<void> {
    if (!titleOk || !bodyOk || sending) return;
    setSending(true);
    setError(null);
    setNeedsAuth(false);
    try {
      const res = await fetch("/api/forum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), topic }),
      });
      if (res.status === 401) {
        setNeedsAuth(true);
        return;
      }
      if (!res.ok) {
        setError(
          res.status === 422
            ? "Titles are 3–120 characters, bodies 10–5000."
            : "Could not post the thread. Try again."
        );
        return;
      }
      const j = (await res.json()) as { thread: { slug: string } };
      onOpenChange(false);
      setTitle("");
      setBody("");
      router.push(`/forums/${j.thread.slug}`);
    } catch {
      setError("Could not post the thread. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92vh] gap-0 overflow-y-auto border-white/10 bg-coal p-0 text-white sm:max-w-lg"
        aria-describedby={undefined}
      >
        <DialogHeader className="border-b border-white/10 p-5 text-left">
          <DialogTitle className="text-lg font-black tracking-tight">
            Start a new thread
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-white/50">
            Specific beats loud. Say what you did, what happened, and what you
            would do differently.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-5">
          <div>
            <label htmlFor="forum-thread-title" className="font-mono text-[11px] tracking-wider text-white/50 uppercase">
              Title
            </label>
            <Input
              id="forum-thread-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Ask a question or name what you shipped"
              className="mt-1.5 border-white/10 bg-white/[0.03] text-white placeholder:text-white/30 focus-visible:border-ember/50 focus-visible:ring-ember/30"
            />
            <p className="mt-1 font-mono text-[10px] text-white/30">
              {title.trim().length}/120
            </p>
          </div>

          <div>
            <label id="forum-topic-label" className="font-mono text-[11px] tracking-wider text-white/50 uppercase">
              Topic
            </label>
            <Select value={topic} onValueChange={(v) => setTopic(v as ForumTopic)}>
              <SelectTrigger
                aria-labelledby="forum-topic-label"
                className="mt-1.5 w-full border-white/10 bg-white/[0.03] text-white focus-visible:border-ember/50 focus-visible:ring-ember/30"
              >
                <SelectValue placeholder="Pick a topic" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-coal text-white">
                {FORUM_TOPICS.map((t) => (
                  <SelectItem key={t} value={t} className="focus:bg-ember/15 focus:text-ember">
                    {FORUM_TOPIC_LABELS[t]} — {TOPIC_HINTS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="forum-thread-body" className="font-mono text-[11px] tracking-wider text-white/50 uppercase">
              Body
            </label>
            <Textarea
              id="forum-thread-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={7}
              maxLength={5000}
              placeholder="The details: numbers, stack, timelines, what surprised you."
              className="mt-1.5 resize-y border-white/10 bg-white/[0.03] text-white placeholder:text-white/30 focus-visible:border-ember/50 focus-visible:ring-ember/30"
            />
            <p className="mt-1 font-mono text-[10px] text-white/30">
              {body.trim().length}/5000
            </p>
          </div>

          {needsAuth && (
            <div className="rounded-lg border border-ember/40 bg-ember/10 p-3 text-sm">
              <p className="text-white/80">Sign in to post.</p>
              <p className="mt-0.5 text-xs text-white/50">
                Threads are tied to an account — the header sign-in uses email
                magic links, no password.
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
            <p role="alert" className="text-xs text-red-400">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-white/60 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void submit()}
              disabled={!canSubmit}
              className="bg-ember text-black hover:bg-ember-hot disabled:opacity-50"
            >
              {sending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
              Post thread
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
