"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Clock,
  KeyRound,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Star,
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
  claims?: EditorClaim[];
  filteredReviews?: EditorReview[];
};

/** Ownership claim awaiting arbitration (F-30 — editor gate). */
type EditorClaim = {
  id: string;
  toolSlug: string;
  toolName: string;
  toolEmoji: string;
  userEmail: string;
  userName: string;
  method: string;
  status: "pending" | "failed" | "disputed";
  token: string;
  note: string | null;
  ageH: number;
};

/** Review held back by the <48h account-age filter (F-16 soft moderation). */
type EditorReview = {
  id: string;
  toolSlug: string;
  toolName: string;
  toolEmoji: string;
  author: string;
  ease: number;
  power: number;
  value: number;
  body: string;
  ageH: number;
};

/** Demo passcode — real auth (NextAuth) ships in Phase 2. */
const DEMO_HINT = "ember-dev";
const KEY_STORAGE = "prother_editor_key";

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
            title: `${sub.name} approved`,
            description: `Listing approved — now live in the directory at /tool/${data.slug}.`,
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
                      <CheckCircle2 className="size-4" aria-hidden />
                    )}
                    Approve &amp; publish listing
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

// ── One ownership-claim arbitration card (F-30) ──────────────────────────

const CLAIM_STATUS_STYLE: Record<EditorClaim["status"], string> = {
  pending: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  failed: "border-red-400/30 bg-red-400/10 text-red-300",
  disputed: "border-white/15 bg-white/5 text-white/50",
};

function ClaimCard({ claim, onDone }: { claim: EditorClaim; onDone: () => void }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<"verify" | "dismiss" | null>(null);
  const [dismissing, setDismissing] = useState(false);
  const [note, setNote] = useState("");

  const decide = useCallback(
    async (action: "verify" | "dismiss") => {
      setBusy(action);
      try {
        const res = await fetch("/api/editor/arbitrate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-editor-key": sessionStorage.getItem(KEY_STORAGE) ?? "",
          },
          body: JSON.stringify(
            action === "verify"
              ? { type: "claim", id: claim.id, action }
              : { type: "claim", id: claim.id, action, note: note || undefined }
          ),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          toast({ title: data.error ?? "Arbitration failed", variant: "destructive" });
          return;
        }
        toast({
          title:
            action === "verify"
              ? `${claim.toolName} verified → ${claim.userName}`
              : `Claim by ${claim.userName} dismissed`,
          description:
            action === "verify"
              ? "Listing ownership transferred, badge goes live."
              : "Claimant sees DISPUTED — they can re-claim with proof.",
        });
        onDone();
      } catch {
        toast({
          title: "Arbitration failed",
          description: "Network error — try again.",
          variant: "destructive",
        });
      } finally {
        setBusy(null);
      }
    },
    [claim, note, toast, onDone]
  );

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-start gap-3">
        <div
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/5 text-lg"
        >
          {claim.toolEmoji}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-bold text-white">
            <span className="truncate">{claim.toolName}</span>
            <span
              className={cn(
                "rounded-full border px-1.5 py-px font-mono text-[9px] uppercase",
                CLAIM_STATUS_STYLE[claim.status]
              )}
            >
              {claim.status}
            </span>
            <span className="rounded-full border border-white/15 px-1.5 py-px font-mono text-[9px] text-white/50">
              {claim.method === "email_domain" ? "EMAIL DOMAIN" : "META TAG"}
            </span>
          </p>
          <p className="truncate text-sm text-white/60">
            {claim.userName} · <span className="font-mono text-xs">{claim.userEmail}</span>
          </p>
          <p className="mt-0.5 flex items-center gap-1 font-mono text-[10px] text-white/40">
            <Clock className="size-3" aria-hidden /> waiting {claim.ageH}h · /{claim.toolSlug}
          </p>
          {claim.note && (
            <p className="mt-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-white/60">
              {claim.note}
            </p>
          )}
        </div>
      </div>

      {/* verification token — editors can spot-check the live site */}
      <div className="mt-3 rounded-lg border border-white/10 bg-black/40 p-2.5">
        <p className="font-mono text-[10px] tracking-widest text-white/35">EXPECTED META TAG</p>
        <p className="mt-1 break-all font-mono text-[11px] text-white/70">
          &lt;meta name=&quot;prother-claim&quot; content=&quot;
          <span className="text-ember">{claim.token}</span>&quot;&gt;
        </p>
      </div>

      {!dismissing ? (
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            disabled={busy !== null}
            onClick={() => decide("verify")}
            className="h-9 rounded-lg bg-ember font-semibold text-black shadow-none hover:bg-ember-hot disabled:opacity-50 dark:text-black"
          >
            {busy === "verify" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ShieldCheck className="size-4" aria-hidden />
            )}
            Verify &amp; transfer ownership
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy !== null}
            onClick={() => setDismissing(true)}
            className="h-9 rounded-lg border-red-400/30 bg-transparent text-red-400 hover:bg-red-400/10 hover:text-red-300"
          >
            <XCircle className="size-4" aria-hidden />
            Dismiss…
          </Button>
        </div>
      ) : (
        <div className="mt-3 space-y-2.5 rounded-xl border border-red-400/25 bg-red-400/[0.05] p-3">
          <p className="flex items-center gap-2 font-mono text-[11px] tracking-widest text-red-300">
            <ShieldAlert className="size-4" aria-hidden />
            DISMISSAL IS FINAL FOR THIS CLAIM
          </p>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason shown to the claimant…"
            maxLength={500}
            className="border-white/10 bg-white/5 text-sm text-white placeholder:text-white/25"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              disabled={busy !== null}
              onClick={() => decide("dismiss")}
              className="h-9 rounded-lg bg-red-500 font-semibold text-white shadow-none hover:bg-red-400 disabled:opacity-40"
            >
              {busy === "dismiss" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <XCircle className="size-4" aria-hidden />
              )}
              Dismiss claim
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDismissing(false)}
              className="h-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white"
            >
              Back
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── One filtered-review moderation card (F-16) ───────────────────────────

