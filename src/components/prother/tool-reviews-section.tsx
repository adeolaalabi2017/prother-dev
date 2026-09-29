"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Star, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export type ReviewAggregate = {
  count: number;
  ease: number;
  power: number;
  value: number;
  overall: number;
};

export type ReviewRow = {
  id: string;
  author: string;
  ease: number;
  power: number;
  value: number;
  body: string;
  createdAt: string;
  mine?: boolean;
  status?: string;
};

type ReviewsResponse = {
  count: number;
  aggregate: ReviewAggregate | null;
  reviews: ReviewRow[];
  mine?: ReviewRow | null;
  canReview: boolean;
  reason: null | "auth" | "maker";
};

const PANEL = "rounded-2xl border border-white/10 bg-white/[0.02]";
const MONO = "font-mono text-xs uppercase tracking-[0.2em] text-white/60";
const REVIEW_BODY_MIN = 20;
const REVIEW_BODY_MAX = 2000;

function openAuth(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("prother:auth-open"));
  }
}

function StarPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={MONO}>{label}</span>
      <div className="flex items-center gap-0.5" role="radiogroup" aria-label={`${label} rating`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${label}: ${n} of 5`}
            onClick={() => onChange(n)}
            className="grid size-9 place-items-center rounded-lg transition-colors hover:bg-white/10"
          >
            <Star
              aria-hidden
              className={cn(
                "size-5 transition-colors",
                n <= value ? "fill-ember text-ember" : "text-white/40"
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function DimBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 shrink-0 font-mono text-xs tracking-[0.2em] text-white/60">
        {label}
      </span>
      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-ember transition-all"
          style={{ width: `${Math.max(4, Math.min(100, (value / 5) * 100))}%` }}
        />
      </div>
      <span className="w-7 shrink-0 text-right font-mono text-xs tabular-nums text-white/70">
        {value.toFixed(1)}
      </span>
    </div>
  );
}

function Stars({ value, size = 3 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "size-3",
            n <= value ? "fill-ember text-ember" : "text-white/30"
          )}
          aria-hidden
        />
      ))}
    </div>
  );
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ToolReviewsSection({
  slug,
  toolName,
  isMaker = false,
  initialReviews = [],
  initialAggregate = null,
  viewerMyReview = null,
  onRefreshTool,
}: {
  slug: string;
  toolName: string;
  isMaker?: boolean;
  initialReviews?: ReviewRow[];
  initialAggregate?: ReviewAggregate | null;
  viewerMyReview?: any;
  onRefreshTool?: () => void;
}) {
  const { toast } = useToast();
  const { status: sessionStatus } = useSession();

  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [ease, setEase] = useState(0);
  const [power, setPower] = useState(0);
  const [value, setValue] = useState(0);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const prefilled = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(false);
    try {
      const res = await fetch(`/api/reviews?tool=${encodeURIComponent(slug)}`);
      if (!res.ok) throw new Error("failed");
      const json = (await res.json()) as ReviewsResponse;
      setData(json);
      if (!prefilled.current) {
        prefilled.current = true;
        const mine = json.mine;
        const mineObj =
          mine && typeof mine === "object" && "ease" in (mine as object)
            ? (mine as { ease: number; power: number; value: number; body: string })
            : viewerMyReview;
        if (mineObj) {
          setEase(mineObj.ease ?? 0);
          setPower(mineObj.power ?? 0);
          setValue(mineObj.value ?? 0);
          setBody(mineObj.body ?? "");
        }
      }
    } catch {
      setLoadErr(true);
    } finally {
      setLoading(false);
    }
  }, [slug, viewerMyReview]);

  useEffect(() => {
    prefilled.current = false;
    void load();
  }, [load]);

  const count = data?.count ?? initialReviews.length;
  const aggregate = data?.aggregate ?? initialAggregate;
  const reviewList = data?.reviews ?? initialReviews;
  const isUpdate = Boolean(data?.mine || viewerMyReview);

  const submit = useCallback(async () => {
    const localErrors: string[] = [];
    if (ease < 1 || power < 1 || value < 1) {
      localErrors.push("Please rate all three dimensions (1 to 5 stars).");
    }
    if (body.trim().length < REVIEW_BODY_MIN) {
      localErrors.push(`Review needs at least ${REVIEW_BODY_MIN} characters.`);
    }
    if (body.trim().length > REVIEW_BODY_MAX) {
      localErrors.push(`Review cannot exceed ${REVIEW_BODY_MAX} characters.`);
    }
    setErrors(localErrors);
    if (localErrors.length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolSlug: slug,
          ease,
          power,
          value,
          body: body.trim(),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as
        | (ReviewsResponse & { review?: ReviewRow })
        | { error?: string };

      if (res.status === 201) {
        const ok = json as ReviewsResponse & { review?: ReviewRow };
        const newReview = ok.review;
        setData((prev) => {
          if (!prev) return prev;
          const updatedReviews = newReview
            ? [newReview, ...prev.reviews.filter((r) => !r.mine && r.id !== newReview.id)]
            : prev.reviews;
          return {
            ...prev,
            count: ok.count ?? prev.count,
            aggregate: ok.aggregate ?? prev.aggregate,
            mine: newReview ?? prev.mine,
            reviews: updatedReviews,
          };
        });
        toast({ title: isUpdate ? "Review updated" : "Review posted. Thank you!" });
        onRefreshTool?.();
      } else if (res.status === 401) {
        openAuth();
        toast({ title: "Sign in required to post a review." });
      } else if (res.status === 403) {
        toast({
          title: "Makers cannot review their own product",
          variant: "destructive",
        });
      } else {
        const msg =
          (json as { error?: string }).error ?? "Please check the input fields and try again.";
        setErrors([msg]);
      }
    } catch {
      setErrors(["Could not submit review. Please try again."]);
    } finally {
      setSubmitting(false);
    }
  }, [body, ease, power, value, slug, toast, isUpdate, onRefreshTool]);

  const counterTone =
    body.length >= REVIEW_BODY_MAX
      ? "text-red-400"
      : body.length >= REVIEW_BODY_MAX * 0.8
        ? "text-ember"
        : "text-white/55";

  return (
    <section aria-label="Reviews" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-white/60">
          Reviews ({count})
        </h2>
        <span className="font-mono text-xs text-white/45">HONEST AND VERIFIED ONLY</span>
      </div>

      {/* Aggregate Score Card */}
      {loading && !aggregate && <Skeleton className="h-24 w-full rounded-xl bg-white/5" />}
      {aggregate && (
        <div className={cn(PANEL, "flex flex-col gap-5 p-5 sm:flex-row sm:items-center")}>
          <div className="text-center sm:w-32">
            <span className="block text-4xl font-black tabular-nums text-white">
              {aggregate.overall.toFixed(1)}
            </span>
            <div className="mt-1 flex justify-center">
              <Stars value={Math.round(aggregate.overall)} size={4} />
            </div>
            <span className="mt-1 block font-mono text-[11px] tracking-wider text-white/50 uppercase">
              {aggregate.count} {aggregate.count === 1 ? "review" : "reviews"}
            </span>
          </div>
          <div className="grid min-w-0 flex-1 gap-2 sm:border-l sm:border-white/10 sm:pl-6">
            <DimBar label="EASE" value={aggregate.ease} />
            <DimBar label="POWER" value={aggregate.power} />
            <DimBar label="VALUE" value={aggregate.value} />
          </div>
        </div>
      )}

      {!loading && !loadErr && !aggregate && count === 0 && (
        <p className={cn(PANEL, "p-4 font-mono text-xs uppercase tracking-[0.2em] text-white/60")}>
          No reviews yet. Be the first after trying {toolName}.
        </p>
      )}

      {/* Reviews List */}
      {reviewList.length > 0 && (
        <ul
          className={cn(
            "space-y-3",
            reviewList.length > 4 && "max-h-96 overflow-y-auto pr-1"
          )}
          aria-label="Review list"
        >
          {reviewList.map((r) => (
            <li key={r.id} className={cn(PANEL, "p-4 space-y-2")}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-white/90">
                  <User className="size-3 text-white/40" />
                  {r.author}
                </span>
                {r.mine && (
                  <span className="rounded-full border border-ember/30 bg-ember/10 px-2 py-0.5 font-mono text-[10px] font-bold text-ember uppercase">
                    Your Review
                  </span>
                )}
                {r.status === "filtered" && r.mine && (
                  <span className="rounded-full border border-white/20 bg-white/5 px-1.5 py-px font-mono text-[10px] text-white/50 uppercase">
                    In Moderation
                  </span>
                )}
                <span className="ml-auto font-mono text-xs text-white/50">
                  {fmtDate(r.createdAt)}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-mono text-xs tracking-widest text-white/50">EASE</span>
                  <Stars value={r.ease} />
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-mono text-xs tracking-widest text-white/50">POWER</span>
                  <Stars value={r.power} />
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-mono text-xs tracking-widest text-white/50">VALUE</span>
                  <Stars value={r.value} />
                </span>
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-white/80">
                {r.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      {/* Review Form or Auth Gate */}
      {data?.reason === "auth" || (sessionStatus === "unauthenticated" && !data?.reason) ? (
        <div className={cn(PANEL, "flex flex-wrap items-center justify-between gap-3 p-4")}>
          <p className="text-sm text-white/70">Been using {toolName}? Rate it honestly.</p>
          <Button
            type="button"
            onClick={openAuth}
            className="h-10 bg-ember font-mono text-sm font-black tracking-wider text-[#0A0A0A] hover:bg-ember-hot"
          >
            SIGN IN TO REVIEW →
          </Button>
        </div>
      ) : data?.reason === "maker" || isMaker ? (
        <p className={cn(PANEL, "p-4 font-mono text-xs uppercase tracking-[0.2em] text-white/60")}>
          Makers cannot review their own product
        </p>
      ) : (
        <div className={cn(PANEL, "space-y-4 p-5")}>
          <div className="border-b border-white/10 pb-3">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-white/85">
              {isUpdate ? "Edit your review" : `Review ${toolName}`}
            </h3>
            <p className="mt-0.5 text-xs text-white/55">
              Share real experiences on ease of use, feature power, and overall value.
            </p>
          </div>

          <StarPicker label="EASE OF USE" value={ease} onChange={setEase} />
          <StarPicker label="FEATURE POWER" value={power} onChange={setPower} />
          <StarPicker label="OVERALL VALUE" value={value} onChange={setValue} />

          <div>
            <label htmlFor={`review-body-${slug}`} className="sr-only">
              Your review
            </label>
            <Textarea
              id={`review-body-${slug}`}
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, REVIEW_BODY_MAX))}
              rows={4}
              placeholder="What does this tool do well? Where does it fall short? Practical, specific details help the community most."
              className="resize-none border-white/10 bg-transparent text-sm text-white placeholder:text-white/40 focus-visible:border-ember/50"
            />
            <div className="mt-1.5 flex items-center justify-between">
              <span className="font-mono text-xs text-white/50">
                MIN {REVIEW_BODY_MIN} CHARACTERS
              </span>
              <span className={cn("font-mono text-xs tabular-nums", counterTone)} aria-live="polite">
                {body.length}/{REVIEW_BODY_MAX}
              </span>
            </div>
          </div>

          {errors.length > 0 && (
            <ul className="space-y-1 rounded-lg border border-red-500/25 bg-red-500/[0.06] p-3" aria-live="polite">
              {errors.map((e, i) => (
                <li key={i} className="text-xs text-red-300">
                  {e}
                </li>
              ))}
            </ul>
          )}

          <Button
            type="button"
            onClick={() => void submit()}
            disabled={submitting}
            className="h-10 w-full bg-ember font-mono text-xs font-black tracking-wider text-[#0A0A0A] hover:bg-ember-hot sm:w-auto px-6"
          >
            {submitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin mr-1.5" aria-hidden /> SUBMITTING...
              </>
            ) : isUpdate ? (
              "UPDATE REVIEW"
            ) : (
              "POST REVIEW"
            )}
          </Button>
        </div>
      )}
    </section>
  );
}
