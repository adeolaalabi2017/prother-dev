"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Clock, Triangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { FeedRow, TopWeekRow } from "@/lib/prother";
import { WaitlistForm } from "./waitlist-form";
import { useFeed } from "./use-feed";
import { CATEGORIES } from "./categories";

type Tab = "new" | "top" | "tomorrow";
type VoteState = Record<string, { votes: number; voted: boolean }>;

const VOTER_KEY_STORAGE = "prother_voter_key";

function getVoterKey(): string {
  if (typeof window === "undefined") return "";
  let key = window.localStorage.getItem(VOTER_KEY_STORAGE);
  if (!key) {
    key = crypto.randomUUID();
    window.localStorage.setItem(VOTER_KEY_STORAGE, key);
  }
  return key;
}

function formatCountdown(totalSec: number): string {
  const s = Math.max(0, totalSec);
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function pricingLabel(row: FeedRow): string {
  const { model, price } = row.pricing;
  switch (model) {
    case "free":
      return "Free";
    case "freemium":
      return `Freemium ${price ?? ""}`.trim();
    case "paid":
      return `Paid ${price ?? ""}`.trim();
    case "open_source":
      return "Open Source";
    default:
      return "Free";
  }
}

function Logo({
  emoji,
  gradient,
  size,
}: {
  emoji: string;
  gradient: string;
  size: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "size-7 rounded-md text-sm",
    md: "size-12 rounded-xl text-xl",
    lg: "size-10 rounded-xl text-lg",
  } as const;
  return (
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center bg-gradient-to-br shadow-inner",
        gradient,
        sizes[size]
      )}
    >
      {emoji}
    </div>
  );
}

function BadgeChip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px]",
        className
      )}
    >
      {children}
    </span>
  );
}

function UpvoteButton({
  votes,
  voted,
  onVote,
}: {
  votes: number;
  voted: boolean;
  onVote: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onVote}
      aria-label={voted ? "Remove upvote" : "Upvote"}
      aria-pressed={voted}
      className={cn(
        "flex min-w-[52px] flex-col items-center gap-0.5 rounded-lg border px-3 py-2 transition",
        voted
          ? "border-ember bg-ember/10 text-ember"
          : "border-white/10 text-white/60 hover:border-ember/50 hover:text-ember"
      )}
    >
      <Triangle className="size-4" fill={voted ? "currentColor" : "none"} aria-hidden />
      <span className="font-mono text-sm font-semibold">{votes}</span>
    </button>
  );
}

function FeedRowItem({
  row,
  rank,
  vote,
  onVote,
}: {
  row: FeedRow;
  rank: number;
  vote?: { votes: number; voted: boolean };
  onVote: (row: FeedRow) => void;
}) {
  return (
    <article className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-ember/40 hover:bg-white/5">
      <span className="w-6 pt-1 font-mono text-lg text-white/30" aria-hidden>
        {rank}
      </span>
      <UpvoteButton
        votes={vote?.votes ?? row.votes}
        voted={vote?.voted ?? row.voted}
        onVote={() => onVote(row)}
      />
      <Logo emoji={row.emoji} gradient={row.gradient} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-bold text-white">{row.name}</h3>
          {row.badges.editorsPick && (
            <BadgeChip className="border-ember/30 bg-ember/15 text-ember">⭐ Editor's Pick</BadgeChip>
          )}
          {row.badges.curated && (
            <BadgeChip className="border-yellow-500/30 bg-yellow-500/10 text-yellow-500">
              Curated
            </BadgeChip>
          )}
          {row.badges.relaunch && (
            <BadgeChip className="border-white/15 bg-white/5 text-white/60">🔁 Re-launch</BadgeChip>
          )}
          {row.badges.unclaimed && (
            <a
              href="#submit"
              className="font-mono text-[10px] text-ember underline-offset-2 hover:underline"
            >
              Claim this →
            </a>
          )}
        </div>
        <p className="mt-0.5 truncate text-sm text-white/70">{row.tagline}</p>
        <p className="mt-1 font-mono text-[11px] text-white/40">
          {row.category.emoji} {row.category.name} · {pricingLabel(row)} · {row.maker}
          {row.badges.openSource && " · OSS"}
          {row.badges.hasApi && " · API"}
        </p>
      </div>
      <div className="hidden items-center md:flex">
        <span className="inline-flex cursor-default items-center gap-1 text-sm text-white/50 transition-colors hover:text-ember">
          Visit <ArrowUpRight className="size-3.5" aria-hidden />
        </span>
      </div>
    </article>
  );
}

