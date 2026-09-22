"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Inbox,
  Loader2,
  MailSearch,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SubmissionStatusItem } from "@/lib/submit";
import { useExplorer } from "./explorer-store";

// ── Maker status tracking (PRD §11 "status tracking") ───────────────────

const EMAIL_STORAGE = "prother_track_email";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "1 day ago" : `${d} days ago`;
}

/** reviewNote looks like "Failed: S1, S4 — optional note" (PRD §7). */
function parseReviewNote(note: string): { ids: string[]; note: string } {
  // [\s\S] instead of the `s` flag — project targets ES2017 (TS1501).
  const m = note.match(/^Failed:\s*([\s\S]+?)(?:\s+—\s*([\s\S]*))?$/);
  if (!m) return { ids: [], note };
  return {
    ids: m[1].split(",").map((s) => s.trim()).filter(Boolean),
    note: m[2]?.trim() ?? "",
  };
}

function StatusChip({ item }: { item: SubmissionStatusItem }) {
  if (item.status === "pending") {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-mono text-[10px] tracking-wider text-amber-400"
        title="Editors review within 24h"
      >
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-60" />
          <span className="relative inline-flex size-1.5 rounded-full bg-amber-400" />
        </span>
        IN REVIEW{item.queuePosition ? ` · QUEUE #${item.queuePosition}` : ""}
      </span>
    );
  }
  if (item.status === "approved") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] tracking-wider text-emerald-400">
        <BadgeCheck className="size-3" aria-hidden /> LISTING LIVE
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 font-mono text-[10px] tracking-wider text-red-400">
      <TriangleAlert className="size-3" aria-hidden /> REJECTED
    </span>
  );
}

