/**
 * Ad measurement (Task 28, P4) — the ops half of the ad plan.
 *
 * Two data flows:
 *   1. Fill accounting — /api/ads/serve calls recordServeOutcome() with
 *      "served" | "house" | "unfilled" after every public serve request
 *      (disabled placements never reach the API → they count nothing, by
 *      design: an off switch is not an unfilled slot). Rows are one per
 *      placement per UTC day; the admin Measurement card reads the last 7.
 *   2. Viewable impressions — the AdSlot island (and the homepage promo row)
 *      fire one POST /api/ads/viewable per creative when MRC viewability is
 *      met (≥50% of the box on screen for ≥1s). recordViewable() increments
 *      AdCampaign.viewableImpressions; vRate = viewable / impressions.
 *
 * All raw SQL (stale-PrismaClient rule — see lib/forum.ts). Every writer is
 * fire-and-forget safe: measurement must never break serving.
 */
import { db } from "@/lib/db";
import { AD_PLACEMENTS, type AdPlacement } from "@/lib/ads";

export type ServeOutcome = "served" | "house" | "unfilled";

function utcDay(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

const dayStart = (day: string) => new Date(`${day}T00:00:00.000Z`);
const dayEnd = (day: string) => new Date(`${day}T23:59:59.999Z`);

export function recordServeOutcome(placement: AdPlacement, outcome: ServeOutcome): void {
  const day = utcDay();
  const now = new Date().toISOString();
  db.$executeRawUnsafe(
    `INSERT INTO AdServeStat (id, placement, day, served, house, unfilled, "createdAt", "updatedAt")
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT("placement", "day") DO UPDATE SET
       served   = served   + ?,
       house    = house    + ?,
       unfilled = unfilled + ?,
       "updatedAt" = ?`,
    crypto.randomUUID(),
    placement,
    day,
    outcome === "served" ? 1 : 0,
    outcome === "house" ? 1 : 0,
    outcome === "unfilled" ? 1 : 0,
    now,
    now,
    outcome === "served" ? 1 : 0,
    outcome === "house" ? 1 : 0,
    outcome === "unfilled" ? 1 : 0,
    now
  ).catch(() => {});
}

export function recordViewable(campaignId: string): void {
  db.$executeRaw`UPDATE AdCampaign SET "viewableImpressions" = "viewableImpressions" + 1
                 WHERE id = ${campaignId}`.catch(() => {});
}

export type PlacementMeasurement = {
  placement: AdPlacement;
  day: string;
  served: number;
  house: number;
  unfilled: number;
  /** served+served+house requested slots that did not yield a campaign. */
  unfillRate: number; // percent, 1 decimal — house fills count as unfilled demand
};

export type MeasurementResponse = {
  days: { day: string; date: string }[];
  rows: PlacementMeasurement[]; // per placement × day (7 days each)
  perPlacement: {
    placement: AdPlacement;
    served: number;
    house: number;
    unfilled: number;
    unfillRate: number;
  }[];
};

/** 7-day fill window for the admin Measurement card. */
export async function getPlacementMeasurement(): Promise<MeasurementResponse> {
  const today = new Date();
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    days.push(utcDay(new Date(today.getTime() - i * 86_400_000)));
  }

  let rows: { placement: string; day: string; served: number; house: number; unfilled: number }[] =
    [];
  try {
    rows = await db.$queryRaw`
      SELECT placement, day, served, house, unfilled
      FROM AdServeStat
      WHERE day >= ${days[0]} AND day <= ${days[days.length - 1]}`;
  } catch {
    rows = [];
  }

  const dayRows: { day: string; date: string }[] = days.map((d) => ({
    day: d,
    date: dayStart(d).toUTCString().slice(0, 11),
  }));

  // Per-placement totals over the window (missing days = 0).
  const perPlacement = AD_PLACEMENTS.map((p) => {
    const agg = { served: 0, house: 0, unfilled: 0 };
    for (const r of rows) {
      if (r.placement !== p) continue;
      agg.served += r.served;
      agg.house += r.house;
      agg.unfilled += r.unfilled;
    }
    const requested = agg.served + agg.house + agg.unfilled;
    return {
      placement: p,
      ...agg,
      unfillRate:
        requested > 0 ? Math.round(((agg.house + agg.unfilled) / requested) * 1000) / 10 : 0,
    };
  });

  // Long rows: placement × day for sparkline-style rendering.
  const grid: PlacementMeasurement[] = [];
  for (const p of AD_PLACEMENTS) {
    for (const d of days) {
      const r = rows.find((x) => x.placement === p && x.day === d);
      const served = r?.served ?? 0;
      const house = r?.house ?? 0;
      const unfilled = r?.unfilled ?? 0;
      const requested = served + house + unfilled;
      grid.push({
        placement: p,
        day: d,
        served,
        house,
        unfilled,
        unfillRate: requested > 0 ? Math.round(((house + unfilled) / requested) * 1000) / 10 : 0,
      });
    }
  }

  return { days: dayRows, perPlacement, rows: grid };
}

/** Guard for the public viewable endpoint: a real campaign id, uuid-shaped. */
export function campaignIdOk(id: unknown): id is string {
  return (
    typeof id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  );
}

export { dayStart, dayEnd };
