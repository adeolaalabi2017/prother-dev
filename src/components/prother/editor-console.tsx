"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Clock,
  KeyRound,
  Loader2,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "./categories";
import { useExplorer } from "./explorer-store";
import { STANDARD_DEFS } from "@/lib/standards";
import { PRICING_MODELS } from "@/lib/submit";

// ── Types (mirrors /api/editor/queue) ────────────────────────────────────

type EditorSubmission = {
  id: string;
  email: string;
  websiteUrl: string;
  domain: string;
  name: string;
  tagline: string;
  description: string;
  categorySlug: string;
  tags: string;
  pricingModel: string;
  startingPrice: string | null;
  pricingNote: string | null;
  hasApi: boolean;
  githubUrl: string | null;
  docsUrl: string | null;
  twitterUrl: string | null;
  logoEmoji: string;
  logoGradient: string;
  isOwner: boolean;
  confirmedLive: boolean;
  agreedStandards: boolean;
  status: string;
  createdAt: string;
  ageH: number;
};

type QueueResponse = {
  ok?: boolean;
  error?: string;
  pending?: EditorSubmission[];
  counts?: { pending: number; approved: number; rejected: number };
  capacity?: { today: number; tomorrow: number; floor: number; cap: number };
};

/** Demo passcode — real auth (NextAuth) ships in Phase 2. */
const DEMO_HINT = "ember-dev";
const KEY_STORAGE = "prother_editor_key";

function capacityChip(n: number, floor: number, cap: number) {
  if (n < floor) return { emoji: "🔴", label: "below floor" };
  if (n > cap) return { emoji: "⛔", label: "over cap" };
  if (n >= 11) return { emoji: "🟡", label: "11–15" };
  return { emoji: "🟢", label: "5–10" };
}

// ── Gate screen ──────────────────────────────────────────────────────────

function Gate({ onUnlock }: { onUnlock: (key: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="flex flex-col items-center px-8 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-ember/30 bg-ember/10">
        <KeyRound className="size-6 text-ember" aria-hidden />
      </div>
      <h2 className="mt-5 text-xl font-black tracking-tight text-white">
        Editor access
      </h2>
      <p className="mt-1.5 max-w-xs text-sm text-white/50">
        Review queue for the moderation desk. Demo key:{" "}
        <button
          type="button"
          onClick={() => setValue(DEMO_HINT)}
          className="font-mono text-ember underline-offset-2 hover:underline"
        >
          {DEMO_HINT}
        </button>
      </p>
      <form
        className="mt-6 flex w-full max-w-xs gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onUnlock(value.trim());
        }}
      >
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Editor key"
          type="password"
          aria-label="Editor key"
          className="border-white/10 bg-white/5 font-mono text-white placeholder:text-white/25"
        />
        <Button
          type="submit"
          className="rounded-lg bg-ember font-semibold text-black shadow-none hover:bg-ember-hot dark:text-black"
        >
          Unlock
        </Button>
      </form>
    </div>
  );
}

// ── One pending submission card ──────────────────────────────────────────