function ResultCard({
  item,
  email,
}: {
  item: SubmissionStatusItem;
  email: string;
}) {
  const setTrackOpen = useExplorer((s) => s.setTrackOpen);
  const setSubmitOpen = useExplorer((s) => s.setSubmitOpen);
  const parsed = item.reviewNote ? parseReviewNote(item.reviewNote) : null;

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg",
            item.gradient,
          )}
        >
          {item.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="truncate text-sm font-bold text-white">{item.name}</p>
            <StatusChip item={item} />
          </div>
          <p className="mt-0.5 truncate text-xs text-white/50">{item.tagline}</p>
          <p className="mt-1 font-mono text-[10px] tracking-wider text-white/35">
            {item.domain.toUpperCase()} · SUBMITTED {relTime(item.createdAt)}
          </p>
        </div>
      </div>

      {/* Rejection detail — cited standards + editor note (PRD §7) */}
      {item.status === "rejected" && parsed && (
        <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/[0.06] p-3">
          <p className="font-mono text-[10px] tracking-widest text-red-400/80">
            FAILED STANDARDS
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {parsed.ids.map((id) => (
              <span
                key={id}
                className="rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 font-mono text-[10px] text-red-300"
              >
                {id}
              </span>
            ))}
          </div>
          {parsed.note && (
            <p className="mt-2 text-xs leading-relaxed text-white/60">
              {parsed.note}
            </p>
          )}
          <p className="mt-2 text-[11px] text-white/40">
            Fix the cited standards and submit again — the same product is
            welcome once it complies.
          </p>
          {item.resubmit && (
            <button
              type="button"
              onClick={() => {
                setTrackOpen(false);
                window.setTimeout(
                  () => setSubmitOpen(true, item.resubmit!),
                  80,
                );
              }}
              className="group mt-3 inline-flex w-full items-center justify-between rounded-lg border border-red-500/25 bg-red-500/[0.06] px-3 py-2 text-left transition-colors hover:bg-red-500/[0.14]"
            >
              <span className="font-mono text-[11px] tracking-wider text-red-300">
                RESUBMIT WITH FIXES
              </span>
              <ArrowRight
                className="size-3.5 text-red-300 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </button>
          )}
        </div>
      )}

      {/* Approved → the live listing in the directory */}
      {item.status === "approved" && item.toolSlug && (
        <Link
          href={`/tools/${item.toolSlug}`}
          className="group mt-3 inline-flex w-full items-center justify-between rounded-lg border border-ember/25 bg-ember/[0.06] px-3 py-2 text-left transition-colors hover:bg-ember/[0.12]"
        >
          <span className="font-mono text-[11px] tracking-wider text-ember">
            Listing live — view it
          </span>
          <ArrowRight
            className="size-3.5 text-ember transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      )}
    </motion.li>
  );
}

// ── Dialog ───────────────────────────────────────────────────────────────

export function StatusTracker() {
  const open = useExplorer((s) => s.trackOpen);
  const setOpen = useExplorer((s) => s.setTrackOpen);
  const setSubmitOpen = useExplorer((s) => s.setSubmitOpen);
  const prefill = useExplorer((s) => s.trackEmail);

  const [email, setEmail] = useState("");
  const [items, setItems] = useState<SubmissionStatusItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchedFor, setSearchedFor] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const lookup = useCallback(async (raw: string) => {
    const value = raw.trim();
    if (!EMAIL_RE.test(value)) {
      setError("Enter the email you submitted with.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/submit/status?email=${encodeURIComponent(value)}`
      );
      const data = (await res.json()) as {
        items?: SubmissionStatusItem[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Lookup failed");
      setItems(data.items ?? []);
      setSearchedFor(value);
      window.localStorage.setItem(EMAIL_STORAGE, value);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lookup failed");
      setItems(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Open → prefill from the wizard hand-off, else the remembered email;
  // auto-lookup when we already know who's asking.
  useEffect(() => {
    if (!open) return;
    const remembered =
      prefill.trim() || window.localStorage.getItem(EMAIL_STORAGE) || "";
    setEmail(remembered);
    setItems(null);
    setError(null);
    setSearchedFor("");
    if (EMAIL_RE.test(remembered.trim())) {
      void lookup(remembered);
    } else {
      window.setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open, prefill, lookup]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton
        className="max-h-[90vh] gap-0 overflow-y-auto border-white/10 bg-coal p-0 text-white max-w-[calc(100vw-2rem)] sm:max-w-lg"
      >
        <DialogTitle className="sr-only">Track your submission</DialogTitle>
        <DialogDescription className="sr-only">
          Check the review status of a tool you submitted to Prother.
        </DialogDescription>

        <div className="px-6 pt-6 pb-2">
          <p className="font-mono text-[10px] tracking-widest text-ember">
            MAKERS
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight">
            Track your submission
          </h2>
          <p className="mt-1.5 text-sm text-white/50">
            Editors check every listing against the six standards — typically
            within 24h. Decisions are also emailed.
          </p>
        </div>

        <form
          className="flex gap-2 px-6 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            void lookup(email);
          }}
        >
          <Input
            ref={inputRef}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.ai"
            type="email"
            inputMode="email"
            autoComplete="email"
            aria-label="Submission email"
            className="border-white/10 bg-white/5 text-white placeholder:text-white/25"
          />
          <Button
            type="submit"
            disabled={loading}
            className="shrink-0 rounded-lg bg-ember font-semibold text-black shadow-none hover:bg-ember-hot dark:text-black"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <MailSearch className="size-4" aria-hidden />
            )}
            Track
          </Button>
        </form>

        {error && (
          <p role="alert" className="px-6 pb-2 text-xs text-red-400">
            {error}
          </p>
        )}

        <div className="px-6 pb-6">
          {loading && (
            <div className="space-y-3 py-2" aria-busy="true">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-xl bg-white/[0.04]"
                />
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            {!loading && items && items.length > 0 && (
              <motion.ul
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-h-[46vh] space-y-3 overflow-y-auto pr-1"
              >
                {items.map((item) => (
                  <ResultCard key={item.id} item={item} email={searchedFor} />
                ))}
              </motion.ul>
            )}

            {!loading && items && items.length === 0 && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center rounded-xl border border-dashed border-white/15 px-6 py-10 text-center"
              >
                <Inbox className="size-8 text-white/25" aria-hidden />
                <p className="mt-3 text-sm font-semibold text-white/70">
                  No submissions for{" "}
                  <span className="font-mono text-white/90">{searchedFor}</span>
                </p>
                <p className="mt-1 max-w-xs text-xs text-white/40">
                  Shipped something? Every listing that passes the quality bar
                  gets a permanent listing in the directory.
                </p>
                <Button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    window.setTimeout(() => setSubmitOpen(true), 80);
                  }}
                  className="mt-5 rounded-lg bg-ember font-semibold text-black shadow-none hover:bg-ember-hot dark:text-black"
                >
                  Submit your tool
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {searchedFor && items && items.length > 0 && (
            <p className="mt-4 border-t border-white/10 pt-3 text-center font-mono text-[10px] tracking-wider text-white/30">
              ALSO SENT TO {searchedFor.toUpperCase()} · REVIEW USUALLY TAKES 1–2 DAYS
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
