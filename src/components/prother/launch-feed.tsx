"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Clock, Crown, MessageSquare, Triangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { DayArchiveResponse, FeedRow, TopWeekRow } from "@/lib/prother";
import { WaitlistForm } from "./waitlist-form";
import { useFeed } from "./use-feed";
import { useExplorer } from "./explorer-store";
import { getVoterKey } from "./voter";
import { CATEGORIES } from "./categories";

type Tab = "new" | "top" | "tomorrow" | "yesterday";
type VoteState = Record<string, { votes: number; voted: boolean }>;

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
  onVote: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onClick={onVote}
      aria-label={voted ? "Remove upvote" : "Upvote"}
      aria-pressed={voted}
      className={cn(
        "flex min-w-[52px] flex-col items-center gap-0.5 rounded-lg border border-white/10 px-3 py-2 transition hover:border-ember/50 hover:text-ember active:scale-95",
        voted ? "border-ember bg-ember/10 text-ember hover:border-ember" : "text-white/60"
      )}
    >
      <Triangle className="size-4" fill={voted ? "currentColor" : "none"} aria-hidden />
      {/* key={votes} re-runs the entrance so the number pops on every change */}
      <motion.span
        key={votes}
        initial={{ scale: 1.35, color: "var(--color-ember)" }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 22 }}
        className="font-mono text-sm font-semibold tabular-nums"
      >
        {votes}
      </motion.span>
    </button>
  );
}

/** Final score for closed launch days — voting is locked, count is history. */
function FinalScore({ votes, rank }: { votes: number; rank: number }) {
  return (
    <div
      title={`Voting closed — final #${rank} score`}
      className="flex min-w-[52px] flex-col items-center gap-0.5 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-white/40"
      aria-label={`Final score ${votes} votes, rank ${rank}`}
    >
      <Triangle className="size-4" aria-hidden />
      <span className="font-mono text-sm font-semibold tabular-nums">{votes}</span>
    </div>
  );
}

