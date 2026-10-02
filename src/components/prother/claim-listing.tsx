"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/**
 * ClaimListing — ownership claim CTA for the server-rendered /tools/[slug]
 * page.
 *
 * Why this exists: the full claim flow (meta tag, VERIFY NOW, failure states)
 * already ships in the ?tool= overlay, but the real crawlable tool page is
 * where makers actually land — from Google, from a shared link. Until now that
 * page showed an "Unclaimed" chip and nothing else, so a maker had to know the
 * overlay existed to fix their own listing. Nearly 60% of the directory is
 * unclaimed, so this was the single highest-leverage surface for getting specs
 * corrected.
 *
 * Scope: start a claim and show the meta tag. Deliberately not a second
 * implementation of verify/retry — those stay in the overlay, and this
 * component links there so the two never drift.
 */

type StartedClaim = {
  id: string;
  status: string;
  token: string;
  note: string | null;
  verifiedAt?: string | null;
};

type ClaimState = {
  claimable?: boolean;
  claim?: StartedClaim | null;
  tool?: { claimed?: boolean; maker?: string | null };
};

export function ClaimListing({
  slug,
  maker,
  claimed,
}: {
  slug: string;
  maker: string;
  claimed: boolean;
}) {
  const { toast } = useToast();
  const [state, setState] = useState<ClaimState | null>(null);
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Claim state is per-viewer (it depends on who is signed in), so it can only
  // be read client-side. Fetch once on mount; a failure just hides the panel
  // rather than showing an error — the listing itself is unaffected.
  useEffect(() => {
    let alive = true;
    fetch(`/api/claims?tool=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ClaimState | null) => {
        if (alive && d) setState(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [slug]);

  const startClaim = useCallback(async () => {
    setStarting(true);
    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolSlug: slug }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        claim?: StartedClaim;
        error?: string;
      };
      if (res.status === 409) {
        toast({ title: "This listing is already claimed." });
        return;
      }
      if (res.status === 401) {
        toast({
          title: "Sign in first",
          description: "Claims are tied to your account.",
        });
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
      setState((s) => ({ ...(s ?? {}), claim: data.claim }));
      toast({ title: "Claim started — add the meta tag to your site." });
    } catch {
      toast({
        title: "Could not start the claim",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setStarting(false);
    }
  }, [slug, toast]);

  const activeClaim = state?.claim ?? null;
  const metaTag = activeClaim
    ? `<meta name="prother-verify" content="${activeClaim.token}" />`
    : "";

  const copyTag = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(metaTag);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({
        title: "Could not copy. Select the tag manually.",
        variant: "destructive",
      });
    }
  }, [metaTag, toast]);

  // Already owned by someone else — nothing to offer.
  if (claimed) return null;

  // Still loading claim state: render nothing rather than flashing a
  // "claim this" button at someone who has already claimed it.
  if (state === null) return null;

  // Signed out: point at sign-in, the API will 401 otherwise.
  if (state.claimable === false && !activeClaim) return null;

  if (activeClaim) {
    const verified =
      activeClaim.status === "verified" || Boolean(activeClaim.verifiedAt);
    return (
      <section
        aria-label="Ownership claim"
        className="rounded-xl border border-ember/30 bg-ember/[0.05] p-4"
      >
        <p className="font-mono text-xs font-semibold tracking-wider text-ember uppercase">
          {verified ? "Verified" : "Claim in progress"}
        </p>
        {verified ? (
          <p className="mt-2 flex items-center gap-2 text-sm text-mint">
            <BadgeCheck className="size-4 shrink-0" aria-hidden />
            This listing is verified as yours.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-white/70">
              Add this to the <code className="text-white">&lt;head&gt;</code>{" "}
              of <span className="text-white">{maker}</span>, then verify.
            </p>
            <code className="mt-3 block overflow-x-auto rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs whitespace-nowrap text-white/80">
              {metaTag}
            </code>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void copyTag()}
                className="h-9 rounded-lg border border-white/20 bg-white/5 px-3 font-mono text-xs font-semibold text-white transition-colors hover:border-ember/40 hover:text-ember"
              >
                {copied ? "COPIED" : "COPY TAG"}
              </button>
              <a
                href={`/?tool=${encodeURIComponent(slug)}`}
                className="h-9 rounded-lg border border-white/20 bg-white/5 px-3 font-mono text-xs font-semibold text-white transition-colors hover:border-ember/40 hover:text-ember"
              >
                VERIFY NOW →
              </a>
            </div>
          </>
        )}
      </section>
    );
  }

  return (
    <section
      aria-label="Ownership claim"
      className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
    >
      <p className="text-sm font-semibold text-white">
        Is this your tool? Claim the listing.
      </p>
      <p className="mt-1.5 text-sm text-white/65">
        Prove ownership and correct the specs. Claimed listings can be edited by
        their owners, so the pricing and context window stay accurate.
      </p>
      <button
        type="button"
        onClick={() => void startClaim()}
        disabled={starting}
        className={cn(
          "mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-ember px-4",
          "font-mono text-sm font-black tracking-wider text-[#0A0A0A]",
          "transition-colors hover:bg-ember-hot disabled:opacity-60",
        )}
      >
        {starting ? (
          <>
            <Loader2 className="size-3.5 animate-spin" aria-hidden /> STARTING…
          </>
        ) : (
          "CLAIM THIS LISTING →"
        )}
      </button>
    </section>
  );
}
