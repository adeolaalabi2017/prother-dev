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
  { box: string; pad: string; emoji: string }
> = {
  xs: {
    box: "size-6 rounded-md",
    pad: "p-0.5",
    emoji: "text-xs",
  },
  sm: {
    box: "size-7 rounded-md",
    pad: "p-1",
    emoji: "text-sm",
  },
  md: {
    box: "size-10 rounded-lg",
    pad: "p-1.5",
    emoji: "text-lg",
  },
  lg: {
    box: "size-12 rounded-xl",
    pad: "p-2",
    emoji: "text-xl",
  },
  xl: {
    box: "size-16 sm:size-20 rounded-2xl",
    pad: "p-3 sm:p-3.5",
    emoji: "text-3xl sm:text-4xl",
  },
};

export function ToolLogo({
  slug,
  name,
  logoUrl,
  emoji,
  gradient = "from-stone-600 to-orange-700",
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

  return (
    <span
      aria-hidden={!showImage}
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden shadow-inner",
        style.box,
        showImage
          ? cn("border border-white/10 bg-white/[0.04]", style.pad)
          : cn("bg-gradient-to-br", style.emoji, gradient),
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
        <span aria-hidden>{emoji || "⬡"}</span>
      )}
    </span>
  );
}
