"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  CircleDashed,
  Clock,
  ExternalLink,
  FileText,
  Github,
  Link2,
  Loader2,
  MailSearch,
  MessageSquare,
  Send,
  Share2,
  Sparkles,
  Triangle,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
// DialogTitle/DialogDescription are used by ToolDetailDialog above.
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { CommentRow, ToolDetailResponse } from "@/lib/prother";
import { CATEGORIES } from "./categories";
import { useExplorer } from "./explorer-store";
import { useFeed } from "./use-feed";
import { getVoterKey } from "./voter";

// ── Tool detail modal ────────────────────────────────────────────────────

const PRICING_LABEL: Record<string, string> = {
  free: "Free",
  freemium: "Freemium",
  paid: "Paid",
  open_source: "Open Source",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function DetailSkeleton() {
  return (
    <div className="space-y-5 p-6">
      <div className="flex items-end gap-4">
        <Skeleton className="size-16 rounded-2xl bg-white/10" />
        <div className="flex-1 space-y-2 pb-1">
          <Skeleton className="h-6 w-40 bg-white/10" />
          <Skeleton className="h-4 w-64 bg-white/10" />
        </div>
      </div>
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl bg-white/5" />
      ))}
    </div>
  );
}

// ── Launch discussion (comments) ─────────────────────────────────────────

const COMMENT_BODY_MAX = 280;
const COMMENT_BODY_WARN = 224; // 80% — counter turns ember
const COMMENT_NAME_MAX = 24;
const COMMENT_NAME_STORAGE = "prother_comment_name";

const AVATAR_GRADIENTS = [
  "from-orange-400 to-rose-600",
  "from-amber-400 to-orange-600",
  "from-emerald-400 to-teal-600",
  "from-rose-400 to-red-600",
  "from-yellow-400 to-amber-600",
  "from-lime-400 to-green-600",
  "from-fuchsia-400 to-purple-600",
  "from-red-400 to-orange-600",
] as const;

