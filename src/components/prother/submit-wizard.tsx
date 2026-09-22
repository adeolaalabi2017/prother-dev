"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  ExternalLink,
  Eye,
  Loader2,
  TriangleAlert,
  X,
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
import {
  CATEGORIES,
} from "./categories";
import { toolHash, useExplorer } from "./explorer-store";
import {
  domainOf,
  GRADIENTS,
  INITIAL_SUBMIT_FORM,
  LOGO_EMOJIS,
  PRICING_MODELS,
  TAG_VOCAB,
  validateStep,
  type SubmitForm,
  type TagVocab,
} from "@/lib/submit";

// ── Small building blocks ────────────────────────────────────────────────

const STEP_TITLES = ["Product", "Describe", "Pricing & links", "Media", "Confirm"];

function FieldLabel({
  htmlFor,
  children,
  hint,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="flex items-baseline justify-between gap-2 font-mono text-[11px] tracking-widest text-white/60"
    >
      <span>{children}</span>
      {hint && <span className="text-[10px] normal-case tracking-normal text-white/35">{hint}</span>}
    </label>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1.5 font-mono text-[11px] text-red-400">
      <TriangleAlert className="size-3" aria-hidden />
      {msg}
    </p>
  );
}

const inputCls =
  "border-white/10 bg-white/5 text-white placeholder:text-white/25 focus-visible:border-ember/60 focus-visible:ring-ember/20";

// ── Live preview (right rail — updates every keystroke, PRD §11) ─────────

function LivePreview({ form }: { form: SubmitForm }) {
  const pricing =
    PRICING_MODELS.find((p) => p.value === form.pricingModel)?.label ?? "Freemium";
  const category = CATEGORIES.find((c) => c.slug === form.categorySlug);
  return (
    <div className="space-y-4">
      <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-white/40">
        <Eye className="size-3.5 text-ember" aria-hidden /> LIVE PREVIEW
      </p>

      {/* Listing mock */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex gap-3">
          <div
            aria-hidden
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xl shadow-inner",
              form.logoGradient
            )}
          >
            {form.logoEmoji}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-base font-bold text-white">
                {form.name.trim() || "Your tool"}
              </p>
              {form.isOwner && form.name.trim() && (
                <span className="rounded-full border border-ember/30 bg-ember/15 px-2 py-0.5 font-mono text-[9px] text-ember">
                  SUBMITTED BY YOU
                </span>
              )}
            </div>
            <p className="mt-0.5 line-clamp-2 text-sm text-white/70">
              {form.tagline.trim() || (
                <span className="text-white/25">Say what it does in the first 5 words…</span>
              )}
            </p>
          </div>
        </div>
        <p className="mt-3 font-mono text-[11px] text-white/40">
          {category ? `${category.emoji} ${category.name}` : "Category"} · {pricing}
          {form.hasApi && " · API"}
          {form.tags.includes("open-source") && " · OSS"}
          {domainOf(form.websiteUrl) && ` · ${domainOf(form.websiteUrl)}`}
        </p>
      </div>

      {/* Pricing mock */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <p className="font-mono text-[10px] tracking-widest text-white/40">PRICING</p>
        <p className="mt-1.5 text-sm text-white/80">
          {pricing}
          {form.startingPrice.trim() && (
            <span className="ml-1.5 font-mono text-ember">{form.startingPrice.trim()}</span>
          )}
        </p>
        {form.pricingNote.trim() && (
          <p className="mt-1 text-xs text-white/50">{form.pricingNote.trim()}</p>
        )}
      </div>

      {/* Standards reminder */}
      <div className="rounded-xl border border-ember/20 bg-ember/[0.06] p-4">
        <p className="font-mono text-[10px] tracking-widest text-ember">QUALITY BAR</p>
        <p className="mt-1.5 text-xs leading-relaxed text-white/60">
          Every listing passes all six standards: live &amp; accessible, AI-native,
          complete, honest, safe, English. Rejections cite the failed standard.
        </p>
      </div>
    </div>
  );
}

// ── Duplicate interstitial (PRD §11 — fires on Step-1 URL blur) ──────────

type DuplicateInfo = {
  kind: string;
  name: string;
  slug?: string;
  maker?: string;
};

