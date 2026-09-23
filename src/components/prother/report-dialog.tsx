"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Flag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getVoterKey } from "./voter";

/**
 * ReportDialog (Task 23) — "report content" flow against POST /api/reports.
 *
 * Controlled dialog: the parent owns `open`; `targetType`/`targetId` describe
 * what is being reported. Works signed-in (server resolves the session) or
 * anonymous (the shared localStorage voterKey rides along as visitorKey, so
 * duplicate-open reports dedupe per visitor the same way votes do).
 *
 * Outcomes:
 *  201 {already:false} → success panel, auto-close ~1.6s
 *  200 {already:true}  → "Already reported" panel, auto-close ~1.6s
 *  404 invalid_target  → "no longer available" inline error
 *  400 owner_required  → generic inline error (anon without a key — abnormal)
 */

export type ReportTargetType = "thread" | "reply" | "tool" | "post" | "review";

const REASONS: { value: string; label: string; hint: string }[] = [
  { value: "spam", label: "Spam", hint: "Ads, phishing, or repeated self-promotion" },
  { value: "harassment", label: "Harassment", hint: "Targeting someone abusively" },
  { value: "inappropriate", label: "Inappropriate", hint: "Content that breaks the house rules" },
  { value: "misleading", label: "Misleading", hint: "Fake claims or wrong information" },
  { value: "broken", label: "Broken", hint: "Link or demo doesn't work" },
  { value: "other", label: "Other", hint: "Something else the moderators should see" },
];

const DETAILS_MAX = 500;

type Phase = "form" | "submitting" | "done" | "already";

export function ReportDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportTargetType;
  targetId: string;
  /** Shown in the subtitle so the reporter knows what they're flagging. */
  targetLabel?: string;
}) {
  const { open, onOpenChange, targetType, targetId, targetLabel } = props;

  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  // Reset for the next open when the dialog closes (event-driven — no
  // setState-in-effect), and clear any pending auto-close timer on unmount.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setReason(null);
      setDetails("");
      setPhase("form");
      setError(null);
    }
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onOpenChange(next);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const closeSoon = (ms: number) => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      handleOpenChange(false);
    }, ms);
  };

  const submit = async () => {
    if (!reason || phase === "submitting" || !targetId) return;
    setPhase("submitting");
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId,
          reason,
          details: details.trim() || undefined,
          visitorKey: getVoterKey() || undefined,
        }),
      });
      if (res.status === 404) {
        setError("This content is no longer available.");
        setPhase("form");
        return;
      }
      if (res.status === 400 || res.status === 422) {
        setError("Something went wrong. Try again in a moment.");
        setPhase("form");
        return;
      }
      if (!res.ok) {
        setError("Something went wrong. Try again in a moment.");
        setPhase("form");
        return;
      }
      const j = (await res.json().catch(() => ({}))) as { already?: boolean };
      if (j.already) {
        setPhase("already");
        closeSoon(1800);
      } else {
        setPhase("done");
        closeSoon(1600);
      }
    } catch {
      setError("Something went wrong. Try again in a moment.");
      setPhase("form");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[92vh] gap-0 overflow-y-auto border-white/10 bg-coal p-0 text-white sm:max-w-md"
        aria-describedby={undefined}
      >
        <DialogHeader className="border-b border-white/10 p-5 text-left">
          <DialogTitle className="flex items-center gap-2 text-lg font-black tracking-tight">
            <Flag className="size-4 text-ember" aria-hidden />
            Report {targetType}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-white/50">
            {targetLabel
              ? `Flag "${targetLabel}" for the moderators.`
              : "Flag this for the moderators."}{" "}
            Reports are reviewed by people, not automations.
          </DialogDescription>
        </DialogHeader>

        {phase === "done" || phase === "already" ? (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <span
              aria-hidden
              className="grid size-12 place-items-center rounded-full border border-mint/40 bg-mint/10"
            >
              <Check className="size-5 text-mint" />
            </span>
            <p className="text-sm font-semibold text-white">
              {phase === "already" ? "Already reported, thanks" : "Thanks. Our moderators will take a look"}
            </p>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-white/55">
              {phase === "already" ? "One report is enough" : "Closing…"}
            </p>
          </div>
        ) : (
          <div className="space-y-4 p-5">
            <fieldset>
              <legend className="font-mono text-xs uppercase tracking-wider text-white/50">
                What&apos;s wrong?
              </legend>
              <RadioGroup
                value={reason ?? undefined}
                onValueChange={setReason}
                aria-label="Report reason"
                className="mt-2 gap-1.5"
              >
                {REASONS.map((r) => (
                  <label
                    key={r.value}
                    htmlFor={`report-reason-${r.value}`}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                      reason === r.value
                        ? "border-ember/50 bg-ember/10"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20"
                    )}
                  >
                    <RadioGroupItem
                      id={`report-reason-${r.value}`}
                      value={r.value}
                      className="mt-0.5 border-white/25 text-ember focus-visible:ring-ember/30 data-[state=checked]:border-ember"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-white/90">{r.label}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-white/60">{r.hint}</span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </fieldset>

            <div>
              <label
                htmlFor="report-details"
                className="font-mono text-xs uppercase tracking-wider text-white/50"
              >
                Details (optional)
              </label>
              <Textarea
                id="report-details"
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, DETAILS_MAX))}
                rows={3}
                maxLength={DETAILS_MAX}
                placeholder="Anything that helps the moderators: links, context, what happened."
                className="mt-1.5 resize-y border-white/10 bg-white/[0.03] text-white placeholder:text-white/55 focus-visible:border-ember/50 focus-visible:ring-ember/30"
              />
              <p className="mt-1 font-mono text-xs text-white/55">
                {details.length}/{DETAILS_MAX}
              </p>
            </div>

            {error && (
              <p role="alert" className="text-xs text-red-400">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                className="text-white/60 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void submit()}
                disabled={!reason || phase === "submitting"}
                className="bg-ember text-coal hover:bg-ember-hot disabled:opacity-50"
              >
                {phase === "submitting" && (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                )}
                Submit report
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
