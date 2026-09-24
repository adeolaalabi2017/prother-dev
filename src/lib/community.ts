/**
 * Community shared helpers — pure functions only.
 *
 * The Prisma data layer that used to live here (reviews / claims /
 * follows / collections / comparisons) was retired with the Convex
 * cutover; convex/community.ts owns that data now. What remains are the
 * store-independent helpers still imported by routes and components:
 * domain matching, claim tokens, the maker self-block check, and the
 * review row/aggregate shapes.
 */
import { domainOf } from "@/lib/submit";

/** Canonical domain match helper (delegates to lib/submit). */
export function sameDomain(a: string | null | undefined, b: string | null | undefined): boolean {
  const da = a ? domainOf(a) : null;
  const dbb = b ? domainOf(b) : null;
  return da != null && dbb != null && da === dbb;
}

// ── Reviews (F-16) ───────────────────────────────────────────────────────

export type ReviewAggregate = {
  count: number;
  ease: number;
  power: number;
  value: number;
  overall: number;
};

export type ReviewRow = {
  id: string;
  toolId: string;
  userId: string;
  author: string;
  ease: number;
  power: number;
  value: number;
  body: string;
  status: string;
  createdAt: number | string;
  updatedAt: number | string;
};

/** Review maker self-block (F-16): claimed owner OR same registrable domain. */
export function isReviewMaker(
  tool: { claimed: boolean; makerEmail: string | null; websiteUrl: string },
  user: { email: string }
): boolean {
  return (tool.claimed && tool.makerEmail === user.email) || sameDomain(user.email, tool.websiteUrl);
}

// ── Claims ────────────────────────────────────────────────────────────────

/** "prother-" + 24 hex chars (from a UUID). Collision-checked by caller loop. */
export function newClaimToken(): string {
  return `prother-${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
}