function DuplicateBanner({
  dup,
  onViewTool,
  onContinue,
}: {
  dup: DuplicateInfo;
  onViewTool: (slug: string) => void;
  onContinue: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-amber-500/40 bg-amber-500/[0.07] p-3.5"
    >
      <p className="flex items-start gap-2 text-sm text-amber-200">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden />
        <span>
          This tool may already be on Prother —{" "}
          <span className="font-semibold">{dup.name}</span>
          {dup.kind === "tool" && (
            <span className="text-amber-200/70"> · already listed</span>
          )}
          {dup.kind === "submission" && (
            <span className="text-amber-200/70"> · already in the review queue</span>
          )}
        </span>
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2 pl-6">
        {dup.kind === "tool" && dup.slug ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onViewTool(dup.slug!)}
            className="h-8 rounded-lg border-amber-500/40 bg-transparent text-amber-200 hover:bg-amber-500/10 hover:text-amber-100"
          >
            This is my product → View it
          </Button>
        ) : (
          <span className="pl-0.5 font-mono text-[11px] text-amber-200/70">
            One submission per domain — pick another product or contact editors.
          </span>
        )}
        {dup.kind !== "submission" && (
          <button
            type="button"
            onClick={onContinue}
            className="rounded-lg px-2 py-1 font-mono text-[11px] text-white/50 underline-offset-2 transition-colors hover:text-white hover:underline"
          >
            It&apos;s a different tool → Continue
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ── The wizard ───────────────────────────────────────────────────────────

export function SubmitWizard() {
  const { toast } = useToast();
  const router = useRouter();
  const open = useExplorer((s) => s.submitOpen);
  const setOpen = useExplorer((s) => s.setSubmitOpen);
  const submitPrefill = useExplorer((s) => s.submitPrefill);
  const openTool = useExplorer((s) => s.openTool);
  const setTrackOpen = useExplorer((s) => s.setTrackOpen);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<SubmitForm>(INITIAL_SUBMIT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dup, setDup] = useState<DuplicateInfo | null>(null);
  const [checkingDup, setCheckingDup] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ id: string; position: number } | null>(
    null
  );

  const set = useCallback(
    <K extends keyof SubmitForm>(key: K, value: SubmitForm[K]) => {
      setForm((f) => ({ ...f, [key]: value }));
      setErrors((e) => {
        if (!e[key as string]) return e;
        const next = { ...e };
        delete next[key as string];
        return next;
      });
    },
    []
  );

  const reset = useCallback(() => {
    setForm(INITIAL_SUBMIT_FORM);
    setStep(0);
    setErrors({});
    setDup(null);
    setResult(null);
  }, []);

  const onOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) window.setTimeout(reset, 250);
    },
    [setOpen, reset]
  );

  // "Resubmit with fixes" (status tracker): a draft queued in the store is
  // applied once when the wizard opens with one — confirm checkboxes stay
  // unticked so the maker re-attests after addressing the cited standards.
  // `toast` is a module-level function (stable identity), so it's a safe dep.
  useEffect(() => {
    if (!open || !submitPrefill) return;
    setForm({ ...INITIAL_SUBMIT_FORM, ...submitPrefill });
    setStep(0);
    setErrors({});
    setDup(null);
    setResult(null);
    toast({
      title: "Draft loaded",
      description: `Pre-filled from your rejected ${submitPrefill.name} submission.`,
    });
  }, [open, submitPrefill, toast]);

  // PRD §11: duplicate check on Step-1 URL blur.
  const checkDuplicate = useCallback(async () => {
    const domain = domainOf(form.websiteUrl);
    if (!domain || !domain.includes(".")) return;
    setCheckingDup(true);
    try {
      const res = await fetch(
        `/api/submit/check?url=${encodeURIComponent(form.websiteUrl.trim())}`
      );
      const data = (await res.json()) as { valid: boolean; duplicate: DuplicateInfo | null };
      setDup(data.duplicate);
    } catch {
      // Network hiccup — non-blocking; server re-checks on submit.
    } finally {
      setCheckingDup(false);
    }
  }, [form.websiteUrl]);

  const goNext = useCallback(() => {
    const errs = validateStep(step, form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (step === 0 && dup?.kind === "submission") return; // blocked by interstitial
    setStep((s) => Math.min(4, s + 1));
  }, [step, form, dup]);

  const onSubmit = useCallback(async () => {
    const errs = validateStep(4, form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.status === 201) {
        const data = (await res.json()) as { id: string; position: number };
        setResult({ id: data.id, position: data.position });
        return;
      }
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        fields?: Record<string, string>;
        duplicate?: DuplicateInfo;
      };
      if (data.fields) setErrors(data.fields);
      if (data.duplicate) {
        setDup(data.duplicate);
        setStep(0);
      }
      toast({
        title: data.error ?? "Submission failed",
        description: "Fix the highlighted fields and try again.",
        variant: "destructive",
      });
    } catch {
      toast({
        title: "Submission failed",
        description: "Network error — please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }, [form, toast]);

  const taglineLen = form.tagline.trim().length;
  const descLen = form.description.trim().length;

  const toggleTag = useCallback(
    (tag: TagVocab) => {
      setForm((f) => {
        const has = f.tags.includes(tag);
        if (has) return { ...f, tags: f.tags.filter((t) => t !== tag) };
        if (f.tags.length >= 5) return f; // ≤5 controlled vocab (PRD §13)
        return { ...f, tags: [...f.tags, tag] };
      });
    },
    []
  );

  const canProceed = useMemo(
    () => Object.keys(validateStep(step, form)).length === 0,
    [step, form]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={!result}
        className="max-h-[92vh] gap-0 overflow-y-auto border-white/10 bg-coal p-0 text-white max-w-[calc(100vw-2rem)] sm:max-w-3xl"
      >
        <DialogTitle className="sr-only">Submit your tool</DialogTitle>
        <DialogDescription className="sr-only">
          Five-step submission wizard: product, description, pricing, media,
          confirmation. Editors review within 24 hours.
        </DialogDescription>

        {result ? (
          // ── Post-submit state (PRD §11: "in review, typically 24h") ──
          <div className="flex flex-col items-center px-8 py-14 text-center">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
            >
              <CheckCircle2 className="size-14 text-ember" aria-hidden />
            </motion.div>
            <h2 className="mt-5 text-2xl font-black tracking-tight">
              Queued for review
            </h2>
            <p className="mt-2 max-w-sm text-sm text-white/60">
              <span className="font-semibold text-white">{form.name.trim()}</span> is
              in the moderation queue. Editors check the six standards and reply
              to <span className="font-mono text-ember">{form.email.trim()}</span> —
              typically within 24h. Review usually takes 1–2 days — approved
              listings go live immediately, free forever.
            </p>
            <div className="mt-6 grid w-full max-w-sm grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="font-mono text-[10px] tracking-widest text-white/40">QUEUE</p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-ember">
                  #{result.position}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="font-mono text-[10px] tracking-widest text-white/40">TICKET</p>
                <p className="mt-1.5 font-mono text-sm text-white/70">
                  {result.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
            </div>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg bg-ember font-semibold text-black shadow-none hover:bg-ember-hot dark:text-black"
              >
                Done — back to the directory
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  // Hand off to the maker status tracker with the email
                  // pre-filled (PRD §11 status tracking).
                  const email = form.email.trim();
                  onOpenChange(false);
                  window.setTimeout(() => setTrackOpen(true, email), 80);
                }}
                className="rounded-lg border-white/15 bg-transparent text-white/70 hover:bg-white/5 hover:text-white"
              >
                Track this submission
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={reset}
                className="rounded-lg border-white/15 bg-transparent text-white/70 hover:bg-white/5 hover:text-white"
              >
                Submit another tool
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_270px]">
            {/* ── Left: steps ─────────────────────────────────────────── */}
            <div className="min-w-0">
              {/* Progress header */}
              <div className="border-b border-white/10 px-5 pb-4 pt-5 sm:px-6">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[11px] tracking-[0.25em] text-ember">
                    SUBMIT YOUR TOOL
                  </p>
                  <p className="font-mono text-[11px] text-white/40">
                    STEP {String(step + 1).padStart(2, "0")}/05
                  </p>
                </div>
                <div className="mt-3 flex gap-1.5" role="presentation">
                  {STEP_TITLES.map((t, i) => (
                    <div
                      key={t}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-colors duration-300",
                        i < step ? "bg-ember/70" : i === step ? "bg-ember" : "bg-white/10"
                      )}
                    />
                  ))}
                </div>
                <p className="mt-2.5 text-sm font-semibold text-white">
                  {STEP_TITLES[step]}
                  <span className="ml-2 font-mono text-[10px] font-normal text-white/35">
                    {step === 0 && "Where does it live?"}
                    {step === 1 && "The 5-second scan"}
                    {step === 2 && "Honest pricing only (S4)"}
                    {step === 3 && "Make it recognizable"}
                    {step === 4 && "Two confirmations, then queue"}
                  </span>
                </p>
              </div>

              <div className="space-y-5 px-5 py-5 sm:px-6">
                {/* STEP 1 — Product */}
                {step === 0 && (
                  <>
                    <div className="space-y-1.5">
                      <FieldLabel htmlFor="su-url" hint="we auto-check for duplicates">
                        WEBSITE URL *
                      </FieldLabel>
                      <div className="relative">
                        <Input
                          id="su-url"
                          value={form.websiteUrl}
                          onChange={(e) => set("websiteUrl", e.target.value)}
                          onBlur={checkDuplicate}
                          placeholder="yourtool.ai"
                          inputMode="url"
                          autoComplete="url"
                          className={cn(inputCls, "pr-9")}
                        />
                        {checkingDup && (
                          <Loader2
                            className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-white/30"
                            aria-hidden
                          />
                        )}
                      </div>
                      <FieldError msg={errors.websiteUrl} />
                    </div>

                    <AnimatePresence>
                      {dup && (
                        <DuplicateBanner
                          dup={dup}
                          onViewTool={(slug) => {
                            onOpenChange(false);
                            window.setTimeout(() => openTool(slug), 120);
                          }}
                          onContinue={() => setDup(null)}
                        />
                      )}
                    </AnimatePresence>

                    <div className="space-y-1.5">
                      <FieldLabel htmlFor="su-name">TOOL NAME *</FieldLabel>
                      <Input
                        id="su-name"
                        value={form.name}
                        onChange={(e) => set("name", e.target.value)}
                        placeholder="Promptly"
                        className={inputCls}
                        maxLength={40}
                      />
                      <FieldError msg={errors.name} />
                    </div>

                    <div className="space-y-1.5">
                      <FieldLabel htmlFor="su-email" hint="review decision lands here">
                        CONTACT EMAIL *
                      </FieldLabel>
                      <Input
                        id="su-email"
                        type="email"
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        placeholder="founder@yourtool.ai"
                        autoComplete="email"
                        className={inputCls}
                      />
                      <FieldError msg={errors.email} />
                    </div>

                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5 transition-colors hover:border-ember/30">
                      <Checkbox
                        checked={form.isOwner}
                        onCheckedChange={(v) => set("isOwner", v === true)}
                        className="mt-0.5 border-white/20 data-[state=checked]:border-ember data-[state=checked]:bg-ember data-[state=checked]:text-black"
                      />
                      <span className="text-sm text-white/75">
                        This is my product
                        <span className="block text-xs text-white/40">
                          Uncheck to submit on behalf of someone else (listing starts unclaimed).
                        </span>
                      </span>
                    </label>
                  </>
                )}

                {/* STEP 2 — Describe */}
                {step === 1 && (
                  <>
                    <div className="space-y-1.5">
                      <FieldLabel
                        htmlFor="su-tagline"
                        hint={`${taglineLen}/60 — say what it does in the first 5 words`}
                      >
                        TAGLINE *
                      </FieldLabel>
                      <Input
                        id="su-tagline"
                        value={form.tagline}
                        onChange={(e) => set("tagline", e.target.value)}
                        placeholder="AI chatbots that never hallucinate citations"
                        className={cn(
                          inputCls,
                          taglineLen > 60 && "border-red-400/60"
                        )}
                        maxLength={80}
                      />
                      <div className="h-0.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className={cn(
                            "h-full transition-all duration-200",
                            taglineLen > 60 ? "bg-red-400" : taglineLen >= 5 ? "bg-ember" : "bg-white/20"
                          )}
                          style={{ width: `${Math.min(100, (taglineLen / 60) * 100)}%` }}
                        />
                      </div>
                      <FieldError msg={errors.tagline} />
                    </div>

                    <div className="space-y-1.5">
                      <FieldLabel
                        htmlFor="su-desc"
                        hint={`${descLen}/500 — what it does, for whom, how it's AI-native`}
                      >
                        DESCRIPTION *
                      </FieldLabel>
                      <textarea
                        id="su-desc"
                        value={form.description}
                        onChange={(e) => set("description", e.target.value)}
                        rows={4}
                        maxLength={600}
                        placeholder="What does it do, who is it for, and what makes the AI core to the value — not a bolt-on?"
                        className={cn(
                          inputCls,
                          "w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2",
                          descLen > 500 && "border-red-400/60"
                        )}
                      />
                      <FieldError msg={errors.description} />
                    </div>

                    <fieldset className="space-y-1.5">
                      <legend className="font-mono text-[11px] tracking-widest text-white/60">
                        CATEGORY *
                      </legend>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {CATEGORIES.map((c) => (
                          <label
                            key={c.slug}
                            className={cn(
                              "flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-all",
                              form.categorySlug === c.slug
                                ? "border-ember bg-ember/[0.08]"
                                : "border-white/10 bg-white/[0.02] hover:border-white/25"
                            )}
                          >
                            <input
                              type="radio"
                              name="su-category"
                              value={c.slug}
                              checked={form.categorySlug === c.slug}
                              onChange={() => set("categorySlug", c.slug)}
                              className="mt-1 accent-[#FF6A00]"
                            />
                            <span className="min-w-0">
                              <span className="block text-xs font-semibold text-white">
                                {c.emoji} {c.name}
                              </span>
                              <span className="block text-[11px] leading-snug text-white/40">
                                {c.helper}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                      <FieldError msg={errors.categorySlug} />
                    </fieldset>

                    <div className="space-y-1.5">
                      <FieldLabel hint={`${form.tags.length}/5 — controlled vocabulary`}>
                        TAGS
                      </FieldLabel>
                      <div className="flex flex-wrap gap-1.5">
                        {TAG_VOCAB.map((tag) => {
                          const active = form.tags.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              aria-pressed={active}
                              onClick={() => toggleTag(tag)}
                              className={cn(
                                "rounded-full border px-2.5 py-1 font-mono text-[11px] transition-all active:scale-95",
                                active
                                  ? "border-ember bg-ember font-semibold text-black"
                                  : "border-white/15 text-white/60 hover:border-ember/40 hover:text-white",
                                !active && form.tags.length >= 5 && "opacity-40"
                              )}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* STEP 3 — Pricing & links */}
                {step === 2 && (
                  <>
                    <fieldset className="space-y-1.5">
                      <legend className="font-mono text-[11px] tracking-widest text-white/60">
                        PRICING MODEL *
                      </legend>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {PRICING_MODELS.map((p) => (
                          <label
                            key={p.value}
                            className={cn(
                              "flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-all",
                              form.pricingModel === p.value
                                ? "border-ember bg-ember/[0.08]"
                                : "border-white/10 bg-white/[0.02] hover:border-white/25"
                            )}
                          >
                            <input
                              type="radio"
                              name="su-pricing"
                              value={p.value}
                              checked={form.pricingModel === p.value}
                              onChange={() => set("pricingModel", p.value)}
                              className="mt-1 accent-[#FF6A00]"
                            />
                            <span>
                              <span className="block text-sm font-semibold text-white">
                                {p.label}
                              </span>
                              <span className="block text-[11px] text-white/40">{p.helper}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    {form.pricingModel !== "free" && form.pricingModel !== "open_source" && (
                      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                        <div className="space-y-1.5">
                          <FieldLabel htmlFor="su-price">STARTING AT</FieldLabel>
                          <Input
                            id="su-price"
                            value={form.startingPrice}
                            onChange={(e) => set("startingPrice", e.target.value)}
                            placeholder="$19"
                            className={cn(inputCls, "font-mono")}
                            maxLength={20}
                          />
                          <FieldError msg={errors.startingPrice} />
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel htmlFor="su-pnote" hint="optional">
                            PRICING NOTE
                          </FieldLabel>
                          <Input
                            id="su-pnote"
                            value={form.pricingNote}
                            onChange={(e) => set("pricingNote", e.target.value)}
                            placeholder="Pro / 20 free queries per month"
                            className={inputCls}
                            maxLength={120}
                          />
                        </div>
                      </div>
                    )}

                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5 transition-colors hover:border-ember/30">
                      <Checkbox
                        checked={form.hasApi}
                        onCheckedChange={(v) => set("hasApi", v === true)}
                        className="border-white/20 data-[state=checked]:border-ember data-[state=checked]:bg-ember data-[state=checked]:text-black"
                      />
                      <span className="text-sm text-white/75">
                        Public API available
                        <span className="ml-2 font-mono text-[10px] text-white/35">
                          gets an API chip on your listing
                        </span>
                      </span>
                    </label>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <FieldLabel htmlFor="su-gh" hint={form.pricingModel === "open_source" ? "required" : "optional"}>
                          GITHUB
                        </FieldLabel>
                        <Input
                          id="su-gh"
                          value={form.githubUrl}
                          onChange={(e) => set("githubUrl", e.target.value)}
                          placeholder="github.com/you/tool"
                          className={cn(inputCls, errors.githubUrl && "border-red-400/60")}
                        />
                        <FieldError msg={errors.githubUrl} />
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel htmlFor="su-docs">DOCS</FieldLabel>
                        <Input
                          id="su-docs"
                          value={form.docsUrl}
                          onChange={(e) => set("docsUrl", e.target.value)}
                          placeholder="yourtool.ai/docs"
                          className={inputCls}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel htmlFor="su-x">𝕏 / TWITTER</FieldLabel>
                        <Input
                          id="su-x"
                          value={form.twitterUrl}
                          onChange={(e) => set("twitterUrl", e.target.value)}
                          placeholder="x.com/yourtool"
                          className={inputCls}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* STEP 4 — Media */}
                {step === 3 && (
                  <>
                    <div className="space-y-1.5">
                      <FieldLabel hint="stands in for the auto-fetched favicon/logo">LOGO EMOJI</FieldLabel>
                      <div className="flex flex-wrap gap-1.5">
                        {LOGO_EMOJIS.map((e) => (
                          <button
                            key={e}
                            type="button"
                            aria-pressed={form.logoEmoji === e}
                            aria-label={`Logo emoji ${e}`}
                            onClick={() => set("logoEmoji", e)}
                            className={cn(
                              "flex size-10 items-center justify-center rounded-xl border text-lg transition-all active:scale-95",
                              form.logoEmoji === e
                                ? "border-ember bg-ember/15"
                                : "border-white/10 bg-white/[0.02] hover:border-white/30"
                            )}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel hint="previews on your listing">LOGO GRADIENT</FieldLabel>
                      <div className="flex flex-wrap gap-2">
                        {GRADIENTS.map((g) => (
                          <button
                            key={g.value}
                            type="button"
                            aria-pressed={form.logoGradient === g.value}
                            aria-label={`Gradient ${g.label}`}
                            title={g.label}
                            onClick={() => set("logoGradient", g.value)}
                            className={cn(
                              "size-9 rounded-lg border-2 bg-gradient-to-br transition-all active:scale-95",
                              g.value,
                              form.logoGradient === g.value
                                ? "border-white/80"
                                : "border-transparent opacity-70 hover:opacity-100"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="rounded-xl border border-ember/20 bg-ember/[0.06] p-3.5 text-xs leading-relaxed text-white/60">
                      <span className="font-semibold text-ember">Heads up:</span> screenshots
                      and real logo upload ship with maker accounts (Phase 2). Editors
                      enrich your listing — you&apos;ll get a preview.
                    </p>
                  </>
                )}

                {/* STEP 5 — Confirm */}
                {step === 4 && (
                  <>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="font-mono text-[10px] tracking-widest text-white/40">
                        SUMMARY
                      </p>
                      <div className="mt-2 grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
                        {[
                          ["Name", form.name.trim()],
                          ["URL", domainOf(form.websiteUrl) ?? form.websiteUrl],
                          ["Category", CATEGORIES.find((c) => c.slug === form.categorySlug)?.name ?? "—"],
                          ["Pricing", PRICING_MODELS.find((p) => p.value === form.pricingModel)?.label ?? "—"],
                          ["Tags", form.tags.length ? form.tags.join(", ") : "none"],
                          ["Contact", form.email.trim()],
                        ].map(([k, v]) => (
                          <p key={k} className="truncate">
                            <span className="font-mono text-[10px] tracking-widest text-white/40">
                              {k.toUpperCase()}
                            </span>{" "}
                            <span className="text-white/80">{v}</span>
                          </p>
                        ))}
                      </div>
                    </div>

                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5 transition-colors hover:border-ember/30">
                      <Checkbox
                        checked={form.confirmedLive}
                        onCheckedChange={(v) => set("confirmedLive", v === true)}
                        className="mt-0.5 border-white/20 data-[state=checked]:border-ember data-[state=checked]:bg-ember data-[state=checked]:text-black"
                      />
                      <span className="text-sm text-white/75">
                        My tool is <em>live and usable right now</em> — no waitlists,
                        coming-soon pages, or closed betas (S1).
                      </span>
                    </label>
                    <FieldError msg={errors.confirmedLive} />

                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5 transition-colors hover:border-ember/30">
                      <Checkbox
                        checked={form.agreedStandards}
                        onCheckedChange={(v) => set("agreedStandards", v === true)}
                        className="mt-0.5 border-white/20 data-[state=checked]:border-ember data-[state=checked]:bg-ember data-[state=checked]:text-black"
                      />
                      <span className="text-sm text-white/75">
                        I&apos;ve read the{" "}
                        <a
                          href="/about#standards"
                          onClick={(e) => {
                            e.preventDefault();
                            onOpenChange(false);
                            // Standards live on /about now — navigate there from any route.
                            router.push("/about#standards");
                          }}
                          className="text-ember underline-offset-2 hover:underline"
                        >
                          Listing Standards (S1–S6)
                        </a>{" "}
                        and my listing is honest, complete, and in English (S3–S6).
                      </span>
                    </label>
                    <FieldError msg={errors.agreedStandards} />

                    <p className="font-mono text-[11px] leading-relaxed text-white/35">
                      Rate limits: 3 submissions / email / 7 days · 1 per domain.
                      By submitting you agree to editor review — rejections cite the
                      failed standard(s) with one-click resubmit.
                    </p>
                  </>
                )}
              </div>

              {/* Footer nav */}
              <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-white/10 bg-coal/95 px-5 py-4 backdrop-blur sm:px-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => (step === 0 ? onOpenChange(false) : setStep((s) => s - 1))}
                  className="rounded-lg text-white/60 hover:bg-white/5 hover:text-white"
                >
                  <ArrowLeft className="size-4" aria-hidden />
                  {step === 0 ? "Cancel" : "Back"}
                </Button>
                <div className="flex items-center gap-2.5">
                  {step === 0 && dup?.kind === "submission" && (
                    <span className="font-mono text-[11px] text-amber-300">
                      Domain already queued
                    </span>
                  )}
                  {step < 4 ? (
                    <Button
                      type="button"
                      onClick={goNext}
                      disabled={checkingDup || (step === 0 && dup?.kind === "submission")}
                      className="rounded-lg bg-ember font-semibold text-black shadow-none hover:bg-ember-hot disabled:opacity-40 dark:text-black"
                    >
                      Continue
                      <ArrowRight className="size-4" aria-hidden />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={onSubmit}
                      disabled={submitting}
                      className="rounded-lg bg-ember font-semibold text-black shadow-none hover:bg-ember-hot disabled:opacity-60 dark:text-black"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                          Submitting…
                        </>
                      ) : (
                        <>
                          <BadgeCheck className="size-4" aria-hidden />
                          Submit for review
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* ── Right: persistent live preview (PRD §11) ──────────────── */}
            <aside className="hidden border-l border-white/10 bg-black/20 p-5 lg:block">
              <LivePreview form={form} />
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="mt-5 inline-flex items-center gap-1 font-mono text-[11px] text-white/30 transition-colors hover:text-white/60"
              >
                <X className="size-3" aria-hidden /> close &amp; finish later
              </button>
            </aside>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