function PendingCard({
  sub,
  onApproved,
  onRejected,
}: {
  sub: EditorSubmission;
  onApproved: (slug: string) => void;
  onRejected: (id: string) => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [failed, setFailed] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [expanded, setExpanded] = useState(false);

  const category = CATEGORIES.find((c) => c.slug === sub.categorySlug);
  const pricing =
    PRICING_MODELS.find((p) => p.value === sub.pricingModel)?.label ??
    sub.pricingModel;
  const tags = sub.tags ? sub.tags.split("|").filter(Boolean) : [];

  const decide = useCallback(
    async (decision: "approve" | "reject") => {
      setBusy(decision);
      try {
        const res = await fetch("/api/editor/decision", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-editor-key": sessionStorage.getItem(KEY_STORAGE) ?? "",
          },
          body: JSON.stringify(
            decision === "approve"
              ? { decision, id: sub.id }
              : { decision, id: sub.id, failedStandards: failed, note }
          ),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          slug?: string;
          reviewNote?: string;
        };
        if (!res.ok || !data.ok) {
          toast({
            title: data.error ?? "Decision failed",
            variant: "destructive",
          });
          return;
        }
        if (decision === "approve" && data.slug) {
          toast({
            title: `${sub.name} scheduled`,
            description: `Added to tomorrow's launch day as /tool/${data.slug}.`,
          });
          onApproved(data.slug);
        } else {
          toast({ title: `${sub.name} rejected`, description: data.reviewNote });
          onRejected(sub.id);
        }
      } catch {
        toast({
          title: "Decision failed",
          description: "Network error — try again.",
          variant: "destructive",
        });
      } finally {
        setBusy(null);
      }
    },
    [sub, failed, note, toast, onApproved, onRejected]
  );

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02]">
      {/* header row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-white/[0.03]"
      >
        <div
          aria-hidden
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg shadow-inner",
            sub.logoGradient
          )}
        >
          {sub.logoEmoji}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-bold text-white">
            <span className="truncate">{sub.name}</span>
            {sub.isOwner ? (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-px font-mono text-[9px] text-emerald-400">
                <BadgeCheck className="size-2.5" aria-hidden /> OWNER
              </span>
            ) : (
              <span className="shrink-0 rounded-full border border-white/15 px-1.5 py-px font-mono text-[9px] text-white/50">
                3RD PARTY
              </span>
            )}
          </p>
          <p className="truncate text-sm text-white/60">{sub.tagline}</p>
        </div>
        <div className="hidden shrink-0 text-right sm:block">
          <p className="font-mono text-[10px] text-white/40">{sub.domain}</p>
          <p className="flex items-center justify-end gap-1 font-mono text-[10px] text-ember">
            <Clock className="size-3" aria-hidden /> {sub.ageH}h in queue
          </p>
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-white/40 transition-transform",
            expanded && "rotate-180"
          )}
          aria-hidden
        />
      </button>

      {/* expanded detail */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t border-white/10 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="font-mono text-[10px] tracking-widest text-white/40">
                    LISTING
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-white/70">
                    {sub.description}
                  </p>
                </div>
                <div className="space-y-1.5 text-xs text-white/70">
                  <p>
                    <span className="font-mono text-[10px] text-white/40">CATEGORY</span>{" "}
                    {category ? `${category.emoji} ${category.name}` : sub.categorySlug}
                  </p>
                  <p>
                    <span className="font-mono text-[10px] text-white/40">PRICING</span>{" "}
                    {pricing}
                    {sub.startingPrice && (
                      <span className="ml-1 font-mono text-ember">{sub.startingPrice}</span>
                    )}
                    {sub.pricingNote && (
                      <span className="text-white/50"> — {sub.pricingNote}</span>
                    )}
                  </p>
                  <p>
                    <span className="font-mono text-[10px] text-white/40">EMAIL</span>{" "}
                    <span className="font-mono">{sub.email}</span>
                  </p>
                  <p className="flex flex-wrap gap-1.5 pt-0.5">
                    {sub.hasApi && (
                      <span className="rounded border border-white/15 px-1.5 py-px font-mono text-[10px] text-white/60">
                        API
                      </span>
                    )}
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="rounded border border-white/15 px-1.5 py-px font-mono text-[10px] text-white/60"
                      >
                        {t}
                      </span>
                    ))}
                  </p>
                  <a
                    href={sub.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block font-mono text-[11px] text-ember hover:underline"
                  >
                    Visit {sub.domain} ↗
                  </a>
                </div>
              </div>

              {/* S1–S6 quick audit (PRD §7 — reviewer checklist) */}
              <div className="grid gap-1.5 sm:grid-cols-2">
                {STANDARD_DEFS.map((s) => {
                  const selfDeclared =
                    (s.id === "S1" && sub.confirmedLive) ||
                    (s.id === "S3" && sub.agreedStandards);
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1.5"
                    >
                      {selfDeclared ? (
                        <CheckCircle2
                          className="size-3.5 shrink-0 text-emerald-400"
                          aria-hidden
                        />
                      ) : (
                        <CircleDashed
                          className="size-3.5 shrink-0 text-white/30"
                          aria-hidden
                        />
                      )}
                      <p className="min-w-0 text-[11px] text-white/60">
                        <span className="font-mono text-ember">{s.id}</span>{" "}
                        {s.title}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* decision row */}
              {!rejecting ? (
                <div className="flex flex-wrap items-center gap-2.5 border-t border-white/10 pt-3.5">
                  <Button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => decide("approve")}
                    className="h-9 rounded-lg bg-ember font-semibold text-black shadow-none hover:bg-ember-hot disabled:opacity-50 dark:text-black"
                  >
                    {busy === "approve" ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <CalendarClock className="size-4" aria-hidden />
                    )}
                    Approve → schedule tomorrow
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy !== null}
                    onClick={() => setRejecting(true)}
                    className="h-9 rounded-lg border-red-400/30 bg-transparent text-red-400 hover:bg-red-400/10 hover:text-red-300"
                  >
                    <XCircle className="size-4" aria-hidden />
                    Reject…
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 rounded-xl border border-red-400/25 bg-red-400/[0.05] p-3.5">
                  <p className="flex items-center gap-2 font-mono text-[11px] tracking-widest text-red-300">
                    <ShieldAlert className="size-4" aria-hidden />
                    REJECTIONS MUST CITE FAILED STANDARD(S)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {STANDARD_DEFS.map((s) => {
                      const on = failed.includes(s.id);
                      return (
                        <label
                          key={s.id}
                          className={cn(
                            "flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] transition-all active:scale-95",
                            on
                              ? "border-red-400 bg-red-400/15 text-red-200"
                              : "border-white/15 text-white/60 hover:border-red-400/40"
                          )}
                        >
                          <Checkbox
                            checked={on}
                            onCheckedChange={(v) =>
                              setFailed((prev) =>
                                v
                                  ? [...prev, s.id]
                                  : prev.filter((x) => x !== s.id)
                              )
                            }
                            className="size-3 border-white/30 data-[state=checked]:border-red-400 data-[state=checked]:bg-red-400 data-[state=checked]:text-black"
                          />
                          {s.id} {s.title}
                        </label>
                      );
                    })}
                  </div>
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Optional note for the maker…"
                    maxLength={500}
                    className="border-white/10 bg-white/5 text-sm text-white placeholder:text-white/25"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      disabled={busy !== null || failed.length === 0}
                      onClick={() => decide("reject")}
                      className="h-9 rounded-lg bg-red-500 font-semibold text-white shadow-none hover:bg-red-400 disabled:opacity-40"
                    >
                      {busy === "reject" ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <XCircle className="size-4" aria-hidden />
                      )}
                      Reject with {failed.length} citation{failed.length === 1 ? "" : "s"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setRejecting(false)}
                      className="h-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white"
                    >
                      Back
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── The console ──────────────────────────────────────────────────────────

export function EditorConsole() {
  const { toast } = useToast();
  const open = useExplorer((s) => s.editorOpen);
  const setOpen = useExplorer((s) => s.setEditorOpen);
  const [authed, setAuthed] = useState(false);
  const [queue, setQueue] = useState<QueueResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/editor/queue", {
        headers: { "x-editor-key": sessionStorage.getItem(KEY_STORAGE) ?? "" },
      });
      if (res.status === 401) {
        sessionStorage.removeItem(KEY_STORAGE);
        setAuthed(false);
        return;
      }
      setQueue((await res.json()) as QueueResponse);
    } catch {
      toast({
        title: "Queue unavailable",
        description: "Could not reach the review desk.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const unlock = useCallback(
    (key: string) => {
      sessionStorage.setItem(KEY_STORAGE, key);
      setAuthed(true);
      void load();
    },
    [load]
  );

  // Restore session key + ⌘⇧E shortcut.
  useEffect(() => {
    if (sessionStorage.getItem(KEY_STORAGE)) {
      setAuthed(true);
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  // Load the queue when the dialog opens.
  useEffect(() => {
    if (open && authed) void load();
  }, [open, authed, load]);

  const cap = queue?.capacity;
  const chip = cap ? capacityChip(cap.today, cap.floor, cap.cap) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton
        className="max-h-[92vh] gap-0 overflow-y-auto border-white/10 bg-coal p-0 text-white max-w-[calc(100vw-2rem)] sm:max-w-2xl"
      >
        <DialogTitle className="sr-only">Editor review queue</DialogTitle>
        <DialogDescription className="sr-only">
          Moderate pending tool submissions: approve to schedule for tomorrow,
          or reject citing failed listing standards.
        </DialogDescription>

        {!authed ? (
          <Gate onUnlock={unlock} />
        ) : (
          <div className="px-5 pb-6 pt-5 sm:px-6">
            {/* header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] tracking-[0.25em] text-ember">
                  EDITOR CONSOLE
                </p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-white">
                  Review queue
                </h2>
              </div>
              {cap && chip && (
                <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
                  <span
                    title={`Today: ${chip.label}`}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-white/70"
                  >
                    {chip.emoji} TODAY {cap.today}/{cap.cap}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-white/70">
                    TMRW {cap.tomorrow}/{cap.cap}
                  </span>
                  <span className="rounded-full border border-ember/30 bg-ember/10 px-2.5 py-1 text-ember">
                    PENDING {queue?.counts?.pending ?? 0}
                  </span>
                </div>
              )}
            </div>

            {/* queue */}
            <div className="mt-5 space-y-3">
              {loading && !queue && (
                <div className="flex items-center justify-center py-12 text-white/40">
                  <Loader2 className="size-5 animate-spin" aria-hidden />
                </div>
              )}

              {queue && (queue.pending?.length ?? 0) === 0 && (
                <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
                  <CheckCircle2
                    className="mx-auto size-8 text-emerald-400"
                    aria-hidden
                  />
                  <p className="mt-3 font-mono text-sm text-white/60">
                    Queue clear — nothing waiting for review.
                  </p>
                  <p className="mt-1 text-xs text-white/35">
                    New submissions from the wizard land here oldest-first.
                  </p>
                </div>
              )}

              {queue?.pending?.map((s) => (
                <PendingCard
                  key={s.id}
                  sub={s}
                  onApproved={() => {
                    void load();
                    window.dispatchEvent(new CustomEvent("prother:feed-refresh"));
                  }}
                  onRejected={() => void load()}
                />
              ))}
            </div>

            <p className="mt-5 font-mono text-[10px] leading-relaxed text-white/30">
              APPROVED LISTINGS GO LIVE AT 00:00 UTC · REJECTIONS EMAIL THE MAKER
              WITH CITED STANDARDS · DEMO AUTH — PHASE 2 ADDS NEXTAUTH
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
