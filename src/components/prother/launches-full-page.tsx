"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Triangle } from "lucide-react";
import type { DayArchiveResponse, FeedRow, WeekDay } from "@/lib/prother";
import { cn } from "@/lib/utils";
import { useExplorer } from "./explorer-store";
import { FullPageShell, PageError, PageSkeleton } from "./page-shell";

/**
 * Launch archive FULL PAGE — one day's final standings, opened via
 * ?launches=<YYYY-MM-DD> (explorer-store.launchesDate). Day-strip nav and
 * prev/next/date controls swap the date in-place (openLaunches) and the
 * page scrolls back to the top. Rows open the tool page on top; category
 * chips open the category page on top.
 */

/** Narrow view of GET /api/feed — only what the day strip needs. */
type FeedSummary = {
  todayCount?: number;
  weekDays?: WeekDay[];
};

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftDay(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function formatDayLabel(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatWeekday(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}

export function LaunchesFullPage() {
  const date = useExplorer((s) => s.launchesDate);
  const closeLaunches = useExplorer((s) => s.closeLaunches);
  const openLaunches = useExplorer((s) => s.openLaunches);
  const openTool = useExplorer((s) => s.openTool);
  const openCategory = useExplorer((s) => s.openCategory);

  const [data, setData] = useState<DayArchiveResponse | null>(null);
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const [weekDays, setWeekDays] = useState<WeekDay[] | null>(null);
  const [todayCount, setTodayCount] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);

  const error = date !== null && failedFor === date;
  const loading = date !== null && !error && (data === null || data.date !== date);

  // Day strip source — fetched once per mount of the page.
  useEffect(() => {
    let alive = true;
    fetch("/api/feed")
      .then(async (r) => {
        if (!r.ok) throw new Error("feed unavailable");
        return r.json() as Promise<FeedSummary>;
      })
      .then((d) => {
        if (!alive) return;
        setWeekDays(d.weekDays ?? []);
        setTodayCount(d.todayCount ?? 0);
      })
      .catch(() => {
        /* strip is optional — silently skip */
      });
    return () => {
      alive = false;
    };
  }, []);

  // Fetch the archive day (state updates only in async callbacks).
  useEffect(() => {
    if (!date) return;
    let alive = true;
    fetch(`/api/feed/day?date=${encodeURIComponent(date)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("no archive for this day");
        return r.json() as Promise<DayArchiveResponse>;
      })
      .then((d) => {
        if (!alive) return;
        setData(d);
        setFailedFor(null);
      })
      .catch(() => {
        if (alive) setFailedFor(date);
      });
    return () => {
      alive = false;
    };
  }, [date]);

  // Same-page date swaps restart the reading position.
  useEffect(() => {
    if (!date) return;
    topRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [date]);

  const today = todayISO();
  const stripDays = useMemo(() => {
    const days = [...(weekDays ?? [])];
    if (!days.some((d) => d.date === today)) {
      days.push({
        date: today,
        label: formatDayLabel(today),
        weekday: formatWeekday(today),
        count: todayCount,
      });
    }
    return days;
  }, [weekDays, todayCount, today]);
  const todayFromApi = (weekDays ?? []).some((d) => d.date === today);

  const rows: FeedRow[] = data && data.date === date ? data.rows : [];

  if (!date) return null;

  const displayLabel =
    data && data.date === date ? data.label : formatDayLabel(date);
  const prevDay = shiftDay(date, -1);
  const yesterday = shiftDay(today, -1);
  const nextDay = shiftDay(date, 1);
  const nextDisabled = nextDay >= today;
  const isToday = date >= today;

  const goto = (d: string) => {
    if (DAY_RE.test(d)) openLaunches(d);
  };

  return (
    <FullPageShell
      breadcrumb={[{ label: "Home", onClick: () => closeLaunches() }, { label: "Archive" }]}
      onClose={closeLaunches}
      ariaLabel="Launch archive"
      wide
      kicker="Launch Archive"
      shareUrl={`/?launches=${encodeURIComponent(date)}`}
    >
      {loading && <PageSkeleton />}

      {(error || rows.length === 0) && !loading && (
        <PageError
          title="No launches on this day"
          message={
            isToday
              ? "Today's launches are live on the feed — the archive starts yesterday."
              : `The archive has no record for ${displayLabel} (${date}).`
          }
          action={
            <button
              type="button"
              onClick={() => goto(yesterday)}
              className="rounded-lg border border-white/15 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/70 transition-colors hover:border-ember/50 hover:text-ember"
            >
              ← Go to {formatDayLabel(yesterday)}
            </button>
          }
        />
      )}

      {!loading && !error && rows.length > 0 && (
        <div ref={topRef} className="scroll-mt-16">
          {/* header */}
          <header className="mt-4">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-white">
                AI launches on {displayLabel}
              </h1>
              <span
                aria-label={`${rows.length} launches on this day`}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[10px] tracking-[0.2em] text-white/60 uppercase"
              >
                {rows.length} launches
              </span>
            </div>
          </header>

          {/* SEO intro */}
          <section
            aria-label="About this page"
            className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5"
          >
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
              <span aria-hidden className="h-px w-6 bg-ember/70" />
              About this page
            </p>
            <p className="mt-2.5 text-sm leading-relaxed text-white/60">
              On {displayLabel}, {rows.length} AI product
              {rows.length === 1 ? "" : "s"} launched on Prother and faced the
              community vote. The standings below are final for{" "}
              {date} — jump to another day in the archive to keep browsing.
            </p>
          </section>

          {/* day strip + date controls */}
          <nav aria-label="Browse launch days" className="mt-6">
            <p className="font-mono text-[10px] tracking-[0.25em] text-white/40 uppercase">
              Browse by day
            </p>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-ember/30 [&::-webkit-scrollbar-track]:bg-transparent">
              {stripDays.map((d) => {
                const appendedToday = d.date === today && !todayFromApi;
                const active = d.date === date;
                return (
                  <button
                    key={d.date}
                    type="button"
                    disabled={appendedToday}
                    title={
                      appendedToday
                        ? "Today's launches are on the live feed"
                        : `Launches on ${d.label}`
                    }
                    aria-current={active ? "date" : undefined}
                    onClick={() => goto(d.date)}
                    className={cn(
                      "shrink-0 rounded-lg border px-3 py-2 text-center font-mono text-[10px] tracking-wider uppercase transition-colors",
                      active
                        ? "border-ember bg-ember/10 text-ember"
                        : "border-white/10 text-white/50 hover:border-white/25 hover:text-white/80",
                      appendedToday && "cursor-not-allowed opacity-35 hover:border-white/10 hover:text-white/50"
                    )}
                  >
                    <span className="block">{d.weekday}</span>
                    <span className="mt-0.5 block text-white/70">
                      {d.label} · {d.count}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => goto(prevDay)}
                aria-label={`Previous day — ${formatDayLabel(prevDay)}`}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 font-mono text-[10px] tracking-wider text-white/60 uppercase transition-colors hover:border-ember/50 hover:text-ember"
              >
                <ChevronLeft className="size-3.5" aria-hidden />
                Prev day
              </button>
              <input
                type="date"
                value={date}
                onChange={(e) => goto(e.target.value)}
                aria-label="Pick a launch date"
                style={{ colorScheme: "dark" }}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 font-mono text-[10px] tracking-wider text-white/70 uppercase [color-scheme:dark] outline-none transition-colors focus:border-ember/50"
              />
              <button
                type="button"
                onClick={() => goto(nextDay)}
                disabled={nextDisabled}
                aria-label={
                  nextDisabled
                    ? "No next day — archived days end yesterday"
                    : `Next day — ${formatDayLabel(nextDay)}`
                }
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 font-mono text-[10px] tracking-wider text-white/60 uppercase transition-colors hover:border-ember/50 hover:text-ember disabled:pointer-events-none disabled:opacity-40"
              >
                Next day
                <ChevronRight className="size-3.5" aria-hidden />
              </button>
            </div>
          </nav>

          {/* standings */}
          <section aria-label={`Final standings for ${displayLabel}`} className="mt-8">
            <p className="font-mono text-[10px] tracking-[0.25em] text-white/40 uppercase">
              Final standings
            </p>
            <ol role="list" className="mt-4 flex flex-col gap-3">
              {rows.map((row, i) => {
                const rank = i + 1;
                return (
                  <li key={row.slug}>
                    <article
                      aria-label={`#${rank} ${row.name} — ${row.votes} votes`}
                      className="group relative flex items-start gap-4 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-ember/40 hover:bg-white/5"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "w-6 shrink-0 pt-1 font-mono text-lg tabular-nums",
                          rank === 1 ? "font-bold text-ember" : rank <= 3 ? "text-white/60" : "text-white/30"
                        )}
                      >
                        {rank}
                      </span>
                      <div
                        className="flex min-w-[52px] shrink-0 flex-col items-center gap-0.5 rounded-lg border border-ember/25 bg-ember/[0.06] px-3 py-2 text-ember"
                        title={`Final score — ${row.votes} votes`}
                      >
                        <Triangle className="size-4" fill="currentColor" aria-hidden />
                        <span className="text-lg font-black tabular-nums">{row.votes}</span>
                      </div>
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xl shadow-inner",
                          row.gradient
                        )}
                      >
                        {row.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => openTool(row.slug)}
                          aria-label={`View ${row.name} details`}
                          className="text-left text-lg font-bold text-white transition-colors hover:text-ember"
                        >
                          {row.name}
                        </button>
                        <p className="mt-0.5 line-clamp-2 text-sm text-white/60">
                          {row.tagline}
                        </p>
                        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-white/40">
                          <button
                            type="button"
                            onClick={() => openCategory(row.category.slug)}
                            aria-label={`Browse ${row.category.name} category`}
                            className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[9px] tracking-wider uppercase transition-colors hover:border-ember/40 hover:text-ember"
                          >
                            <span aria-hidden>{row.category.emoji}</span>
                            {row.category.name}
                          </button>
                          <span aria-hidden className="text-white/20">
                            ·
                          </span>
                          <span>{row.maker}</span>
                        </p>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      )}
    </FullPageShell>
  );
}