function StarRow({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1" title={`${label} ${value}/5`}>
      <span className="font-mono text-[10px] tracking-widest text-white/40">{label}</span>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "size-3",
            i < value ? "fill-ember text-ember" : "text-white/20"
          )}
          aria-hidden
        />
      ))}
    </span>
  );
}

function FilteredReviewCard({
  review,
  onDone,
}: {
  review: EditorReview;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<"publish" | "spam" | null>(null);
  const [confirmSpam, setConfirmSpam] = useState(false);

  const decide = useCallback(
    async (action: "publish" | "spam") => {
      setBusy(action);
      try {
        const res = await fetch("/api/editor/arbitrate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-editor-key": sessionStorage.getItem(KEY_STORAGE) ?? "",
          },
          body: JSON.stringify({ type: "review", id: review.id, action }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          toast({ title: data.error ?? "Moderation failed", variant: "destructive" });
          return;
        }
        toast({
          title:
            action === "publish"
              ? `Review on ${review.toolName} published`
              : `Spam removed from ${review.toolName}`,
          description:
            action === "publish"
              ? "It now counts toward the tool's rating aggregate."
              : "The review was deleted permanently.",
        });
        onDone();
      } catch {
        toast({
          title: "Moderation failed",
          description: "Network error — try again.",
          variant: "destructive",
        });
      } finally {
        setBusy(null);
      }
    },
    [review, toast, onDone]
  );

  return (
    <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-4">
      <div className="flex items-start gap-3">
        <div
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/5 text-lg"
        >
          {review.toolEmoji}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-bold text-white">
            <span className="truncate">{review.toolName}</span>
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-1.5 py-px font-mono text-[9px] text-amber-300">
              HELD &lt;48H ACCOUNT
            </span>
          </p>
          <p className="font-mono text-xs text-white/50">
            by {review.author} · waiting {review.ageH}h · /{review.toolSlug}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        <StarRow label="EASE" value={review.ease} />
        <StarRow label="POWER" value={review.power} />
        <StarRow label="VALUE" value={review.value} />
      </div>
      <p className="mt-2.5 whitespace-pre-line rounded-lg border border-white/10 bg-black/30 p-3 text-sm leading-relaxed text-white/75">
        {review.body}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <Button
          type="button"
          disabled={busy !== null}
          onClick={() => decide("publish")}
          className="h-9 rounded-lg bg-emerald-500 font-semibold text-black shadow-none hover:bg-emerald-400 disabled:opacity-50"
        >
          {busy === "publish" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <CheckCircle2 className="size-4" aria-hidden />
          )}
          Publish
        </Button>
        {!confirmSpam ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy !== null}
            onClick={() => setConfirmSpam(true)}
            className="h-9 rounded-lg border-red-400/30 bg-transparent text-red-400 hover:bg-red-400/10 hover:text-red-300"
          >
            <XCircle className="size-4" aria-hidden />
            Spam…
          </Button>
        ) : (
          <>
            <Button
              type="button"
              disabled={busy !== null}
              onClick={() => decide("spam")}
              className="h-9 rounded-lg bg-red-500 font-semibold text-white shadow-none hover:bg-red-400 disabled:opacity-40"
            >
              {busy === "spam" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <XCircle className="size-4" aria-hidden />
              )}
              Delete permanently
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmSpam(false)}
              className="h-9 rounded-lg text-white/60 hover:bg-white/5 hover:text-white"
            >
              Back
            </Button>
          </>
        )}
      </div>
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
  const [tab, setTab] = useState<"submissions" | "claims" | "reviews">(
    "submissions"
  );

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

  const claimCount = queue?.claims?.length ?? 0;
  const reviewCount = queue?.filteredReviews?.length ?? 0;
  const pendingCount = queue?.pending?.length ?? 0;

  const TABS = [
    { id: "submissions", label: "SUBMISSIONS", count: pendingCount },
    { id: "claims", label: "CLAIMS", count: claimCount },
    { id: "reviews", label: "FILTERED REVIEWS", count: reviewCount },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton
        className="max-h-[92vh] gap-0 overflow-y-auto border-white/10 bg-coal p-0 text-white max-w-[calc(100vw-2rem)] sm:max-w-2xl"
      >
        <DialogTitle className="sr-only">Editor review queue</DialogTitle>
        <DialogDescription className="sr-only">
          Moderate pending tool submissions: approve to publish the listing
          immediately, or reject citing failed listing standards.
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
              {queue && (
                <span className="rounded-full border border-ember/30 bg-ember/10 px-2.5 py-1 font-mono text-[10px] text-ember">
                  PENDING {pendingCount}
                </span>
              )}
            </div>

            {/* moderation desk tabs */}
            <div
              role="tablist"
              aria-label="Editor console sections"
              className="mt-4 flex flex-wrap gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] p-1"
            >
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[11px] tracking-widest transition-colors",
                    tab === t.id
                      ? "bg-ember font-bold text-black"
                      : "text-white/55 hover:bg-white/5 hover:text-white"
                  )}
                >
                  {t.label}
                  {t.count > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-px text-[9px]",
                        tab === t.id
                          ? "bg-black/20 text-black"
                          : "bg-ember/15 text-ember"
                      )}
                    >
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* queue */}
            <div className="mt-4 space-y-3">
              {loading && !queue && (
                <div className="flex items-center justify-center py-12 text-white/40">
                  <Loader2 className="size-5 animate-spin" aria-hidden />
                </div>
              )}

              {tab === "submissions" && (
                <>
                  {queue && pendingCount === 0 && (
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
                </>
              )}

              {tab === "claims" && (
                <>
                  {queue && claimCount === 0 && (
                    <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
                      <ShieldCheck
                        className="mx-auto size-8 text-emerald-400"
                        aria-hidden
                      />
                      <p className="mt-3 font-mono text-sm text-white/60">
                        No claims awaiting arbitration.
                      </p>
                      <p className="mt-1 text-xs text-white/35">
                        Failed or disputed ownership claims land here for a human
                        decision (F-30).
                      </p>
                    </div>
                  )}

                  {queue?.claims?.map((c) => (
                    <ClaimCard key={c.id} claim={c} onDone={() => void load()} />
                  ))}
                </>
              )}

              {tab === "reviews" && (
                <>
                  {queue && reviewCount === 0 && (
                    <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
                      <CheckCircle2
                        className="mx-auto size-8 text-emerald-400"
                        aria-hidden
                      />
                      <p className="mt-3 font-mono text-sm text-white/60">
                        No reviews held in moderation.
                      </p>
                      <p className="mt-1 text-xs text-white/35">
                        Reviews from accounts younger than 48h are held here —
                        publish the legit ones, trash the spam (F-16).
                      </p>
                    </div>
                  )}

                  {queue?.filteredReviews?.map((r) => (
                    <FilteredReviewCard
                      key={r.id}
                      review={r}
                      onDone={() => void load()}
                    />
                  ))}
                </>
              )}
            </div>

            <p className="mt-5 font-mono text-[10px] leading-relaxed text-white/30">
              APPROVED LISTINGS GO LIVE IMMEDIATELY · REJECTIONS EMAIL THE MAKER
              WITH CITED STANDARDS · CLAIM ARBITRATION TRANSFERS OWNERSHIP
              IMMEDIATELY · DEMO AUTH — PHASE 2 ADDS NEXTAUTH ROLES
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
