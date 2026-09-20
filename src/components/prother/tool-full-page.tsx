"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronDown,
  CircleDashed,
  Clock,
  Copy,
  Heart,
  Link2,
  Loader2,
  MessageSquare,
  Plus,
  Scale,
  Send,
  ShieldCheck,
  Star,
  Triangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { ToolDetailResponse } from "@/lib/prother";
import type { CommentRow } from "@/lib/discussion";
import { FullPageShell, PageError, PageSkeleton } from "./page-shell";
import { useExplorer } from "./explorer-store";
import { getVoterKey } from "./voter";

// ── Types (additive fields per the tool-detail API contract) ─────────────

type ReviewsAggregate = {
  count: number;
  ease: number;
  power: number;
  value: number;
  overall: number;
};

type RelaunchEvent = {
  version: string;
  note: string | null;
  launchedAt: string;
  totalVotes: number;
};

type ToolViewer = {
  isMaker: boolean;
  following: boolean;
  canRelaunch: boolean;
  nextEligibleAt: string | null;
  claim: null | {
    id: string;
    status: string;
    method: string;
    token: string;
    note: string | null;
    createdAt: string;
    verifiedAt: string | null;
  };
  myReview: null | { id: string; ease: number; power: number; value: number; body: string; status: string };
  savedIn: { slug: string; name: string }[];
};

type ToolFullDetail = ToolDetailResponse & {
  reviews?: { count: number; aggregate: ReviewsAggregate | null };
  launchHistory?: RelaunchEvent[];
  relaunchCount?: number;
  relaunchNote?: string | null;
  originalLaunchDate?: string | null;
  viewer?: ToolViewer | null;
};

type ReviewRow = {
  id: string;
  author: string;
  ease: number;
  power: number;
  value: number;
  body: string;
  status: string;
  createdAt: string;
  mine: boolean;
};

type ReviewsResponse = {
  count: number;
  aggregate: ReviewsAggregate | null;
  reviews: ReviewRow[];
  /** My review (object) or null — defensively guarded below. */
  mine?: unknown;
  canReview: boolean;
  reason: null | "auth" | "maker" | "scheduled";
};

type CollectionRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  itemCount: number;
  covers: string[];
};

// ── Shared bits ───────────────────────────────────────────────────────────

const MONO = "font-mono text-[10px] uppercase tracking-[0.25em] text-white/40";
const PANEL = "rounded-xl border border-white/10 bg-white/[0.02]";

