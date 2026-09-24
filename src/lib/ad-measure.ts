/**
 * Ad measurement shapes (Task 28, P4).
 *
 * Store-independent pieces only — counting lives in Convex (convex/ads.ts);
 * the Prisma measurement layer was retired with the cutover.
 */
import type { AdPlacement } from "@/lib/ads";

export type PlacementMeasurement = {
  placement: AdPlacement;
  day: string;
  served: number;
  house: number;
  unfilled: number;
  /** served+served+house requested slots that did not yield a campaign. */
  unfillRate: number; // percent, 1 decimal — house fills count as unfilled demand
};

/** Guard for the public viewable endpoint: a real campaign id, uuid-shaped. */
export function campaignIdOk(id: unknown): id is string {
  return (
    typeof id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  );
}