function avatarGradient(author: string): string {
  let h = 0;
  for (let i = 0; i < author.length; i++) h = (h * 31 + author.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

function relTime(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Discussion({
  slug,
  makerHandle,
}: {
  slug: string;
  makerHandle: string;
}) {
  const { toast } = useToast();
  const [items, setItems] = useState<CommentRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [postedFlash, setPostedFlash] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setLoadError(false);
    setItems(null);
    fetch(`/api/tools/${encodeURIComponent(slug)}/comments`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load discussion");
        return (await res.json()) as { items: CommentRow[] };
      })
      .then((data) => {
        if (alive) setItems(data.items);
      })
      .catch(() => {
        if (alive) setLoadError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  // Remember the commenter's display name (per browser).
  useEffect(() => {
    setName(window.localStorage.getItem(COMMENT_NAME_STORAGE) ?? "");
  }, []);

  const canPost =
    name.trim().length >= 2 && body.trim().length >= 4 && !posting;

  const onPost = useCallback(async () => {
    if (!canPost) return;
    setPosting(true);
    try {
      const res = await fetch(
        `/api/tools/${encodeURIComponent(slug)}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ author: name.trim(), body: body.trim() }),
        },
      );
      const data = (await res.json()) as CommentRow & { error?: string };
      if (!res.ok)
        throw new Error(data.error ?? "Could not post — please try again.");
      setItems((prev) => [...(prev ?? []), data]);
      setBody("");
      window.localStorage.setItem(COMMENT_NAME_STORAGE, name.trim());
      setPostedFlash(true);
      window.setTimeout(() => setPostedFlash(false), 1600);
      toast({ title: "Comment posted" });
    } catch (err) {
      toast({
        title: "Could not post comment",
        description:
          err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setPosting(false);
    }
  }, [canPost, slug, name, body, toast]);

  const count = items?.length ?? 0;
  const counterTone =
    body.length >= COMMENT_BODY_MAX
      ? "text-red-400"
      : body.length >= COMMENT_BODY_WARN
        ? "text-ember"
        : "text-white/35";

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] tracking-widest text-white/40">
          DISCUSSION ({count})
        </p>
        <p className="font-mono text-[10px] tracking-wider text-white/25">
          MODERATED PER S6
        </p>
      </div>

      <div
        className="mt-2 max-h-96 space-y-2 overflow-y-auto"
        aria-live="polite"
        aria-label={`Discussion for this tool, ${count} comments`}
      >
        {loading && (
          <>
            <Skeleton className="h-16 w-full rounded-xl bg-white/5" />
            <Skeleton className="h-16 w-5/6 rounded-xl bg-white/5" />
          </>
        )}

        {!loading && loadError && (
          <p className="rounded-lg border border-red-500/25 bg-red-500/[0.04] p-3 text-xs text-red-300">
            Couldn&apos;t load the discussion. It will appear next time you
            open this listing.
          </p>
        )}

        {!loading && !loadError && count === 0 && (
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-white/15 p-6 text-center">
            <MessageSquare className="size-4 text-white/30" aria-hidden />
            <p className="text-sm text-white/70">No comments yet.</p>
            <p className="text-xs text-white/40">
              Start the discussion — ask {makerHandle} anything.
            </p>
          </div>
        )}

        {items?.map((c) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5 transition-colors hover:border-ember/25"
          >
            <span
              aria-hidden
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-black",
                avatarGradient(c.author),
              )}
            >
              {c.author.replace(/^@/, "").charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-semibold text-white/90">
                  {c.author}
                </span>
                {c.isMaker && (
                  <span className="rounded-full border border-ember/40 bg-ember/15 px-1.5 py-px font-mono text-[9px] tracking-wider text-ember">
                    MAKER
                  </span>
                )}
                <span className="ml-auto shrink-0 whitespace-nowrap font-mono text-[10px] text-white/35">
                  {relTime(c.createdAt)}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-white/75">
                {c.body}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Composer */}
      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 transition-colors focus-within:border-ember/40">
        <label htmlFor={`c-name-${slug}`} className="sr-only">
          Your display name
        </label>
        <input
          id={`c-name-${slug}`}
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, COMMENT_NAME_MAX))}
          placeholder="Your name"
          maxLength={COMMENT_NAME_MAX}
          autoComplete="name"
          className="w-full border-b border-white/10 bg-transparent pb-2 font-mono text-sm text-white placeholder:text-white/30 focus:border-ember/60 focus:outline-none"
        />
        <label htmlFor={`c-body-${slug}`} className="sr-only">
          Write a comment
        </label>
        <textarea
          id={`c-body-${slug}`}
          value={body}
          onChange={(e) =>
            setBody(e.target.value.slice(0, COMMENT_BODY_MAX))
          }
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              void onPost();
            }
          }}
          placeholder="Add to the discussion…"
          rows={3}
          maxLength={COMMENT_BODY_MAX}
          className={cn(
            "mt-2 w-full resize-none bg-transparent text-sm leading-relaxed text-white placeholder:text-white/30 focus:outline-none",
            body.length >= COMMENT_BODY_MAX && "text-red-300",
          )}
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] text-white/30">
            ⌘↵ TO POST · BE CONSTRUCTIVE (S6)
          </p>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "font-mono text-[10px] tabular-nums transition-colors",
                counterTone,
              )}
              aria-live="polite"
            >
              {body.length}/{COMMENT_BODY_MAX}
            </span>
            <button
              type="button"
              onClick={() => void onPost()}
              disabled={!canPost}
              aria-label="Post comment"
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition active:scale-95",
                postedFlash
                  ? "bg-emerald-500 text-black"
                  : "bg-ember text-black hover:bg-ember-hot",
                !canPost && !posting && "cursor-not-allowed opacity-40",
              )}
            >
              {posting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Posting…
                </>
              ) : postedFlash ? (
                <>
                  <Check className="size-3.5" aria-hidden />
                  Posted
                </>
              ) : (
                <>
                  <Send className="size-3.5" aria-hidden />
                  Post
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolDetailDialog() {
  const slug = useExplorer((s) => s.slug);
  const closeTool = useExplorer((s) => s.closeTool);

  return (
    <Dialog open={!!slug} onOpenChange={(open) => !open && closeTool()}>
      <DialogContent
        showCloseButton
        className="max-h-[90vh] max-w-[calc(100vw-2rem)] gap-0 overflow-y-auto border-white/10 bg-coal p-0 text-white sm:max-w-2xl"
      >
        <DialogTitle className="sr-only">Tool details</DialogTitle>
        <DialogDescription className="sr-only">
          Full listing, pricing, and quality-bar verification for this tool.
        </DialogDescription>
        {slug && <DetailBody key={slug} slug={slug} onClose={closeTool} />}
      </DialogContent>
    </Dialog>
  );
}

function DetailBody({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { toast } = useToast();
  const openTool = useExplorer((s) => s.openTool);
  const setCategoryFilter = useExplorer((s) => s.setCategoryFilter);
  const [detail, setDetail] = useState<ToolDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vote, setVote] = useState<{ votes: number; voted: boolean } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/tools/${slug}?vk=${encodeURIComponent(getVoterKey())}`)
      .then(async (res) => {
        if (!res.ok)
          throw new Error(
            res.status === 404 ? "Tool not found" : "Failed to load tool",
          );
        return (await res.json()) as ToolDetailResponse;
      })
      .then((data) => {
        if (alive) {
          setDetail(data);
          setVote({ votes: data.votes, voted: data.voted });
        }
      })
      .catch((err: unknown) => {
        if (alive)
          setError(err instanceof Error ? err.message : "Failed to load tool");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  const onVote = useCallback(async () => {
    if (!detail?.launchId || !vote) return;
    const nextVoted = !vote.voted;
    setVote({ votes: vote.votes + (nextVoted ? 1 : -1), voted: nextVoted });
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          launchId: detail.launchId,
          voterKey: getVoterKey(),
        }),
      });
      const data = (await res.json()) as { voted: boolean; votes: number };
      setVote({ votes: data.votes, voted: data.voted });
      // Sync the feed list behind the modal.
      window.dispatchEvent(
        new CustomEvent("prother:vote", {
          detail: { launchId: detail.launchId, votes: data.votes, voted: data.voted },
        }),
      );
    } catch {
      setVote(vote);
      toast({
        title: "Vote failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  }, [detail, vote, toast]);

  const passedCount = detail?.standards.filter((s) => s.passed).length ?? 0;

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/?tool=${encodeURIComponent(slug)}`
      : "";
  const shareText = detail
    ? `🚀 ${detail.name} — ${detail.tagline} is on Prother`
    : "";

  const onCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast({
        title: "Could not copy the link",
        description: shareUrl,
        variant: "destructive",
      });
    }
  }, [shareUrl, toast]);

  // Cross-link: close the modal, filter the feed to this category, scroll there.
  const browseCategory = useCallback(() => {
    if (!detail) return;
    const cat = detail.category.slug;
    onClose();
    window.setTimeout(() => {
      setCategoryFilter(cat);
      document
        .querySelector("#feed")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 80);
  }, [detail, onClose, setCategoryFilter]);

  return (
    <>
      {loading && <DetailSkeleton />}

      {!loading && error && (
        <div className="p-10 text-center">
          <p className="text-sm text-white/60">{error}</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 font-mono text-xs text-ember hover:underline"
          >
            ← Close
          </button>
        </div>
      )}

      {!loading && !error && detail && vote && (
        <>
          {/* Header with gradient banner + ember glow / dot texture */}
          <div className="relative">
            <div
              aria-hidden
              className={cn(
                "h-20 w-full bg-gradient-to-br opacity-30",
                detail.gradient,
              )}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[radial-gradient(340px_120px_at_85%_0%,rgba(255,106,0,0.22),transparent_70%)]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-20 opacity-[0.14] [background-image:radial-gradient(rgba(255,255,255,0.55)_1px,transparent_1px)] [background-size:12px_12px]"
            />
            <div className="relative flex items-end gap-4 px-6 pb-4">
              <div
                aria-hidden
                className={cn(
                  "-mt-9 flex size-16 shrink-0 items-center justify-center rounded-2xl border-4 border-coal bg-gradient-to-br text-2xl shadow-xl",
                  detail.gradient,
                )}
              >
                {detail.emoji}
              </div>
              <div className="min-w-0 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-black tracking-tight">
                    {detail.name}
                  </h2>
                  {detail.badges.editorsPick && (
                    <span className="rounded-full border border-ember/30 bg-ember/15 px-2 py-0.5 font-mono text-[10px] text-ember">
                      ⭐ EDITOR&apos;S PICK
                    </span>
                  )}
                  {detail.badges.curated && (
                    <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 font-mono text-[10px] text-yellow-500">
                      CURATED
                    </span>
                  )}
                  {detail.badges.relaunch && (
                    <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/60">
                      🔁 RE-LAUNCH
                    </span>
                  )}
                </div>
                <p className="truncate text-sm text-white/60">
                  {detail.tagline}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 border-t border-white/10 p-6">
            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={detail.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-ember px-4 text-sm font-semibold text-black transition hover:bg-ember-hot active:scale-[0.98]"
              >
                Visit website <ExternalLink className="size-3.5" aria-hidden />
              </a>
              {detail.links.github && (
                <a
                  href={detail.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${detail.name} on GitHub`}
                  className="inline-flex size-10 items-center justify-center rounded-lg border border-white/10 text-white/70 transition-colors hover:border-ember/40 hover:text-ember"
                >
                  <Github className="size-4" aria-hidden />
                </a>
              )}
              {detail.links.docs && (
                <a
                  href={detail.links.docs}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${detail.name} documentation`}
                  className="inline-flex size-10 items-center justify-center rounded-lg border border-white/10 text-white/70 transition-colors hover:border-ember/40 hover:text-ember"
                >
                  <FileText className="size-4" aria-hidden />
                </a>
              )}
              {detail.links.twitter && (
                <a
                  href={detail.links.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${detail.name} on X`}
                  className="inline-flex size-10 items-center justify-center rounded-lg border border-white/10 text-white/70 transition-colors hover:border-ember/40 hover:text-ember"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-4 fill-current"
                    aria-hidden
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              )}
              <button
                type="button"
                onClick={onCopyLink}
                aria-label="Copy link to this tool"
                className={cn(
                  "inline-flex size-10 items-center justify-center rounded-lg border border-white/10 transition-colors",
                  copied
                    ? "border-emerald-500/40 text-emerald-400"
                    : "text-white/70 hover:border-ember/40 hover:text-ember",
                )}
              >
                {copied ? (
                  <Check className="size-4" aria-hidden />
                ) : (
                  <Link2 className="size-4" aria-hidden />
                )}
              </button>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Share ${detail.name} on X`}
                className="inline-flex size-10 items-center justify-center rounded-lg border border-white/10 text-white/70 transition-colors hover:border-ember/40 hover:text-ember"
              >
                <Share2 className="size-4" aria-hidden />
              </a>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={onVote}
                  disabled={!detail.launchId}
                  aria-label={vote.voted ? "Remove upvote" : "Upvote this tool"}
                  aria-pressed={vote.voted}
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-lg border px-4 font-mono text-sm font-semibold tabular-nums transition active:scale-95",
                    vote.voted
                      ? "border-ember bg-ember/10 text-ember"
                      : "border-white/10 text-white/70 hover:border-ember/50 hover:text-ember",
                  )}
                >
                  <Triangle
                    className="size-4"
                    fill={vote.voted ? "currentColor" : "none"}
                    aria-hidden
                  />
                  {vote.votes}
                </button>
              </div>
            </div>

            {/* Meta grid */}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:grid-cols-4">
              <div>
                <dt className="font-mono text-[10px] tracking-widest text-white/40">
                  CATEGORY
                </dt>
                <dd
                  className="mt-1 text-sm leading-snug text-white/85"
                  title={`${detail.category.emoji} ${detail.category.name}`}
                >
                  {detail.category.emoji} {detail.category.name}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] tracking-widest text-white/40">
                  STATUS
                </dt>
                <dd className="mt-1 text-sm">
                  {detail.verified ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400">
                      <Check className="size-3.5" aria-hidden /> Verified
                    </span>
                  ) : detail.scheduled ? (
                    <span className="inline-flex items-center gap-1 text-white/60">
                      <CircleDashed className="size-3.5" aria-hidden /> In
                      review
                    </span>
                  ) : (
                    <span className="text-white/60">Unverified</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] tracking-widest text-white/40">
                  SUBMITTED
                </dt>
                <dd className="mt-1 text-sm text-white/85">
                  {fmtDate(detail.submittedAt)}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] tracking-widest text-white/40">
                  {detail.scheduled ? "GOES LIVE" : "LAUNCH DAY"}
                </dt>
                <dd className="mt-1 inline-flex items-center gap-1 text-sm text-white/85">
                  {detail.scheduled && (
                    <Clock className="size-3.5 text-ember" aria-hidden />
                  )}
                  {fmtDate(detail.launchDate)}
                </dd>
              </div>
            </dl>

            {/* Pricing */}
            <div className="flex items-center justify-between gap-4 rounded-xl border border-ember/25 bg-ember/[0.05] p-4">
              <div>
                <p className="font-mono text-[10px] tracking-widest text-white/40">
                  PRICING
                </p>
                <p className="mt-1 font-semibold text-white">
                  {PRICING_LABEL[detail.pricing.model] ?? "Free"}
                  {detail.pricing.price && (
                    <span className="ml-2 font-mono text-ember">
                      {detail.pricing.price}/mo
                    </span>
                  )}
                </p>
                {detail.pricing.note && (
                  <p className="mt-0.5 text-xs text-white/50">
                    {detail.pricing.note}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-1.5">
                {detail.badges.openSource && (
                  <span className="rounded-full border border-white/15 px-2.5 py-1 font-mono text-[10px] text-white/60">
                    OSS
                  </span>
                )}
                {detail.badges.hasApi && (
                  <span className="rounded-full border border-white/15 px-2.5 py-1 font-mono text-[10px] text-white/60">
                    API
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {detail.description && (
              <p className="text-sm leading-relaxed text-white/70">
                {detail.description}
              </p>
            )}

            {/* Standards */}
            <div>
              <p className="font-mono text-[10px] tracking-widest text-white/40">
                QUALITY BAR — {passedCount}/{detail.standards.length}{" "}
                {detail.scheduled ? "PENDING" : "PASSED"}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {detail.standards.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-start gap-2.5 rounded-lg border border-white/10 bg-white/[0.02] p-3"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full",
                        s.passed
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-white/10 text-white/40",
                      )}
                    >
                      {s.passed ? (
                        <Check className="size-2.5" aria-hidden />
                      ) : (
                        <CircleDashed className="size-2.5" aria-hidden />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white/85">
                        <span className="mr-1.5 font-mono text-ember">
                          {s.id}
                        </span>
                        {s.title}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-white/45">
                        {s.blurb}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Discussion — comments on this listing */}
            <Discussion slug={detail.slug} makerHandle={detail.maker} />

            {/* More like this — same category, live tools only */}
            {detail.related && detail.related.length > 0 && (
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[10px] tracking-widest text-white/40">
                    MORE LIKE THIS
                  </p>
                  <button
                    type="button"
                    onClick={browseCategory}
                    className="font-mono text-[10px] tracking-wider text-ember transition-colors hover:text-ember-hot"
                  >
                    ALL {detail.category.name.toUpperCase()} →
                  </button>
                </div>
                <ul className="mt-2 space-y-2">
                  {detail.related.map((r) => (
                    <li key={r.slug}>
                      <button
                        type="button"
                        onClick={() => openTool(r.slug)}
                        aria-label={`Open ${r.name} details`}
                        className="group flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-2.5 text-left transition-colors hover:border-ember/40 hover:bg-ember/[0.05]"
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-base transition-transform group-hover:scale-105",
                            r.gradient,
                          )}
                        >
                          {r.emoji}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-white/90 group-hover:text-white">
                              {r.name}
                            </span>
                            <span className="shrink-0 font-mono text-xs tabular-nums text-ember">
                              ▲{r.votes}
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-white/45">
                            {r.tagline}
                          </span>
                        </span>
                        <ArrowUpRight
                          className="size-3.5 shrink-0 text-white/25 transition-colors group-hover:text-ember"
                          aria-hidden
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Maker footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4">
              <p className="font-mono text-xs text-white/50">
                by <span className="text-ember">{detail.maker}</span>
                {" · "}
                {detail.track === "community"
                  ? "community submit"
                  : "editor seed"}
              </p>
              {detail.badges.unclaimed && (
                <a
                  href="#submit"
                  onClick={onClose}
                  className="font-mono text-xs text-ember hover:underline"
                >
                  Is this you? Claim this listing →
                </a>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ── ⌘K command palette ───────────────────────────────────────────────────

function CommandPalette() {
  const { feed } = useFeed();
  const searchOpen = useExplorer((s) => s.searchOpen);
  const setSearch = useExplorer((s) => s.setSearch);
  const openTool = useExplorer((s) => s.openTool);
  const setCategoryFilter = useExplorer((s) => s.setCategoryFilter);
  const setSubmitOpen = useExplorer((s) => s.setSubmitOpen);
  const setTrackOpen = useExplorer((s) => s.setTrackOpen);

  const pickTool = useCallback(
    (slug: string) => {
      setSearch(false);
      // Let the command dialog finish closing before opening the detail modal.
      window.setTimeout(() => openTool(slug), 80);
    },
    [setSearch, openTool],
  );

  const goTo = useCallback(
    (hash: string) => {
      setSearch(false);
      window.setTimeout(() => {
        document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
      }, 80);
    },
    [setSearch],
  );

  const filterCategory = useCallback(
    (slug: string) => {
      setCategoryFilter(slug);
      goTo("#feed");
    },
    [setCategoryFilter, goTo],
  );

  const seen = new Set<string>();
  const todayTools = (feed?.top ?? []).filter((r) => {
    if (seen.has(r.slug)) return false;
    seen.add(r.slug);
    return true;
  });

  return (
    <CommandDialog
      open={searchOpen}
      onOpenChange={setSearch}
      className="border-white/10 bg-coal text-white [&_[cmdk-group-heading]]:text-white/40 [&_[cmdk-input]]:text-white [&_[cmdk-input]::placeholder]:text-white/30 [&_[cmdk-item]]:text-white/80 [&_[cmdk-item][data-selected=true]]:bg-ember/15 [&_[cmdk-item][data-selected=true]]:text-ember [&_[cmdk-separator]]:bg-white/10"
    >
      <CommandInput placeholder="Search tools, categories, actions…" />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>
          No results — try &quot;agents&quot; or &quot;voice&quot;.
        </CommandEmpty>

        {todayTools.length > 0 && (
          <CommandGroup heading="Today's launches">
            {todayTools.map((r) => (
              <CommandItem
                key={r.slug}
                value={`${r.name} ${r.tagline} ${r.category.name}`}
                onSelect={() => pickTool(r.slug)}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-6 items-center justify-center rounded-md bg-gradient-to-br text-xs",
                    r.gradient,
                  )}
                >
                  {r.emoji}
                </span>
                <span className="font-semibold">{r.name}</span>
                <span className="truncate text-white/40">{r.tagline}</span>
                <span className="ml-auto font-mono text-xs text-ember">
                  ▲{r.votes}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {(feed?.tomorrow.length ?? 0) > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Tomorrow">
              {feed!.tomorrow.map((t) => (
                <CommandItem
                  key={t.slug}
                  value={`${t.name} ${t.tagline} ${t.category.name} tomorrow`}
                  onSelect={() => pickTool(t.slug)}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-6 items-center justify-center rounded-md bg-gradient-to-br text-xs",
                      t.gradient,
                    )}
                  >
                    {t.emoji}
                  </span>
                  <span className="font-semibold">{t.name}</span>
                  <span className="truncate text-white/40">{t.tagline}</span>
                  <span className="ml-auto font-mono text-[10px] text-white/40">
                    IN {t.goesLiveInH}H
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {(feed?.topWeek.length ?? 0) > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Top this week">
              {feed!.topWeek.map((t) => (
                <CommandItem
                  key={t.slug}
                  value={`${t.name} top week`}
                  onSelect={() => pickTool(t.slug)}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-6 items-center justify-center rounded-md bg-gradient-to-br text-xs",
                      t.gradient,
                    )}
                  >
                    {t.emoji}
                  </span>
                  <span className="font-semibold">{t.name}</span>
                  <span className="ml-auto font-mono text-xs text-ember">
                    ▲{t.votes}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Categories">
          {CATEGORIES.map((c) => {
            const count = feed?.categoryCounts?.[c.slug] ?? 0;
            return (
              <CommandItem
                key={c.slug}
                value={`category ${c.slug} ${c.name}`}
                onSelect={() => filterCategory(c.slug)}
              >
                <span aria-hidden>{c.emoji}</span>
                <span>{c.name}</span>
                {count > 0 && (
                  <span className="rounded-full bg-white/10 px-1.5 font-mono text-[10px] tabular-nums text-white/50">
                    {count} today
                  </span>
                )}
                <span className="ml-auto font-mono text-[10px] text-white/30">
                  FILTER
                </span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            value="submit your tool launch wizard"
            onSelect={() => {
              setSearch(false);
              window.setTimeout(() => setSubmitOpen(true), 80);
            }}
          >
            <Sparkles aria-hidden />
            <span>Submit your tool</span>
          </CommandItem>
          <CommandItem
            value="track my submission status makers"
            onSelect={() => {
              setSearch(false);
              window.setTimeout(() => setTrackOpen(true), 80);
            }}
          >
            <MailSearch aria-hidden />
            <span>Track my submission</span>
          </CommandItem>
          <CommandItem
            value="read the standards quality bar"
            onSelect={() => goTo("#standards")}
          >
            <Check aria-hidden />
            <span>Read the standards</span>
          </CommandItem>
          <CommandItem
            value="get the daily feed newsletter"
            onSelect={() => goTo("#feed")}
          >
            <ArrowUpRight aria-hidden />
            <span>Jump to the feed</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

// ── Mounted-once explorer + ⌘K shortcut ──────────────────────────────────

export function ToolExplorer() {
  const setSearch = useExplorer((s) => s.setSearch);
  const openTool = useExplorer((s) => s.openTool);

  // ⌘K / ctrl+K opens the command palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSearch]);

  // Shareable deep links open the detail modal:
  //  - /#tool=<slug>     hash form (works on load AND same-document nav)
  //  - /?tool=<slug>     canonical form (server-reachable → real OG unfurl;
  //                      copied by the modal's Copy-link action)
  // Clearing the hash (e.g. browser Back) closes the modal again.
  useEffect(() => {
    const applyHash = (initial = false) => {
      const m = window.location.hash.match(/^#tool=([^&]+)$/);
      if (m?.[1]) openTool(decodeURIComponent(m[1]));
      else if (!initial) useExplorer.getState().closeTool();
    };
    applyHash(true);
    const onHash = () => applyHash(false);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [openTool]);

  // Canonical ?tool= form: open the modal once at mount, then normalize the
  // URL to the hash form (keeps ?cat=/?tab=, drops the query param) so the
  // address bar matches what in-app navigation produces.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tool");
    if (!t) return;
    openTool(t);
    const url = new URL(window.location.href);
    url.searchParams.delete("tool");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, [openTool]);

  // Restore a shared/filtered category from the URL on load (?cat=<slug>)
  // and jump straight to the feed — a shared ?cat= link is an intent to browse.
  useEffect(() => {
    const cat = new URLSearchParams(window.location.search).get("cat");
    if (cat && CATEGORIES.some((c) => c.slug === cat)) {
      useExplorer.getState().setCategoryFilter(cat);
      // Wait a beat for the feed to render before smooth-scrolling to it.
      const t = window.setTimeout(() => {
        document
          .querySelector("#feed")
          ?.scrollIntoView({ behavior: "smooth" });
      }, 500);
      return () => window.clearTimeout(t);
    }
  }, []);

  return (
    <>
      <CommandPalette />
      <ToolDetailDialog />
    </>
  );
}
