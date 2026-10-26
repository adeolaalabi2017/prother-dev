"use client";

import React, { useCallback } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { ToolLogo } from "./tool-logo";
import { useExplorer } from "./explorer-store";

export type ToolCardProps = {
  slug: string;
  name: string;
  tagline: string;
  description?: string | null;
  emoji?: string;
  gradient?: string;
  logoUrl?: string | null;
  pricingModel?: string; // "free" | "freemium" | "paid" | "open_source"
  pricing?:
    | {
        model?: string;
        price?: string | null;
        note?: string | null;
      }
    | string;
  startingPrice?: string | null;
  pricingNote?: string | null;
  hasApi?: boolean;
  githubUrl?: string | null;
  tags?: string[];
  category?: {
    slug?: string;
    name: string;
    emoji?: string;
  };
  editorsPick?: boolean;
  curated?: boolean;
  rank?: number;
  listedAt?: string;
  className?: string;
};

function formatTag(raw: string): string {
  return raw
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function resolvePricingModel(p: ToolCardProps): string {
  if (p.pricingModel) return p.pricingModel.toLowerCase();
  if (typeof p.pricing === "object" && p.pricing?.model) {
    return p.pricing.model.toLowerCase();
  }
  if (typeof p.pricing === "string") {
    const lower = p.pricing.toLowerCase();
    if (lower.includes("open source")) return "open_source";
    if (lower.includes("freemium") || lower.includes("free tier")) return "freemium";
    if (lower.includes("free")) return "free";
    if (lower.includes("paid")) return "paid";
  }
  return "freemium";
}

function getSubtitle(p: ToolCardProps, model: string, hasApi: boolean): string {
  const parts: string[] = [];
  if (p.category?.name) {
    parts.push(p.category.name);
  }
  if (p.tags && p.tags.length > 0) {
    const formatted = p.tags
      .map(formatTag)
      .filter((t) => t.toLowerCase() !== p.category?.name?.toLowerCase())
      .slice(0, 2);
    parts.push(...formatted);
  } else if (hasApi) {
    parts.push("API");
  }
  return parts.slice(0, 3).join(" · ");
}

function getBadges(model: string, hasApi: boolean, isSelfHostable: boolean) {
  const badges: { label: string; tone: "emerald" | "sky" | "amber" | "neutral" }[] = [];

  // 1. Pricing tier badge
  if (model === "open_source") {
    badges.push({ label: "Open source", tone: "sky" });
  } else if (model === "freemium") {
    badges.push({ label: "Free tier", tone: "emerald" });
  } else if (model === "free") {
    badges.push({ label: "Free", tone: "emerald" });
  } else {
    badges.push({ label: "Paid", tone: "amber" });
  }

  // 2. API capability badge
  if (hasApi) {
    badges.push({ label: "API available", tone: "neutral" });
  } else {
    badges.push({ label: "Web interface", tone: "neutral" });
  }

  // 3. Deployment badge
  if (isSelfHostable) {
    badges.push({ label: "Self-hostable", tone: "neutral" });
  } else {
    badges.push({ label: "Cloud hosted", tone: "neutral" });
  }

  return badges;
}

function getPricingSummary(p: ToolCardProps, model: string): string {
  const note =
    p.pricingNote || (typeof p.pricing === "object" ? p.pricing?.note : null);
  if (note && note.trim().length > 0) {
    return note;
  }

  const price =
    p.startingPrice || (typeof p.pricing === "object" ? p.pricing?.price : null);
  if (price && price.trim().length > 0) {
    if (model === "freemium") {
      return `Free tier available; paid starts at ${price}.`;
    }
    return `Plans start at ${price}.`;
  }

  if (model === "open_source") {
    return "Free and open source; self-hostable with public code.";
  }
  if (model === "freemium") {
    return "Free tier available; paid plans vary.";
  }
  if (model === "free") {
    return "100% free; no payment or credit card required.";
  }
  return "Commercial pricing; paid plans vary.";
}

export function ToolDecisionCard(props: ToolCardProps) {
  const {
    slug,
    name,
    tagline,
    description,
    emoji = "⚡",
    gradient = "from-amber-500 to-orange-600",
    logoUrl,
    rank,
    editorsPick,
    className = "",
  } = props;

  const compareSlugs = useExplorer((s) => s.compare);
  const addCompare = useExplorer((s) => s.addCompare);
  const removeCompare = useExplorer((s) => s.removeCompare);

  const inCompare = compareSlugs.includes(slug);

  const onCompareToggle = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (inCompare) {
        removeCompare(slug);
      } else {
        addCompare(slug);
      }
    },
    [inCompare, slug, addCompare, removeCompare],
  );

  const model = resolvePricingModel(props);
  const hasApi = Boolean(props.hasApi);
  const isSelfHostable = model === "open_source" || Boolean(props.githubUrl);
  const subtitle = getSubtitle(props, model, hasApi);
  const badges = getBadges(model, hasApi, isSelfHostable);
  const pricingSummary = getPricingSummary(props, model);
  const descText = tagline || description || "";

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0c0d10] p-5 sm:p-6 transition-all duration-200 hover:border-ember/40 hover:bg-white/[0.035] hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)] ${className}`}
    >
      {/* Primary stretched click target covering the entire card */}
      <Link
        href={`/tools/${slug}`}
        className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
        aria-label={`View specifications for ${name}`}
      />

      {/* Card Content (pointer-events-none so click events fall through to the stretched link) */}
      <div className="relative z-10 pointer-events-none flex flex-1 flex-col justify-between">
        <div>
          {/* Header row: Logo + Name + Badges + Subtitle */}
          <div className="flex items-start gap-3.5">
            <div className="shrink-0 pt-0.5">
              <ToolLogo
                slug={slug}
                name={name}
                logoUrl={logoUrl}
                emoji={emoji}
                gradient={gradient}
                size="md"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h3 className="truncate text-base font-semibold text-white transition-colors group-hover:text-ember sm:text-lg">
                  {name}
                </h3>
                {rank !== undefined && rank > 0 && (
                  <span className="font-mono text-xs font-semibold text-white/50">
                    #{rank}
                  </span>
                )}
                {editorsPick ? (
                  <span className="inline-flex items-center gap-1 rounded border border-ember/30 bg-ember/15 px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide text-ember uppercase">
                    <Star className="size-2.5 fill-current" aria-hidden />
                    Pick
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide text-white/70 uppercase">
                    Verified
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="mt-0.5 truncate font-mono text-xs text-white/50">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Use Case & Explanation */}
          <p className="mt-3.5 line-clamp-2 text-xs leading-relaxed text-white/70 sm:text-sm text-pretty">
            {descText}
          </p>

          {/* Decision Badges Row */}
          <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
            {badges.map((b, idx) => {
              if (b.tone === "emerald") {
                return (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-emerald-400"
                  >
                    {b.label}
                  </span>
                );
              }
              if (b.tone === "sky") {
                return (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-sky-400"
                  >
                    {b.label}
                  </span>
                );
              }
              if (b.tone === "amber") {
                return (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-amber-300"
                  >
                    {b.label}
                  </span>
                );
              }
              return (
                <span
                  key={idx}
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-[11px] font-medium text-white/70"
                >
                  {b.label}
                </span>
              );
            })}
          </div>

          {/* Explicit Pricing Summary */}
          <div className="mt-3.5 text-xs text-white/60">
            <span className="font-medium text-white/80">Pricing: </span>
            <span>{pricingSummary}</span>
          </div>
        </div>

        {/* Footer actions: View specs link + Separate comparison action */}
        <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-3.5">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-ember transition-colors group-hover:text-ember-hot">
            <span>View specifications</span>
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
              &rarr;
            </span>
          </span>

          {/* Interactive Compare button (pointer-events-auto re-enables clicking) */}
          <button
            type="button"
            onClick={onCompareToggle}
            className={`pointer-events-auto inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ember ${
              inCompare
                ? "border border-ember/40 bg-ember/15 text-ember hover:bg-ember/25"
                : "border border-white/10 bg-white/[0.04] text-white/65 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            }`}
            title={inCompare ? "Remove from comparison tray" : "Add to comparison tray"}
          >
            <span>{inCompare ? "✓ In Compare" : "+ Compare"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
