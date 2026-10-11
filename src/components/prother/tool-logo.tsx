"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { useToolLogos } from "./use-tool-logos";

export type ToolLogoSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface ToolLogoProps {
  slug?: string;
  name: string;
  logoUrl?: string | null;
  emoji?: string;
  gradient?: string;
  size?: ToolLogoSize;
  className?: string;
  imageClassName?: string;
}

/**
 * Rendered box edge length per size, in px. Used as the img's intrinsic
 * width/height so the browser reserves the correct aspect-ratio box before
 * the file decodes (the surrounding `size-*` class then scales it). Without
 * this, a lazy-loaded logo is a late layout shift on every card.
 */
const SIZE_PX: Record<ToolLogoSize, number> = {
  xs: 24,
  sm: 28,
  md: 40,
  lg: 48,
  xl: 80,
};

const SIZE_STYLES: Record<
  ToolLogoSize,
  { box: string; pad: string; initials: string }
> = {
  xs: {
    box: "size-6 rounded-md",
    pad: "p-0.5",
    initials: "text-[9px]",
  },
  sm: {
    box: "size-7 rounded-md",
    pad: "p-1",
    initials: "text-[10px]",
  },
  md: {
    box: "size-10 rounded-lg",
    pad: "p-1.5",
    initials: "text-sm",
  },
  lg: {
    box: "size-12 rounded-lg",
    pad: "p-2",
    initials: "text-base",
  },
  xl: {
    box: "size-16 sm:size-20 rounded-lg",
    pad: "p-3 sm:p-3.5",
    initials: "text-xl sm:text-2xl",
  },
};

export function ToolLogo({
  slug,
  name,
  logoUrl,
  // `emoji` and `gradient` are legacy data fields; they are accepted for
  // caller compatibility but are no longer rendered. See the initials
  // fallback below.
  emoji: _emoji,
  gradient: _gradient,
  size = "md",
  className,
  imageClassName,
}: ToolLogoProps) {
  const getLogo = useToolLogos();
  const resolvedUrl = getLogo(slug, logoUrl);
  const [hasError, setHasError] = useState(false);

  React.useEffect(() => {
    setHasError(false);
  }, [resolvedUrl]);

  const style = SIZE_STYLES[size];
  const showImage = Boolean(resolvedUrl) && !hasError;
  // Initials fallback: the listing name's first letters on a quiet, neutral
  // surface. Per the asset standards (AGENTS.md section 1), a tool with a
  // missing logo never degrades to an emoji tile or a colored gradient.
  const initials = name
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");

  return (
    <span
      aria-hidden={!showImage}
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden",
        style.box,
        showImage
          ? cn("border border-white/10 bg-white/[0.04] shadow-inner", style.pad)
          : "border border-white/10 bg-white/[0.04] text-white/70 font-semibold",
        className,
      )}
    >
      {showImage ? (
        <img
          src={resolvedUrl!}
          alt={`${name} logo`}
          width={SIZE_PX[size]}
          height={SIZE_PX[size]}
          loading="lazy"
          onError={() => setHasError(true)}
          className={cn("size-full object-contain", imageClassName)}
        />
      ) : (
        <span
          aria-hidden
          className={cn(style.initials, "leading-none tracking-tight")}
        >
          {initials || "PRO"}
        </span>
      )}
    </span>
  );
}