function TeaserRow({
  slug,
  name,
  tagline,
  emoji,
  gradient,
  goesLiveInH,
}: {
  slug: string;
  name: string;
  tagline: string;
  emoji: string;
  gradient: string;
  goesLiveInH: number;
}) {
  return (
    <article
      key={slug}
      className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4"
    >
      <Logo emoji={emoji} gradient={gradient} size="md" />
      <div className="min-w-0 flex-1">
        <h3 className="font-bold text-white">{name}</h3>
        <p className="truncate text-sm text-white/60">{tagline}</p>
      </div>
      <span className="shrink-0 font-mono text-xs whitespace-nowrap text-ember">
        GOES LIVE IN {goesLiveInH}H
      </span>
    </article>
  );
}

function TopWeekItem({ row, rank }: { row: TopWeekRow; rank: number }) {
  return (
    <div className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      <span className="w-5 font-mono text-sm text-white/40" aria-hidden>
        {rank}
      </span>
      <Logo emoji={row.emoji} gradient={row.gradient} size="sm" />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{row.name}</span>
      <span className="font-mono text-sm text-ember">▲{row.votes}</span>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4"
        >
          <Skeleton className="h-6 w-6 bg-white/10" />
          <Skeleton className="h-[52px] w-[52px] rounded-lg bg-white/10" />
          <Skeleton className="h-12 w-12 rounded-xl bg-white/10" />
          <div className="flex-1 space-y-2 py-1">
            <Skeleton className="h-4 w-1/3 bg-white/10" />
            <Skeleton className="h-3 w-2/3 bg-white/10" />
            <Skeleton className="h-3 w-1/2 bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LaunchFeed() {
  const { toast } = useToast();
  const { feed, loading, error, refresh } = useFeed();
  const [tab, setTab] = useState<Tab>("new");
  const [now, setNow] = useState<number>(() => Date.now());
  const [voteState, setVoteState] = useState<VoteState>({});

  // Countdown deadline — computed from the feed at render (no effect-synced state).
  const deadlineRef = useRef<{ date: string | null; at: number }>({ date: null, at: 0 });
  if (feed && deadlineRef.current.date !== feed.date) {
    deadlineRef.current = { date: feed.date, at: Date.now() + feed.resetsInSec * 1000 };
  }
  const deadline = deadlineRef.current.at;

  // Tick the clock every second (setState inside the interval callback is fine).
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const remaining = feed ? Math.max(0, Math.round((deadline - now) / 1000)) : null;

  // UTC-midnight rollover: refetch the feed exactly once when the countdown hits zero.
  const rolledRef = useRef(false);
  useEffect(() => {
    if (remaining !== null && remaining > 0) {
      rolledRef.current = false;
    } else if (remaining === 0 && !rolledRef.current) {
      rolledRef.current = true;
      void refresh();
    }
  }, [remaining, refresh]);

  const onVote = useCallback(
    async (row: FeedRow) => {
      const current = voteState[row.launchId] ?? { votes: row.votes, voted: row.voted };
      const nextVoted = !current.voted;
      const nextVotes = current.votes + (nextVoted ? 1 : -1);
      setVoteState((prev) => ({
        ...prev,
        [row.launchId]: { votes: nextVotes, voted: nextVoted },
      }));
      try {
        const res = await fetch("/api/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ launchId: row.launchId, voterKey: getVoterKey() }),
        });
        const data = (await res.json()) as { voted: boolean; votes: number };
        setVoteState((prev) => ({
          ...prev,
          [row.launchId]: { votes: data.votes, voted: data.voted },
        }));
      } catch {
        setVoteState((prev) => ({ ...prev, [row.launchId]: current }));
        toast({ title: "Vote failed", description: "Please try again.", variant: "destructive" });
      }
    },
    [voteState, toast]
  );

  const rows = useMemo<FeedRow[]>(() => {
    if (!feed) return [];
    return tab === "top" ? feed.top : feed.new;
  }, [feed, tab]);

  const dayLabel = feed?.dayLabel ?? "Today";
  const todayCount = feed?.todayCount ?? 0;
  const isTomorrow = tab === "tomorrow";

  return (
    <section id="feed" className="bg-ink py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <p className="font-mono text-xs tracking-[0.25em] text-ember">TODAY&apos;S LAUNCHES</p>
            <h2 className="mt-2 text-4xl font-black tracking-tighter text-white md:text-5xl">
              {dayLabel} · {todayCount} launches
            </h2>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 font-mono text-sm text-white/70">
            <Clock className="size-4 text-ember" aria-hidden />
            Resets in{" "}
            <span className="tabular-nums">
              {remaining === null ? "--:--:--" : formatCountdown(remaining)}
            </span>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="my-8 inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
          {(
            [
              { key: "new", label: "New" },
              { key: "top", label: "Top Today" },
              { key: "tomorrow", label: `Tomorrow (${feed?.tomorrow.length ?? 0})` },
            ] as { key: Tab; label: string }[]
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
              className={cn(
                "rounded-lg px-4 py-2 text-sm transition-colors",
                tab === t.key
                  ? "bg-ember font-semibold text-black"
                  : "text-white/60 hover:text-white"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content grid */}
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Sidebar — first on mobile, last on desktop */}
          <aside className="order-first min-w-0 space-y-6 lg:order-last">
            <div className="rounded-2xl border border-white/10 bg-coal p-5">
              <h3 className="font-mono text-xs tracking-widest text-ember">📬 THE DAILY LAUNCH</h3>
              <p className="mt-2 text-sm text-white/60">
                One email a day. Today&apos;s launches in a 5-minute scan.
              </p>
              <div className="mt-4">
                <WaitlistForm compact source="daily" dark />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-coal p-5">
              <h3 className="font-mono text-xs tracking-widest text-ember">🏆 TOP WEEK</h3>
              <div className="mt-3 divide-y divide-white/5">
                {(feed?.topWeek ?? []).map((row, i) => (
                  <TopWeekItem key={row.slug} row={row} rank={i + 1} />
                ))}
                {!feed && [0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="py-2.5">
                    <Skeleton className="h-7 w-full bg-white/10" />
                  </div>
                ))}
              </div>
            </div>

            {feed?.editorsPick && (
              <div className="rounded-2xl border border-ember/30 bg-ember/[0.06] p-5">
                <h3 className="font-mono text-xs tracking-widest text-ember">⭐ EDITOR&apos;S PICK</h3>
                <div className="mt-3 flex items-center gap-3">
                  <Logo
                    emoji={feed.editorsPick.emoji}
                    gradient={feed.editorsPick.gradient}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-white">{feed.editorsPick.name}</p>
                    <p className="truncate text-sm text-white/60">{feed.editorsPick.tagline}</p>
                  </div>
                </div>
                <a
                  href="#standards"
                  className="mt-3 inline-block font-mono text-xs text-ember hover:underline"
                >
                  Why we picked it →
                </a>
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-coal p-5">
              <h3 className="font-mono text-xs tracking-widest text-white/50">BROWSE</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <span
                    key={c.slug}
                    role="link"
                    tabIndex={0}
                    className="cursor-default rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70 transition-colors hover:border-ember/40 hover:text-white"
                  >
                    {c.emoji} {c.short}
                  </span>
                ))}
                <span className="rounded-full border border-white/10 px-3 py-1.5 font-mono text-xs text-white/50">
                  +4 more
                </span>
              </div>
            </div>
          </aside>

          {/* Main feed list */}
          <div className="min-w-0">
            {loading && <FeedSkeleton />}

            {!loading && error && (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-white/60">
                Couldn&apos;t load the feed — please refresh the page.
              </div>
            )}

            {!loading && !error && (
              <>
                <div className="space-y-3">
                  {isTomorrow
                    ? (feed?.tomorrow ?? []).map((t) => (
                        <TeaserRow
                          key={t.slug}
                          slug={t.slug}
                          name={t.name}
                          tagline={t.tagline}
                          emoji={t.emoji}
                          gradient={t.gradient}
                          goesLiveInH={t.goesLiveInH}
                        />
                      ))
                    : rows.map((row, i) => (
                        <FeedRowItem
                          key={row.launchId}
                          row={row}
                          rank={i + 1}
                          vote={voteState[row.launchId]}
                          onVote={onVote}
                        />
                      ))}
                </div>

                {isTomorrow && (
                  <p className="mt-6 font-mono text-xs text-white/40">
                    → Editors schedule every launch day. Want yours?{" "}
                    <a href="#submit" className="text-ember hover:underline">
                      Submit your tool.
                    </a>
                  </p>
                )}

                <div className="mt-8 flex flex-col justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    className="cursor-default font-mono text-sm text-white/50 transition-colors hover:text-white"
                  >
                    ← Yesterday · Sep 18
                  </button>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm text-white/60">
                      Built something with AI?{" "}
                      <span className="font-semibold text-white">Launch it free.</span>
                    </p>
                    <Button
                      asChild
                      className="rounded-lg bg-ember font-semibold text-black shadow-none hover:bg-ember-hot dark:text-black"
                    >
                      <a href="#submit">Submit your tool →</a>
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sticky submit bar */}
      <a
        href="#submit"
        className="fixed inset-x-0 bottom-0 z-40 bg-ember py-3.5 text-center text-sm font-bold text-black md:hidden"
        style={{ paddingBottom: "calc(0.875rem + env(safe-area-inset-bottom))" }}
      >
        Submit your tool →
      </a>
    </section>
  );
}
