"use client";

import { KNOWN_LOCAL_LOGOS } from "@/lib/logos";
export { KNOWN_LOCAL_LOGOS };

/**
 * Resolve a logo from the canonical local brand map first, then from the
 * listing's already-fetched logoUrl. This hook intentionally does not open a
 * Convex subscription: tool cards render on the server and their data layer
 * should supply logoUrl when a listing has a non-local logo.
 */
export function resolveToolLogoUrl(
  slug?: string | null,
  fallback?: string | null,
): string | null {
  if (slug) {
    const local = KNOWN_LOCAL_LOGOS[slug];
    if (local) return local;
  }

  // Reject legacy AI-generated mock thumbnail URLs.
  if (fallback && !fallback.startsWith("/api/media/")) return fallback;
  return null;
}

/** Stable resolver for existing ToolLogo callers. */
export function useToolLogos(): (
  slug?: string | null,
  fallback?: string | null,
) => string | null {
  return resolveToolLogoUrl;
}
