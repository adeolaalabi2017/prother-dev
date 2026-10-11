/**
 * Name initials for fallback tiles: 1-2 letters derived from the display
 * name itself. Per the asset standards (AGENTS.md section 1), entities
 * without a real image fall back to a quiet monogram, never an emoji tile
 * or a colored gradient.
 */
export function initialsOf(name: string, count = 2): string {
  return name
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, count)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** Neutral tile classes for the initials monogram; pair with initialsOf(). */
export const INITIALS_TILE =
  "flex shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] font-semibold tracking-tight text-white/70";
