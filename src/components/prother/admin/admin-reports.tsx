"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, EyeOff, CheckCircle2, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { adminFetch, Age, LoadError, MiniStat } from "./admin-shared";

/**
 * Admin — Reports module (Task 23-b).
 * Community moderation queue: filter chips (open/resolved/dismissed/all),
 * hide + resolve or dismiss with an optional note. Optimistic status flips
 * (revert + toast on error). PATCH requires hideTarget to be explicit —
 * send false unless the content should be soft-hidden.
 */

type ReportTargetType = "thread" | "reply" | "tool" | "post" | "review";
type ReportStatus = "open" | "resolved" | "dismissed";

type AdminReport = {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  targetLabel: string;
  targetHref: string;
  targetHidden: boolean;
  reason: string;
  details: string;
  status: ReportStatus;
  reporter: string;
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

type ReportCounts = { open: number; resolved: number; dismissed: number };

const FILTERS: { id: ReportStatus | "all"; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "resolved", label: "Resolved" },
  { id: "dismissed", label: "Dismissed" },
  { id: "all", label: "All" },
];

function ReportsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[132px] rounded-xl bg-white/[0.04]" />
      ))}
    </div>
  );
}

/** Move a report between buckets in the local counts copy. */
function moveCount(c: ReportCounts, from: ReportStatus, to: ReportStatus): ReportCounts {
  const next = { ...c };
  next[from] = Math.max(0, next[from] - 1);
  next[to] = next[to] + 1;
  return next;
}

function TargetLink({ href, label }: { href: string; label: string }) {
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 font-mono text-[10px] tracking-wider text-white/50 uppercase transition-colors hover:bg-white/5 hover:text-white"
      >
        <ExternalLink className="size-3.5" aria-hidden />
        Open target
      </a>
    );
  }
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 font-mono text-[10px] tracking-wider text-white/50 uppercase transition-colors hover:bg-white/5 hover:text-white"
    >
      <ExternalLink className="size-3.5" aria-hidden />
      Open target
    </Link>
  );
}