const PRICING_LABEL: Record<string, string> = {
  free: "Free",
  freemium: "Freemium",
  paid: "Paid",
  open_source: "Open Source",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function fmtDay(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function relTime(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** Re-open the auth modal from anywhere (wired by the site header). */
function openAuth(): void {
  window.dispatchEvent(new CustomEvent("prother:auth-open"));
}

function Stars({ value, size = 3.5 }: { value: number; size?: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={`${value.toFixed(1)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden
          style={{ width: size * 4, height: size * 4 }}
          className={cn(
            i <= Math.round(value) ? "fill-ember text-ember" : "text-white/25"
          )}
        />
      ))}
    </span>
  );
}

function SectionHead({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className={MONO}>{children}</h2>
      {right}
    </div>
  );
}

// ── Facts rail ────────────────────────────────────────────────────────────

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 lg:border-b lg:border-white/10 lg:py-3 lg:first:pt-0 lg:last:border-0">
      <dt className={MONO}>{label}</dt>
      <dd className="mt-1 text-sm leading-snug text-white/85">{children}</dd>
    </div>
  );
}

function FactsRail({ detail }: { detail: ToolFullDetail }) {
  const openCategory = useExplorer((s) => s.openCategory);
  const claimVerifiedAt = detail.viewer?.claim?.verifiedAt ?? null;
  const verifiedDays =
    claimVerifiedAt !== null
      ? Math.max(
          1,
          Math.floor((Date.now() - new Date(claimVerifiedAt).getTime()) / 86_400_000)
        )
      : null;
  const verified =
    claimVerifiedAt !== null && verifiedDays !== null
      ? { label: `VERIFIED ${verifiedDays}D AGO ✓`, ok: true }
      : detail.verified
        ? { label: "VERIFIED ✓", ok: true }
        : { label: "UNVERIFIED", ok: false };
  const relaunches = detail.relaunchCount ?? detail.launchHistory?.length ?? 0;

  return (
    <aside aria-label="Key facts" className="lg:sticky lg:top-20 lg:self-start">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-1 lg:gap-y-0">
        <Fact label="Launched">
          {detail.scheduled ? (
            <span className="inline-flex items-center gap-1.5 font-mono text-xs text-ember">
              <Clock className="size-3.5" aria-hidden />
              TOMORROW — TEASER
            </span>
          ) : (
            fmtDay(detail.launchDate)
          )}
        </Fact>
        <Fact label="Pricing">
          <span className="font-semibold text-white">
            {PRICING_LABEL[detail.pricing.model] ?? "Free"}
          </span>
          {detail.pricing.price && (
            <span className="ml-1.5 font-mono text-xs text-ember">
              {detail.pricing.price}
            </span>
          )}
          {detail.pricing.note && (
            <span className="mt-0.5 block text-xs text-white/45">
              {detail.pricing.note}
            </span>
          )}
        </Fact>
        <Fact label="API">
          {detail.badges.hasApi ? (
            <span className="text-mint">✓ AVAILABLE</span>
          ) : (
            <span className="text-white/35">✗ NONE</span>
          )}
        </Fact>
        <Fact label="Verified">
          <span className={verified.ok ? "text-mint" : "text-white/35"}>
            {verified.label}
          </span>
        </Fact>
        <Fact label="Category">
          <button
            type="button"
            onClick={() => openCategory(detail.category.slug)}
            aria-label={`Browse the ${detail.category.name} category`}
            className="text-left transition-colors hover:text-ember"
          >
            {detail.category.emoji} {detail.category.name}
          </button>
        </Fact>
        <Fact label="Maker">
          <span className="text-ember">{detail.maker}</span>
        </Fact>
        <Fact label="Relaunches">
          {relaunches}
          {detail.relaunchNote && (
            <span className="mt-0.5 block text-xs text-white/45">
              {detail.relaunchNote}
            </span>
          )}
        </Fact>
      </dl>
    </aside>
  );
}

// ── Claim panel (PRD F-30) ────────────────────────────────────────────────

type StartedClaim = {
  id: string;
  status: string;
  token: string;
  note: string | null;
  verifiedAt?: string | null;
};

const DEFAULT_CLAIM_STEPS = [
  "Add the meta tag below to your site's <head> section.",
  "Deploy or save the change so the tag is live on your homepage.",
  "Hit VERIFY NOW — we fetch your page and look for the tag.",
];

function ClaimPanel({
  slug,
  maker,
  claim,
  sessionStatus,
  onRefresh,
}: {
  slug: string;
  maker: string;
  claim: StartedClaim | null;
  sessionStatus: "loading" | "authenticated" | "unauthenticated";
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [starting, setStarting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [failReason, setFailReason] = useState<string | null>(null);
  const claimRef = useRef(claim);
  claimRef.current = claim;

  const metaTag = claim
    ? `<meta name="prother-verify" content="${claim.token}" />`
    : "";

  const startClaim = useCallback(async () => {
    setStarting(true);
    setFailReason(null);
    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolSlug: slug }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        claim?: StartedClaim;
        verified?: boolean;
        error?: string;
      };
      if (res.status === 409) {
        toast({ title: "This listing is already claimed." });
        onRefresh();
        return;
      }
      if (!res.ok || !data.claim) {
        toast({
          title: "Could not start the claim",
          description: data.error ?? "Please try again.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Claim started — add the meta tag to your site." });
      onRefresh();
    } catch {
      toast({
        title: "Could not start the claim",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setStarting(false);
    }
  }, [slug, toast, onRefresh]);

  const onVerify = useCallback(async () => {
    const c = claimRef.current;
    if (!c) return;
    setVerifying(true);
    setFailReason(null);
    try {
      const res = await fetch(`/api/claims/${encodeURIComponent(c.id)}/verify`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        verified?: boolean;
        reason?: string;
        claim?: StartedClaim;
      };
      if (data.verified) {
        toast({
          title: "Ownership verified ✓",
          description: "This listing is yours.",
        });
        onRefresh();
      } else {
        setFailReason(data.reason ?? "We couldn't find the meta tag on your site yet.");
      }
    } catch {
      setFailReason("Verification request failed — please try again.");
    } finally {
      setVerifying(false);
    }
  }, [toast, onRefresh]);

  const onCopyTag = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(metaTag);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast({ title: "Could not copy — select the tag manually.", variant: "destructive" });
    }
  }, [metaTag, toast]);

  // Anonymous: sign-in gate.
  if (sessionStatus === "unauthenticated") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ember/30 bg-ember/[0.05] p-4">
        <p className="text-sm font-semibold text-white/85">
          Sign in to prove ownership of this listing.
        </p>
        <Button
          type="button"
          onClick={openAuth}
          className="h-10 bg-ember font-mono text-xs font-black tracking-wider text-[#0A0A0A] hover:bg-ember-hot"
        >
          SIGN IN TO CLAIM →
        </Button>
      </div>
    );
  }

  // No claim yet (authenticated): start one.
  if (!claim) {
    return (
      <div className="rounded-xl border border-ember/30 bg-ember/[0.05] p-4">
        <p className="text-sm text-white/70">
          Start a claim — we&apos;ll generate a verification meta tag for{" "}
          <span className="text-white">{maker}</span> to place on the product
          site.
        </p>
        <Button
          type="button"
          onClick={() => void startClaim()}
          disabled={starting}
          className="mt-3 h-10 bg-ember font-mono text-xs font-black tracking-wider text-[#0A0A0A] hover:bg-ember-hot"
        >
          {starting ? (
            <>
              <Loader2 className="size-3.5 animate-spin" aria-hidden /> STARTING…
            </>
          ) : (
            "START CLAIM →"
          )}
        </Button>
      </div>
    );
  }

  // Claim in progress / verified / failed.
  const verified = claim.status === "verified" || !!claim.verifiedAt;
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        verified ? "border-mint/40 bg-mint/[0.05]" : "border-ember/30 bg-ember/[0.05]"
      )}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className={MONO}>OWNERSHIP CLAIM</p>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 font-mono text-[9px] tracking-wider",
            verified
              ? "border-mint/40 bg-mint/10 text-mint"
              : claim.status === "failed"
                ? "border-red-500/40 bg-red-500/10 text-red-400"
                : "border-white/20 bg-white/5 text-white/70"
          )}
        >
          {verified ? "VERIFIED" : claim.status.toUpperCase()}
        </span>
      </div>

      {verified ? (
        <p className="mt-2 text-sm text-mint">
          ✓ Verified — this listing is yours.
        </p>
      ) : (
        <>
          <ol className="mt-3 space-y-1.5">
            {DEFAULT_CLAIM_STEPS.map((step, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed text-white/65">
                <span className="font-mono text-ember">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ol>

          <div className="mt-3 flex items-start gap-2">
            <code className="min-w-0 flex-1 break-all rounded-lg border border-white/10 bg-black/40 p-2.5 font-mono text-[11px] text-white/80">
              {metaTag}
            </code>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Copy the verification meta tag"
              onClick={() => void onCopyTag()}
              className={cn(
                "bg-white/[0.03] hover:bg-white/[0.08] size-9 shrink-0 border-white/10",
                copied ? "text-mint" : "text-white/70 hover:border-ember/40 hover:text-ember"
              )}
            >
              {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            </Button>
          </div>

          {failReason && (
            <p className="mt-3 rounded-lg border border-red-500/25 bg-red-500/[0.06] p-2.5 text-xs text-red-300">
              {failReason}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={() => void onVerify()}
              disabled={verifying}
              className="h-10 bg-ember font-mono text-xs font-black tracking-wider text-[#0A0A0A] hover:bg-ember-hot"
            >
              {verifying ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" aria-hidden /> VERIFYING…
                </>
              ) : (
                "VERIFY NOW"
              )}
            </Button>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
              False claims fail by design · disputes → editor arbitration
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ── Reviews (PRD F-16) ────────────────────────────────────────────────────

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
            className="grid size-10 place-items-center rounded-lg transition-colors hover:bg-white/5"
          >
            <Star
              aria-hidden
              className={cn(
                "size-5",
                n <= value ? "fill-ember text-ember" : "text-white/30"
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
      <span className="w-12 shrink-0 font-mono text-[10px] tracking-[0.2em] text-white/40">
        {label}
      </span>
      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-ember"
          style={{ width: `${Math.max(4, Math.min(100, (value / 5) * 100))}%` }}
        />
      </div>
      <span className="w-7 shrink-0 text-right font-mono text-[11px] tabular-nums text-white/70">
        {value.toFixed(1)}
      </span>
    </div>
  );
}

const REVIEW_BODY_MIN = 20;
const REVIEW_BODY_MAX = 2000;

function ReviewsSection({
  slug,
  isMaker,
  sessionStatus,
  viewerMyReview,
  onRefreshTool,
}: {
  slug: string;
  isMaker: boolean;
  sessionStatus: "loading" | "authenticated" | "unauthenticated";
  viewerMyReview: ToolViewer["myReview"];
  onRefreshTool: () => void;
}) {
  const { toast } = useToast();
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
          setEase(mineObj.ease);
          setPower(mineObj.power);
          setValue(mineObj.value);
          setBody(mineObj.body);
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

  const count = data?.count ?? 0;
  const aggregate = data?.aggregate ?? null;
  const isUpdate = !!viewerMyReview || !!(data?.mine && typeof data.mine === "object");

  const submit = useCallback(async () => {
    const localErrors: string[] = [];
    if (ease < 1 || power < 1 || value < 1)
      localErrors.push("Rate all three dimensions (1–5 stars).");
    if (body.trim().length < REVIEW_BODY_MIN)
      localErrors.push(`Review needs ${REVIEW_BODY_MIN}+ characters.`);
    if (body.trim().length > REVIEW_BODY_MAX)
      localErrors.push(`Review is capped at ${REVIEW_BODY_MAX} characters.`);
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
        setData((prev) =>
          prev
            ? {
                ...prev,
                count: ok.count ?? prev.count,
                aggregate: ok.aggregate ?? prev.aggregate,
                reviews: ok.review
                  ? [ok.review, ...prev.reviews.filter((r) => !r.mine)]
                  : prev.reviews,
              }
            : prev
        );
        toast({ title: isUpdate ? "Review updated" : "Review posted — thanks!" });
        onRefreshTool();
      } else if (res.status === 401) {
        openAuth();
      } else if (res.status === 403) {
        toast({
          title: "Makers can't review their own product",
          variant: "destructive",
        });
      } else {
        const msg =
          (json as { error?: string }).error ?? "Fix the highlighted fields and try again.";
        setErrors([msg]);
      }
    } catch {
      setErrors(["Could not submit the review — please try again."]);
    } finally {
      setSubmitting(false);
    }
  }, [body, ease, power, value, slug, toast, isUpdate, onRefreshTool]);

  const counterTone =
    body.length >= REVIEW_BODY_MAX
      ? "text-red-400"
      : body.length >= REVIEW_BODY_MAX * 0.8
        ? "text-ember"
        : "text-white/35";

  return (
    <section aria-label="Reviews" className="space-y-4">
      <SectionHead right={<span className="font-mono text-[10px] text-white/30">MODERATED · HONEST ONLY</span>}>
        Reviews ({count})
      </SectionHead>

      {/* Aggregate */}
      {loading && <Skeleton className="h-24 w-full rounded-xl bg-white/5" />}
      {!loading && !loadErr && aggregate && (
        <div className={cn(PANEL, "flex flex-col gap-5 p-5 sm:flex-row sm:items-center")}>
          <div className="text-center sm:w-32">
            <p className="text-4xl font-black tabular-nums text-white">
              {aggregate.overall.toFixed(1)}
            </p>
            <div className="mt-1 flex justify-center">
              <Stars value={aggregate.overall} />
            </div>
            <p className="mt-1 font-mono text-[10px] text-white/40">
              {aggregate.count} REVIEWS
            </p>
          </div>
          <div className="min-w-0 flex-1 space-y-2.5">
            <DimBar label="EASE" value={aggregate.ease} />
            <DimBar label="POWER" value={aggregate.power} />
            <DimBar label="VALUE" value={aggregate.value} />
          </div>
        </div>
      )}
      {!loading && !loadErr && !aggregate && (
        <p className={cn(PANEL, "p-4 font-mono text-[11px] uppercase tracking-[0.2em] text-white/45")}>
          Ratings unlock at 3 reviews · {count} so far
        </p>
      )}
      {!loading && loadErr && (
        <p className="rounded-lg border border-red-500/25 bg-red-500/[0.04] p-3 text-xs text-red-300">
          Couldn&apos;t load reviews right now.
        </p>
      )}

      {/* Review list */}
      {(data?.reviews.length ?? 0) > 0 && (
        <ul
          className={cn(
            "space-y-2",
            (data?.reviews.length ?? 0) > 4 && "max-h-96 overflow-y-auto pr-1"
          )}
          aria-label="Review list"
        >
          {data!.reviews.map((r) => (
            <li key={r.id} className={cn(PANEL, "p-3.5")}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-mono text-xs font-semibold text-white/90">
                  {r.author}
                </span>
                {r.status === "filtered" && r.mine && (
                  <span className="rounded-full border border-white/20 bg-white/5 px-1.5 py-px font-mono text-[9px] tracking-wider text-white/50">
                    IN MODERATION
                  </span>
                )}
                <span className="ml-auto font-mono text-[10px] text-white/35">
                  {fmtDay(r.createdAt)}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-mono text-[9px] tracking-widest text-white/35">EASE</span>
                  <Stars value={r.ease} size={2.5} />
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-mono text-[9px] tracking-widest text-white/35">POWER</span>
                  <Stars value={r.power} size={2.5} />
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-mono text-[9px] tracking-widest text-white/35">VALUE</span>
                  <Stars value={r.value} size={2.5} />
                </span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-white/75">
                {r.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      {/* Write / update a review */}
      {data?.reason === "auth" || (sessionStatus === "unauthenticated" && !data?.reason) ? (
        <div className={cn(PANEL, "flex flex-wrap items-center justify-between gap-3 p-4")}>
          <p className="text-sm text-white/70">Been using {slugToName(slug)}? Rate it honestly.</p>
          <Button
            type="button"
            onClick={openAuth}
            className="h-10 bg-ember font-mono text-xs font-black tracking-wider text-[#0A0A0A] hover:bg-ember-hot"
          >
            SIGN IN TO REVIEW →
          </Button>
        </div>
      ) : data?.reason === "maker" || isMaker ? (
        <p className={cn(PANEL, "p-4 font-mono text-[11px] uppercase tracking-[0.2em] text-white/40")}>
          Makers can&apos;t review their own product
        </p>
      ) : data?.reason === "scheduled" ? (
        <p className={cn(PANEL, "p-4 font-mono text-[11px] uppercase tracking-[0.2em] text-white/40")}>
          Reviews open on launch day
        </p>
      ) : data?.canReview ? (
        <div className={cn(PANEL, "space-y-4 p-4")}>
          <StarPicker label="EASE" value={ease} onChange={setEase} />
          <StarPicker label="POWER" value={power} onChange={setPower} />
          <StarPicker label="VALUE" value={value} onChange={setValue} />
          <div>
            <label htmlFor="review-body" className="sr-only">
              Your review
            </label>
            <Textarea
              id="review-body"
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, REVIEW_BODY_MAX))}
              rows={4}
              placeholder="Honest, specific, useful — what does this tool actually do well or badly?"
              className="resize-none border-white/10 bg-transparent text-sm text-white placeholder:text-white/30 focus-visible:border-ember/50"
            />
            <div className="mt-1 flex items-center justify-between">
              <span className="font-mono text-[10px] text-white/30">
                {REVIEW_BODY_MIN}–{REVIEW_BODY_MAX} CHARS
              </span>
              <span className={cn("font-mono text-[10px] tabular-nums", counterTone)} aria-live="polite">
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
            className="h-11 w-full bg-ember font-mono text-xs font-black tracking-wider text-[#0A0A0A] hover:bg-ember-hot sm:w-auto"
          >
            {submitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden /> SENDING…
              </>
            ) : isUpdate ? (
              "UPDATE REVIEW"
            ) : (
              "POST REVIEW"
            )}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function slugToName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ── Re-launch (PRD F-35) ──────────────────────────────────────────────────

function RelaunchSection({
  slug,
  viewer,
  history,
  originalLaunchDate,
  launchDate,
  currentVotes,
  onRefresh,
}: {
  slug: string;
  viewer: ToolViewer | null;
  history: RelaunchEvent[];
  originalLaunchDate: string | null;
  launchDate: string | null;
  currentVotes: number;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState<string | null>(viewer?.nextEligibleAt ?? null);

  const relaunch = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/tools/${encodeURIComponent(slug)}/relaunch`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        relaunched?: boolean;
        version?: string;
        date?: string;
        error?: string;
        nextEligibleAt?: string;
      };
      if (res.ok && data.relaunched) {
        toast({
          title: `Re-launched as ${data.version ?? "a new version"}`,
          description: "Fresh vote pool — the feed resets for today.",
        });
        setConfirming(false);
        onRefresh();
      } else if (res.status === 403 && data.error === "cooldown") {
        setCooldown(data.nextEligibleAt ?? null);
        toast({
          title: "Cooldown active",
          description: "One re-launch per tool per period.",
          variant: "destructive",
        });
      } else if (res.status === 409) {
        toast({ title: "Launch is scheduled — re-launch after it goes live.", variant: "destructive" });
      } else {
        toast({ title: "Could not re-launch", variant: "destructive" });
      }
    } catch {
      toast({ title: "Could not re-launch", description: "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }, [slug, toast, onRefresh]);

  const canRelaunch = viewer?.canRelaunch && !cooldown;

  return (
    <section aria-label="Re-launch history" className="space-y-4">
      <SectionHead>Re-launch</SectionHead>

      {viewer?.isMaker && (
        <div className="rounded-xl border border-ember/30 bg-ember/[0.05] p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/60">
            Launch a new version
          </p>
          <p className="mt-1.5 text-sm text-white/65">
            Shipping a major update? Re-launch resets the vote pool and puts you
            back on today&apos;s feed.
          </p>
          {canRelaunch ? (
            confirming ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={() => void relaunch()}
                  disabled={busy}
                  className="h-10 bg-ember font-mono text-xs font-black tracking-wider text-[#0A0A0A] hover:bg-ember-hot"
                >
                  {busy ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" aria-hidden /> RE-LAUNCHING…
                    </>
                  ) : (
                    "CONFIRM — RE-LAUNCH NOW"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setConfirming(false)}
                  className="h-10 font-mono text-xs text-white/60 hover:text-white"
                >
                  CANCEL
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                onClick={() => setConfirming(true)}
                className="mt-3 h-10 bg-ember font-mono text-xs font-black tracking-wider text-[#0A0A0A] hover:bg-ember-hot"
              >
                RE-LAUNCH — FRESH VOTE POOL
              </Button>
            )
          ) : (
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-white/45">
              Next eligible {cooldown ? fmtDate(cooldown) : "— later"}
            </p>
          )}
        </div>
      )}

      <ul className={cn(PANEL, "divide-y divide-white/[0.06]")}>
        {(history ?? []).map((h) => (
          <li key={`${h.version}-${h.launchedAt}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3.5">
            <span className="font-mono text-xs font-bold text-ember">{h.version}</span>
            {h.note && <span className="min-w-0 flex-1 truncate text-xs text-white/55">{h.note}</span>}
            <span className="ml-auto font-mono text-[10px] text-white/40">{fmtDay(h.launchedAt)}</span>
            <span className="font-mono text-xs tabular-nums text-white/70">▲ {h.totalVotes}</span>
          </li>
        ))}
        <li className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3.5">
          <span className="font-mono text-xs font-bold text-white/60">V1 · ORIGINAL</span>
          <span className="ml-auto font-mono text-[10px] text-white/40">
            {fmtDay(originalLaunchDate ?? launchDate)}
          </span>
          <span className="font-mono text-xs tabular-nums text-white/70">▲ {currentVotes}</span>
        </li>
      </ul>
    </section>
  );
}

// ── Discussion (ported from the legacy modal — same API shapes) ──────────

const COMMENT_BODY_MAX = 280;
const COMMENT_BODY_WARN = 224;
const COMMENT_NAME_MAX = 24;
const COMMENT_NAME_STORAGE = "prother_comment_name";

const AVATAR_GRADIENTS = [
  "from-orange-400 to-rose-600",
  "from-amber-400 to-orange-600",
  "from-emerald-400 to-teal-600",
  "from-rose-400 to-red-600",
  "from-yellow-400 to-amber-600",
  "from-lime-400 to-green-600",
  "from-fuchsia-400 to-purple-600",
  "from-red-400 to-orange-600",
] as const;

function avatarGradient(author: string): string {
  let h = 0;
  for (let i = 0; i < author.length; i++) h = (h * 31 + author.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length]!;
}

function Discussion({
  slug,
  makerHandle,
}: {
  slug: string;
  makerHandle: string;
}) {
  const { toast } = useToast();
  const [items, setItems] = useState<CommentRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setLoadError(false);
    setItems(null);
    fetch(`/api/tools/${encodeURIComponent(slug)}/comments`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load discussion");
        return (await res.json()) as { items: CommentRow[] };
      })
      .then((data) => {
        if (alive) setItems(data.items);
      })
      .catch(() => {
        if (alive) setLoadError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  useEffect(() => {
    setName(window.localStorage.getItem(COMMENT_NAME_STORAGE) ?? "");
  }, []);

  const canPost = name.trim().length >= 2 && body.trim().length >= 4 && !posting;

  const onPost = useCallback(async () => {
    if (!canPost) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/tools/${encodeURIComponent(slug)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: name.trim(), body: body.trim() }),
      });
      const data = (await res.json()) as CommentRow & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not post — please try again.");
      setItems((prev) => [...(prev ?? []), data]);
      setBody("");
      window.localStorage.setItem(COMMENT_NAME_STORAGE, name.trim());
      toast({ title: "Comment posted" });
    } catch (err) {
      toast({
        title: "Could not post comment",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setPosting(false);
    }
  }, [canPost, slug, name, body, toast]);

  const count = items?.length ?? 0;
  const counterTone =
    body.length >= COMMENT_BODY_MAX
      ? "text-red-400"
      : body.length >= COMMENT_BODY_WARN
        ? "text-ember"
        : "text-white/35";

  return (
    <section aria-label="Discussion" className="space-y-3">
      <SectionHead
        right={
          <span className="font-mono text-[10px] tracking-wider text-white/25">
            MODERATED PER S6
          </span>
        }
      >
        Discussion ({count})
      </SectionHead>

      <div
        className="max-h-96 space-y-2 overflow-y-auto pr-1"
        aria-live="polite"
        aria-label={`Discussion for this tool, ${count} comments`}
      >
        {loading && (
          <>
            <Skeleton className="h-16 w-full rounded-xl bg-white/5" />
            <Skeleton className="h-16 w-5/6 rounded-xl bg-white/5" />
          </>
        )}

        {!loading && loadError && (
          <p className="rounded-lg border border-red-500/25 bg-red-500/[0.04] p-3 text-xs text-red-300">
            Couldn&apos;t load the discussion — it will appear next time you open
            this listing.
          </p>
        )}

        {!loading && !loadError && count === 0 && (
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-white/15 p-6 text-center">
            <MessageSquare className="size-4 text-white/30" aria-hidden />
            <p className="text-sm text-white/70">No comments yet.</p>
            <p className="text-xs text-white/40">
              Start the discussion — ask {makerHandle} anything.
            </p>
          </div>
        )}

        {items?.map((c) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={cn(PANEL, "p-3.5 transition-colors hover:border-ember/25")}
          >
            <div className="flex gap-3">
              <span
                aria-hidden
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-black",
                  avatarGradient(c.author)
                )}
              >
                {c.author.replace(/^@/, "").charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-semibold text-white/90">{c.author}</span>
                  {c.isMaker && (
                    <span className="rounded-full border border-ember/40 bg-ember/15 px-1.5 py-px font-mono text-[9px] tracking-wider text-ember">
                      MAKER
                    </span>
                  )}
                  <span className="ml-auto shrink-0 whitespace-nowrap font-mono text-[10px] text-white/35">
                    {relTime(c.createdAt)}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-white/75">
                  {c.body}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Composer */}
      <div className={cn(PANEL, "p-3 transition-colors focus-within:border-ember/40")}>
        <label htmlFor={`fp-c-name-${slug}`} className="sr-only">
          Your display name
        </label>
        <Input
          id={`fp-c-name-${slug}`}
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, COMMENT_NAME_MAX))}
          placeholder="Your name"
          maxLength={COMMENT_NAME_MAX}
          autoComplete="name"
          className="border-0 border-b border-white/10 bg-transparent px-0 font-mono text-sm focus-visible:border-ember/60 focus-visible:ring-0"
        />
        <label htmlFor={`fp-c-body-${slug}`} className="sr-only">
          Write a comment
        </label>
        <textarea
          id={`fp-c-body-${slug}`}
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, COMMENT_BODY_MAX))}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              void onPost();
            }
          }}
          placeholder="Add to the discussion…"
          rows={3}
          maxLength={COMMENT_BODY_MAX}
          aria-label="Write a comment"
          className={cn(
            "mt-2 w-full resize-none bg-transparent text-sm leading-relaxed text-white placeholder:text-white/30 focus:outline-none",
            body.length >= COMMENT_BODY_MAX && "text-red-300"
          )}
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] text-white/30">⌘↵ TO POST · BE CONSTRUCTIVE (S6)</p>
          <div className="flex items-center gap-3">
            <span className={cn("font-mono text-[10px] tabular-nums", counterTone)} aria-live="polite">
              {body.length}/{COMMENT_BODY_MAX}
            </span>
            <Button
              type="button"
              onClick={() => void onPost()}
              disabled={!canPost}
              aria-label="Post comment"
              className="h-9 rounded-lg bg-ember px-3 text-xs font-semibold text-[#0A0A0A] hover:bg-ember-hot disabled:opacity-40"
            >
              {posting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" aria-hidden /> Posting…
                </>
              ) : (
                <>
                  <Send className="size-3.5" aria-hidden /> Post
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Save popover (collections) ────────────────────────────────────────────

function SavePopover({
  slug,
  toolName,
  savedIn,
  onSavedChange,
  children,
}: {
  slug: string;
  toolName: string;
  savedIn: { slug: string; name: string }[];
  onSavedChange: (saved: { slug: string; name: string }[]) => void;
  children: React.ReactNode;
}) {
  const { toast } = useToast();
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [colls, setColls] = useState<CollectionRow[] | null>(null);
  const [newName, setNewName] = useState("");
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const savedSet = useMemo(() => new Set(savedIn.map((s) => s.slug)), [savedIn]);

  const onOpenChange = useCallback(
    (next: boolean) => {
      if (next && status === "unauthenticated") {
        openAuth();
        toast({ title: "Sign in to save tools to collections." });
        return;
      }
      setOpen(next);
      if (next) {
        setColls(null);
        fetch("/api/collections")
          .then(async (res) => {
            if (!res.ok) throw new Error("failed");
            return (await res.json()) as { mine: CollectionRow[] };
          })
          .then((data) => setColls(data.mine ?? []))
          .catch(() => setColls([]));
      }
    },
    [status, toast]
  );

  const toggle = useCallback(
    async (c: CollectionRow) => {
      setBusySlug(c.slug);
      try {
        const res = await fetch(`/api/collections/${encodeURIComponent(c.slug)}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toolSlug: slug }),
        });
        if (res.status === 401) {
          openAuth();
          return;
        }
        const data = (await res.json().catch(() => ({}))) as { inCollection?: boolean };
        const nowIn = !!data.inCollection;
        const next = nowIn
          ? [...savedIn, { slug: c.slug, name: c.name }]
          : savedIn.filter((s) => s.slug !== c.slug);
        onSavedChange(next);
        toast({
          title: nowIn ? `Saved to ${c.name}` : `Removed from ${c.name}`,
        });
      } catch {
        toast({ title: "Could not update the collection", variant: "destructive" });
      } finally {
        setBusySlug(null);
      }
    },
    [slug, savedIn, onSavedChange, toast]
  );

  const create = useCallback(async () => {
    const nameTrimmed = newName.trim();
    if (nameTrimmed.length < 2 || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameTrimmed }),
      });
      if (res.status === 401) {
        openAuth();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { collection?: CollectionRow };
      if (!res.ok || !data.collection) {
        toast({ title: "Could not create the collection", variant: "destructive" });
        return;
      }
      setColls((prev) => [data.collection!, ...(prev ?? [])]);
      setNewName("");
      // Auto-save the tool into the fresh collection.
      const c = data.collection;
      try {
        const itemRes = await fetch(`/api/collections/${encodeURIComponent(c.slug)}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toolSlug: slug }),
        });
        if (itemRes.ok) {
          onSavedChange([...savedIn, { slug: c.slug, name: c.name }]);
        }
      } catch {
        /* collection exists; saving is best-effort */
      }
      toast({ title: `Collection "${c.name}" created` });
    } catch {
      toast({ title: "Could not create the collection", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }, [newName, creating, slug, savedIn, onSavedChange, toast]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-72 border-white/10 bg-coal p-3 text-white"
        aria-label={`Save ${toolName} to a collection`}
      >
        <p className={MONO}>Save to collection</p>
        <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
          {colls === null && (
            <>
              <Skeleton className="h-10 w-full rounded-lg bg-white/5" />
              <Skeleton className="h-10 w-5/6 rounded-lg bg-white/5" />
            </>
          )}
          {colls !== null && colls.length === 0 && (
            <p className="px-1 py-2 text-xs text-white/45">
              No collections yet — create your first one below.
            </p>
          )}
          {colls?.map((c) => {
            const saved = savedSet.has(c.slug);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => void toggle(c)}
                disabled={busySlug === c.slug}
                aria-pressed={saved}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-white/5"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-white/85">{c.name}</span>
                <span className="font-mono text-[10px] text-white/35">{c.itemCount}</span>
                <span
                  aria-hidden
                  className={cn(
                    "flex size-5 items-center justify-center rounded border",
                    saved ? "border-ember bg-ember/15 text-ember" : "border-white/20 text-transparent"
                  )}
                >
                  <Check className="size-3" />
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex items-center gap-2 border-t border-white/10 pt-2.5">
          <label htmlFor="new-collection-name" className="sr-only">
            New collection name
          </label>
          <Input
            id="new-collection-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value.slice(0, 40))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void create();
              }
            }}
            placeholder="+ New collection"
            className="h-9 border-white/10 bg-transparent text-sm focus-visible:border-ember/50 focus-visible:ring-0"
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Create collection"
            onClick={() => void create()}
            disabled={newName.trim().length < 2 || creating}
            className="bg-white/[0.03] hover:bg-white/[0.08] size-9 shrink-0 border-white/10 text-ember hover:border-ember/40 hover:bg-ember/10"
          >
            {creating ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export function ToolFullPage() {
  const { toast } = useToast();
  const { status: sessionStatus } = useSession();
  const slug = useExplorer((s) => s.slug);
  const closeTool = useExplorer((s) => s.closeTool);
  const openTool = useExplorer((s) => s.openTool);
  const addCompare = useExplorer((s) => s.addCompare);
  const removeCompare = useExplorer((s) => s.removeCompare);
  const compareSlugs = useExplorer((s) => s.compare);

  const [detail, setDetail] = useState<ToolFullDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadErr, setLoadErr] = useState(false);
  const [vote, setVote] = useState<{ votes: number; voted: boolean } | null>(null);
  const [following, setFollowing] = useState(false);
  const [savedLocal, setSavedLocal] = useState<{ slug: string; name: string }[] | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    setLoadErr(false);
    setSavedLocal(null);
    try {
      const res = await fetch(
        `/api/tools/${encodeURIComponent(slug)}?vk=${encodeURIComponent(getVoterKey())}`
      );
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as ToolFullDetail;
      setDetail(data);
      setVote({ votes: data.votes, voted: data.voted });
      setFollowing(data.viewer?.following ?? false);
    } catch {
      setLoadErr(true);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    setDetail(null);
    void load();
  }, [load]);

  const onVote = useCallback(async () => {
    if (!detail?.launchId || !vote) return;
    const nextVoted = !vote.voted;
    setVote({ votes: vote.votes + (nextVoted ? 1 : -1), voted: nextVoted });
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ launchId: detail.launchId, voterKey: getVoterKey() }),
      });
      const data = (await res.json()) as { voted: boolean; votes: number };
      setVote({ votes: data.votes, voted: data.voted });
      window.dispatchEvent(
        new CustomEvent("prother:vote", {
          detail: { launchId: detail.launchId, votes: data.votes, voted: data.voted },
        })
      );
    } catch {
      setVote(vote);
      toast({ title: "Vote failed", description: "Please try again.", variant: "destructive" });
    }
  }, [detail, vote, toast]);

  const onFollow = useCallback(async () => {
    if (!detail) return;
    const next = !following;
    setFollowing(next);
    try {
      const res = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "tool",
          targetId: slug,
          targetLabel: detail.name,
        }),
      });
      if (res.status === 401) {
        setFollowing(!next);
        openAuth();
        toast({ title: "Sign in to follow tools." });
        return;
      }
      const data = (await res.json()) as { following?: boolean };
      setFollowing(!!data.following);
      toast({ title: data.following ? "Following — you'll see updates" : "Unfollowed" });
    } catch {
      setFollowing(!next);
      toast({ title: "Could not update follow", variant: "destructive" });
    }
  }, [detail, following, slug, toast]);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/?tool=${encodeURIComponent(slug ?? "")}`
      : `/?tool=${encodeURIComponent(slug ?? "")}`;

  const onCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
      toast({ title: "Link copied" });
    } catch {
      toast({ title: "Could not copy the link", description: shareUrl, variant: "destructive" });
    }
  }, [shareUrl, toast]);

  const savedIn = savedLocal ?? detail?.viewer?.savedIn ?? [];
  const savedSet = useMemo(() => new Set(savedIn.map((s) => s.slug)), [savedIn]);

  const inCompare = slug ? compareSlugs.includes(slug) : false;
  const compareFull = compareSlugs.length >= 2 && !inCompare;

  const onCompare = useCallback(() => {
    if (!slug) return;
    if (inCompare) removeCompare(slug);
    else if (!compareFull) addCompare(slug);
  }, [slug, inCompare, compareFull, addCompare, removeCompare]);

  const claim: StartedClaim | null = detail?.viewer?.claim
    ? {
        id: detail.viewer.claim.id,
        status: detail.viewer.claim.status,
        token: detail.viewer.claim.token,
        note: detail.viewer.claim.note,
        verifiedAt: detail.viewer.claim.verifiedAt,
      }
    : null;
  const claimed = detail ? !detail.badges.unclaimed : false;
  const passedCount = detail?.standards.filter((s) => s.passed).length ?? 0;

  // ── States ──
  if (!slug) return null;

  if (loading) {
    return (
      <FullPageShell
        kicker="Tool"
        breadcrumb={[{ label: "Home" }]}
        onClose={closeTool}
        wide
        ariaLabel={detail?.name ? `${detail.name} details` : "Tool details"}
      >
        <PageSkeleton />
      </FullPageShell>
    );
  }

  if (notFound) {
    return (
      <PageError
        title="TOOL NOT FOUND"
        message="This listing doesn't exist (or was removed)."
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => closeTool()}
            className="bg-white/[0.03] hover:bg-white/[0.08] h-10 border-white/15 font-mono text-xs tracking-wider text-white/70 hover:border-ember/40 hover:text-ember"
          >
            ← CLOSE
          </Button>
        }
      />
    );
  }

  if (loadErr || !detail || !vote) {
    return (
      <PageError
        title="COULDN'T LOAD THIS TOOL"
        message="The listing service didn't respond — try again in a moment."
        action={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void load()}
              className="bg-white/[0.03] hover:bg-white/[0.08] h-10 border-white/15 font-mono text-xs tracking-wider text-white/70 hover:border-ember/40 hover:text-ember"
            >
              RETRY
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => closeTool()}
              className="bg-white/[0.03] hover:bg-white/[0.08] h-10 border-white/15 font-mono text-xs tracking-wider text-white/70 hover:border-ember/40 hover:text-ember"
            >
              ← CLOSE
            </Button>
          </div>
        }
      />
    );
  }

  const name = detail.name;

  return (
    <FullPageShell
      kicker="Tool"
      breadcrumb={[{ label: "Home", onClick: closeTool }]}
      onClose={closeTool}
      shareUrl={shareUrl}
      wide
      ariaLabel={`${name} — full listing`}
    >
      <div className="space-y-10">
        {/* a. Header */}
        <header className="space-y-5">
          <div className="flex items-start gap-4 sm:gap-5">
            <span
              aria-hidden
              className={cn(
                "grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-4xl shadow-xl sm:size-20",
                detail.gradient
              )}
            >
              {detail.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                {name}
              </h1>
              <p className="mt-1 text-base text-white/65 sm:text-lg">{detail.tagline}</p>
            </div>
          </div>

          {/* Badge chips */}
          <ul className="flex flex-wrap items-center gap-1.5" aria-label="Badges">
            {detail.badges.editorsPick && (
              <li className="inline-flex items-center gap-1 rounded-full border border-ember/30 bg-ember/15 px-2.5 py-1 font-mono text-[10px] tracking-wider text-ember">
                <Star className="size-3" aria-hidden /> EDITORS PICK
              </li>
            )}
            {detail.badges.curated && (
              <li className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1 font-mono text-[10px] tracking-wider text-yellow-500">
                CURATED
              </li>
            )}
            {detail.badges.relaunch && (
              <li
                title={detail.relaunchNote ?? undefined}
                className="rounded-full border border-mint/30 bg-mint/10 px-2.5 py-1 font-mono text-[10px] tracking-wider text-mint"
              >
                RE-LAUNCH
              </li>
            )}
            {detail.badges.unclaimed && (
              <li className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 font-mono text-[10px] tracking-wider text-white/40">
                UNCLAIMED
              </li>
            )}
            {detail.badges.hasApi && (
              <li className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 font-mono text-[10px] tracking-wider text-white/60">
                API ✓
              </li>
            )}
            {detail.badges.openSource && (
              <li className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 font-mono text-[10px] tracking-wider text-white/60">
                OPEN SOURCE
              </li>
            )}
            <li className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 font-mono text-[10px] tracking-wider text-white/60">
              {detail.track === "editor_seed" ? "SEED" : "SUBMITTED"}
            </li>
          </ul>

          {/* Actions row: vote + secondary icon buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void onVote()}
              disabled={!detail.launchId}
              aria-label={vote.voted ? "Remove upvote" : "Upvote this tool"}
              aria-pressed={vote.voted}
              className={cn(
                "inline-flex h-11 items-center gap-2 rounded-full px-5 text-base font-black tabular-nums transition active:scale-95",
                vote.voted
                  ? "border border-ember bg-ember/10 text-ember"
                  : "bg-ember text-[#0A0A0A] hover:bg-ember-hot",
                !detail.launchId && "cursor-not-allowed opacity-40"
              )}
            >
              <Triangle
                className="size-4"
                fill={vote.voted ? "currentColor" : "none"}
                aria-hidden
              />
              {vote.votes}
            </button>

            <Button
              asChild
              variant="outline"
              size="icon"
              className="bg-white/[0.03] hover:bg-white/[0.08] size-11 border-white/10 text-white/70 hover:border-ember/40 hover:text-ember"
            >
              <a
                href={detail.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Visit ${name} website`}
              >
                <ArrowUpRight className="size-4" aria-hidden />
              </a>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Copy link to this tool"
              onClick={() => void onCopyLink()}
              className={cn(
                "bg-white/[0.03] hover:bg-white/[0.08] size-11 border-white/10 hover:border-ember/40",
                copied ? "text-mint" : "text-white/70 hover:text-ember"
              )}
            >
              {copied ? <Check className="size-4" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={following ? `Unfollow ${name}` : `Follow ${name}`}
              aria-pressed={following}
              onClick={() => void onFollow()}
              className={cn(
                "bg-white/[0.03] hover:bg-white/[0.08] size-11 border-white/10 hover:border-ember/40",
                following ? "text-ember" : "text-white/70 hover:text-ember"
              )}
            >
              <Heart className={cn("size-4", following && "fill-ember")} aria-hidden />
            </Button>

            <SavePopover
              slug={slug}
              toolName={name}
              savedIn={savedIn}
              onSavedChange={(next) => setSavedLocal(next)}
            >
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={
                  savedSet.size > 0
                    ? `Saved in ${savedSet.size} collection${savedSet.size === 1 ? "" : "s"} — manage`
                    : `Save ${name} to a collection`
                }
                aria-pressed={savedSet.size > 0}
                className={cn(
                  "bg-white/[0.03] hover:bg-white/[0.08] size-11 border-white/10 hover:border-ember/40",
                  savedSet.size > 0 ? "text-ember" : "text-white/70 hover:text-ember"
                )}
              >
                <Bookmark
                  className={cn("size-4", savedSet.size > 0 && "fill-ember")}
                  aria-hidden
                />
              </Button>
            </SavePopover>

            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={
                inCompare
                  ? `Remove ${name} from comparison`
                  : compareFull
                    ? "Comparison is full — remove a tool first"
                    : `Add ${name} to comparison`
              }
              aria-pressed={inCompare}
              disabled={compareFull}
              onClick={onCompare}
              className={cn(
                "bg-white/[0.03] hover:bg-white/[0.08] size-11 border-white/10 hover:border-ember/40",
                inCompare ? "text-ember" : "text-white/70 hover:text-ember",
                compareFull && "opacity-40"
              )}
            >
              <Scale className="size-4" aria-hidden />
            </Button>

            {detail.links.github && (
              <Button
                asChild
                variant="outline"
                size="icon"
                className="bg-white/[0.03] hover:bg-white/[0.08] size-11 border-white/10 text-white/70 hover:border-ember/40 hover:text-ember"
              >
                <a
                  href={detail.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${name} on GitHub`}
                >
                  <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
                    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.15c-3.2.69-3.87-1.36-3.87-1.36-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.26.72-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.04.77 2.1v3.11c0 .3.21.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
                  </svg>
                </a>
              </Button>
            )}
          </div>
        </header>

        {/* b–i: main column + facts rail */}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-10">
          <div className="min-w-0 space-y-10">
            {/* c. About */}
            {detail.description && (
              <section aria-label="About" className="space-y-3">
                <SectionHead>About</SectionHead>
                <p className="whitespace-pre-line text-sm leading-relaxed text-white/70">
                  {detail.description}
                </p>
              </section>
            )}

            {/* d. Claim banner (F-30) */}
            <section aria-label="Ownership claim" className="space-y-3">
              <SectionHead>Ownership</SectionHead>
              {claimed ? (
                <div className="flex items-center gap-2 rounded-xl border border-mint/40 bg-mint/[0.05] p-4">
                  <ShieldCheck className="size-4 shrink-0 text-mint" aria-hidden />
                  <p className="text-sm font-semibold text-mint">
                    ✓ Claimed by {detail.maker}
                  </p>
                </div>
              ) : detail.viewer?.claim ? (
                <ClaimPanel
                  slug={slug}
                  maker={detail.maker}
                  claim={claim}
                  sessionStatus={sessionStatus}
                  onRefresh={() => void load()}
                />
              ) : (
                <ClaimPanel
                  slug={slug}
                  maker={detail.maker}
                  claim={null}
                  sessionStatus={sessionStatus}
                  onRefresh={() => void load()}
                />
              )}
            </section>

            {/* e. Reviews (F-16) */}
            <ReviewsSection
              slug={slug}
              isMaker={detail.viewer?.isMaker ?? false}
              sessionStatus={sessionStatus}
              viewerMyReview={detail.viewer?.myReview ?? null}
              onRefreshTool={() => void load()}
            />

            {/* f. Re-launch (F-35) */}
            <RelaunchSection
              slug={slug}
              viewer={detail.viewer ?? null}
              history={detail.launchHistory ?? []}
              originalLaunchDate={detail.originalLaunchDate ?? null}
              launchDate={detail.launchDate}
              currentVotes={vote.votes}
              onRefresh={() => void load()}
            />

            {/* g. Discussion */}
            <Discussion slug={detail.slug} makerHandle={detail.maker} />

            {/* h. Related */}
            {detail.related && detail.related.length > 0 && (
              <section aria-label="More like this" className="space-y-3">
                <SectionHead>More like this</SectionHead>
                <div className="grid gap-3 sm:grid-cols-3">
                  {detail.related.slice(0, 3).map((r) => (
                    <button
                      key={r.slug}
                      type="button"
                      onClick={() => openTool(r.slug)}
                      aria-label={`Open ${r.name} details`}
                      className={cn(PANEL, "p-4 text-left transition-colors hover:border-ember/40 hover:bg-ember/[0.04]")}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "grid size-10 place-items-center rounded-lg bg-gradient-to-br text-lg",
                          r.gradient
                        )}
                      >
                        {r.emoji}
                      </span>
                      <span className="mt-2.5 flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold text-white/90">{r.name}</span>
                        <span className="shrink-0 font-mono text-xs tabular-nums text-ember">▲{r.votes}</span>
                      </span>
                      <span className="mt-1 line-clamp-2 block text-xs leading-snug text-white/45">
                        {r.tagline}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* i. Standards */}
            <section aria-label="Quality bar" className="space-y-3">
              <Collapsible>
                <CollapsibleTrigger
                  className={cn(
                    "group flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-left transition-colors hover:border-ember/40"
                  )}
                >
                  <span className={MONO}>
                    Quality bar — {passedCount}/{detail.standards.length}{" "}
                    {detail.scheduled ? "pending" : "passed"}
                  </span>
                  <ChevronDown
                    className="size-4 text-white/50 transition-transform group-data-[state=open]:rotate-180"
                    aria-hidden
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="mt-2 space-y-2">
                    {detail.standards.map((s) => (
                      <li key={s.id} className={cn(PANEL, "flex items-start gap-2.5 p-3")}>
                        <span
                          className={cn(
                            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full",
                            s.passed ? "bg-mint/15 text-mint" : "bg-white/10 text-white/40"
                          )}
                        >
                          {s.passed ? (
                            <Check className="size-2.5" aria-hidden />
                          ) : (
                            <CircleDashed className="size-2.5" aria-hidden />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white/85">
                            <span className="mr-1.5 font-mono text-ember">{s.id}</span>
                            {s.title}
                          </p>
                          <p className="mt-0.5 text-[11px] leading-snug text-white/45">{s.blurb}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            </section>
          </div>

          {/* b. Facts rail */}
          <FactsRail detail={detail} />
        </div>
      </div>
    </FullPageShell>
  );
}