function FeedRowItem({
  row,
  rank,
  vote,
  onVote,
  votingOpen = true,
}: {
  row: FeedRow;
  rank: number;
  vote?: { votes: number; voted: boolean };
  onVote: (row: FeedRow) => void;
  /** false for archive days — shows the locked final score instead. */
  votingOpen?: boolean;
}) {
  const openTool = useExplorer((s) => s.openTool);
  return (
    <article
      onClick={() => openTool(row.slug)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "BUTTON") {
          openTool(row.slug);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`View ${row.name} details`}
      className={cn(
        "group relative flex cursor-pointer gap-4 overflow-hidden rounded-xl border p-4 transition-all hover:translate-x-0.5 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-ember/60",
        // Archive day winner gets a gold-tinted frame on top of the hover ring.
        rank === 1 && !votingOpen
          ? "border-amber-400/30 bg-amber-400/[0.04] hover:border-amber-400/60"
          : "border-white/10 bg-white/[0.02] hover:border-ember/40",
      )}
    >
      {/* ember accent bar — slides in from the left on hover */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px] origin-top scale-y-0 bg-ember transition-transform duration-200 group-hover:scale-y-100"
      />
      <span
        className={cn(
          "w-6 pt-1 font-mono text-lg tabular-nums",
          rank === 1 ? "font-bold text-ember" : rank <= 3 ? "text-white/60" : "text-white/30"
        )}
        aria-hidden
      >
        {rank}
      </span>
      {votingOpen ? (
        <UpvoteButton
          votes={vote?.votes ?? row.votes}
          voted={vote?.voted ?? row.voted}
          onVote={(e) => {
            e.stopPropagation();
            onVote(row);
          }}
        />
      ) : (
        <FinalScore votes={row.votes} rank={rank} />
      )}
      <Logo emoji={row.emoji} gradient={row.gradient} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-bold text-white">{row.name}</h3>
          {rank === 1 && !votingOpen && (
            <BadgeChip className="border-amber-400/40 bg-amber-400/10 text-amber-300">
              <Crown className="mr-1 size-3" aria-hidden /> DAY WINNER
            </BadgeChip>
          )}
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
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-ember/40 px-2 py-0.5 font-mono text-[10px] text-ember transition-colors hover:bg-ember/10"
            >
              Claim this <ArrowUpRight className="size-3" aria-hidden />
            </a>
          )}
        </div>
        <p className="mt-0.5 truncate text-sm text-white/70">{row.tagline}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-[11px] text-white/40">
          <span>
            {row.category.emoji} {row.category.name} · {pricingLabel(row)} · {row.maker}
            {row.badges.openSource && " · OSS"}
            {row.badges.hasApi && " · API"}
          </span>
          {(row.comments ?? 0) > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-1.5 py-px text-white/55 transition-colors group-hover:border-ember/30 group-hover:text-ember"
              title={`${row.comments} comments on this launch`}
            >
              <MessageSquare className="size-2.5" aria-hidden />
              {row.comments}
            </span>
          )}
        </p>
      </div>
      <div className="hidden items-center md:flex">
        <span className="inline-flex items-center gap-1 text-sm text-white/50 transition-colors group-hover:text-ember">
          Details <ArrowUpRight className="size-3.5" aria-hidden />
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
  const openTool = useExplorer((s) => s.openTool);
  return (
    <article
      key={slug}
      onClick={() => openTool(slug)}
      className="flex cursor-pointer items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-ember/40 hover:bg-white/5"
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
  const openTool = useExplorer((s) => s.openTool);
  return (
    <button
      type="button"
      onClick={() => openTool(row.slug)}
      className="flex w-full items-center gap-3 py-2.5 text-left transition-colors first:pt-0 last:pb-0 hover:[&_span[data-name]]:text-ember"
    >
      <span className="w-5 font-mono text-sm text-white/40" aria-hidden>
        {rank}
      </span>
      <Logo emoji={row.emoji} gradient={row.gradient} size="sm" />
      <span data-name className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
        {row.name}
      </span>
      <span className="font-mono text-sm text-ember">▲{row.votes}</span>
    </button>
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
  const openTool = useExplorer((s) => s.openTool);
  const setSubmitOpen = useExplorer((s) => s.setSubmitOpen);
  const categoryFilter = useExplorer((s) => s.categoryFilter);
  const setCategoryFilter = useExplorer((s) => s.setCategoryFilter);
  // ?tab= persistence — shareable feed states (new | top | tomorrow | yesterday).
  // Read AFTER mount only: reading window.location during the initial render makes
  // the server HTML ("new") and the hydrated client (?tab=top) diverge, which
  // React reports as a hydration mismatch. Post-mount sync keeps SSR markup valid.
  const [tab, setTab] = useState<Tab>("new");
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "top" || t === "tomorrow" || t === "yesterday") setTab(t);
  }, []);

  // Archive day browser: null = yesterday (served from the main feed payload),
  // otherwise an ISO day from the strip — fetched once, then cached.
  const [archiveDate, setArchiveDate] = useState<string | null>(null);
  const [dayCache, setDayCache] = useState<Record<string, DayArchiveResponse>>({});
  const [dayLoading, setDayLoading] = useState(false);

  // Fetch (and cache) a selected archive day's final standings.
  useEffect(() => {
    if (!archiveDate || dayCache[archiveDate]) return;
    let alive = true;
    setDayLoading(true);
    fetch(`/api/feed/day?date=${encodeURIComponent(archiveDate)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load this archive day");
        return (await res.json()) as DayArchiveResponse;
      })
      .then((data) => {
        if (alive) setDayCache((c) => ({ ...c, [data.date]: data }));
      })
      .catch(() => {
        if (alive) setArchiveDate(null); // gracefully fall back to yesterday
      })
      .finally(() => {
        if (alive) setDayLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [archiveDate, dayCache]);

  // UTC rollover shifts the whole archive window — drop cached days + selection.
  useEffect(() => {
    setDayCache({});
    setArchiveDate(null);
  }, [feed?.date]);

  // Keep the selected tab in the URL (replaceState — no history spam).
  const setTabSync = useCallback((next: Tab) => {
    setTab(next);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const prev = url.searchParams.get("tab");
    if (next === "new") {
      if (prev) {
        url.searchParams.delete("tab");
        window.history.replaceState(null, "", url.pathname + url.search + url.hash);
      }
    } else if (prev !== next) {
      url.searchParams.set("tab", next);
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
  }, []);
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

  // Votes cast inside the tool detail modal sync back into the feed list.
  useEffect(() => {
    const onModalVote = (e: Event) => {
      const d = (e as CustomEvent).detail as {
        launchId: string;
        votes: number;
        voted: boolean;
      };
      setVoteState((prev) => ({
        ...prev,
        [d.launchId]: { votes: d.votes, voted: d.voted },
      }));
    };
    window.addEventListener("prother:vote", onModalVote);
    return () => window.removeEventListener("prother:vote", onModalVote);
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
    const base =
      tab === "top"
        ? feed.top ?? []
        : tab === "yesterday"
          ? archiveDate
            ? dayCache[archiveDate]?.rows ?? []
            : feed.yesterday ?? []
          : feed.new ?? [];
    if (!categoryFilter) return base;
    return base.filter((r) => r.category?.slug === categoryFilter);
  }, [feed, tab, categoryFilter, archiveDate, dayCache]);

  const tomorrowRows = useMemo(() => {
    if (!feed) return [];
    if (!categoryFilter) return feed.tomorrow ?? [];
    return (feed.tomorrow ?? []).filter((t) => t.category?.slug === categoryFilter);
  }, [feed, categoryFilter]);

  const activeCategory = useMemo(
    () => CATEGORIES.find((c) => c.slug === categoryFilter) ?? null,
    [categoryFilter]
  );

  const dayLabel = feed?.dayLabel ?? "Today";
  const todayCount = feed?.todayCount ?? 0;
  const isTomorrow = tab === "tomorrow";
  const isYesterday = tab === "yesterday";
  const weekDays = feed?.weekDays ?? [];
  const archiveLabel = archiveDate
    ? dayCache[archiveDate]?.label ?? feed?.yesterdayLabel ?? "Archive"
    : feed?.yesterdayLabel ?? "Yesterday";

  const tabs: { key: Tab; label: string; short: string }[] = [
    { key: "new", label: "New", short: "New" },
    { key: "top", label: "Top Today", short: "Top" },
    { key: "tomorrow", label: `Tomorrow (${feed?.tomorrow?.length ?? 0})`, short: `Tmrw (${feed?.tomorrow?.length ?? 0})` },
    { key: "yesterday", label: `Archive (${feed?.yesterday?.length ?? 0})`, short: `Arch. (${feed?.yesterday?.length ?? 0})` },
  ];

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

        {/* Tabs — sliding ember pill (framer-motion layout animation) */}
        <div className="my-8 flex max-w-full flex-wrap gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/5 p-1 sm:inline-flex">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTabSync(t.key)}
              aria-pressed={tab === t.key}
              className={cn(
                "relative shrink-0 rounded-lg px-3.5 py-2 text-sm transition-colors sm:px-4",
                tab === t.key ? "font-semibold text-black" : "text-white/60 hover:text-white"
              )}
            >
              {tab === t.key && (
                <motion.span
                  layoutId="feed-tab-pill"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  className="absolute inset-0 rounded-lg bg-ember"
                  aria-hidden
                />
              )}
              <span className="relative z-10">
                <span className="sm:hidden">{t.short}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Category filter status (set from BROWSE chips or ⌘K palette) */}
        <AnimatePresence initial={false}>
          {activeCategory && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="inline-flex flex-wrap items-center gap-3 rounded-full border border-ember/30 bg-ember/[0.08] py-1.5 pr-1.5 pl-4">
                <p className="font-mono text-xs text-ember">
                  FILTER · {activeCategory.emoji} {activeCategory.short}
                </p>
                <button
                  type="button"
                  onClick={() => setCategoryFilter(null)}
                  className="inline-flex items-center gap-1 rounded-full bg-ember px-3 py-1 font-mono text-[10px] font-semibold text-black transition-colors hover:bg-ember-hot"
                  aria-label="Clear category filter"
                >
                  CLEAR <X className="size-3" aria-hidden />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                <button
                  type="button"
                  onClick={() => openTool(feed.editorsPick!.slug)}
                  className="mt-3 flex w-full items-center gap-3 text-left"
                >
                  <Logo
                    emoji={feed.editorsPick.emoji}
                    gradient={feed.editorsPick.gradient}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-white">{feed.editorsPick.name}</p>
                    <p className="truncate text-sm text-white/60">{feed.editorsPick.tagline}</p>
                  </div>
                </button>
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
              <p className="mt-1 font-mono text-[10px] text-white/30">
                TODAY&apos;S LAUNCHES PER CATEGORY
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {CATEGORIES.map((c) => {
                  const active = categoryFilter === c.slug;
                  const count = feed?.categoryCounts?.[c.slug] ?? 0;
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      aria-pressed={active}
                      title={`${c.name} · ${count} today`}
                      onClick={() => setCategoryFilter(active ? null : c.slug)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all active:scale-95",
                        active
                          ? "border-ember bg-ember font-semibold text-black"
                          : "border-white/10 text-white/70 hover:border-ember/40 hover:text-white"
                      )}
                    >
                      <span aria-hidden>{c.emoji}</span>
                      <span>{c.short}</span>
                      {count > 0 && (
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-px font-mono text-[10px] leading-4 tabular-nums",
                            active ? "bg-black/15 text-black" : "bg-white/10 text-white/50"
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
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
                {isYesterday && (
                  <>
                    {/* Launch-week day strip — any of the past 6 days is browsable */}
                    {weekDays.length > 0 && (
                      <div className="mb-3 flex flex-wrap items-center gap-1.5">
                        <span className="mr-1 font-mono text-[10px] tracking-widest text-white/30">
                          PAST 6 DAYS
                        </span>
                        {weekDays.map((d) => {
                          const selected =
                            archiveDate === d.date || (!archiveDate && d.date === weekDays[weekDays.length - 1]?.date);
                          return (
                            <button
                              key={d.date}
                              type="button"
                              onClick={() => setArchiveDate(archiveDate === d.date ? null : d.date)}
                              aria-pressed={selected}
                              title={`${d.label} · ${d.count} launches — final standings`}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-[11px] transition-all active:scale-95",
                                selected
                                  ? "border-ember bg-ember font-semibold text-black"
                                  : "border-white/10 text-white/55 hover:border-ember/40 hover:text-white",
                              )}
                            >
                              <span className="hidden sm:inline text-white/40 group-hover:text-inherit">{d.weekday}</span>
                              <span className="hidden sm:inline">·</span>
                              <span>{d.label}</span>
                              {/* heat dot — count → ember intensity */}
                              <span
                                aria-hidden
                                className={cn(
                                  "size-1.5 rounded-full",
                                  d.count === 0 && (selected ? "bg-black/30" : "bg-white/15"),
                                  d.count > 0 && (selected ? "bg-black/60" : "bg-ember"),
                                  d.count >= 2 && !selected && "ring-1 ring-ember/40",
                                )}
                              />
                              <span className={cn("tabular-nums", selected ? "text-black/70" : "text-white/35")}>
                                {d.count}
                              </span>
                            </button>
                          );
                        })}
                        <span className="ml-auto hidden font-mono text-[10px] tracking-widest text-white/25 sm:inline">
                          UTC DAYS
                        </span>
                      </div>
                    )}
                    <div className="mb-4 flex items-center gap-2 font-mono text-[11px] tracking-widest text-white/40">
                      <span className="h-px flex-1 bg-white/10" aria-hidden />
                      ARCHIVE · {archiveLabel.toUpperCase()} · FINAL STANDINGS · VOTING CLOSED
                      <span className="h-px flex-1 bg-white/10" aria-hidden />
                    </div>
                  </>
                )}

                <div className="space-y-3">
                  {isTomorrow
                    ? tomorrowRows.map((t) => (
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
                          votingOpen={!isYesterday}
                        />
                      ))}
                </div>

                {!isTomorrow && !dayLoading && rows.length === 0 && (
                  <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
                    <p className="font-mono text-sm text-white/60">
                      No{" "}
                      {activeCategory ? activeCategory.short : ""} launches{" "}
                      {isYesterday
                        ? archiveDate
                          ? `on ${archiveLabel}`
                          : "yesterday"
                        : "in this list today"}
                      .
                    </p>
                    {activeCategory && (
                      <button
                        type="button"
                        onClick={() => setCategoryFilter(null)}
                        className="mt-3 font-mono text-xs text-ember hover:underline"
                      >
                        Show all categories
                      </button>
                    )}
                  </div>
                )}

                {isYesterday && dayLoading && (
                  <div className="space-y-3" aria-busy="true">
                    {[0, 1].map((i) => (
                      <Skeleton key={i} className="h-24 w-full rounded-xl bg-white/5" />
                    ))}
                  </div>
                )}

                {isTomorrow && (
                  <p className="mt-6 font-mono text-xs text-white/40">
                    → Editors schedule every launch day. Want yours?{" "}
                    <button
                      type="button"
                      onClick={() => setSubmitOpen(true)}
                      className="text-ember hover:underline"
                    >
                      Submit your tool.
                    </button>
                  </p>
                )}

                {isYesterday && (
                  <p className="mt-6 font-mono text-xs text-white/40">
                    {archiveDate
                      ? "Final standings for this UTC day."
                      : "Winner gets the top of tomorrow's daily email."}{" "}
                    Voting re-opens at 00:00 UTC.
                  </p>
                )}

                <div className="mt-8 flex flex-col justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => setTabSync(isYesterday ? "new" : "yesterday")}
                    aria-live="polite"
                    className="group/nav inline-flex items-center gap-1.5 self-start rounded-md px-1 py-0.5 font-mono text-sm text-white/50 transition-colors hover:text-ember focus-visible:outline-2 focus-visible:outline-ember/60"
                  >
                    {isYesterday ? (
                      <>→ Back to today&apos;s launches</>
                    ) : (
                      <>
                        ← Launch-week archive · {archiveLabel}
                        <span className="rounded border border-white/15 px-1.5 py-px font-mono text-[10px] text-white/40 transition-colors group-hover/nav:border-ember/40 group-hover/nav:text-ember">
                          {feed?.yesterday.length ?? 0}
                        </span>
                      </>
                    )}
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
                      <button type="button" onClick={() => setSubmitOpen(true)}>
                        Submit your tool →
                      </button>
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sticky submit bar — opens the §11 wizard */}
      <button
        type="button"
        onClick={() => setSubmitOpen(true)}
        className="fixed inset-x-0 bottom-0 z-40 bg-ember py-3.5 text-center text-sm font-bold text-black md:hidden"
        style={{ paddingBottom: "calc(0.875rem + env(safe-area-inset-bottom))" }}
      >
        Submit your tool →
      </button>
    </section>
  );
}