export function ReportsTab({ apiKey, onChanged }: { apiKey: string; onChanged: () => void }) {
  const { toast } = useToast();
  const [reports, setReports] = useState<AdminReport[] | null>(null);
  const [counts, setCounts] = useState<ReportCounts | null>(null);
  const [filter, setFilter] = useState<ReportStatus | "all">("open");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const load = useCallback(() => {
    adminFetch(apiKey, `/api/admin/reports?status=${filter}`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<{ reports: AdminReport[]; counts: ReportCounts }>;
      })
      .then((d) => {
        setReports(d.reports);
        setCounts(d.counts);
        setError(false);
      })
      .catch(() => setError(true));
  }, [apiKey, filter]);

  useEffect(load, [load]);

  const retry = useCallback(() => {
    setReports(null);
    setError(false);
    load();
  }, [load]);

  const pickFilter = useCallback((f: ReportStatus | "all") => {
    setFilter(f);
    setReports(null);
    setNoteFor(null);
    setNoteText("");
  }, []);

  const act = useCallback(
    async (
      r: AdminReport,
      body: { status: "resolved" | "dismissed"; hideTarget: boolean; note?: string }
    ) => {
      const reportsSnapshot = reports;
      const countsSnapshot = counts;
      // optimistic in-place flip — the client-side status filter below
      // drops it from open/resolved views, "All" shows the new state.
      setReports((cur) =>
        cur?.map((x) =>
          x.id === r.id
            ? {
                ...x,
                status: body.status,
                targetHidden: body.hideTarget ? true : x.targetHidden,
                resolutionNote: body.note?.trim() ? body.note.trim() : x.resolutionNote,
                resolvedAt: new Date().toISOString(),
              }
            : x
        ) ?? cur
      );
      if (counts) setCounts((c) => (c ? moveCount(c, r.status, body.status) : c));
      setBusy(r.id);
      try {
        const res = await adminFetch(apiKey, `/api/admin/reports/${r.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        const d = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !d.ok) throw new Error(d.error ?? "Update failed");
        toast({
          title: body.status === "resolved" ? "Report resolved" : "Report dismissed",
          description: body.hideTarget ? "Content hidden from the site." : undefined,
        });
        setNoteFor(null);
        setNoteText("");
        onChanged();
      } catch (err) {
        setReports(reportsSnapshot);
        setCounts(countsSnapshot);
        toast({
          title: err instanceof Error ? err.message : "Network error",
          variant: "destructive",
        });
      } finally {
        setBusy(null);
      }
    },
    [apiKey, reports, counts, toast, onChanged]
  );

  const visible =
    reports === null
      ? null
      : filter === "all"
        ? reports
        : reports.filter((r) => r.status === filter);

  return (
    <div className="space-y-3">
      {/* stat mini-strip */}
      <div className="grid grid-cols-3 gap-2.5">
        <MiniStat label="Open" value={counts?.open ?? "…"} accent={(counts?.open ?? 0) > 0} />
        <MiniStat label="Resolved" value={counts?.resolved ?? "…"} />
        <MiniStat label="Dismissed" value={counts?.dismissed ?? "…"} />
      </div>

      {/* filter chips */}
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter reports by status">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          const n =
            f.id === "all"
              ? counts
                ? counts.open + counts.resolved + counts.dismissed
                : null
              : counts?.[f.id];
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => pickFilter(f.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] tracking-wider uppercase transition-colors",
                active
                  ? "border-ember/50 bg-ember/10 text-ember"
                  : "border-white/15 text-white/55 hover:border-white/30 hover:text-white"
              )}
            >
              {f.label}
              {n !== null && n !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[9px] font-bold",
                    active ? "bg-ember text-black" : "bg-white/10 text-white/60"
                  )}
                >
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error ? (
        <LoadError label="Reports" onRetry={retry} />
      ) : visible === null ? (
        <ReportsSkeleton />
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
          <CheckCircle2 className="mx-auto size-8 text-emerald-400" aria-hidden />
          <p className="mt-3 font-mono text-sm text-white/60">
            {filter === "open"
              ? "Queue clear — nothing waiting."
              : `No ${filter === "all" ? "" : `${filter} `}reports.`}
          </p>
        </div>
      ) : (
        <div className="max-h-[56vh] space-y-2.5 overflow-y-auto pr-1">
          {visible.map((r) => {
            const isOpen = r.status === "open";
            const noteOpen = noteFor === r.id;
            return (
              <article
                key={r.id}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="shrink-0 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[9px] tracking-wider text-white/60 uppercase">
                    {r.targetType}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">
                    {r.targetLabel}
                  </span>
                  {r.targetHidden && (
                    <span className="shrink-0 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-mono text-[9px] tracking-wider text-amber-300 uppercase">
                      Content hidden
                    </span>
                  )}
                  <span className="shrink-0 rounded-full border border-red-400/30 bg-red-400/10 px-2 py-0.5 font-mono text-[9px] tracking-wider text-red-300 uppercase">
                    {r.reason}
                  </span>
                </div>

                {r.details && (
                  <blockquote className="mt-2.5 border-l-2 border-white/10 pl-3 text-xs leading-relaxed text-white/50">
                    {r.details}
                  </blockquote>
                )}

                <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-white/35">
                  <span className="max-w-56 truncate" title={`Reported by ${r.reporter}`}>
                    via {r.reporter}
                  </span>
                  <Age iso={r.createdAt} />
                </p>

                {isOpen ? (
                  <>
                    {noteOpen && (
                      <Input
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        maxLength={300}
                        placeholder="Optional note for the moderation record…"
                        aria-label="Resolution note"
                        className="mt-3 border-white/10 bg-white/5 text-sm text-white placeholder:text-white/25"
                      />
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
                      {r.targetHref && <TargetLink href={r.targetHref} label={r.targetLabel} />}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (noteOpen) {
                            setNoteFor(null);
                            setNoteText("");
                          } else {
                            setNoteFor(r.id);
                            setNoteText("");
                          }
                        }}
                        className={cn(
                          "h-8 rounded-lg text-white/60 hover:bg-white/5 hover:text-white",
                          noteOpen && "text-ember hover:text-ember"
                        )}
                        aria-pressed={noteOpen}
                      >
                        <StickyNote className="size-3.5" aria-hidden />
                        Note
                      </Button>
                      <Button
                        size="sm"
                        disabled={busy === r.id}
                        onClick={() =>
                          void act(r, {
                            status: "resolved",
                            hideTarget: true,
                            note: noteOpen ? noteText : undefined,
                          })
                        }
                        className="ml-auto h-8 rounded-lg bg-ember font-semibold text-black shadow-none hover:bg-ember-hot dark:text-black"
                      >
                        <EyeOff className="size-3.5" aria-hidden />
                        Hide + resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === r.id}
                        onClick={() =>
                          void act(r, {
                            status: "dismissed",
                            hideTarget: false,
                            note: noteOpen ? noteText : undefined,
                          })
                        }
                        className="h-8 rounded-lg border-white/15 text-white/70 hover:bg-white/5"
                      >
                        Dismiss
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/10 pt-3 font-mono text-[10px] text-white/35">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 tracking-wider uppercase",
                        r.status === "resolved"
                          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                          : "border-white/15 bg-white/5 text-white/50"
                      )}
                    >
                      {r.status}
                    </span>
                    {r.resolutionNote && (
                      <span className="max-w-72 truncate text-white/55" title={r.resolutionNote}>
                        “{r.resolutionNote}”
                      </span>
                    )}
                    {r.resolvedAt && (
                      <span>
                        ·{" "}
                        <Age iso={r.resolvedAt} />
                      </span>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <p className="font-mono text-[10px] leading-relaxed text-white/25">
        HIDE + RESOLVE SOFT-HIDES THE CONTENT (THREAD/REPLY FLAG · TOOL REMOVED ·
        POST DRAFTED) · DISMISS KEEPS IT LIVE · REOPENING IS NOT SUPPORTED
      </p>
    </div>
  );
}
